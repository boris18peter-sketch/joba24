import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Home, Map, Plus, User, Wallet, Trophy, HelpCircle, Target, MessageCircle, ClipboardList, Bell, LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { to: '/', icon: Home, label: 'פיד ג\'ובות' },
  { to: '/map', icon: Map, label: 'מפת ג\'ובות' },
  { to: '/create-task', icon: Plus, label: 'פרסם ג\'ובה' },
  { to: '/my-tasks', icon: ClipboardList, label: 'הג\'ובות שלי' },
  { to: '/notifications', icon: Bell, label: 'התראות' },
  { to: '/chats', icon: MessageCircle, label: 'צ\'אטים' },
  { to: '/daily-goal', icon: Target, label: 'מטרת היום 🎯' },
  { to: '/wallet', icon: Wallet, label: 'ארנק' },
  { to: '/profile', icon: User, label: 'פרופיל' },
  { to: '/leaderboard', icon: Trophy, label: 'לוח מובילים' },
  { to: '/faq', icon: HelpCircle, label: 'שאלות ותשובות' },
];

export default function SideMenu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, login } = useAuth();

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 10000, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px' }}>
        <button
          onClick={() => setOpen(true)}
          style={{
            width: 56, height: 56,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer', background: 'none', padding: 0,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <div style={{
            width: 42, height: 42, borderRadius: 14,
            background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 14px rgba(26,111,212,0.4)',
          }}>
            <Menu size={20} color="white" />
          </div>
        </button>

        {!isAuthenticated && (
          <button
            onClick={() => login()}
            style={{
              padding: '10px 14px',
              background: '#fbbf24',
              color: '#0a1f5c',
              border: 'none',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(251,191,36,0.4)',
              whiteSpace: 'nowrap',
            }}
          >
            <LogIn size={14} /> התחברות
          </button>
        )}
      </div>

      {open && (
        <div onClick={() => setOpen(false)}
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
          <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} color="#93c5fd" />
          </button>
        </div>

        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to} onClick={() => setOpen(false)}
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
            <Link to="/admin" onClick={() => setOpen(false)}
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
             onClick={() => { login(); setOpen(false); }}
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
               gap: 8,
             }}
           >
             התחברות בתוך תפריט
           </button>
         )}
        
        <div style={{ padding: '16px 20px 32px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 11, color: '#93c5fd', textAlign: 'center', opacity: 0.7 }}>
            🐣 Joba24 — פרסם, מצא, הרוויח
          </div>
        </div>
      </div>
    </>
  );
}