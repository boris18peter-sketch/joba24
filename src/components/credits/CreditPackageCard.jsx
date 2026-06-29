import CreditIcon from '@/components/CreditIcon';
import { Star, Crown, Check, TrendingDown } from 'lucide-react';

/**
 * CreditPackageCard — premium-style package tile.
 */
export default function CreditPackageCard({ pkg, selected, onSelect, isSubscription }) {
  const isPopular = pkg.badge === 'popular';
  const isBest = pkg.badge === 'best';
  const pricePerCredit = (pkg.price / pkg.credits).toFixed(2);

  return (
    <button
      onClick={() => onSelect(pkg)}
      className="pkg-card"
      style={{
        position: 'relative',
        background: selected
          ? 'linear-gradient(145deg, var(--brand-primary), var(--brand-primary-dark))'
          : isPopular || isBest
            ? 'linear-gradient(145deg, var(--surface-2), var(--surface-4))'
            : 'var(--surface-2)',
        border: selected
          ? 'none'
          : isPopular
            ? '2px solid var(--brand-primary)'
            : isBest
              ? '2px solid #a855f7'
              : '1.5px solid var(--border-1)',
        borderRadius: 'var(--r-xl)',
        padding: '22px 14px 14px',
        cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: selected
          ? '0 12px 36px rgba(26,111,212,0.4)'
          : isPopular || isBest
            ? 'var(--shadow-md)'
            : 'var(--shadow-xs)',
        transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        textAlign: 'center',
        minHeight: 176,
        width: '100%',
      }}
    >
      {/* Badge */}
      {(isPopular || isBest) && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          background: isBest
            ? 'linear-gradient(90deg, #7c3aed, #a855f7)'
            : 'linear-gradient(90deg, var(--brand-accent-dark), var(--brand-accent))',
          color: isBest ? 'white' : '#7c2d00',
          fontWeight: 900, fontSize: 10,
          padding: '5px 0',
          whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          zIndex: 10,
          letterSpacing: 0.3,
        }}>
          {isBest ? <Crown size={11} fill="currentColor" /> : <Star size={10} fill="currentColor" />}
          {isBest ? 'המשתלם ביותר' : 'פופולרי'}
        </div>
      )}

      {/* Selected checkmark */}
      {selected && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          width: 24, height: 24, borderRadius: '50%',
          background: 'rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 5,
        }}>
          <Check size={14} color="white" strokeWidth={3} />
        </div>
      )}

      {/* Credits count with glow */}
      <div style={{
        fontSize: 34, fontWeight: 900,
        color: selected ? 'white' : 'var(--text-1)',
        letterSpacing: -0.5, lineHeight: 1,
        display: 'flex', alignItems: 'center', gap: 6,
        marginTop: isPopular || isBest ? 14 : 8,
        textShadow: selected ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
      }}>
        {pkg.credits}
        <CreditIcon size={22} />
      </div>

      {/* Label */}
      <div style={{
        fontSize: 11, fontWeight: 700,
        color: selected ? 'rgba(255,255,255,0.7)' : 'var(--text-3)',
      }}>
        {isSubscription ? 'קרדיטים לחודש' : 'קרדיטים'}
      </div>

      {/* Price-per-credit value indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 3,
        fontSize: 10, fontWeight: 700,
        color: selected ? 'rgba(255,255,255,0.6)' : 'var(--color-success)',
        marginTop: 2,
        background: selected ? 'rgba(255,255,255,0.1)' : 'var(--color-success-bg)',
        padding: '2px 8px', borderRadius: 99,
      }}>
        <TrendingDown size={10} />
        ₪{pricePerCredit} לקרדיט
      </div>

      {/* Price */}
      <div style={{
        marginTop: 'auto', width: '100%',
        background: selected
          ? 'rgba(255,255,255,0.15)'
          : isPopular || isBest
            ? 'var(--brand-primary-light)'
            : 'var(--surface-3)',
        borderRadius: 'var(--r-sm)', padding: '9px 6px',
        transition: 'background 0.15s',
      }}>
        <div style={{
          fontSize: 20, fontWeight: 900,
          color: selected ? 'white' : 'var(--brand-primary-dark)',
          letterSpacing: -0.3,
        }}>
          ₪{pkg.price.toFixed(2)}
        </div>
        {isSubscription && (
          <div style={{
            fontSize: 9, fontWeight: 700,
            color: selected ? 'rgba(255,255,255,0.55)' : 'var(--text-3)',
            marginTop: 1,
          }}>
            לחודש
          </div>
        )}
      </div>
    </button>
  );
}