import { useState } from 'react';
import { Shield, Phone, Star, Briefcase, Circle, Lock, ChevronLeft } from 'lucide-react';
import { calculateTrustScore } from '@/lib/trustScore';
import { isUserVerified } from '@/lib/utils';
import VerifyModal from '@/components/VerifyModal';

// Map the trust-score formula (trustScore.js) into actionable checklist items.
// Identity 40 (KYC 30 + phone 10) · Rating 30 · Completed tasks 30 (1.5/task, max 30 → 20 tasks).
function buildBreakdown(user, tasks) {
  const verified = isUserVerified(user);
  const idPoints = (verified ? 30 : 0) + (user?.is_phone_verified ? 10 : 0);
  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length
    || user?.tasks_completed || 0;
  const taskPoints = Math.min(Math.round(completedCount * 1.5), 30);
  const rating = user?.rating || 0;
  const ratingCount = user?.rating_count || 0;
  const ratingPoints = (rating > 0 && ratingCount >= 1) ? Math.round((rating / 5) * 30) : 0;

  return {
    verified, idPoints, completedCount, taskPoints, rating, ratingCount, ratingPoints,
    total: calculateTrustScore(user, { tasks }),
  };
}

function Row({ icon, iconColor, iconBg, label, sub, points, max, done, locked, ctaLabel, onCta }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '12px 0', borderBottom: '1px solid var(--border-1)' }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>{label}</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: done ? '#059669' : 'var(--text-2)', whiteSpace: 'nowrap' }}>
            {points}/{max} {done ? '✓' : ''}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
        {/* mini progress */}
        <div style={{ height: 4, background: '#edf0f7', borderRadius: 99, overflow: 'hidden', marginTop: 7 }}>
          <div style={{ height: '100%', width: `${Math.round((points / max) * 100)}%`, background: done ? '#10b981' : '#1a6fd4', borderRadius: 99, transition: 'width 0.5s ease' }} />
        </div>
        {!done && ctaLabel && !locked && (
          <button onClick={onCta} style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 14px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1a6fd4', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
            {ctaLabel} <ChevronLeft size={13} style={{ transform: 'rotate(180deg)' }} />
          </button>
        )}
        {locked && (
          <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>
            <Lock size={11} /> מתבצע אוטומטית לאחר סיום משימות
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrustChecklist({ user, reviews = [], tasks = [] }) {
  const [showVerify, setShowVerify] = useState(false);
  if (!user) return null;

  const b = buildBreakdown(user, tasks);
  const target = b.total >= 95 ? 100 : 95;
  const gap = Math.max(0, target - b.total);

  // What's still actionable to close the gap
  const tasksToMax = Math.max(0, 20 - b.completedCount); // 20 tasks → 30 pts
  const tasksGapPoints = Math.max(0, 30 - b.taskPoints);
  const ratingGapPoints = Math.max(0, 30 - b.ratingPoints);

  // Headline: the single most impactful next action
  let headline = null;
  if (!b.verified) {
    headline = { label: 'אמת את הזהות שלך וצבור 30 נקודות מיד', color: '#1a6fd4', action: () => setShowVerify(true) };
  } else if (gap > 0 && tasksGapPoints >= ratingGapPoints && tasksToMax > 0) {
    headline = { label: `בצע עוד ${tasksToMax} משימות כדי להגיע ל-100% בניסיון`, color: '#059669' };
  } else if (gap > 0 && ratingGapPoints > 0) {
    headline = { label: 'שמור על דירוג גבוה ובקש ביקורות אחרי כל משימה', color: '#d97706' };
  } else if (gap === 0) {
    headline = { label: 'הגעת לציון מקסימלי — כל הכבוד! 🎉', color: '#059669' };
  }

  return (
    <>
      <div dir="rtl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: 14, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>איך להעלות את הציון שלך</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
            {b.total} → {target}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10, lineHeight: 1.4 }}>
          ציון אמון גבוה יותר = יותר הזדמנויות עבודה ואמון מצד לקוחות.
        </div>

        {/* Headline next action */}
        {headline && (
          <div onClick={headline.action} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, marginBottom: 8,
            background: headline.color + '14', border: `1px solid ${headline.color}33`,
            cursor: headline.action ? 'pointer' : 'default',
          }}>
            <Circle size={14} color={headline.color} fill={headline.color} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: headline.color, flex: 1 }}>{headline.label}</span>
            {gap > 0 && <span style={{ fontSize: 11, fontWeight: 800, color: headline.color, whiteSpace: 'nowrap' }}>+{gap}</span>}
          </div>
        )}

        <Row
          icon={<Shield size={16} color={b.verified ? '#059669' : '#1a6fd4'} />}
          iconBg={b.verified ? '#f0fdf4' : '#eff6ff'}
          label="אימות זהות (מסמכים)"
          sub={b.verified ? 'זהותך אומתה בהצלחה' : 'העלה תעודת זהות ואימות פנים — מוסיף 30 נקודות'}
          points={b.verified ? 30 : 0} max={30} done={b.verified}
          ctaLabel={b.verified ? null : 'אימות עכשיו'} onCta={() => setShowVerify(true)}
        />
        <Row
          icon={<Phone size={16} color={user?.is_phone_verified ? '#059669' : '#1a6fd4'} />}
          iconBg={user?.is_phone_verified ? '#f0fdf4' : '#eff6ff'}
          label="אימות מספר טלפון"
          sub={user?.is_phone_verified ? 'מספר הטלפון מאומת' : 'מאומת אוטומטית בהרשמה — מוסיף 10 נקודות'}
          points={user?.is_phone_verified ? 10 : 0} max={10} done={!!user?.is_phone_verified}
        />
        <Row
          icon={<Star size={16} color="#d97706" fill="#fbbf24" />}
          iconBg="#fffbeb"
          label={`דירוג כוכבים ${b.rating > 0 ? `· ${b.rating.toFixed(1)}★` : ''}`}
          sub={b.ratingCount > 0 ? `${b.ratingCount} ביקורות — דירוג גבוה מעלה את הציון` : 'אין עדיין ביקורות — תקבל אותן לאחר סיום משימה'}
          points={b.ratingPoints} max={30} done={b.ratingPoints >= 30}
          locked={b.ratingCount === 0}
        />
        <div style={{ borderBottom: 'none' }}>
          <Row
            icon={<Briefcase size={16} color="#7c3aed" />}
            iconBg="#f5f3ff"
            label={`משימות שבוצעו · ${b.completedCount}`}
            sub={tasksToMax > 0 ? `בצע עוד ${tasksToMax} משימות כדי להגיע ל-100% בניסיון` : 'הגעת למקסימום הניסיון — כל הכבות!'}
            points={b.taskPoints} max={30} done={b.taskPoints >= 30}
            locked={b.completedCount === 0}
          />
        </div>
      </div>

      {showVerify && (
        <VerifyModal onClose={() => setShowVerify(false)} onSuccess={() => setShowVerify(false)} />
      )}
    </>
  );
}