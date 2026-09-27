import { ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * A compact reminder of the task this conversation is about.
 * It sits at the top of the message list and scrolls away with the history —
 * deliberately not a banner, just enough context to keep the thread anchored.
 */
export default function TaskContextCard({ task, isRTL, t, onOpen }) {
  const price = task.price ?? task.base_price;
  const place = task.city || task.location_name;
  const meta = [price ? `₪${price}` : null, place].filter(Boolean).join(' · ');
  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  return (
    <button
      onClick={onOpen}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '10px 12px', marginBottom: 14, cursor: 'pointer', textAlign: 'start',
        borderRadius: 14, minHeight: 0,
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

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{task.title}</div>
        {meta && (
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 1 }}>{meta}</div>
        )}
      </div>

      <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 700, color: '#1a6fd4', flexShrink: 0 }}>
        {t('chat_view_task')}
        <Chevron size={14} />
      </span>
    </button>
  );
}