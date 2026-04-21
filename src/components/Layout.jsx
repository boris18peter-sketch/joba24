import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Map, Plus, User, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
// Icons are imported above and used via the navItems array

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
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto relative">
      <main className="flex-1 pb-24 overflow-auto">
        <Outlet />
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-card border-t border-border z-50">
        <div className="flex items-end justify-around px-2 py-2">
          {navItems.map(({ to, icon: Icon, label, primary }) => {
            const active = location.pathname === to;
            if (primary) {
              return (
                <Link key={to} to={to} className="flex flex-col items-center -mt-6">
                  <div className="w-14 h-14 rounded-full bg-primary shadow-lg shadow-primary/40 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <span className="text-xs mt-1 text-muted-foreground font-medium">{label}</span>
                </Link>
              );
            }
            return (
              <Link key={to} to={to} className="flex flex-col items-center gap-1 px-3 py-1">
                <Icon className={cn('w-5 h-5 transition-colors', active ? 'text-primary' : 'text-muted-foreground')} />
                <span className={cn('text-xs font-medium transition-colors', active ? 'text-primary' : 'text-muted-foreground')}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}