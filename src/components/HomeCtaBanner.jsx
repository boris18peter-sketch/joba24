import { useLanguage } from '@/lib/LanguageContext';
import GoldCheckBadge from '@/components/GoldCheckBadge';

/**
 * HomeCtaBanner — the one call-to-action card used across the feed AND the
 * profile (verify / gold social check / profile completion).
 *
 * ── ONE NEUTRAL CARD, ONE COLOURED MARK ─────────────────────────────────────
 * It used to be a full-bleed colour block: a saturated green, gold or blue
 * rectangle sitting on top of the feed. Three of them stacked read as three
 * competing advertisements, and on a light screen they shouted louder than the
 * tasks the screen exists for.
 *
 * The card is now the app's OWN surface — the same background, hairline border
 * and soft shadow as every other card — and the only coloured thing on it is
 * the mark inside: the green check, the gold check, or the profile gift. That
 * keeps each banner recognisable at a glance while it belongs to the interface
 * instead of sitting on top of it. Because every banner in the app renders
 * through this component, they all change together and stay identical wherever
 * they appear.
 */
const THEMES = {
  green: { tint: 'rgba(22,163,74,0.12)', color: '#16a34a' },
  gold:  { tint: 'rgba(245,158,11,0.16)', color: '#d97706' },
  blue:  { tint: 'var(--brand-primary-light)', color: 'var(--brand-primary)' },
};

const BADGE_GRADIENTS = {
  green: 'linear-gradient(135deg,#16a34a,#059669)',
  gold:  'linear-gradient(135deg,#fbbf24,#d97706)',
};

const CheckSvg = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="none">
    <path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function BannerIcon({ iconType, icon: Icon, theme }) {
  const t = THEMES[theme] || THEMES.green;
  // The gold mark is the SHARED component — the connect sheet draws the same
  // one, so the badge the user is promised here is the badge they receive
  // inside the sheet. Only the green (KYC) mark is drawn locally.
  return (
    <div style={{
      width: 42, height: 42, borderRadius: '50%',
      background: t.tint,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {iconType === 'social' && <GoldCheckBadge size={28} />}
      {iconType === 'verify' && (
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: BADGE_GRADIENTS.green,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CheckSvg size={15} />
        </div>
      )}
      {!iconType && Icon && <Icon size={20} color={t.color} strokeWidth={2} />}
    </div>
  );
}

export default function HomeCtaBanner({ theme = 'green', iconType, icon: Icon, label, sublabel, onClick, id }) {
  const { isRTL } = useLanguage();
  return (
    <button
      id={id}
      onClick={onClick}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        all: 'unset',
        cursor: 'pointer',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'var(--surface-2)',
        border: '1px solid var(--border-1)',
        borderRadius: 14,
        padding: '12px 14px',
        boxShadow: 'var(--shadow-xs)',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <BannerIcon iconType={iconType} icon={Icon} theme={theme} />
      <div style={{ flex: 1, minWidth: 0, textAlign: 'start' }}>
        <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.3, color: 'var(--text-1)' }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: 11.5, color: 'var(--text-2)', fontWeight: 500, marginTop: 2, lineHeight: 1.35 }}>
            {sublabel}
          </div>
        )}
      </div>
    </button>
  );
}