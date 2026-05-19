import { createPortal } from 'react-dom';
import useCountUp from '@/hooks/useCountUp';
import { X, Zap, Star } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import CreditIcon from '@/components/CreditIcon';

const PACKAGES = [
  { id: 'starter',    label: 'התנסות',  credits: 15,   bonus: 0,   price: 9.90,   popular: false },
  { id: 'basic',      label: 'בסיסית',  credits: 40,   bonus: 0,   price: 24.90,  popular: false },
  { id: 'popular',    label: 'פופולרית',credits: 100,  bonus: 15,  price: 49.90,  popular: true  },
  { id: 'contractor', label: 'קבלנים',  credits: 250,  bonus: 50,  price: 99.90,  popular: false },
  { id: 'pro',        label: 'פרו',     credits: 600,  bonus: 150, price: 199.90, popular: false },
  { id: 'boss',       label: 'Boss',    credits: 1600, bonus: 400, price: 449.90, popular: false },
];

export default function BuyCreditsModal({ onClose, creditsNeeded }) {
  const { user: me } = useAuth();
  const animatedCredits = useCountUp(me?.worker_credits ?? 0);

  const handleSelect = (pkg) => {
    alert(`בקרוב: רכישת חבילת ${pkg.label} — ${pkg.credits + pkg.bonus} קרדיטים ב-₪${pkg.price}`);
  };

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(5,15,40,0.65)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(6px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        dir="rtl"
        style={{
          background: '#f4f7fb',
          borderRadius: '28px 28px 0 0',
          width: '100%',
          maxWidth: 480,
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 -16px 60px rgba(0,0,0,0.25)',
          paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 18px' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CreditIcon size={26} />
            </div>
            <div>
              <div style={{ fontSize: 19, fontWeight: 900, color: '#0f1e40', letterSpacing: -0.3 }}>רכישת קרדיטים</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                יתרה נוכחית: <span style={{ fontWeight: 700, color: '#1a6fd4', display: 'flex', alignItems: 'center', gap: 3 }}>{animatedCredits} <CreditIcon size={13} /></span>
              </div>
            </div>
            </div>

            {creditsNeeded && (
              <div style={{ marginTop: 12, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={14} color="#f97316" />
                <span style={{ fontSize: 13, color: '#c2410c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  כניסה למשימה <strong style={{ display: 'flex', alignItems: 'center', gap: 3 }}>{creditsNeeded} <CreditIcon size={14} /></strong>
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
        <div style={{ padding: '14px 14px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {PACKAGES.map((pkg) => {
            const totalCredits = pkg.credits + pkg.bonus;
            const pricePerCredit = (pkg.price / totalCredits).toFixed(2);

            return (
              <button
                key={pkg.id}
                onClick={() => handleSelect(pkg)}
                style={{
                  background: pkg.popular
                    ? '#1a6fd4'
                    : 'white',
                  border: pkg.popular ? 'none' : '1.5px solid #e5e9f5',
                  borderRadius: 16,
                  padding: '12px 12px',
                  textAlign: 'right',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: pkg.popular ? '0 4px 12px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.06)',
                  transition: 'transform 0.15s',
                }}
                onPointerDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
                onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
                onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {pkg.popular && (
                  <div style={{
                    position: 'absolute', top: -10, right: '50%', transform: 'translateX(50%)',
                    background: 'linear-gradient(90deg,#f59e0b,#fbbf24)',
                    color: '#7c2d00', fontWeight: 900, fontSize: 10,
                    padding: '3px 12px', borderRadius: 99,
                    whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(251,191,36,0.4)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <Star size={9} fill="currentColor" /> הכי פופולרית
                  </div>
                )}

                <div style={{ fontSize: 13, fontWeight: 800, color: pkg.popular ? 'white' : '#0f1e40', marginBottom: 2 }}>
                  {pkg.label}
                </div>

                <div style={{ fontSize: 22, fontWeight: 900, color: pkg.popular ? 'white' : '#0f1e40', letterSpacing: -0.5, lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {totalCredits}
                  <CreditIcon size={18} />
                </div>

                {pkg.bonus > 0 && (
                  <div style={{ fontSize: 10, color: pkg.popular ? 'rgba(255,255,255,0.75)' : '#16a34a', fontWeight: 700, marginTop: 2 }}>
                    +{pkg.bonus} מתנה 🎁
                  </div>
                )}

                <div style={{
                  marginTop: 8,
                  background: pkg.popular ? 'rgba(255,255,255,0.15)' : '#f4f7fb',
                  borderRadius: 10, padding: '6px 8px',
                }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: pkg.popular ? 'white' : '#0f2b6b' }}>
                    ₪{pkg.price.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 10, color: pkg.popular ? 'rgba(255,255,255,0.6)' : '#9ca3af', marginTop: 1 }}>
                    ₪{pricePerCredit} לקרדיט
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ padding: '14px 20px', textAlign: 'center', color: '#bbb', fontSize: 11 }}>
          🔒 קרדיטים = עבודה = רווחים
        </div>
      </div>
    </div>,
    document.body
  );
}