import { MapPin, Send } from 'lucide-react';
import { DEMO_TASKS } from '@/lib/storekit/demoData';

/**
 * The small UI preview inside each journey box on the welcome screen.
 *
 * A magnified card in the same shape as the live task card — real task content,
 * real prices, real cities, real design tokens. Crisp at any size, unlike a
 * screenshot shrunk into a box, and it shows the point of each journey at a
 * glance: a posted task collecting candidates, or a task you can apply to.
 */
const CARD = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border-1)',
  borderRadius: 16,
  padding: '13px 14px',
  boxShadow: 'var(--shadow-sm)',
};

const TITLE = {
  fontSize: 13.5,
  fontWeight: 900,
  color: 'var(--text-1)',
  lineHeight: 1.3,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const PRICE = {
  fontSize: 16,
  fontWeight: 900,
  color: 'var(--text-1)',
  letterSpacing: -0.4,
  flexShrink: 0,
};

const AVATAR_TONES = ['#1a6fd4', '#0a52b0', '#fbbf24'];

function Avatar({ label, tone, index }) {
  return (
    <span
      style={{
        width: 26,
        height: 26,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 900,
        color: '#ffffff',
        background: tone,
        border: '2px solid var(--surface-2)',
        marginInlineStart: index === 0 ? 0 : -9,
      }}
    >
      {label}
    </span>
  );
}

export default function TrackBoxArt({ track }) {
  const publish = track === 'publish';
  const task = publish ? DEMO_TASKS[0] : DEMO_TASKS[1];

  return (
    <div style={CARD}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={TITLE}>{task.title}</span>
        <span style={PRICE}>₪{task.price}</span>
      </div>

      {publish ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {['ד', 'י', 'א'].map((label, i) => (
              <Avatar key={label} label={label} tone={AVATAR_TONES[i]} index={i} />
            ))}
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-1)' }}>3 מועמדים</span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700, color: 'var(--text-2)' }}>
            <MapPin size={12} />
            {task.city}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: 'var(--brand-primary)',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 900,
              padding: '6px 12px',
              borderRadius: 999,
            }}
          >
            <Send size={12} />
            הגש מועמדות
          </span>
        </div>
      )}
    </div>
  );
}