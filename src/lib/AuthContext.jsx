import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  // Poll credits every 15s when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(async () => {
      try {
        const fresh = await base44.auth.me();
        setUser(prev => {
          if (!prev) return fresh;
          if (fresh.worker_credits !== prev.worker_credits) return { ...prev, worker_credits: fresh.worker_credits };
          return prev;
        });
      } catch {}
    }, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // Check if user is authenticated
      if (appParams.token) {
        await checkUserAuth();
      } else {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setAuthChecked(true);
      }
      setIsLoadingPublicSettings(false);
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  // Refresh user data (credits etc.) from server
  const refreshUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      return currentUser;
    } catch {
      return null;
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);

      // Grant signup bonus if first time (no credits yet)
      if (currentUser && (currentUser.worker_credits === undefined || currentUser.worker_credits === null)) {
        base44.functions.invoke('grantSignupBonus', {}).catch(() => {});
      }

      // Referral: if user arrived via ?ref=AGENT_CODE, save it to their profile
      try {
        const savedRef = localStorage.getItem('joba24_ref_code');
        if (savedRef && !currentUser.referred_by_agent_code) {
          await base44.auth.updateMe({ referred_by_agent_code: savedRef });
          localStorage.removeItem('joba24_ref_code');
        }
      } catch {}

      // Subscribe to User entity changes to keep credits up to date in real-time
      base44.entities.User.subscribe((event) => {
        if (event.data?.id === currentUser?.id || event.id === currentUser?.id) {
          setUser(prev => prev ? { ...prev, ...event.data } : event.data);
        }
      });

      // Also subscribe to CreditTransaction — refresh immediately on any credit change
      base44.entities.CreditTransaction.subscribe(async (event) => {
        if (event.data?.user_id === currentUser?.id) {
          try {
            const fresh = await base44.auth.me();
            setUser(prev => prev ? { ...prev, worker_credits: fresh.worker_credits } : fresh);
          } catch {}
        }
      });
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const login = (nextPath) => {
    const nextUrl = nextPath
      ? `${window.location.origin}${nextPath}`
      : window.location.href;
    base44.auth.redirectToLogin(nextUrl);
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);

    // Clear all personal cached data from localStorage
    localStorage.removeItem('joba24_notifications');
    localStorage.removeItem('joba24_draft_task');

    if (shouldRedirect) {
      base44.auth.logout(window.location.href);
    } else {
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      login,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};