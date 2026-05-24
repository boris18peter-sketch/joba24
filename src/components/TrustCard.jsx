import { calculateTrustScore, getTrustLevel } from '@/lib/trustScore';
import { Shield, CheckCircle, Zap, MessageCircle, Star } from 'lucide-react';

/**
 * TrustCard — Trust score bar + 5 behavioral signal rows.
 * Props:
 *   user    — user object
 *   reviews — array of Review records
 *   tasks   — array of Task records
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

function ScoreRow({ icon, label, value, sub, score, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1a2540' }}>{label}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: color }}>{value}</span>
        </div>
        <div style={{ height: 5, background: '#edf0f7', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
        </div>
        {sub && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function TrustCard({ user, reviews = [], tasks = [] }) {
  if (!user) return null;

  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;

  // On-time rate
  const clientReviews = reviews.filter(r => r.role === 'client');
  const withOnTime = clientReviews.filter(r => r.arrived_on_time != null);
  const computedOnTime =
    withOnTime.length >= 2
      ? Math.round((withOnTime.filter(r => r.arrived_on_time === true).length / withOnTime.length) * 100)
      : user.on_time_rate || null;

  const trustScore = calculateTrustScore(user, { tasks, reviews });
  const trustLevel = getTrustLevel(trustScore);
  const activity = getActivityLabel(user.last_active_at);
  const firstName = user.full_name?.split(' ')[0] || 'העובד';

  // ── 5 signal rows ────────────────────────────────────────────────────────
  const rows = [];

  // 1. משימות שביצע
  const taskScore = Math.min(Math.round((completedCount / 20) * 100), 100);
  rows.push({
    icon: <CheckCircle size={16} color="#10b981" strokeWidth={2} />,
    label: 'משימות שבוצעו',
    value: completedCount > 0 ? `${completedCount} משימות` : 'אין עדיין',
    sub: completedCount >= 5 ? 'ניסיון מוכח בשטח' : completedCount > 0 ? 'מתחיל לצבור ניסיון' : null,
    score: taskScore,
    color: '#10b981',
  });

  // 2. זהות מאומתת
  const idScore = user.is_verified ? 100 : user.is_phone_verified ? 50 : 0;
  rows.push({
    icon: <Shield size={16} color="#1a6fd4" strokeWidth={2} />,
    label: 'זהות מאומתת',
    value: user.is_verified ? 'מאומת ✓' : user.is_phone_verified ? 'טלפון בלבד' : 'לא מאומת',
    sub: user.is_verified ? 'אימות תעודת זהות' : null,
    score: idScore,
    color: '#1a6fd4',
  });

  // 3. מהירות מענה
  const respMins = user.avg_response_minutes || null;
  const speedScore = respMins
    ? Math.max(0, Math.round(100 - Math.min(respMins / 60, 1) * 80))
    : 0;
  rows.push({
    icon: <Zap size={16} color="#f59e0b" strokeWidth={2} />,
    label: 'מהירות מענה',
    value: respMins ? (respMins < 60 ? `${respMins} דקות` : `${Math.round(respMins / 60)} שעות`) : 'לא ידוע',
    sub: speedScore >= 70 ? 'מגיב מהר' : speedScore > 0 ? 'מגיב בסבירות' : null,
    score: speedScore,
    color: '#f59e0b',
  });

  // 4. מענה (repeat hires / recommendations)
  const hires = user.repeat_hires || 0;
  const hiresScore = Math.min(hires * 20, 100);
  rows.push({
    icon: <MessageCircle size={16} color="#8b5cf6" strokeWidth={2} />,
    label: 'ממליצים עליו',
    value: hires > 0 ? `${hires} ממליצים` : 'אין עדיין',
    sub: hires >= 3 ? 'בוחרים בו שוב' : hires > 0 ? 'מתחיל לצבור' : null,
    score: hiresScore,
    color: '#8b5cf6',
  });

  // 5. שירות (rating + review quality)
  const rating = user.rating || 0;
  const ratingCount = user.rating_count || reviews.length;
  const serviceScore = ratingCount > 0 ? Math.round((rating / 5) * 100) : 0;
  const wouldHireAgain = reviews.filter(r => r.would_hire_again === true).length;
  rows.push({
    icon: <Star size={16} color="#db2777" strokeWidth={2} />,
    label: 'שירות',
    value: rating > 0 ? `${rating.toFixed(1)} ★ (${ratingCount})` : 'ללא דירוג',
    sub: wouldHireAgain > 0 ? `${wouldHireAgain} ביקורות חיוביות` : null,
    score: serviceScore,
    color: '#db2777',
  });

  if (trustScore === 0 && rows.every(r => r.score === 0)) return null;

  return (
    <div dir="rtl" style={{ background: 'var(--surface-2)', borderRadius: 18, border: '1px solid var(--border-1)', overflow: 'hidden' }}>

      {/* Header + main score bar */}
      <div style={{ padding: '13px 16px 12px', background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)', borderBottom: '1px solid var(--border-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 17 }}>🤝</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#0f1e40', flex: 1 }}>למה סומכים על {firstName}?</span>
          {activity && (
            <span style={{ fontSize: 11, fontWeight: 600, color: activity.color, whiteSpace: 'nowrap' }}>{activity.label}</span>
          )}
        </div>

        {/* Main trust bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 8, background: '#e8edf5', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${trustScore}%`, background: trustLevel.bar, borderRadius: 99, transition: 'width 0.7s ease' }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 900, color: trustLevel.color, background: trustLevel.bg, border: `1px solid ${trustLevel.border}`, borderRadius: 20, padding: '2px 10px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {trustScore}/100 · {trustLevel.label}
          </span>
        </div>
      </div>

      {/* 5 signal rows */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {rows.map((row, i) => (
          <ScoreRow key={i} {...row} />
        ))}
      </div>
    </div>
  );
}