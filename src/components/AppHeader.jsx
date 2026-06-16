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
          backdropFilter: 'blur(14px)',
          height: 56,
          display: 'flex', alignItems: 'center',
          paddingRight: 16, paddingLeft: 16,
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        {/* Right: Logo — always visible, clickable to home */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, textDecoration: 'none' }}>
          <img
            src="https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg"
            alt="Joba24"
            style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 10 }}
          />
          <span style={{ fontWeight: 900, fontSize: 17, color: 'var(--text-1)', letterSpacing: -0.5 }}>
            Joba<span style={{ color: '#fbbf24' }}>24</span>
          </span>
        </Link>

        {/* Left: Credits pill (home only) + Menu button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {isAuthenticated && (
            <span id="onboarding-credits-pill">
            <CreditBalancePill
              credits={me?.worker_credits ?? 0}
              onClick={() => setShowBuyCredits(true)}
            />
            </span>
          )}
          {!isAuthenticated && (
            <button
              onClick={() => setShowLogin(true)}
              style={{
                background: '#fbbf24', color: '#1a3a6b', border: 'none',
                height: 36, padding: '0 16px', borderRadius: 12, fontWeight: 900,
                fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(251,191,36,0.35)',
              }}
            >
              {t('login_now')}
            </button>
          )}
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