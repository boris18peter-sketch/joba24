import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback /> }) {
  const { isAuthenticated, isLoadingAuth, authChecked, login } = useAuth();

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center px-8" dir="rtl">
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0f2b6b', marginBottom: 8 }}>דף זה מצריך התחברות</div>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>התחבר כדי להמשיך</div>
          <button
            onClick={login}
            style={{
              padding: '14px 32px',
              background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
              color: 'white',
              border: 'none',
              borderRadius: 16,
              fontWeight: 800,
              fontSize: 15,
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(26,111,212,0.35)',
            }}
          >
            התחבר עכשיו
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}