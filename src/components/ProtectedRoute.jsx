import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback /> }) {
  const { isAuthenticated, isLoadingAuth, authChecked, login } = useAuth();

  useEffect(() => {
    if (authChecked && !isLoadingAuth && !isAuthenticated) {
      login(window.location.pathname);
    }
  }, [authChecked, isLoadingAuth, isAuthenticated]);

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (!isAuthenticated) {
    // Redirect is triggered in useEffect; render nothing while redirecting
    return fallback;
  }

  return <Outlet />;
}