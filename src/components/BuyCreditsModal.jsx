import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import useCountUp from '@/hooks/useCountUp';
import { X, Zap, Star } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import CreditIcon from '@/components/CreditIcon';
import { useLanguage } from '@/lib/LanguageContext';

const SHIMMER_STYLE = `
  @keyframes shimmerWipe {
    0%   { transform: translateX(-120%) skewX(-15deg); }
    100% { transform: translateX(250%) skewX(-15deg); }
  }
  .pkg-shimmer::after {
    animation: shimmerWipe 2s ease-in-out;
  }
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 10px 2px rgba(251,191,36,0.45), 0 10px 32px rgba(21,101,192,0.38); }
    50%       { box-shadow: 0 0 22px 7px rgba(251,191,36,0.75), 0 10px 32px rgba(21,101,192,0.38); }
  }
  .pkg-shimmer::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 20px;
    background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.22) 50%, transparent 70%);
    transform: translateX(-120%) skewX(-15deg);
    pointer-events: none;
    overflow: hidden;
  }
  .pkg-glow {
    animation: glowPulse 2.2s ease-in-out infinite;
  }
`;

const PACKAGES = [
  { id: 'starter',    credits: 15,   bonus: 0,   price: 9.90,   popular: false, coins: 1 },
  { id: 'basic',      credits: 40,   bonus: 0,   price: 24.90,  popular: false, coins: 2 },
  { id: 'popular',    credits: 100,  bonus: 15,  price: 49.90,  popular: true,  coins: 3 },
  { id: 'contractor', credits: 250,  bonus: 50,  price: 99.90,  popular: false, coins: 4 },
  { id: 'pro',        credits: 600,  bonus: 150, price: 199.90, popular: false, coins: 5 },
  { id: 'boss',       credits: 1600, bonus: 400, price: 449.90, popular: false, coins: 6 },
];



