import { Menu } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import CreditBalancePill from '@/components/CreditBalancePill';
import { useState } from 'react';
import BuyCreditsModal from '@/components/BuyCreditsModal';

export default function AppHeader({ onOpenMenu }) {
  const { isAuthenticated } = useAuth();
  const [showBuyCredits, setShowBuyCredits] = useState(false);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated,
  });

  return (
    <>
      <div
        dir="rtl"
        style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: 'rgba(248,249,252,0.97)',
          borderBottom: '1px solid #eaeef5',
          backdropFilter: 'blur(14px)',
          height: 56,
          display: 'flex', alignItems: 'center',
          paddingRight: 16, paddingLeft: 16,
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        {/* Right side: Credits / Login */}
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {isAuthenticated ? (
            <CreditBalancePill
              credits={me?.worker_credits ?? 0}
              onClick={() => setShowBuyCredits(true)}
            />
          ) : (
            <button
              onClick={() => base44.auth.redirectToLogin()}
              style={{
                background: '#fbbf24', color: '#1a3a6b', border: 'none',
                height: 36, padding: '0 16px', borderRadius: 12, fontWeight: 900,
                fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(251,191,36,0.35)',
              }}
            >
              התחבר עכשיו
            </button>
          )}
        </div>

        {/* Center: Logo + LIVE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: '2px 7px', fontSize: 10, color: '#15803d', fontWeight: 700 }}>
            <span style={{ position: 'relative', display: 'inline-flex', width: 6, height: 6 }}>
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#22c55e', animation: 'ping 1.5s ease-in-out infinite', opacity: 0.6 }} />
              <span style={{ position: 'relative', width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
            </span>
            LIVE
          </span>
          <span style={{ fontWeight: 900, fontSize: 17, color: '#0f2b6b', letterSpacing: -0.5 }}>Joba<span style={{ color: '#fbbf24' }}>24</span></span>
          <img src="https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg" alt="Joba24" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 10 }} />
        </div>

        {/* Left side: Menu button */}
        <button
          onClick={onOpenMenu}
          style={{
            width: 40, height: 40, borderRadius: 12,
            background: '#1a6fd4', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Menu size={20} color="white" strokeWidth={2.5} />
        </button>
      </div>

      {showBuyCredits && <BuyCreditsModal onClose={() => setShowBuyCredits(false)} onSelect={() => setShowBuyCredits(false)} />}

      <style>{`
        @keyframes ping {
          0%, 100% { transform: scale(1); opacity: 0.75; }
          50% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </>
  );
}