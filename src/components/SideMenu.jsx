import { Link, useLocation } from 'react-router-dom';
import useDarkMode from '@/hooks/useDarkMode';
import { X, Home, Map, Plus, User, Wallet, Trophy, HelpCircle, Target, MessageCircle, ClipboardList, Bell, ShieldCheck, FileText } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { to: '/', icon: Home, label: 'פיד משימות' },
  { to: '/map', icon: Map, label: 'מפת משימות' },
  { to: '/create-task', icon: Plus, label: 'פרסם משימה' },
  { to: '/my-tasks', icon: ClipboardList, label: 'המשימות שלי' },
  { to: '/notifications', icon: Bell, label: 'התראות' },
  { to: '/chats', icon: MessageCircle, label: 'צ\'אטים' },
  { to: '/daily-goal', icon: Target, label: 'מטרת היום 🎯' },
  { to: '/wallet', icon: Wallet, label: 'ארנק' },
  { to: '/profile', icon: User, label: 'פרופיל' },
  { to: '/leaderboard', icon: Trophy, label: 'לוח מובילים' },
  { to: '/faq', icon: HelpCircle, label: 'שאלות ותשובות' },
  { to: '/terms', icon: FileText, label: 'תנאי שימוש' },
];

export default function SideMenu({ open, onClose }) {
  const location = useLocation();
  const { isAuthenticated, login } = useAuth();
  const [dark, setDark] = useDarkMode();

  return (
    <>
      {open && (
        <div onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 10001, backdropFilter: 'blur(2px)' }}
        />
      )}

      <div
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, width: 270,
          background: 'linear-gradient(180deg, #0a1f4e 0%, #0f2b6b 40%, #1a3a80 100%)',
          zIndex: 10002,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '6px 0 32px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '52px 20px 28px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <img src="https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg" alt="Joba24" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 8 }} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18, color: 'white', letterSpacing: -0.5 }}>Joba<span style={{ color: '#fbbf24' }}>24</span></div>
              <div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 500, marginTop: 1 }}>משימות מהירות בכל רחבי הארץ</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} color="#93c5fd" />
          </button>
        </div>

        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to} onClick={onClose}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px',
                  background: active ? 'rgba(96,165,250,0.15)' : 'transparent',
                  color: active ? '#60a5fa' : '#bfdbfe',
                  fontWeight: active ? 700 : 500, fontSize: 15,
                  textDecoration: 'none',
                  borderLeft: active ? '3px solid #60a5fa' : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={18} style={{ opacity: active ? 1 : 0.7 }} />
                {label}
              </Link>
            );
          })}
          {/* Admin link — shown only to admins */}
          {isAuthenticated && (
            <Link to="/admin" onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px',
                background: location.pathname === '/admin' ? 'rgba(251,191,36,0.15)' : 'transparent',
                color: location.pathname === '/admin' ? '#fbbf24' : '#fbbf24',
                fontWeight: 700, fontSize: 15, textDecoration: 'none',
                borderLeft: location.pathname === '/admin' ? '3px solid #fbbf24' : '3px solid transparent',
                opacity: 0.85,
              }}
            >
              <ShieldCheck size={18} />
              דשבורד מנהל
            </Link>
          )}
        </nav>

        {!isAuthenticated && (
           <button
              onClick={() => { login(); onClose(); }}
              style={{
                width: 'calc(100% - 40px)',
                margin: '0 20px 20px',
                padding: '14px 16px',
                background: '#fbbf24',
                color: '#0a1f5c',
                border: 'none',
                borderRadius: 14,
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              התחבר עכשיו
            </button>
         )}
        
        <div style={{ padding: '16px 20px 28px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Dark mode toggle */}
          <button
            onClick={() => setDark(d => !d)}
            style={{
              width: '100%', padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)',
              background: dark ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', marginBottom: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 17 }}>{dark ? '☀️' : '🌙'}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: dark ? '#fbbf24' : '#bfdbfe' }}>
                {dark ? 'מצב יום' : 'מצב לילה'}
              </span>
            </div>
            {/* Toggle pill */}
            <div style={{
              width: 42, height: 24, borderRadius: 99,
              background: dark ? '#fbbf24' : 'rgba(255,255,255,0.2)',
              position: 'relative', transition: 'background 0.25s',
              flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute', top: 3,
                left: dark ? 'calc(100% - 21px)' : 3,
                width: 18, height: 18, borderRadius: '50%',
                background: 'white',
                transition: 'left 0.25s cubic-bezier(0.34,1.2,0.64,1)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
              }} />
            </div>
          </button>
          <div style={{ fontSize: 11, color: '#93c5fd', textAlign: 'center', opacity: 0.7 }}>
            🐣 Joba24 — פרסם, מצא, הרוויח
          </div>
        </div>
      </div>
    </>
  );
}