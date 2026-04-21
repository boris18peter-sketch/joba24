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
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-24 overflow-auto max-w-lg mx-auto w-full">
        <Outlet />
      </main>

      {/* Bottom Nav — fixed to full viewport width, always visible */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-[0_-1px_12px_rgba(0,0,0,0.08)]">
        <div className="flex items-end justify-around px-4 py-2 max-w-lg mx-auto">
          {navItems.map(({ to, icon: Icon, label, primary }) => {
            const active = location.pathname === to;
            if (primary) {
              return (
                <Link key={to} to={to} className="flex flex-col items-center -mt-5">
                  <div className="w-14 h-14 rounded-full bg-black shadow-xl flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] mt-1 text-gray-500 font-medium">{label}</span>
                </Link>
              );
            }
            return (
              <Link key={to} to={to} className="flex flex-col items-center gap-1 px-3 py-1 min-w-[44px]">
                <Icon className={cn('w-5 h-5 transition-colors', active ? 'text-black' : 'text-gray-400')} />
                <span className={cn('text-[10px] font-medium transition-colors', active ? 'text-black font-semibold' : 'text-gray-400')}>
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