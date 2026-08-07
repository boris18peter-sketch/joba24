import CreditIcon from '@/components/CreditIcon';
import { packageValueLabel } from '@/lib/jobaBalance';
import { Star, Crown, Check } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * CreditPackageCard — large, readable, attractive package tile (2-column grid friendly).
 */
export default function CreditPackageCard({ pkg, selected, onSelect, isSubscription }) {
  const { t } = useLanguage();
  const isPopular = pkg.badge === 'popular';
  const isBest = pkg.badge === 'best';

  return (
    <button
      onClick={() => onSelect(pkg)}
      className="pkg-card"
      style={{
        position: 'relative',
        background: selected
          ? 'linear-gradient(150deg, var(--brand-primary), var(--brand-primary-dark))'
          : isPopular || isBest
            ? 'linear-gradient(150deg, var(--surface-2), var(--surface-4))'
            : 'var(--surface-2)',
        border: selected
          ? 'none'
          : isPopular
            ? '2px solid var(--brand-primary)'
            : isBest
              ? '2px solid #a855f7'
              : '1.5px solid var(--border-1)',
        borderRadius: 'var(--r-xl)',
        padding: '18px 12px 14px',
        cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: selected
          ? '0 10px 28px rgba(26,111,212,0.38)'
          : isPopular || isBest
            ? 'var(--shadow-sm)'
            : 'var(--shadow-xs)',
        transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        textAlign: 'center',
        minHeight: 188,
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
          fontWeight: 900, fontSize: 11,
          padding: '5px 0',
          whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          zIndex: 10,
          letterSpacing: 0.2,
        }}>
          {isBest ? <Crown size={12} fill="currentColor" /> : <Star size={12} fill="currentColor" />}
          {isBest ? t('buy_best_value') : t('buy_popular_badge')}
        </div>
      )}

      {/* Selected checkmark */}
      {selected && (
        <div style={{
          position: 'absolute', top: 8, left: 8,
          width: 24, height: 24, borderRadius: '50%',
          background: 'rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 5,
        }}>
          <Check size={14} color="white" strokeWidth={3} />
        </div>
      )}

      {/* Credits count */}
      <div style={{
        fontSize: 34, fontWeight: 900,
        color: selected ? 'white' : 'var(--text-1)',
        letterSpacing: -0.5, lineHeight: 1,
        display: 'flex', alignItems: 'center', gap: 6,
        marginTop: isPopular || isBest ? 14 : 4,
      }}>
        {pkg.credits}
        <CreditIcon size={22} />
      </div>

      {/* Label */}
      <div style={{
        fontSize: 12, fontWeight: 700,
        color: selected ? 'rgba(255,255,255,0.75)' : 'var(--text-3)',
        marginTop: 2,
      }}>
        {isSubscription ? t('buy_jobs_month') : t('buy_jobs_label')}
      </div>

      {/* Value label — sharp, single line */}
      <div style={{
        fontSize: 12, fontWeight: 800,
        color: selected ? 'rgba(255,255,255,0.95)' : 'var(--color-success)',
        marginTop: 5, lineHeight: 1.25, textAlign: 'center',
        padding: '0 2px',
      }}>
        {packageValueLabel(pkg.credits)}
      </div>

      {/* Price */}
      <div style={{
        marginTop: 'auto', width: '100%',
        background: selected
          ? 'rgba(255,255,255,0.15)'
          : isPopular || isBest
            ? 'var(--brand-primary-light)'
            : 'var(--surface-3)',
        borderRadius: 'var(--r-sm)', padding: '8px 6px',
      }}>
        <div style={{
          fontSize: 20, fontWeight: 900,
          color: selected ? 'white' : 'var(--brand-primary-dark)',
          letterSpacing: -0.3, lineHeight: 1.1,
        }}>
          ₪{pkg.price.toFixed(2)}
        </div>
        {isSubscription && (
          <div style={{
            fontSize: 10, fontWeight: 700,
            color: selected ? 'rgba(255,255,255,0.6)' : 'var(--text-3)',
            marginTop: 1,
          }}>
            {t('buy_per_month')}
          </div>
        )}
      </div>
    </button>
  );
}