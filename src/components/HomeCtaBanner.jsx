import { useLanguage } from '@/lib/LanguageContext';

/**
 * HomeCtaBanner — unified call-to-action used across the home feed AND profile.
 * One brand color per purpose (green = verify, gold = social, blue = profile),
 * identical layout for all three so the UI stays cohesive and minimal.
 * Official badge icons: verify = green-check badge, social = gold-check badge,
 * profile completion = clock (waiting). No chevron — clean and action-focused.
 */
const THEMES = {
  green: { gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)', glow: 'rgba(5,150,105,0.28)' },
  gold:  { gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', glow: 'rgba(217,119,6,0.30)' },
  blue:  { gradient: 'linear-gradient(135deg, #1a6fd4 0%, #0a52b0 100%)', glow: 'rgba(26,111,212,0.28)' },
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

function BannerIcon({ iconType, icon: Icon }) {
  // Official badge style (green/gold gradient circle + white check) on a white container
  if (iconType === 'verify' || iconType === 'social') {
    return (
      <div style={{
        width: 42, height: 42, borderRadius: '50%',
        background: 'rgba(255,255,255,0.97)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: BADGE_GRADIENTS[iconType === 'verify' ? 'green' : 'gold'],
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CheckSvg size={16} />
        </div>
      </div>
    );
  }
  // Lucide icon (e.g. Clock for profile completion) on a translucent white container
  return (
    <div style={{
      width: 42, height: 42, borderRadius: '50%',
      background: 'rgba(255,255,255,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {Icon && <Icon size={20} color="white" strokeWidth={2} />}
    </div>
  );
}

export default function HomeCtaBanner({ theme = 'green', iconType, icon: Icon, label, sublabel, onClick, id }) {
  const { isRTL } = useLanguage();
  const t = THEMES[theme] || THEMES.green;
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
        background: t.gradient,
        borderRadius: 14,
        padding: '12px 14px',
        boxShadow: `0 3px 14px ${t.glow}`,
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <BannerIcon iconType={iconType} icon={Icon} />
      <div style={{ flex: 1, minWidth: 0, color: 'white', textAlign: 'start' }}>
        <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.3 }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.85)', fontWeight: 500, marginTop: 2, lineHeight: 1.35 }}>
            {sublabel}
          </div>
        )}
      </div>
    </button>
  );
}