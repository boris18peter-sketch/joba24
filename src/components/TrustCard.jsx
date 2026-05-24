import { calculateTrustScore, getTrustLevel } from '@/lib/trustScore';
import { CheckCircle, Zap, Users, MessageSquare, Star } from 'lucide-react';

/**
 * TrustCard — Large green dynamic trust bar at top + 5 explanation mini-bars below.
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

function SignalRow({ icon, label, value, sub, score, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{ width: 36, height: 36, borderRadius: 12, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1a2540' }}>{label}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: color, flexShrink: 0 }}>{value}</span>
        </div>
        <div style={{ height: 6, background: '#edf0f7', borderRadius: 99, overflow: 'hidden', marginBottom: sub ? 3 : 0 }}>
          <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 99, transition: 'width 0.7s ease' }} />
        </div>
        {sub && <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.3 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function TrustCard({ user, reviews = [], tasks = [] }) {
  if (!user) return null;

  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;
  const trustScore = calculateTrustScore(user, { tasks, reviews });
  const trustLevel = getTrustLevel(trustScore);
  const activity = getActivityLabel(user.last_active_at);
  const firstName = user.full_name?.split(' ')[0] || 'העובד';

  // ── 5 signal rows ────────────────────────────────────────────────────────

  // 1. משימות שביצע
  const taskScore = Math.min(Math.round((completedCount / 20) * 100), 100);
  const taskValue = completedCount > 0 ? `${completedCount}` : '0';
  const taskSub = completedCount >= 5 ? 'ניסיון מוכח בשטח' : completedCount > 0 ? 'מתחיל לצבור ניסיון' : 'אין משימות עדיין';

  // 2. זהות מאומתת
  const idScore = user.is_verified ? 100 : user.is_phone_verified ? 50 : 0;
  const idValue = user.is_verified ? '✓ אימת' : user.is_phone_verified ? 'טלפון' : 'לא';
  const idSub = user.is_verified ? 'מילא ואישר טופס' : null;

  // 3. מהירות מענה
  const respMins = user.avg_response_minutes || null;
  const speedScore = respMins ? Math.max(0, Math.round(100 - Math.min(respMins / 60, 1) * 80)) : 0;
  const speedValue = respMins ? (respMins < 60 ? `${Math.round(respMins)} דק׳` : `${Math.round(respMins / 60)}h`) : '—';
  const speedSub = speedScore >= 70 ? 'מגיב במהירות' : speedScore > 0 ? 'מענה בסבירות' : null;

  // 4. ממליצים (repeat hires)
  const hires = user.repeat_hires || 0;
  const hiresScore = Math.min(hires * 20, 100);
  const hiresValue = hires > 0 ? `${hires}` : '0';
  const hiresSub = hires >= 3 ? 'לקוחות בוחרים בו שוב' : hires > 0 ? 'התחיל לצבור' : 'עדיין לא חזרו';

  // 5. שירות (rating)
  const rating = user.rating || 0;
  const ratingCount = user.rating_count || reviews.length;
  const serviceScore = ratingCount > 0 ? Math.round((rating / 5) * 100) : 0;
  const wouldHireAgain = reviews.filter(r => r.would_hire_again === true).length;
  const serviceValue = rating > 0 ? `${rating.toFixed(1)}★` : '—';
  const serviceSub = wouldHireAgain > 0 ? `${wouldHireAgain} ממליצים בחום` : ratingCount > 0 ? `${ratingCount} ביקורות` : null;

  if (trustScore === 0) return null;

  return (
    <div dir="rtl" style={{ background: 'var(--surface-2)', borderRadius: 18, border: '1px solid var(--border-1)', overflow: 'hidden' }}>

      {/* MAIN TRUST BAR — large, dynamic, green ────────────────────────────── */}
      <div style={{
        background: trustLevel.bg,
        border: `2px solid ${trustLevel.border}`,
        borderRadius: '18px 18px 0 0',
        padding: '16px 16px 18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: trustLevel.color, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>ציון אמון</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: trustLevel.color, lineHeight: 1, letterSpacing: -1 }}>{trustScore}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: trustLevel.color, marginTop: 3 }}>{trustLevel.label}</div>
          </div>
          {activity && (
            <div style={{ fontSize: 10, fontWeight: 700, color: activity.color, whiteSpace: 'nowrap', textAlign: 'left', paddingTop: 2 }}>
              {activity.label}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ height: 10, background: 'rgba(0,0,0,0.1)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${trustScore}%`, background: trustLevel.bar, borderRadius: 99, transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: `0 0 12px ${trustLevel.bar}60` }} />
        </div>
      </div>

      {/* Subheader */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f2f7', background: 'rgba(0,0,0,0.01)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🤝</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#0f1e40' }}>למה סומכים על {firstName}?</span>
        </div>
      </div>

      {/* 5 Signal rows with mini-bars */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 13 }}>
        <SignalRow
          icon={<CheckCircle size={16} color="#10b981" strokeWidth={2.5} />}
          label="משימות שבוצעו"
          value={taskValue}
          sub={taskSub}
          score={taskScore}
          color="#10b981"
        />
        <SignalRow
          icon={<CheckCircle size={16} color="#1a6fd4" strokeWidth={2.5} />}
          label="זהות מאומתת"
          value={idValue}
          sub={idSub}
          score={idScore}
          color="#1a6fd4"
        />
        <SignalRow
          icon={<Zap size={16} color="#f59e0b" strokeWidth={2.5} />}
          label="מהירות מענה"
          value={speedValue}
          sub={speedSub}
          score={speedScore}
          color="#f59e0b"
        />
        <SignalRow
          icon={<Users size={16} color="#8b5cf6" strokeWidth={2} />}
          label="ממליצים עליו"
          value={hiresValue}
          sub={hiresSub}
          score={hiresScore}
          color="#8b5cf6"
        />
        <SignalRow
          icon={<Star size={16} color="#db2777" strokeWidth={2} fill="#db2777" />}
          label="שירות"
          value={serviceValue}
          sub={serviceSub}
          score={serviceScore}
          color="#db2777"
        />
      </div>
    </div>
  );
}