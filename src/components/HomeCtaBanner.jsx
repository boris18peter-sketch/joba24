import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * HomeCtaBanner — unified, single-line call-to-action used across the home feed.
 * One brand color per purpose (green = verify, gold = social, blue = profile),
 * identical layout for all three so the feed stays cohesive and minimal.
 * Replaces the previous large rotating multi-block banners.
 */
const THEMES = {
  green: {
    gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    glow: 'rgba(5,150,105,0.28)',
  },
  gold: {
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    glow: 'rgba(217,119,6,0.30)',
  },
  blue: {
    gradient: 'linear-gradient(135deg, #1a6fd4 0%, #0a52b0 100%)',
    glow: 'rgba(26,111,212,0.28)',
  },
};

export default function HomeCtaBanner({ theme = 'green', icon: Icon, label, onClick, id }) {
  const { isRTL } = useLanguage();
  const t = THEMES[theme] || THEMES.green;
  const Arrow = isRTL ? ChevronLeft : ChevronLeft; // chevron points outward to the start side
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
      {Icon && (
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={20} color="white" strokeWidth={2} />
        </div>
      )}
      <div style={{ flex: 1, color: 'white', fontWeight: 800, fontSize: 14, lineHeight: 1.3, textAlign: 'start' }}>
        {label}
      </div>
      <Arrow size={18} color="rgba(255,255,255,0.85)" strokeWidth={2.4} style={{ flexShrink: 0, transform: isRTL ? 'rotate(180deg)' : 'none' }} />
    </button>
  );
}