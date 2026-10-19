import CreditIcon from '@/components/CreditIcon';
import { packageValueLabel } from '@/lib/jobaBalance';
import { Star, Crown, Check } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * CreditPackageCard — large, readable, attractive package tile (2-column grid friendly).
 */
export default function CreditPackageCard({ pkg, selected, onSelect, isSubscription, priceLabel }) {
  const { t } = useLanguage();
  const isPopular = pkg.badge === 'popular';
  const isBest = pkg.badge === 'best';

  return (
    <button
      onClick={() => onSelect(pkg)}
      className="pkg-card"
      style={{
        position: 'relative',
        // Each package carries a soft tint of its own so four tiles never read
        // as four copies of one white card. The two recommended packages get a
        // stronger tint plus a coloured frame; the rest stay quiet.
        background: selected
          ? 'linear-gradient(150deg, var(--brand-primary), var(--brand-primary-dark))'
          : isPopular
            ? 'linear-gradient(160deg, var(--brand-primary-light), var(--surface-2))'
            : isBest
              ? 'linear-gradient(160deg, #f5f3ff, var(--surface-2))'
              : 'var(--surface-3)',
        border: selected
          ? 'none'
          : isPopular
            ? '1.5px solid var(--brand-primary)'
            : isBest
              ? '1.5px solid #c4b5fd'
              : '1px solid var(--border-1)',
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
      {/* Badge — a small quiet chip in the corner, not a full-width coloured
          band. The band plus the thick frame plus the tinted price plate were
          three competing emphases on one card; the chip marks the card without
          shouting over the two things that actually matter: credits and price. */}
      {(isPopular || isBest) && (
        <div style={{
          position: 'absolute', top: 7, right: 7,
          // A filled chip, still a chip: it reads at a glance and carries real
          // weight, without becoming the full-width colour band that used to
          // shout louder than the credits and the price.
          background: isBest ? '#7c3aed' : 'var(--brand-primary)',
          color: 'white',
          fontWeight: 900, fontSize: 10.5,
          padding: '3px 9px', borderRadius: 99,
          whiteSpace: 'nowrap',
          display: 'inline-flex', alignItems: 'center', gap: 3,
          zIndex: 10,
          letterSpacing: 0.2,
          boxShadow: isBest ? '0 3px 10px rgba(124,58,237,0.35)' : '0 3px 10px rgba(26,111,212,0.35)',
        }}>
          {isBest ? <Crown size={11} /> : <Star size={11} />}
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
        marginTop: isPopular || isBest ? 22 : 4,
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

      {/* Value label — supporting information, so it reads as supporting
          information: secondary text, not a green headline repeated four times
          that pulled the eye away from the credits and the price. */}
      <div style={{
        fontSize: 12, fontWeight: 700,
        color: selected ? 'rgba(255,255,255,0.85)' : 'var(--text-2)',
        marginTop: 5, lineHeight: 1.25, textAlign: 'center',
        padding: '0 2px',
      }}>
        {packageValueLabel(pkg.credits, t)}
      </div>

      {/* Price — the most important number on the card after the credits, so it
          stays large and bold. A hairline rule gives it an area of its own
          instead of the tinted plate that used to look like a second button. */}
      <div style={{
        marginTop: 'auto', width: '100%', paddingTop: 11,
        borderTop: `1px solid ${selected ? 'rgba(255,255,255,0.28)' : 'var(--border-1)'}`,
      }}>
        <div style={{
          fontSize: 20, fontWeight: 900,
          color: selected ? 'white' : 'var(--text-1)',
          letterSpacing: -0.3, lineHeight: 1.1,
        }}>
          {priceLabel === undefined ? `₪${pkg.price.toFixed(2)}` : (priceLabel || '…')}
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