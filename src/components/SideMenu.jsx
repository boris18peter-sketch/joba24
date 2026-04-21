import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Home, Map, Plus, User, Wallet } from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'פיד' },
  { to: '/map', icon: Map, label: 'מפה' },
  { to: '/create-task', icon: Plus, label: 'פרסם משימה' },
  { to: '/wallet', icon: Wallet, label: 'ארנק' },
  { to: '/profile', icon: User, label: 'פרופיל' },
];

export default function SideMenu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 10000,
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'black',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
        }}
      >
        <Menu size={20} color="white" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 10001,
          }}
        />
      )}

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 260,
          background: 'white',
          zIndex: 10002,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 0',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 24px' }}>
          <span style={{ fontWeight: 900, fontSize: 20, color: 'black' }}>QuickTasks</span>
          <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={22} color="#555" />
          </button>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1 }}>
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 20px',
                  background: active ? '#f5f5f5' : 'transparent',
                  color: active ? 'black' : '#555',
                  fontWeight: active ? 700 : 500,
                  fontSize: 16,
                  textDecoration: 'none',
                  borderRight: active ? '3px solid black' : '3px solid transparent',
                }}
              >
                <Icon size={20} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}