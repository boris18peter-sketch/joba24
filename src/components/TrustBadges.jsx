/**
 * TrustBadges — displays trust badge pills based on user's verified/achievement status.
 * Props:
 *   user     — the user object
 *   compact  — smaller size variant (default false)
 */

const BADGES = [
  {
    key: 'phone',
    check: u => u.is_phone_verified,
    icon: '📱',
    label: 'טלפון מאומת',
    color: '#059669',
    bg: '#f0fdf4',
    border: '#bbf7d0',
  },
  {
    key: 'fast',
    check: u => (u.avg_response_minutes > 0) && (u.avg_response_minutes <= 10),
    icon: '⚡',
    label: 'מגיב מהר',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
  },
  {
    key: 'trusted',
    check: u => (u.completion_rate || 0) >= 85,
    icon: '✅',
    label: 'עובד מהימן',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
  },
  {
    key: 'star',
    check: u => (u.rating || 0) >= 4.5 && (u.rating_count || 0) >= 5,
    icon: '⭐',
    label: 'מדורג גבוה',
    color: '#b45309',
    bg: '#fffbeb',
    border: '#fde68a',
  },
  {
    key: 'repeat',
    check: u => (u.repeat_hires || 0) >= 3,
    icon: '🔁',
    label: 'לקוחות חוזרים',
    color: '#db2777',
    bg: '#fdf2f8',
    border: '#fbcfe8',
  },
  {
    key: 'ontime',
    check: u => (u.on_time_rate || 0) >= 80,
    icon: '⏱️',
    label: 'מגיע בזמן',
    color: '#0891b2',
    bg: '#ecfeff',
    border: '#a5f3fc',
  },
];

export default function TrustBadges({ user, compact = false }) {
  if (!user) return null;
  const activeBadges = BADGES.filter(b => b.check(user));
  if (activeBadges.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: compact ? 5 : 7 }}>
      {activeBadges.map(badge => (
        <div
          key={badge.key}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: compact ? 3 : 5,
            padding: compact ? '3px 8px' : '5px 11px',
            borderRadius: 99,
            background: badge.bg,
            border: `1px solid ${badge.border}`,
            fontSize: compact ? 10 : 12,
            fontWeight: 700,
            color: badge.color,
            whiteSpace: 'nowrap',
            letterSpacing: 0.1,
          }}
        >
          <span style={{ fontSize: compact ? 11 : 13, lineHeight: 1 }}>{badge.icon}</span>
          {badge.label}
        </div>
      ))}
    </div>
  );
}