/**
 * TaskBadges — clean, minimal signal badges (max 2 shown)
 */
export default function TaskBadges({ badges = {} }) {
  const { isUrgent, isNew, isFunded, isNearby, isHighPay, isVerifiedClient, isLowComp } = badges;

  const items = [];

  // Priority order — only show top 2
  if (isUrgent)        items.push({ label: 'דחוף',       color: '#dc2626', bg: '#fef2f2' });
  if (isNew)           items.push({ label: 'חדש',        color: '#16a34a', bg: '#f0fdf4' });
  if (isHighPay)       items.push({ label: 'שכר גבוה',   color: '#b45309', bg: '#fffbeb' });
  if (isFunded)        items.push({ label: 'ממומן',      color: '#7c3aed', bg: '#f5f3ff' });
  if (isNearby)        items.push({ label: 'קרוב אליך',  color: '#1a6fd4', bg: '#eff6ff' });
  if (isVerifiedClient) items.push({ label: 'לקוח מאומת', color: '#16a34a', bg: '#f0fdf4' });
  if (isLowComp && !isNew) items.push({ label: 'ללא מגישים', color: '#1a6fd4', bg: '#eff6ff' });

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