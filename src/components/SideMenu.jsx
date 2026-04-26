import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Home, Map, Plus, User, Wallet, Trophy, Leaf } from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'פיד', emoji: '🌿' },
  { to: '/map', icon: Map, label: 'מפה', emoji: '🗺️' },
  { to: '/create-task', icon: Plus, label: 'פרסם משימה', emoji: '➕' },
  { to: '/wallet', icon: Wallet, label: 'ארנק', emoji: '💚' },
  { to: '/profile', icon: User, label: 'פרופיל', emoji: '👤' },
  { to: '/leaderboard', icon: Trophy, label: 'לוח מובילים', emoji: '🏆' },
];

export default function SideMenu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', top: 16, left: 16, zIndex: 10000,
          width: 42, height: 42, borderRadius: 14,
          background: 'linear-gradient(135deg, #16a34a, #15803d)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', cursor: 'pointer', boxShadow: '0 2px 14px rgba(22,163,74,0.4)',
        }}
      >
        <Menu size={20} color="white" />
      </button>

      {open && (
        <div onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 10001, backdropFilter: 'blur(2px)' }}
        />
      )}

      <div
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, width: 270,
          background: 'linear-gradient(180deg, #052e16 0%, #14532d 40%, #166534 100%)',
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
            }}>
              <Leaf size={18} color="#4ade80" />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18, color: 'white', letterSpacing: -0.5 }}>EcoTask</div>
              <div style={{ fontSize: 11, color: '#86efac', fontWeight: 500, marginTop: 1 }}>עוזרים לסביבה 🌱</div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} color="#86efac" />
          </button>
        </div>

        <nav style={{ flex: 1, padding: '12px 0' }}>
          {navItems.map(({ to, icon: Icon, label, emoji }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to} onClick={() => setOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px',
                  background: active ? 'rgba(74,222,128,0.15)' : 'transparent',
                  color: active ? '#4ade80' : '#bbf7d0',
                  fontWeight: active ? 700 : 500, fontSize: 15,
                  textDecoration: 'none',
                  borderLeft: active ? '3px solid #4ade80' : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 16 }}>{emoji}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '16px 20px 32px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 11, color: '#4ade80', textAlign: 'center', opacity: 0.7 }}>
            🌍 כל משימה עוזרת לסביבה
          </div>
        </div>
      </div>
    </>
  );
}