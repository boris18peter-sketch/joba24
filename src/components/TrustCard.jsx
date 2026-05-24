import { useState } from 'react';
import { calculateTrustScore, getTrustLevel } from '@/lib/trustScore';
import { CheckCircle, Zap, Users, Star, ChevronDown } from 'lucide-react';

function SignalRow({ icon, label, value, sub, score, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{ width: 34, height: 34, borderRadius: 11, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1a2540' }}>{label}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color, flexShrink: 0 }}>{value}</span>
        </div>
        <div style={{ height: 5, background: '#edf0f7', borderRadius: 99, overflow: 'hidden', marginBottom: sub ? 3 : 0 }}>
          <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 99 }} />
        </div>
        {sub && <div style={{ fontSize: 10, color: '#94a3b8' }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function TrustCard({ user, reviews = [], tasks = [] }) {
  const [open, setOpen] = useState(false);
  if (!user) return null;

  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;
  const trustScore = calculateTrustScore(user, { tasks, reviews });
  const trustLevel = getTrustLevel(trustScore);

  if (trustScore === 0) return null;

  // Signal data
  const taskScore = Math.min(Math.round((completedCount / 20) * 100), 100);
  const taskSub = completedCount >= 5 ? 'ניסיון מוכח בשטח' : completedCount > 0 ? 'מתחיל לצבור ניסיון' : 'אין משימות עדיין';

  const idScore = user.is_verified ? 100 : user.is_phone_verified ? 50 : 0;
  const idValue = user.is_verified ? '✓ מאומת' : user.is_phone_verified ? 'טלפון' : 'לא';

  const respMins = user.avg_response_minutes || null;
  const speedScore = respMins ? Math.max(0, Math.round(100 - Math.min(respMins / 60, 1) * 80)) : 0;
  const speedValue = respMins ? (respMins < 60 ? `${Math.round(respMins)} דק׳` : `${Math.round(respMins / 60)}h`) : '—';
  const speedSub = speedScore >= 70 ? 'מגיב במהירות' : speedScore > 0 ? 'מענה בסבירות' : null;

  const hires = user.repeat_hires || 0;
  const hiresScore = Math.min(hires * 20, 100);
  const hiresSub = hires >= 3 ? 'לקוחות בוחרים בו שוב' : hires > 0 ? 'התחיל לצבור' : 'עדיין לא חזרו';

  const rating = user.rating || 0;
  const ratingCount = user.rating_count || reviews.length;
  const serviceScore = ratingCount > 0 ? Math.round((rating / 5) * 100) : 0;
  const wouldHireAgain = reviews.filter(r => r.would_hire_again === true).length;
  const serviceValue = rating > 0 ? `${rating.toFixed(1)}★` : '—';
  const serviceSub = wouldHireAgain > 0 ? `${wouldHireAgain} ממליצים בחום` : ratingCount > 0 ? `${ratingCount} ביקורות` : null;

  return (
    <div dir="rtl" style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e4ecf8', overflow: 'hidden' }}>

      {/* ── Main bar (always visible, tappable) ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 16px 12px', textAlign: 'right' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: trustLevel.color }}>{trustScore}%</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0f1e40' }}>מצוין</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>מדד אמינות</span>
            <ChevronDown
              size={14}
              color="#94a3b8"
              style={{ transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </div>
        </div>

        {/* Green bar */}
        <div style={{ height: 10, background: '#e8f5e9', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${trustScore}%`,
            borderRadius: 99,
            background: 'linear-gradient(90deg, #4ade80, #16a34a)',
            boxShadow: '0 0 10px rgba(22,163,74,0.4)',
          }} />
        </div>

        <div style={{ marginTop: 7, fontSize: 11, fontWeight: 600, color: trustLevel.color, textAlign: 'center' }}>
          ✨ {trustLevel.label}
        </div>
      </button>

      {/* ── Expandable details panel ── */}
      <div style={{
        maxHeight: open ? 600 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid #f0f4fa' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', paddingTop: 10, paddingBottom: 2 }}>הסבר הציון</div>
          <SignalRow
            icon={<CheckCircle size={15} color="#10b981" strokeWidth={2.5} />}
            label="משימות שבוצעו"
            value={`${completedCount}`}
            sub={taskSub}
            score={taskScore}
            color="#10b981"
          />
          <SignalRow
            icon={<CheckCircle size={15} color="#1a6fd4" strokeWidth={2.5} />}
            label="זהות מאומתת"
            value={idValue}
            sub={null}
            score={idScore}
            color="#1a6fd4"
          />
          <SignalRow
            icon={<Zap size={15} color="#f59e0b" strokeWidth={2.5} />}
            label="מהירות מענה"
            value={speedValue}
            sub={speedSub}
            score={speedScore}
            color="#f59e0b"
          />
          <SignalRow
            icon={<Users size={15} color="#8b5cf6" strokeWidth={2} />}
            label="ממליצים עליו"
            value={`${hires}`}
            sub={hiresSub}
            score={hiresScore}
            color="#8b5cf6"
          />
          <SignalRow
            icon={<Star size={15} color="#db2777" strokeWidth={2} fill="#db2777" />}
            label="שירות"
            value={serviceValue}
            sub={serviceSub}
            score={serviceScore}
            color="#db2777"
          />
        </div>
      </div>
    </div>
  );
}