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

  const pill = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 36, minHeight: 'unset', padding: '0 13px', borderRadius: 999,
    background: 'var(--surface-2)', border: '1px solid var(--border-1)',
    color: 'var(--text-2)', fontSize: 12.5, fontWeight: 800,
    cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
    transition: 'transform 0.12s ease, background 0.15s ease',
  };

  const segments = [
    { key: 'completed', label: t('completed'), count: counts.completed || 0 },
    { key: 'other', label: t('archive'), count: counts.archive || 0 },
  ];

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
              style={hideTitle ? { ...pill, height: 32, fontSize: 12, background: 'transparent', color: 'var(--text-3)' } : pill}
            >
              <History size={hideTitle ? 13 : 14} strokeWidth={2.2} />
              {t('mypub_history')}
            </button>
          )}
        </>
      ) : (
        <>
          {/* The way back is the title itself — one tap, always in the same place */}
          <button
            type="button"
            onClick={onBackToActive}
            style={{
              ...pill,
              color: 'var(--brand-primary)',
              background: 'var(--brand-primary-light)',
              borderColor: 'var(--border-2)',
            }}
          >
            {isRTL ? <ChevronRight size={15} strokeWidth={2.6} /> : <ChevronLeft size={15} strokeWidth={2.6} />}
            {t('mypub_header_title')}
          </button>

          {/* The two history views the tabs used to hold */}
          <div style={{
            display: 'flex', gap: 4, padding: 3, borderRadius: 999,
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
                    height: 32, minHeight: 'unset', minWidth: 'unset', padding: '0 11px',
                    borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
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