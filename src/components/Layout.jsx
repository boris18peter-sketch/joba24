import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Map, Plus, User, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="min-h-screen bg-background">
      {/* Page content */}
      <div className="pb-24">
        <Outlet />
      </div>

      {/* Bottom Nav — fixed to viewport bottom, full width */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: 'white',
          borderTop: '1px solid #f0f0f0',
          boxShadow: '0 -2px 16px rgba(0,0,0,0.07)',
        }}
      >
        <div className="flex items-end justify-around px-4 py-2">
          {navItems.map(({ to, icon: Icon, label, primary }) => {
            const active = location.pathname === to;
            if (primary) {
              return (
                <Link key={to} to={to} className="flex flex-col items-center -mt-5">
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: 'black',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                    }}
                  >
                    <Icon size={24} color="white" />
                  </div>
                  <span style={{ fontSize: 10, color: '#888', marginTop: 4, fontWeight: 500 }}>{label}</span>
                </Link>
              );
            }
            return (
              <Link key={to} to={to} className="flex flex-col items-center gap-1 px-3 py-1">
                <Icon size={20} color={active ? '#000' : '#aaa'} />
                <span style={{ fontSize: 10, color: active ? '#000' : '#aaa', fontWeight: active ? 700 : 500 }}>
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