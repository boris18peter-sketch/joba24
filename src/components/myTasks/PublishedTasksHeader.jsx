import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * The history bar of "משימות שפרסמתי" — and ONLY the history view.
 *
 * It used to also draw a title and a history pill above the ACTIVE list. That is
 * gone: the way into the history is now the icon sitting right beside the tab it
 * belongs to (see HomeFeed), and the title only repeated the tab's own label. What
 * is left is the bar you see once you are inside the history: the way back, and
 * the two views the tabs used to hold.
 *
 * ── IT STICKS ──────────────────────────────────────────────────────────────
 * Scrolling a long history left the two views — and the way back — off the top of
 * the screen, so switching between "הושלמו" and "ארכיון" meant scrolling up
 * first. The bar now sticks directly under the app's sticky tab strip (which owns
 * the first 50px), so it stays where the eye already is.
 */
export default function PublishedTasksHeader({
  view = 'active',
  historyTab = 'completed',
  counts = {},
  onBackToActive,
  onChangeHistoryTab,
}) {
  const { t, isRTL } = useLanguage();

  const segments = [
    { key: 'completed', label: t('completed'), count: counts.completed || 0 },
    { key: 'other', label: t('archive'), count: counts.archive || 0 },
  ];

  // The active screen needs no bar of its own any more.
  if (view !== 'history') return null;

  return (
    <div style={{
      // Straight under the segmented tabs: same offset the feed's own sticky
      // search field uses, so the two can never overlap.
      position: 'sticky', top: 49, zIndex: 49,
      display: 'flex', alignItems: 'center', gap: 8,
      // Bled to the screen edges, so cards scroll UNDER it instead of beside it.
      margin: '-12px -16px 10px', padding: '8px 16px',
      background: 'var(--surface-1)',
    }}>
      {/* The way back is the arrow alone — one tap, always in the same place. */}
      <button
        type="button"
        onClick={onBackToActive}
        aria-label="חזרה"
        style={{
          width: 36, height: 36, minWidth: 'unset', minHeight: 'unset',
          flexShrink: 0, borderRadius: 999, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--brand-primary-light)',
          border: '1px solid var(--border-2)',
          color: 'var(--brand-primary)',
        }}
      >
        {isRTL ? <ChevronRight size={18} strokeWidth={2.8} /> : <ChevronLeft size={18} strokeWidth={2.8} />}
      </button>

      {/* The two history views the tabs used to hold */}
      <div style={{
        display: 'flex', flex: 1, gap: 4, padding: 3, borderRadius: 999,
        background: 'var(--surface-3)', border: '1px solid var(--border-1)',
      }}>
        {segments.map((s) => {
          const on = historyTab === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onChangeHistoryTab(s.key)}
              style={{
                flex: 1, height: 32, minHeight: 'unset', minWidth: 'unset', padding: '0 9px',
                borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                fontSize: 12.5, fontWeight: 800, whiteSpace: 'nowrap',
                background: on ? 'var(--surface-2)' : 'transparent',
                color: on ? 'var(--text-1)' : 'var(--text-3)',
                boxShadow: on ? 'var(--shadow-xs)' : 'none',
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
            >
              {s.label}
              {s.count > 0 && (
                <span style={{
                  fontSize: 10.5, fontWeight: 900,
                  color: on ? 'var(--brand-primary)' : 'var(--text-3)',
                }}>
                  {s.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}