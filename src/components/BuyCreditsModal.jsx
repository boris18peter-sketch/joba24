import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const PACKAGES = [
  { id: 'starter',    credits: 15,   bonus: 0,   price: 9.90,   popular: false, bestOffer: false },
  { id: 'basic',      credits: 40,   bonus: 0,   price: 24.90,  popular: false, bestOffer: false },
  { id: 'popular',    credits: 100,  bonus: 15,  price: 49.90,  popular: true,  bestOffer: false },
  { id: 'contractor', credits: 250,  bonus: 50,  price: 99.90,  popular: false, bestOffer: false },
  { id: 'pro',        credits: 600,  bonus: 150, price: 199.90, popular: false, bestOffer: false },
  { id: 'boss',       credits: 1600, bonus: 400, price: 449.90, popular: false, bestOffer: true  },
];

export default function BuyCreditsModal({ onClose, creditsNeeded }) {
  const { user: me } = useAuth();

  const handleSelect = (pkg) => {
    alert(`בקרוב: רכישת ${pkg.credits + pkg.bonus} קרדיטים ב-₪${pkg.price}`);
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
          background: '#f0e8d8',
          borderRadius: '28px 28px 0 0',
          width: '100%',
          maxWidth: 480,
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 -16px 60px rgba(0,0,0,0.3)',
          paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'rgba(0,0,0,0.15)', margin: '14px auto 0' }} />

        {/* Header */}
        <div style={{ padding: '14px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#3d2000', letterSpacing: -0.3 }}>
              🪙 חנות קרדיטים
            </div>
            <div style={{ fontSize: 12, color: '#7c5533', marginTop: 2, fontWeight: 600 }}>
              יתרה נוכחית: <span style={{ color: '#b45309', fontWeight: 900 }}>{me?.worker_credits ?? 0} קרדיטים</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(0,0,0,0.12)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={15} color="#7c5533" />
          </button>
        </div>

        {creditsNeeded && (
          <div style={{ margin: '10px 18px 0', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#c2410c', fontWeight: 600 }}>
            ⚡ נדרשים <strong>{creditsNeeded} קרדיטים</strong> להגשת הבקשה
          </div>
        )}

        {/* Packages grid */}
        <div style={{ padding: '12px 14px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {PACKAGES.map((pkg) => {
            const totalCredits = pkg.credits + pkg.bonus;
            const bonusPct = pkg.bonus > 0 ? Math.round((pkg.bonus / pkg.credits) * 100) : 0;

            return (
              <button
                key={pkg.id}
                onClick={() => handleSelect(pkg)}
                style={{
                  background: pkg.popular
                    ? 'linear-gradient(160deg, #8b5cf6, #6d28d9)'
                    : pkg.bestOffer
                    ? 'linear-gradient(160deg, #dc2626, #991b1b)'
                    : 'linear-gradient(160deg, #a16207, #78350f)',
                  border: 'none',
                  borderRadius: 16,
                  padding: '10px 8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
                  transition: 'transform 0.15s',
                  overflow: 'visible',
                }}
                onPointerDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
                onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {/* Popular / Best Offer ribbon */}
                {(pkg.popular || pkg.bestOffer) && (
                  <div style={{
                    position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
                    background: pkg.popular ? 'linear-gradient(90deg,#ec4899,#db2777)' : 'linear-gradient(90deg,#f59e0b,#d97706)',
                    color: 'white', fontWeight: 900, fontSize: 9,
                    padding: '3px 10px', borderRadius: 99,
                    whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    zIndex: 2,
                  }}>
                    {pkg.popular ? '⭐ פופולרי' : '🏆 הכי משתלם'}
                  </div>
                )}

                {/* Credits count — big game-style number */}
                <div style={{
                  fontSize: totalCredits >= 1000 ? 22 : 26,
                  fontWeight: 900,
                  color: '#fde68a',
                  textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  lineHeight: 1.1,
                  letterSpacing: -1,
                  marginTop: pkg.popular || pkg.bestOffer ? 8 : 4,
                }}>
                  {totalCredits.toLocaleString()}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,220,100,0.8)', fontWeight: 700, marginBottom: 6 }}>קרדיטים</div>

                {/* Bonus badge */}
                {bonusPct > 0 && (
                  <div style={{ fontSize: 9, color: '#86efac', fontWeight: 800, marginBottom: 4 }}>
                    +{bonusPct}% בונוס
                  </div>
                )}

                {/* Price bar */}
                <div style={{
                  background: '#4ade80',
                  borderRadius: 8,
                  padding: '5px 6px',
                  marginTop: 4,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#14532d' }}>
                    ₪{pkg.price.toFixed(2)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ padding: '12px 18px', textAlign: 'center', color: '#92400e', fontSize: 12, fontWeight: 700 }}>
          🪙 קרדיטים = עבודה = רווחים
        </div>
      </div>
    </div>,
    document.body
  );
}