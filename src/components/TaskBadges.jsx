/**
 * TaskBadges — renders smart feed signal badges on task cards
 */
export default function TaskBadges({ badges = {}, score }) {
  const { isUrgent, isNew, isFunded, isNearby, isHighPay, isVerifiedClient, isLowComp } = badges;

  const items = [];

  if (isUrgent) items.push({
    label: '🔥 דחוף',
    bg: 'linear-gradient(135deg,#ef4444,#dc2626)',
    color: 'white',
  });
  if (isNew) items.push({
    label: '✨ חדש',
    bg: 'linear-gradient(135deg,#10b981,#059669)',
    color: 'white',
  });
  if (isFunded) items.push({
    label: '💳 ממומן',
    bg: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
    color: 'white',
  });
  if (isNearby) items.push({
    label: '📍 קרוב',
    bg: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
    color: 'white',
  });
  if (isHighPay) items.push({
    label: '💰 שכר גבוה',
    bg: 'linear-gradient(135deg,#f59e0b,#d97706)',
    color: 'white',
  });
  if (isVerifiedClient) items.push({
    label: '✓ לקוח מאומת',
    bg: 'linear-gradient(135deg,#16a34a,#15803d)',
    color: 'white',
  });
  if (isLowComp && !isNew) items.push({
    label: '⚡ אין מגישים',
    bg: '#eff6ff',
    color: '#1a6fd4',
    border: '1px solid #bfdbfe',
  });

  if (items.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 5 }}>
      {items.slice(0, 3).map((item, i) => (
        <span
          key={i}
          style={{
            fontSize: 9,
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: 20,
            background: item.bg,
            color: item.color,
            border: item.border || 'none',
            letterSpacing: 0.2,
            lineHeight: 1.6,
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}