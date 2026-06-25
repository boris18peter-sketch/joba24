import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import CreditBalancePill from '@/components/CreditBalancePill';
import { useState } from 'react';
import BuyCreditsModal from '@/components/BuyCreditsModal';
import LoginPromptModal from '@/components/LoginPromptModal';
import { useLanguage } from '@/lib/LanguageContext';

export default function AppHeader({ onOpenMenu }) {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const { isAuthenticated } = useAuth();
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const { t, isRTL } = useLanguage();

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated,
  });

  return (
    <>
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: 'var(--header-bg)',
          borderBottom: '1px solid var(--border-1)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          height: 60,
          paddingTop: 'max(0px, env(safe-area-inset-top))',
          display: 'flex', alignItems: 'center',
          paddingRight: 14, paddingLeft: 14,
          justifyContent: 'space-between',
          flexShrink: 0,
          boxShadow: '0 1px 0 var(--border-1)',
        }}
      >
        {/* Right: Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0, textDecoration: 'none' }}>
          <img
            src="https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg"
            alt="Joba24"
            style={{ width: 34, height: 34, objectFit: 'cover', borderRadius: 'var(--r-sm)' }}
          />
          <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--text-1)', letterSpacing: -0.6 }}>
            Joba<span style={{ color: 'var(--brand-accent)' }}>24</span>
          </span>
        </Link>

        {/* Left: Credits pill + Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {isAuthenticated && (
            <span id="onboarding-credits-pill">
              <CreditBalancePill credits={me?.worker_credits ?? 0} onClick={() => setShowBuyCredits(true)} />
            </span>
          )}
          {!isAuthenticated && (
            <button
              onClick={() => setShowLogin(true)}
              style={{
                background: 'var(--brand-accent)', color: '#1a3a6b', border: 'none',
                height: 40, padding: '0 18px', borderRadius: 'var(--r-sm)',
                fontWeight: 800, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(251,191,36,0.35)',
              }}
            >
              {t('login_now')}
            </button>
          )}
          <button
            onClick={onOpenMenu}
            style={{
              width: 42, height: 42, borderRadius: 'var(--r-sm)',
              background: 'var(--brand-primary)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Menu size={18} color="white" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {showBuyCredits && (
        <BuyCreditsModal
          onClose={() => setShowBuyCredits(false)}
          onSelect={() => setShowBuyCredits(false)}
        />
      )}
      {showLogin && (
        <LoginPromptModal onClose={() => setShowLogin(false)} />
      )}
    </>
  );
}