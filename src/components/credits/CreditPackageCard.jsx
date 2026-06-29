import CreditIcon from '@/components/CreditIcon';
import { Star, Crown, Check } from 'lucide-react';

/**
 * CreditPackageCard — a single credit package tile.
 * Props:
 *   pkg: { id, credits, price, popular, badge, icon }
 *   selected: boolean
 *   onSelect: (pkg) => void
 *   isSubscription: boolean
 */
export default function CreditPackageCard({ pkg, selected, onSelect, isSubscription }) {
  const isPopular = pkg.badge === 'popular';
  const isBest = pkg.badge === 'best';

  return (
    <button
      onClick={() => onSelect(pkg)}
      className="pkg-card"
      style={{
        position: 'relative',
        background: selected
          ? 'linear-gradient(145deg, var(--brand-primary), var(--brand-primary-dark))'
          : 'var(--surface-2)',
        border: selected
          ? 'none'
          : isPopular
            ? '2px solid var(--brand-primary)'
            : '1.5px solid var(--border-1)',
        borderRadius: 'var(--r-lg)',
        padding: '18px 14px 16px',
        cursor: 'pointer',
        overflow: 'visible',
        boxShadow: selected
          ? '0 8px 28px rgba(26,111,212,0.35)'
          : isPopular
            ? 'var(--shadow-sm)'
            : 'var(--shadow-xs)',
        transition: 'all 0.18s cubic-bezier(0.16,1,0.3,1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        textAlign: 'center',
        minHeight: 150,
      }}
    >
      {/* Badge */}
      {(isPopular || isBest) && (
        <div style={{
          position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
          background: isBest
            ? 'linear-gradient(90deg, #7c3aed, #a855f7)'
            : 'linear-gradient(90deg, var(--brand-accent-dark), var(--brand-accent))',
          color: isBest ? 'white' : '#7c2d00',
          fontWeight: 900, fontSize: 10,
          padding: '4px 14px', borderRadius: 99,
          whiteSpace: 'nowrap',
          boxShadow: isBest
            ? '0 2px 10px rgba(124,58,237,0.4)'
            : '0 2px 8px rgba(251,191,36,0.4)',
          display: 'flex', alignItems: 'center', gap: 4,
          zIndex: 10,
        }}>
          {isBest ? <Crown size={10} fill="currentColor" /> : <Star size={9} fill="currentColor" />}
          {isBest ? 'המשתלם ביותר' : 'פופולרי'}
        </div>
      )}

      {/* Selected checkmark */}
      {selected && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          width: 22, height: 22, borderRadius: '50%',
          background: 'rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={13} color="white" strokeWidth={3} />
        </div>
      )}

      {/* Credits count */}
      <div style={{
        fontSize: 28, fontWeight: 900,
        color: selected ? 'white' : 'var(--text-1)',
        letterSpacing: -0.5, lineHeight: 1,
        display: 'flex', alignItems: 'center', gap: 5,
        marginTop: 4,
      }}>
        {pkg.credits}
        <CreditIcon size={18} />
      </div>

      {/* Label */}
      <div style={{
        fontSize: 11, fontWeight: 700,
        color: selected ? 'rgba(255,255,255,0.7)' : 'var(--text-3)',
      }}>
        {isSubscription ? 'קרדיטים לחודש' : 'קרדיטים'}
      </div>

      {/* Price */}
      <div style={{
        marginTop: 'auto', width: '100%',
        background: selected
          ? 'rgba(255,255,255,0.12)'
          : 'var(--surface-3)',
        borderRadius: 'var(--r-sm)', padding: '8px 6px',
      }}>
        <div style={{
          fontSize: 19, fontWeight: 900,
          color: selected ? 'white' : 'var(--brand-primary-dark)',
        }}>
          ₪{pkg.price.toFixed(2)}
        </div>
        {isSubscription && (
          <div style={{
            fontSize: 9, fontWeight: 600,
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