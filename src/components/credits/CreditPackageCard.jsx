import CoinStack from '@/components/credits/CoinStack';
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
        // The top padding is the badge's own zone: every card reserves it, so
        // the credits, the label, the value line and the price all start at the
        // same height on all six cards whether they carry a badge or not.
        padding: '24px 10px 11px',
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
        gap: 3,
        textAlign: 'center',
        minHeight: 168,
        width: '100%',
      }}
    >
      {/* Badge — a small quiet chip in the corner, not a full-width coloured
          band. The band plus the thick frame plus the tinted price plate were
          three competing emphases on one card; the chip marks the card without
          shouting over the two things that actually matter: credits and price. */}
      {(isPopular || isBest) && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          // A filled chip, still a chip: it reads at a glance and carries real
          // weight, without becoming the full-width colour band that used to
          // shout louder than the credits and the price.
          //
          // On a SELECTED card the chip turns translucent white, because the
          // card is already solid brand blue — a blue chip on blue would vanish,
          // and the visitor could no longer tell "this is the one you picked"
          // apart from "this is the one we recommend".
          background: selected ? 'rgba(255,255,255,0.22)' : isBest ? '#7c3aed' : 'var(--brand-primary)',
          border: selected ? '1px solid rgba(255,255,255,0.5)' : 'none',
          color: 'white',
          fontWeight: 900, fontSize: 10.5,
          padding: '3px 9px', borderRadius: 99,
          whiteSpace: 'nowrap',
          display: 'inline-flex', alignItems: 'center', gap: 3,
          zIndex: 10,
          letterSpacing: 0.2,
          boxShadow: selected ? 'none' : isBest ? '0 3px 10px rgba(124,58,237,0.35)' : '0 3px 10px rgba(26,111,212,0.35)',
        }}>
          {isBest ? <Crown size={11} /> : <Star size={11} />}
          {isBest ? t('buy_best_value') : t('buy_popular_badge')}
        </div>
      )}

      {/* Selected checkmark — a solid white tick, so "the one I picked" is
          unmistakable against the recommended card's coloured frame and chip. */}
      {selected && (
        <div style={{
          position: 'absolute', top: 6, left: 6,
          width: 26, height: 26, borderRadius: '50%',
          background: '#ffffff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 11,
          boxShadow: '0 2px 8px rgba(0,0,0,0.22)',
        }}>
          <Check size={15} color="var(--brand-primary)" strokeWidth={3.5} />
        </div>
      )}

      {/* Credits — the number stays the loudest thing on the card, with the
          package's coin stack beside it. The row has a FIXED height, so the
          number, the label, the value line and the price line up on all six
          cards even though the stacks are different sizes. */}
      <div style={{
        height: 55, width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
      }}>
        <span style={{
          fontSize: 34, fontWeight: 900,
          color: selected ? 'white' : 'var(--text-1)',
          letterSpacing: -0.5, lineHeight: 1,
        }}>
          {pkg.credits}
        </span>
        <CoinStack coins={pkg.coins} />
      </div>

      {/* Label */}
      <div style={{
        fontSize: 11.5, fontWeight: 700,
        color: selected ? 'rgba(255,255,255,0.75)' : 'var(--text-3)',
      }}>
        {isSubscription ? t('buy_jobs_month') : t('buy_jobs_label')}
      </div>

      {/* Value label — supporting information, so it reads as supporting
          information: secondary text, not a green headline repeated four times
          that pulled the eye away from the credits and the price. */}
      <div style={{
        fontSize: 11.5, fontWeight: 700,
        color: selected ? 'rgba(255,255,255,0.85)' : 'var(--text-2)',
        marginTop: 2, lineHeight: 1.25, textAlign: 'center',
        padding: '0 2px',
      }}>
        {packageValueLabel(pkg.credits, t)}
      </div>

      {/* Price — the most important number on the card after the credits, so it
          stays large and bold. A hairline rule gives it an area of its own
          instead of the tinted plate that used to look like a second button. */}
      <div style={{
        marginTop: 'auto', width: '100%', paddingTop: 8,
        borderTop: `1px solid ${selected ? 'rgba(255,255,255,0.28)' : 'var(--border-1)'}`,
      }}>
        <div style={{
          fontSize: 19, fontWeight: 900,
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