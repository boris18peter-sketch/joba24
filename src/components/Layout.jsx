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
    <div style={{ minHeight: '100vh', background: 'hsl(120,20%,97%)' }}>
      <SideMenu />
      <div style={{ paddingBottom: 80 }}>
        <Outlet />
      </div>

      {/* Bottom Nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
        background: 'white', borderTop: '1px solid #d1e8d1',
        boxShadow: '0 -2px 20px rgba(34,120,64,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '8px 16px 12px' }}>
          {navItems.map(({ to, icon: Icon, label, primary }) => {
            const active = location.pathname === to;
            if (primary) {
              return (
                <Link key={to} to={to} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -22, textDecoration: 'none' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #16a34a, #15803d)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 20px rgba(22,163,74,0.45)',
                  }}>
                    <Icon size={24} color="white" />
                  </div>
                  <span style={{ fontSize: 10, color: '#4b7c57', marginTop: 4, fontWeight: 600 }}>{label}</span>
                </Link>
              );
            }
            return (
              <Link key={to} to={to} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 12px', textDecoration: 'none' }}>
                <Icon size={20} color={active ? '#16a34a' : '#a3c9a8'} />
                <span style={{ fontSize: 10, color: active ? '#16a34a' : '#a3c9a8', fontWeight: active ? 700 : 500 }}>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}