import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { isNativeLike } from '@/lib/nativeEnv';
import { detectMobilePlatform } from '@/lib/utils';
import { trackEvent, setAnalyticsUser, clearAnalyticsUser } from '@/lib/analytics';
import { applyDisplayName } from '@/lib/displayName';
import { resolveJourneyTrack } from '@/lib/onboardingTrack';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { queryClientInstance } from '@/lib/query-client';
import LoginPromptModal from '@/components/LoginPromptModal';
import { bootMark } from '@/lib/bootTrace';

// IMPORTANT: This module owns the React context object. When Vite hot-reloads
// this file, `createContext()` runs again and produces a NEW context object,
// while consumers (DeepLinkHandler, etc.) that weren't re-evaluated still hold
// the OLD context → useContext returns undefined → "useAuth must be used within
// an AuthProvider". Declining HMR forces a clean full-page reload on change,
// keeping a single context identity across the whole tree.
if (import.meta.hot) {
  import.meta.hot.decline();
}

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }
  const [showLoginModal, setShowLoginModal] = useState(false);
  // The login popup's headline continues whatever the visitor was trying to do
  // when it appeared, so the ask reads as the next step of their own action
  // rather than a generic invitation. null = the generic headline.
  const [loginPromptTitleKey, setLoginPromptTitleKey] = useState(null);
  // Guest mode — lets unauthenticated users browse the main feed only (Apple Guideline 5.1.1).
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem('joba24_guest_mode') === '1');
  // Refs to store unsubscribe functions — prevents leaked subscriptions on re-auth
  const unsubUserRef = useRef(null);
  const unsubCreditRef = useRef(null);
  const unsubAppRef = useRef(null);

  useEffect(() => {
    // Request persistent storage so localStorage (auth token) survives app kills on Android
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {});
    }
    checkAppState();
  }, []);

  // Refresh the user when a push notification is received (e.g. verification approval).
  // The celebration popup depends on the user object updating — the WS subscription
  // may miss asServiceRole updates, so this push-triggered refresh is the reliable
  // path that fires the instant the admin approves the user.
  useEffect(() => {
    const handlePushReceived = async () => {
      try {
        const freshUser = await base44.auth.me();
        setUser(prev => {
          if (!prev) return freshUser;
          if (prev.kyc_status !== 'approved' && freshUser.kyc_status === 'approved') {
            trackEvent('kyc_completed', {}, { dedupeKey: freshUser.id });
          }
          if (prev.is_verified !== freshUser.is_verified ||
              prev.kyc_status !== freshUser.kyc_status ||
              prev.worker_credits !== freshUser.worker_credits) {
            queryClientInstance.invalidateQueries({ queryKey: ['me'] });
            return freshUser;
          }
          return prev;
        });
      } catch {}
    };
    window.addEventListener('joba24:push-received', handlePushReceived);
    return () => window.removeEventListener('joba24:push-received', handlePushReceived);
  }, []);

  // Credits are kept up-to-date via the CreditTransaction WS subscription in checkUserAuth.
  // No polling needed — removing the 15s interval to reduce unnecessary API calls.

  const checkAppState = async () => {
    try {
      console.log('[Joba24] Auth: checkAppState start');
      bootMark('auth', 'start');
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // Safety timeout — if auth hangs for 5s, force-unlock the UI
      const safetyTimeout = setTimeout(() => {
        console.warn('[Joba24] Auth: safety timeout — forcing isLoading=false');
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }, 5000);
      
      // Check if user is authenticated
      if (appParams.token) {
        await checkUserAuth();
      } else {
        console.log('[Joba24] Auth: no token — not authenticated');
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setAuthChecked(true);
        // No session is a NORMAL state — a visitor with no account. It must never
        // read as a failure or hold the app on the splash.
        bootMark('session', 'ok', 'guest (no session)');
        }
      clearTimeout(safetyTimeout);
      console.log('[Joba24] Auth: checkAppState done — isLoadingPublicSettings=false');
      bootMark('auth', 'ok');
      setIsLoadingPublicSettings(false);
      } catch (error) {
      console.error('[Joba24] Auth: checkAppState error:', error.message);
      bootMark('auth', 'fail', error.message);
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
      // Cache in React Query so Layout's useQuery(['me']) doesn't make a duplicate API call
      queryClientInstance.setQueryData(['me'], currentUser);

      // ── Cross-user contamination guard ──
      // The null-sid OAuthHandshake bug (now fixed) silently swapped tokens
      // between users — user B's device got user A's token, so me() returned
      // user A's data (name, credits, tasks). This guard catches any REMAINING
      // stale tokens on devices: if the authenticated user ID changed WITHOUT
      // an explicit logout (which clears joba24_last_user_id), the token is
      // contaminated — force logout to prevent cross-user data exposure.
      // Also catches any future token-swap bug of the same class.
      const lastUserId = localStorage.getItem('joba24_last_user_id');
      if (lastUserId && lastUserId !== currentUser.id) {
        console.error('[Joba24] Auth: cross-user contamination detected — token user ID changed without logout. Forcing logout.', { last: lastUserId, current: currentUser.id });
        try {
          localStorage.removeItem('base44_access_token');
          localStorage.removeItem('token');
          localStorage.removeItem('joba24_last_user_id');
        } catch {}
        window.location.reload();
        return;
      }
      localStorage.setItem('joba24_last_user_id', currentUser.id);

      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      // ── RELEASE THE LOADING SCREEN HERE — NOT AFTER THE HOUSEKEEPING ─────
      // Everything below this line is post-auth bookkeeping: linking the
      // referral device, writing registration_source, refreshing last_active_at.
      // Each one is a SEPARATE network round-trip.
      //
      // checkAppState only cleared isLoadingPublicSettings AFTER awaiting this
      // whole function, so the app stayed on the loading screen until all of
      // that finished — three extra serialised writes added to every cold
      // start. On a slow connection the boot regularly exceeded the 5s safety
      // timeout, which is what actually released the UI. The user is fully
      // known at this point, so the app is shown now and the housekeeping
      // completes in the background.
      setIsLoadingPublicSettings(false);
      // Logging in exits guest mode
      localStorage.removeItem('joba24_guest_mode');
      setIsGuest(false);

      // Referral: if user arrived via ?ref=AGENT_CODE, save it to their profile BEFORE
      // granting the signup bonus, so grantSignupBonus can detect the referral and add
      // the extra referral bonus. Read from BOTH URL params and localStorage —
      // CaptureRefCode may not have run yet (AuthProvider runs before it).
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const refFromUrl = urlParams.get('ref');
        // UH-4: attribution is NEVER written from a client-supplied ref code.
        // The agent is derived SERVER-SIDE by linkReferralDevice() from the
        // persisted ReferralEvent for this device (first-touch, immutable).
        // It is awaited here so the signup bonus below sees the resolved
        // attribution. The ref code stays in localStorage so CaptureRefCode
        // can still ensure the ReferralEvent exists for this device.
        const deviceId = localStorage.getItem('joba24_device_id');
        if (deviceId) {
          try {
            await base44.functions.invoke('linkReferralDevice', { device_id: deviceId });
          } catch (e) {
            console.error('[Joba24] Auth: linkReferralDevice failed:', e?.message);
          }
        }
        // Clean URL to prevent re-processing
        if (refFromUrl) window.history.replaceState({}, '', window.location.pathname);
      } catch (refErr) {
        console.error('[Joba24] Auth: failed to apply referral code:', refErr?.message);
      }

      // Grant signup bonus if first time (no credits yet) — runs AFTER the referral
      // code is saved so the configurable referral bonus is applied for referred users.
      // NOTE: the Meta CompleteRegistration event deliberately does NOT live here.
      // It used to be tied to this balance check, which made it re-fire on later
      // logins and balance changes. It now lives in the registration block below,
      // which is keyed on the account's own creation state instead.
      if (currentUser && (currentUser.worker_credits === undefined || currentUser.worker_credits === null)) {
        // ── REFRESH THE USER THE MOMENT THE BONUS LANDS ──────────────────────
        // The bonus is granted here in the background, but `currentUser` was
        // fetched a moment EARLIER — before the server wrote the balance — so it
        // still carries worker_credits: null. Nothing then updated it: the
        // realtime User subscription is only established further down (the write
        // usually wins that race), and the 120s fallback poll is two minutes too
        // late. A brand-new account therefore sat on a stale user object for its
        // entire first session — which is why the signup gift popup never
        // appeared (it is gated on a real balance), the header showed 0 instead
        // of the 60 ג'ובות, and the welcome tour announced "0 ג'ובות במתנה".
        // Re-reading the user right after the grant makes the first session show
        // the truth immediately.
        base44.functions.invoke('grantSignupBonus', {})
          .catch(() => {})
          .finally(async () => {
            try {
              const fresh = await base44.auth.me();
              // Only apply it if this is still the same signed-in user — a
              // logout/login that happened meanwhile must not be overwritten.
              setUser(prev => (prev && prev.id === fresh.id ? { ...prev, ...fresh } : prev));
              queryClientInstance.setQueryData(['me'], fresh);
            } catch {
              /* the 120s fallback poll still catches up */
            }
          });
      }

      // Set the stable internal user id for attribution on every provider
      setAnalyticsUser(currentUser?.id);

      // Track registration source + granular platform — only set once
      try {
        if (!currentUser.registration_source) {
          // isNativeLike() covers both iOS (Capacitor bridge) and Android
          // (WebView "; wv)" UA marker) — more reliable than the old
          // window.Capacitor?.isNativePlatform?.() check which returns false
          // on Android remote server.url content.
          const isNative = isNativeLike();
          // detectMobilePlatform() returns 'ios' / 'android' / 'other' from
          // the UA — works in both browser and native WebView contexts.
          const mobilePlatform = detectMobilePlatform();
          let platform;
          if (isNative) {
            const plat = window.Capacitor?.getPlatform?.();
            platform = plat === 'ios' ? 'ios' : plat === 'android' ? 'android' : 'native';
          } else {
            platform = mobilePlatform === 'other' ? 'web' : mobilePlatform;
          }
          await base44.auth.updateMe({
            registration_source: isNative ? 'native' : 'web',
            registration_platform: platform,
          });

          // ── Meta CompleteRegistration ──
          // Fires ONLY here, and only after the write above succeeded:
          //   • the server record had no `registration_source`, so this account
          //     has never been through the post-registration flow;
          //   • the write has just claimed it, so this is exactly once per user
          //     and can never repeat on a later login, app launch or balance
          //     change (the old trigger was keyed on the Joba balance, which is
          //     what made it fire repeatedly).
          // `created_date` is the account's real creation time and is the source
          // of truth for "genuinely new registration" — accounts that predate
          // this marker are existing users, not new registrations, and are
          // skipped so they never emit a false registration event.
          const createdAt = Date.parse(currentUser.created_date || '');
          const isGenuinelyNewAccount =
            Number.isFinite(createdAt) &&
            Date.now() - createdAt < 7 * 24 * 60 * 60 * 1000;
          if (isGenuinelyNewAccount) {
            trackEvent('sign_up', {}, { dedupeKey: currentUser.id });
          }
        }
      } catch (srcErr) {
        console.error('[Joba24] Auth: failed to set registration_source:', srcErr?.message);
      }

      // ── WHICH JOURNEY THEY CAME IN ON — RECORDED ONCE ─────────────────────
      // The track lived only in this device's browser storage, so the launch
      // gate could not answer "did this person arrive as a professional?" for
      // anyone signing in on another device, or after the storage was cleared.
      // It is written to the account on the FIRST signed-in load and never
      // changed afterwards, so the answer is a fact about the person rather
      // than about the device they happen to be holding.
      try {
        if (!currentUser.signup_track) {
          const journey = resolveJourneyTrack();
          if (journey) await base44.auth.updateMe({ signup_track: journey });
        }
      } catch (journeyErr) {
        console.error('[Joba24] Auth: failed to set signup_track:', journeyErr?.message);
      }

      // Update last_active_at (throttled to once per hour — avoids redundant API calls
      // on every app open, while still tracking daily retention for admin dashboards)
      try {
        const now = new Date().toISOString();
        const lastActive = currentUser.last_active_at;
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        if (!lastActive || lastActive < oneHourAgo) {
          await base44.auth.updateMe({ last_active_at: now });
        }
      } catch {}

      // ReferralEvent linking (pre-registration downloads) happens in the awaited
      // linkReferralDevice() call above, so attribution is resolved server-side
      // BEFORE the signup bonus runs.

      // Clean up any previous subscriptions before creating new ones (prevents leaks on re-auth)
      if (unsubUserRef.current) { unsubUserRef.current(); unsubUserRef.current = null; }
      if (unsubCreditRef.current) { unsubCreditRef.current(); unsubCreditRef.current = null; }
      if (unsubAppRef.current) { unsubAppRef.current(); unsubAppRef.current = null; }

      // Subscribe to User entity changes to keep user data (credits, KYC status, verification) up to date in real-time
      unsubUserRef.current = base44.entities.User.subscribe((event) => {
        if (event.data?.id === currentUser?.id || event.id === currentUser?.id) {
          setUser(prev => {
            if (!prev) return event.data;
            // Track KYCCompleted when kyc_status transitions to 'approved' via WS
            if (prev.kyc_status !== 'approved' && event.data?.kyc_status === 'approved') {
              trackEvent('kyc_completed', {}, { dedupeKey: event.data?.id });
            }
            return prev ? { ...prev, ...event.data } : event.data;
          });
          // Invalidate the ['me'] React Query cache so all pages using useQuery(['me']) get fresh data
          queryClientInstance.invalidateQueries({ queryKey: ['me'] });
        }
      });

      // Also subscribe to CreditTransaction — update credits from the transaction's balance_after
      const unsubCredit = base44.entities.CreditTransaction.subscribe((event) => {
        if (event.data?.user_id === currentUser?.id && event.data.balance_after != null) {
          setUser(prev => prev ? { ...prev, worker_credits: event.data.balance_after } : prev);
        }
      });

      // Subscribe to TaskApplication — keep locked (committed) balance fresh in real-time.
      // When an application is created/approved/rejected/cancelled, invalidate the locked-balance
      // queries so the header indicator + popups update immediately (no manual refresh needed).
      unsubAppRef.current = base44.entities.TaskApplication.subscribe((event) => {
        const app = event.data;
        // Partial updates can omit worker_id when only the status changes.
        if (!app?.worker_id || app.worker_id === currentUser?.id) {
          queryClientInstance.invalidateQueries({ queryKey: ['myLockedJobas'] });
          queryClientInstance.invalidateQueries({ queryKey: ['myApplicationsFeed'] });
        }
      });

      // Fallback polling: refresh user data every 120 seconds to catch changes
      // (e.g. admin KYC approval/rejection) that realtime might miss for cross-user updates
      const pollInterval = setInterval(async () => {
        try {
          const freshUser = await base44.auth.me();
          setUser(prev => {
            if (!prev) return freshUser;
            if (prev.is_verified !== freshUser.is_verified ||
                prev.kyc_status !== freshUser.kyc_status ||
                prev.worker_credits !== freshUser.worker_credits ||
                prev.is_blocked !== freshUser.is_blocked) {
              queryClientInstance.invalidateQueries({ queryKey: ['me'] });
              return freshUser;
            }
            return prev;
          });
        } catch {}
      }, 30000);

      // Also refresh immediately when the tab becomes visible again (user returns to app)
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
          base44.auth.me().then(freshUser => {
            setUser(prev => {
              if (!prev) return freshUser;
              if (prev.kyc_status !== 'approved' && freshUser.kyc_status === 'approved') {
                trackEvent('kyc_completed', {}, { dedupeKey: freshUser.id });
              }
              if (prev.is_verified !== freshUser.is_verified ||
                  prev.kyc_status !== freshUser.kyc_status ||
                  prev.worker_credits !== freshUser.worker_credits ||
                  prev.is_blocked !== freshUser.is_blocked) {
                queryClientInstance.invalidateQueries({ queryKey: ['me'] });
                return freshUser;
              }
              return prev;
            });
          }).catch(() => {});
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);

      // Compose cleanup for both the CreditTransaction subscription and the poll interval
      unsubCreditRef.current = () => {
        unsubCredit();
        clearInterval(pollInterval);
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    } catch (error) {
      console.error('[Joba24] Auth: checkUserAuth failed:', error.message, error.status);
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

  const login = (titleKey) => {
    // Accepts either nothing, a legacy redirect path (ignored), or a
    // 'login_title_*' translation key that becomes the popup's headline.
    setLoginPromptTitleKey(
      typeof titleKey === 'string' && titleKey.startsWith('login_title_') ? titleKey : null,
    );
    setShowLoginModal(true);
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);

    // Clean up real-time subscriptions
    if (unsubUserRef.current) { unsubUserRef.current(); unsubUserRef.current = null; }
    if (unsubCreditRef.current) { unsubCreditRef.current(); unsubCreditRef.current = null; }
    if (unsubAppRef.current) { unsubAppRef.current(); unsubAppRef.current = null; }

    // Clear the analytics identity on every provider
    clearAnalyticsUser();

    // Clear all personal cached data from localStorage
    localStorage.removeItem('joba24_notifications');
    localStorage.removeItem('joba24_draft_task');

    // Clear the auth token locally. base44.auth.logout() redirects to
    // ${appBaseUrl}/api/apps/auth/logout — on Android native that external URL
    // escapes the WebView (opens the system browser) and exposes the raw
    // joba24.base44.app domain. Clearing the localStorage token + reloading the
    // app root logs the user out cleanly in-app on every platform.
    try {
      localStorage.removeItem('base44_access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('joba24_last_user_id');
    } catch {}
    localStorage.removeItem('joba24_guest_mode');
    setIsGuest(false);

    // ── Where a signed-out visitor lands ────────────────────────────────────
    // The welcome screen: the first-run choice between publishing and earning,
    // which is also where they sign back in.
    //
    // Redirecting to '/' was not enough on its own. A visitor who had already
    // been through the first-run flow is sent on from '/' by the Layout gate to
    // the destination of the track they once chose — and for the publish track
    // that is the publish form. So logging out looked exactly like being pushed
    // into creating a task. Clearing the first-run state is what makes the
    // welcome screen the real destination rather than a one-frame detour: a
    // signed-out visitor is a visitor starting over, and this is the screen
    // that starts over.
    try {
      localStorage.removeItem('joba24_onboarding_track');
      localStorage.removeItem('joba24_onboarding_explainer_publish');
      localStorage.removeItem('joba24_onboarding_explainer_worker');
    } catch {}

    if (shouldRedirect) {
      window.location.replace('/welcome');
    }
  };

  const navigateToLogin = () => {
    setShowLoginModal(true);
  };

  const enterGuestMode = () => {
    localStorage.setItem('joba24_guest_mode', '1');
    setIsGuest(true);
  };

  const exitGuestMode = () => {
    localStorage.removeItem('joba24_guest_mode');
    setIsGuest(false);
  };

  // `full_name` is a built-in auth field the platform refuses to change, so a
  // user-chosen name is kept in the custom `display_name` field. Exposing the
  // merged value as `full_name` here means every existing `user.full_name` read
  // across the app shows the chosen name — and every new record that snapshots
  // a name (worker_name, sender_name, …) stores it too.
  const displayUser = useMemo(() => applyDisplayName(user), [user]);

  return (
    <AuthContext.Provider value={{ 
      user: displayUser, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      login,
      navigateToLogin,
      enterGuestMode,
      exitGuestMode,
      isGuest,
      checkUserAuth,
      checkAppState,
      refreshUser,
    }}>
      {children}
      {showLoginModal && (
        <LoginPromptModal
          titleKey={loginPromptTitleKey}
          onClose={() => setShowLoginModal(false)}
          onLogin={() => setShowLoginModal(false)}
        />
      )}
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