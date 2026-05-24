/**
 * TrustCard — "Why this worker is trusted" section.
 * Shows behavioral trust metrics derived from tasks, reviews, and user data.
 * Props:
 *   user     — the worker's user object
 *   reviews  — array of Review records for this user
 *   tasks    — array of Task records for this user
 */

function getActivityLabel(lastActiveAt) {
  if (!lastActiveAt) return null;
  const diffMs = Date.now() - new Date(lastActiveAt).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 10) return { label: '🟢 מחובר עכשיו', color: '#10b981' };
  if (diffHours < 2) return { label: `פעיל לפני ${diffMins} דקות`, color: '#10b981' };
  if (diffHours < 24) return { label: 'פעיל היום', color: '#64748b' };
  if (diffDays <= 2) return { label: `פעיל לפני ${diffDays} ימים`, color: '#94a3b8' };
  return null;
}

export default function TrustCard({ user, reviews = [], tasks = [] }) {
  if (!user) return null;

  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;

  // Calculate on_time_rate live from reviews when enough data
  const clientReviews = reviews.filter(r => r.role === 'client');
  const withOnTime = clientReviews.filter(
    r => r.arrived_on_time !== null && r.arrived_on_time !== undefined
  );
  const computedOnTime =
    withOnTime.length >= 2
      ? Math.round(
          (withOnTime.filter(r => r.arrived_on_time === true).length / withOnTime.length) * 100
        )
      : user.on_time_rate || null;

  const activity = getActivityLabel(user.last_active_at);
  const firstName = user.full_name?.split(' ')[0] || 'העובד';

  const metrics = [];

  if (completedCount > 0) {
    metrics.push({
      icon: '✅',
      text: `השלים ${completedCount} משימות`,
      sub: 'ניסיון מוכח בשטח',
    });
  }
  if (computedOnTime !== null && computedOnTime > 0) {
    metrics.push({
      icon: '⏱️',
      text: `${computedOnTime}% הגעות בזמן`,
      sub: 'אמינות הגעה',
    });
  }
  if (user.avg_response_minutes > 0) {
    metrics.push({
      icon: '⚡',
      text: `מגיב תוך ${user.avg_response_minutes} דקות בממוצע`,
      sub: 'זמינות ותגובה מהירה',
    });
  }
  if (user.is_verified) {
    metrics.push({
      icon: '🛡️',
      text: 'זהות אומתה',
      sub: 'אימות תעודת זהות',
    });
  }
  if (user.is_phone_verified) {
    metrics.push({
      icon: '📱',
      text: 'מספר טלפון מאומת',
      sub: 'אמינות ליצירת קשר',
    });
  }
  if ((user.repeat_hires || 0) >= 2) {
    metrics.push({
      icon: '🔁',
      text: `${user.repeat_hires} ממליצים עליו`,
      sub: 'בוחרים בו שוב ושוב',
    });
  }
  if ((user.rating || 0) >= 4 && (user.rating_count || 0) >= 3) {
    metrics.push({
      icon: '⭐',
      text: `דירוג ${user.rating} מתוך 5 (${user.rating_count} ביקורות)`,
      sub: 'דירוג ממוצע גבוה',
    });
  }

  if (metrics.length === 0 && !activity) return null;

  return (
    <div
      dir="rtl"
      style={{
        background: 'var(--surface-2)',
        borderRadius: 18,
        border: '1px solid var(--border-1)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '13px 16px 11px',
          background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
          borderBottom: '1px solid var(--border-1)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 17 }}>🤝</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#0f1e40', flex: 1 }}>
          למה סומכים על {firstName}?
        </span>
        {activity && (
          <span style={{ fontSize: 11, fontWeight: 600, color: activity.color, whiteSpace: 'nowrap' }}>
            {activity.label}
          </span>
        )}
      </div>

      {/* Metrics list */}
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {metrics.length > 0 ? (
          metrics.map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 17, flexShrink: 0, lineHeight: 1 }}>{m.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f1e40', lineHeight: 1.2 }}>
                  {m.text}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{m.sub}</div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '6px 0' }}>
            מידע אמון יצטבר עם השלמת משימות וקבלת ביקורות
          </div>
        )}
      </div>
    </div>
  );
}