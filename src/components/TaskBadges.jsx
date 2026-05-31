/**
 * TaskBadges — clean, minimal signal badges (max 2 shown)
 * Urgency is handled separately in the card header — not shown here.
 */
export default function TaskBadges({ badges = {} }) {
  const { isNew, isFunded, isNearby, isHighPay, isVerifiedClient, isLowComp } = badges;

  const items = [];

  // Neutral gray style for all badges — only urgency gets color (handled in header)
  const neutralStyle = { color: '#64748b', bg: '#f1f5f9' };

  if (isNew)            items.push({ label: 'חדש',         ...neutralStyle });
  if (isHighPay)        items.push({ label: 'שכר גבוה',    ...neutralStyle });
  if (isFunded)         items.push({ label: 'ממומן',        ...neutralStyle });
  if (isNearby)         items.push({ label: 'קרוב אליך',   ...neutralStyle });
  if (isVerifiedClient) items.push({ label: 'לקוח מאומת',  ...neutralStyle });
  if (isLowComp && !isNew) items.push({ label: 'ללא מגישים', ...neutralStyle });

  if (items.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
      {items.slice(0, 2).map((item, i) => (
        <span key={i} style={{
          fontSize: 10,
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: 6,
          background: item.bg,
          color: item.color,
          letterSpacing: 0.1,
          lineHeight: 1.7,
        }}>
          {item.label}
        </span>
      ))}
    </div>
  );
}