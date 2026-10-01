import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

/**
 * AdminRoute — admin-only route guard (Package #3.1C).
 *
 * Uses the same `role === 'admin'` check Joba24 already applies elsewhere
 * (SideMenu, AdminDashboard, AdminAnalyticsTab). No new role or authorization
 * model is introduced.
 *
 * This is nested inside <ProtectedRoute /> in App.jsx, so the caller is already
 * authenticated by the time it renders. The explicit checks below keep the guard
 * correct if it is ever mounted on its own.
 *
 * `['me']` is the same React Query key AuthContext and Layout populate, so this
 * normally resolves from cache with no additional request.
 */
export default function AdminRoute({ fallback = <DefaultFallback /> }) {
  const { isAuthenticated, isLoadingAuth, authChecked } = useAuth();

  const { data: me, isLoading: isLoadingMe } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated,
  });

  if (isLoadingAuth || !authChecked || (isAuthenticated && isLoadingMe)) {
    return fallback;
  }

  if (me?.role !== 'admin') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center px-8" dir="rtl">
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0f2b6b', marginBottom: 8 }}>
            אין לך הרשאה לדף זה
          </div>
          <div style={{ fontSize: 14, color: '#64748b' }}>
            דף זה מיועד למנהלים בלבד
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}