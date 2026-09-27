import { ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * A compact reminder of the task this conversation is about.
 * It sits at the top of the message list and scrolls away with the history —
 * deliberately not a banner, just enough context to keep the thread anchored.
 *
 * Deliberately a single, unbreakable row (icon · text · chevron) so it can
 * never wrap into a cramped two-line block on a narrow screen.
 */
export default function TaskContextCard({ task, isRTL, t, onOpen }) {
  const price = task.price ?? task.base_price;
  const place = task.city || task.location_name;
  const meta = [price ? `₪${price}` : null, place].filter(Boolean).join(' · ');
  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t('chat_view_task')}
      style={{
        display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 10,
        width: '100%', boxSizing: 'border-box',
        padding: '10px 12px', marginBottom: 14, cursor: 'pointer', textAlign: 'start',
        borderRadius: 14, minHeight: 'unset', minWidth: 'unset',
        background: 'var(--surface-2)', border: '1px solid var(--border-1)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 11, flexShrink: 0,
        background: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <ClipboardList size={17} color="#1a6fd4" />
      </div>

      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div style={{
          fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{task.title}</div>
        {meta && (
          <div style={{
            fontSize: 11.5, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.3,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{meta}</div>
        )}
      </div>

      <span style={{
        width: 26, height: 26, borderRadius: 9, flexShrink: 0,
        background: 'var(--brand-primary-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Chevron size={15} color="#1a6fd4" />
      </span>
    </button>
  );
}