export default function BuyCreditsModal({ onClose, creditsNeeded }) {
  const { user: me } = useAuth();
  const { t } = useLanguage();
  const animatedCredits = useCountUp(me?.worker_credits ?? 0);

  // Inject keyframes once
  useEffect(() => {
    const id = 'buy-credits-styles';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id;
      s.textContent = SHIMMER_STYLE;
      document.head.appendChild(s);
    }
  }, []);

  // Trigger shimmer every 4s
  useEffect(() => {
    const trigger = () => {
      document.querySelectorAll('.pkg-card').forEach((el, i) => {
        setTimeout(() => {
          el.classList.remove('pkg-shimmer');
          void el.offsetWidth; // reflow
          el.classList.add('pkg-shimmer');
          setTimeout(() => el.classList.remove('pkg-shimmer'), 1300);
        }, i * 80);
      });
    };
    trigger();
    const iv = setInterval(trigger, 4000);
    return () => clearInterval(iv);
  }, []);

  const handleSelect = (pkg) => {
    alert(t('buy_coming_soon').replace('{credits}', pkg.credits + pkg.bonus).replace('{price}', pkg.price.toFixed(2)));
  };

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(5,15,40,0.65)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(6px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        dir="rtl"
        style={{
          background: 'var(--sheet-bg)',
          borderRadius: '28px 28px 0 0',
          width: '100%',
          maxWidth: 480,
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 -16px 60px rgba(0,0,0,0.25)',
          paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
        }}
      >
        {/* Handle */}
        <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 16px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CreditIcon size={26} />
              </div>
              <div>
                <div style={{ fontSize: 19, fontWeight: 900, color: '#0f1e40', letterSpacing: -0.3 }}>{t('buy_title')}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {t('buy_balance')} <span style={{ fontWeight: 700, color: '#1a6fd4', display: 'flex', alignItems: 'center', gap: 3 }}>{animatedCredits} <CreditIcon size={13} /></span>
                </div>
              </div>
            </div>
            {creditsNeeded && (
              <div style={{ marginTop: 12, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={14} color="#f97316" />
                <span style={{ fontSize: 13, color: '#c2410c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {t('buy_task_entry')} <strong style={{ display: 'flex', alignItems: 'center', gap: 3 }}>{creditsNeeded} <CreditIcon size={14} /></strong>
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: 11, background: '#f0f2f7', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginTop: 24 }}
          >
            <X size={16} color="#9ca3af" />
          </button>
        </div>

        {/* Packages grid */}
        <div style={{ padding: '14px 14px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, overflowX: 'hidden' }}>
          {PACKAGES.map((pkg) => {
            const totalCredits = pkg.credits + pkg.bonus;
            const pricePerCredit = (pkg.price / totalCredits).toFixed(2);

            return (
              <button
                key={pkg.id}
                onClick={() => handleSelect(pkg)}
                className={`pkg-card${pkg.popular ? ' pkg-glow' : ''}`}
                style={{
                  background: pkg.popular
                    ? 'linear-gradient(145deg, #1565c0, #0d47a1)'
                    : 'white',
                  border: pkg.popular ? 'none' : '1.5px solid #e5e9f5',
                  borderRadius: 20,
                  padding: '16px 14px 14px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'visible',
                  boxShadow: pkg.popular
                    ? '0 10px 32px rgba(21,101,192,0.38)'
                    : '0 2px 10px rgba(0,0,0,0.06)',
                  transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
                onPointerDown={e => {
                  e.currentTarget.style.transform = 'scale(1.04)';
                  e.currentTarget.style.boxShadow = pkg.popular
                    ? '0 20px 48px rgba(21,101,192,0.55)'
                    : '0 12px 24px rgba(0,0,0,0.15)';
                }}
                onPointerUp={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = pkg.popular
                    ? '0 10px 32px rgba(21,101,192,0.38)'
                    : '0 2px 10px rgba(0,0,0,0.06)';
                }}
                onPointerLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = pkg.popular
                    ? '0 10px 32px rgba(21,101,192,0.38)'
                    : '0 2px 10px rgba(0,0,0,0.06)';
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.04)';
                  e.currentTarget.style.boxShadow = pkg.popular
                    ? '0 20px 48px rgba(21,101,192,0.55)'
                    : '0 12px 24px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = pkg.popular
                    ? '0 10px 32px rgba(21,101,192,0.38)'
                    : '0 2px 10px rgba(0,0,0,0.06)';
                }}
              >
                {pkg.popular && (
                  <div style={{
                    position: 'absolute', top: -11, right: '50%', transform: 'translateX(50%)',
                    background: 'linear-gradient(90deg,#f59e0b,#fbbf24)',
                    color: '#7c2d00', fontWeight: 900, fontSize: 10,
                    padding: '3px 12px', borderRadius: 99,
                    whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(251,191,36,0.4)',
                    display: 'flex', alignItems: 'center', gap: 4,
                    zIndex: 10,
                  }}>
                    <Star size={9} fill="currentColor" /> {t('buy_popular')}
                  </div>
                )}

                {/* Credits count */}
                <div style={{ fontSize: 24, fontWeight: 900, color: pkg.popular ? 'white' : '#0f1e40', letterSpacing: -0.5, lineHeight: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {totalCredits}
                  <CreditIcon size={16} />
                </div>

                {/* Bonus tag */}
                {pkg.bonus > 0 && (
                  <div style={{ fontSize: 10, color: pkg.popular ? '#fde68a' : '#16a34a', fontWeight: 800, background: pkg.popular ? 'rgba(255,255,255,0.1)' : '#f0fdf4', borderRadius: 20, padding: '2px 8px', border: pkg.popular ? 'none' : '1px solid #bbf7d0' }}>
                    +{pkg.bonus} {t('buy_bonus')}
                  </div>
                )}

                {/* Price */}
                <div style={{
                  marginTop: 4, width: '100%',
                  background: pkg.popular ? 'rgba(255,255,255,0.12)' : '#f4f7fb',
                  borderRadius: 12, padding: '8px 6px',
                }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: pkg.popular ? 'white' : '#0f2b6b' }}>
                    ₪{pkg.price.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 10, color: pkg.popular ? 'rgba(255,255,255,0.55)' : '#9ca3af', marginTop: 1 }}>
                    ₪{pricePerCredit} {t('buy_per_credit')}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ padding: '14px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 11 }}>
          {t('buy_footer')}
        </div>
      </div>
    </div>,
    document.body
  );
}