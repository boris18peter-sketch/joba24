import { ChevronLeft, ChevronRight, History } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * The compact header of "משימות שפרסמתי" — and ONLY that screen.
 *
 * It replaces the three full-width status tabs with one title and one small
 * secondary button. The statuses themselves are untouched: the screen still
 * renders exactly the same 'active' / 'completed' / 'other' lists from the same
 * data, and this header only decides which of them is on screen. Nothing here
 * fetches, filters or changes a task.
 */
export default function PublishedTasksHeader({
  view = 'active',
  historyTab = 'completed',
  counts = {},
  showHistory = true,
  hideTitle = false,
  onOpenHistory,
  onBackToActive,
  onChangeHistoryTab,
}) {
  const { t, isRTL } = useLanguage();

  // Secondary, but never disabled-looking: a real surface, a visible border and
  // primary-weight text. The faint transparent version read as an unavailable
  // control rather than as the way into the history.
  const pill = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 34, minHeight: 'unset', padding: '0 13px', borderRadius: 999,
    background: 'var(--surface-2)', border: '1px solid var(--border-2)',
    color: 'var(--text-1)', fontSize: 12.5, fontWeight: 800,
    boxShadow: 'var(--shadow-xs)',
    cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
    transition: 'transform 0.12s ease, background 0.15s ease',
  };

  const segments = [
    { key: 'completed', label: t('completed'), count: counts.completed || 0 },
    { key: 'other', label: t('archive'), count: counts.archive || 0 },
  ];

  // Nothing to say on the empty screen: the banner is the hero there and it
  // already carries the headline, while the history link sits beneath the
  // publish button. An empty row would only push the hero down.
  if (view === 'active' && hideTitle && !showHistory) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      justifyContent: hideTitle ? 'flex-end' : 'space-between',
      marginTop: 6, marginBottom: hideTitle ? 8 : 14,
    }}>
      {view === 'active' ? (
        <>
          {/* With no active tasks the screen is the empty state, and the empty
              state carries its own headline — a second title above it would only
              repeat where the user already is. */}
          {!hideTitle && (
            <div style={{
              fontSize: 19, fontWeight: 900, letterSpacing: -0.4,
              color: 'var(--text-1)', whiteSpace: 'nowrap',
            }}>
              {t('mypub_header_title')}
            </div>
          )}
          {/* Only when there is a history to open — with no tasks at all the
              empty state below is the whole screen, and a button into two empty
              lists would be a dead end. */}
          {showHistory && (
            <button
              type="button"
              onClick={onOpenHistory}
              style={hideTitle ? { ...pill, height: 32, padding: '0 11px', fontSize: 12 } : pill}
            >
              <History size={hideTitle ? 13 : 14} strokeWidth={2.2} />
              {t('mypub_history')}
            </button>
          )}
        </>
      ) : (
        <>
          {/* The way back is the arrow alone — one tap, always in the same
              place, and it no longer repeats the screen's name beside the two
              status tabs it is sitting next to. */}
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
        </>
      )}
    </div>
  );
}