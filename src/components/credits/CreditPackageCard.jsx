import CreditIcon from '@/components/CreditIcon';
import { Star, Crown, Check, TrendingDown } from 'lucide-react';

/**
 * CreditPackageCard — compact package tile (3-column grid friendly).
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
        borderRadius: 'var(--r-lg)',
        padding: '14px 6px 8px',
        cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: selected
          ? '0 8px 24px rgba(26,111,212,0.35)'
          : isPopular || isBest
            ? 'var(--shadow-sm)'
            : 'var(--shadow-xs)',
        transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        textAlign: 'center',
        minHeight: 124,
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
          fontWeight: 900, fontSize: 9,
          padding: '3px 0',
          whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
          zIndex: 10,
        }}>
          {isBest ? <Crown size={9} fill="currentColor" /> : <Star size={9} fill="currentColor" />}
          {isBest ? 'הכי משתלם' : 'פופולרי'}
        </div>
      )}

      {/* Selected checkmark */}
      {selected && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          width: 20, height: 20, borderRadius: '50%',
          background: 'rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 5,
        }}>
          <Check size={12} color="white" strokeWidth={3} />
        </div>
      )}

      {/* Credits count */}
      <div style={{
        fontSize: 24, fontWeight: 900,
        color: selected ? 'white' : 'var(--text-1)',
        letterSpacing: -0.5, lineHeight: 1,
        display: 'flex', alignItems: 'center', gap: 4,
        marginTop: isPopular || isBest ? 10 : 4,
      }}>
        {pkg.credits}
        <CreditIcon size={16} />
      </div>

      {/* Label */}
      <div style={{
        fontSize: 9, fontWeight: 700,
        color: selected ? 'rgba(255,255,255,0.7)' : 'var(--text-3)',
      }}>
        {isSubscription ? 'לחודש' : 'קרדיטים'}
      </div>

      {/* Price-per-credit */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2,
        fontSize: 8, fontWeight: 700,
        color: selected ? 'rgba(255,255,255,0.6)' : 'var(--color-success)',
        marginTop: 1,
        background: selected ? 'rgba(255,255,255,0.1)' : 'var(--color-success-bg)',
        padding: '1px 5px', borderRadius: 99,
      }}>
        <TrendingDown size={9} />
        ₪{pricePerCredit}
      </div>

      {/* Price */}
      <div style={{
        marginTop: 'auto', width: '100%',
        background: selected
          ? 'rgba(255,255,255,0.15)'
          : isPopular || isBest
            ? 'var(--brand-primary-light)'
            : 'var(--surface-3)',
        borderRadius: 'var(--r-xs)', padding: '5px 4px',
      }}>
        <div style={{
          fontSize: 15, fontWeight: 900,
          color: selected ? 'white' : 'var(--brand-primary-dark)',
          letterSpacing: -0.3,
        }}>
          ₪{pkg.price.toFixed(2)}
        </div>
        {isSubscription && (
          <div style={{
            fontSize: 8, fontWeight: 700,
            color: selected ? 'rgba(255,255,255,0.55)' : 'var(--text-3)',
          }}>
            /חודש
          </div>
        )}
      </div>
    </button>
  );
}