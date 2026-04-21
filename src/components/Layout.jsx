import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Map, Plus, User, Wallet } from 'lucide-react';
import SideMenu from '@/components/SideMenu';

const navItems = [
  { to: '/', icon: Home, label: 'פיד' },
  { to: '/map', icon: Map, label: 'מפה' },
  { to: '/create-task', icon: Plus, label: 'פרסם', primary: true },
  { to: '/wallet', icon: Wallet, label: 'ארנק' },
  { to: '/profile', icon: User, label: 'פרופיל' },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      {/* Side menu */}
      <SideMenu />

      {/* Page content with bottom padding so nav doesn't cover content */}
      <div style={{ paddingBottom: 80 }}>
        <Outlet />
      </div>

      {/* Bottom Nav */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: 'white',
          borderTop: '1px solid #efefef',
          boxShadow: '0 -2px 16px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-around',
            padding: '8px 16px 12px',
          }}
        >
          {navItems.map(({ to, icon: Icon, label, primary }) => {
            const active = location.pathname === to;

            if (primary) {
              return (
                <Link
                  key={to}
                  to={to}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginTop: -20,
                    textDecoration: 'none',
                  }}
                >
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: '50%',
                      background: 'black',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
                    }}
                  >
                    <Icon size={22} color="white" />
                  </div>
                  <span style={{ fontSize: 10, color: '#888', marginTop: 4, fontWeight: 500 }}>{label}</span>
                </Link>
              );
            }

            return (
              <Link
                key={to}
                to={to}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  padding: '4px 12px',
                  textDecoration: 'none',
                }}
              >
                <Icon size={20} color={active ? '#000' : '#bbb'} />
                <span style={{ fontSize: 10, color: active ? '#000' : '#bbb', fontWeight: active ? 700 : 500 }}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}