import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { calculateTrustScore, getTrustLevel, getCompletedCount } from '@/lib/trustScore';
import { isUserVerified } from '@/lib/utils';
import { CheckCircle, Star, X, Shield, Briefcase, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import VerifyModal from '@/components/VerifyModal';

function SignalRow({ icon, label, value, sub, score, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1a2540' }}>{label}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color }}>{value}</span>
        </div>
        <div style={{ height: 5, background: '#edf0f7', borderRadius: 99, overflow: 'hidden', marginBottom: sub ? 3 : 0 }}>
          <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 99 }} />
        </div>
        {sub && <div style={{ fontSize: 10, color: '#94a3b8' }}>{sub}</div>}
      </div>
    </div>
  );
}

// Real-time, personalized improvement guide — recomputed from live user/tasks/reviews.
function ImprovementGuide({ user, reviews, tasks, trustScore, mainColor, onClose }) {
  const [showVerify, setShowVerify] = useState(false);

  const verified = isUserVerified(user);
  const idPoints = verified ? 40 : 0;

  const completedCount = getCompletedCount(tasks, user);
  const taskPoints = Math.min(Math.round(completedCount * 1.5), 30);
  const tasksToMax = Math.max(0, 20 - completedCount);

  const rating = user?.rating || 0;
  const ratingCount = user?.rating_count || (Array.isArray(reviews) ? reviews.length : 0);
  const ratingPoints = (rating > 0 && ratingCount >= 1) ? Math.round((rating / 5) * 30) : 0;

  const target = trustScore >= 95 ? 100 : 95;
  const gap = Math.max(0, target - trustScore);
  const taskGapPoints = Math.max(0, 30 - taskPoints);
  const ratingGapPoints = Math.max(0, 30 - ratingPoints);

  // The single most impactful next action — only actionable, real improvements
  let headline = null;
  if (!verified) {
    headline = { icon: <Shield size={14} color="#1a6fd4" />, text: 'אמת את הזהות וצבור 40 נקודות מיד', color: '#1a6fd4', gain: 40, cta: () => setShowVerify(true), ctaLabel: 'אימות עכשיו' };
  } else if (gap > 0 && taskGapPoints >= ratingGapPoints && tasksToMax > 0) {
    headline = { icon: <Briefcase size={14} color="#059669" />, text: `בצע עוד ${tasksToMax} משימות ותגיע ל-100% בניסיון`, color: '#059669', gain: taskGapPoints };
  } else if (gap > 0 && ratingGapPoints > 0) {
    headline = { icon: <Star size={14} color="#d97706" />, text: 'שמור על דירוג גבוה ובקש ביקורות אחרי כל משימה', color: '#d97706', gain: ratingGapPoints };
  } else {
    headline = { icon: <TrendingUp size={14} color="#059669" />, text: 'מצוין! הגעת לציון מקסימלי — המשך כך 🎉', color: '#059669', gain: 0 };
  }

  const steps = [
    {
      icon: <Shield size={15} color={verified ? '#059669' : '#1a6fd4'} />,
      label: 'אימות זהות',
      points: idPoints, max: 40,
      done: verified,
      tip: verified ? 'זהותך אומתה בהצלחה ✓' : 'העלה תעודת זהות — מוסיף 40 נקודות מיד',
      cta: verified ? null : () => setShowVerify(true),
      ctaLabel: verified ? null : 'אימות',
    },
    {
      icon: <Star size={15} color="#d97706" fill="#fbbf24" />,
      label: `דירוג כוכבים${rating > 0 ? ` · ${rating.toFixed(1)}★` : ''}`,
      points: ratingPoints, max: 30,
      done: ratingPoints >= 30,
      tip: ratingCount > 0 ? `${ratingCount} ביקורות — דירוג גבוה מעלה את הציון` : 'תקבל ביקורות לאחר סיום משימות',
    },
    {
      icon: <Briefcase size={15} color="#7c3aed" />,
      label: `משימות שבוצעו · ${completedCount}`,
      points: taskPoints, max: 30,
      done: taskPoints >= 30,
      tip: tasksToMax > 0 ? `בצע עוד ${tasksToMax} משימות למקסימום ניסיון` : 'הגעת למקסימום הניסיון — כל הכבוד!',
    },
  ];

  return (
    <>
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #edf0f7' }}>
        {/* Headline next action */}
        <div onClick={headline.cta} style={{
          display: 'flex', alignItems: 'center', gap: 9, padding: '11px 12px', borderRadius: 12, marginBottom: 12,
          background: headline.color + '14', border: `1px solid ${headline.color}33`,
          cursor: headline.cta ? 'pointer' : 'default',
        }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {headline.icon}
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: headline.color, flex: 1 }}>{headline.text}</span>
          {headline.gain > 0 && <span style={{ fontSize: 12, fontWeight: 800, color: headline.color, whiteSpace: 'nowrap' }}>+{headline.gain}</span>}
          {headline.ctaLabel && (
            <span style={{ fontSize: 11, fontWeight: 800, color: headline.color, background: 'white', padding: '3px 9px', borderRadius: 8, border: `1px solid ${headline.color}33` }}>{headline.ctaLabel}</span>
          )}
        </div>

        {/* Per-signal steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: s.done ? '#f0fdf4' : '#f8faff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {s.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1a2540' }}>{s.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: s.done ? '#059669' : '#64748b' }}>{s.points}/{s.max}{s.done ? ' ✓' : ''}</span>
                </div>
                <div style={{ height: 4, background: '#edf0f7', borderRadius: 99, overflow: 'hidden', marginTop: 5, marginBottom: 4 }}>
                  <div style={{ height: '100%', width: `${Math.round((s.points / s.max) * 100)}%`, background: s.done ? '#10b981' : mainColor, borderRadius: 99, transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ fontSize: 10.5, color: '#94a3b8', lineHeight: 1.4 }}>{s.tip}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12, padding: '9px 11px', background: '#f8faff', borderRadius: 10, fontSize: 11, color: '#64748b', lineHeight: 1.5, textAlign: 'center' }}>
          ציון אמון גבוה יותר = יותר הזדמנויות עבודה ואמון מצד לקוחות. כל משימה שמסתיימת בהצלחה מקדמת אותך.
        </div>
      </div>

      {showVerify && (
        <VerifyModal onClose={() => { setShowVerify(false); onClose(); }} onSuccess={() => setShowVerify(false)} />
      )}
    </>
  );
}

function DetailsPopup({ user, reviews, tasks, trustScore, trustLevel, mainColor, onClose }) {
  const [showGuide, setShowGuide] = useState(false);
  const completedCount = getCompletedCount(tasks, user);

  const taskScore = Math.min(Math.round((completedCount / 20) * 100), 100);
  const taskValue = `${completedCount}`;
  const taskSub = completedCount >= 5 ? 'ניסיון מוכח בשטח' : completedCount > 0 ? 'מתחיל לצבור ניסיון' : 'אין משימות עדיין';

  const _verified = isUserVerified(user);
  const idScore = _verified ? 100 : 0;
  const idValue = _verified ? '✓ אומת' : 'לא';
  const idSub = _verified ? 'מסמכי זהות אומתו' : 'אימות KYC בהמתנה';

  const rating = user.rating || 0;
  const ratingCount = user.rating_count || reviews.length;
  const serviceScore = ratingCount > 0 ? Math.round((rating / 5) * 100) : 0;
  const wouldHireAgain = reviews.filter(r => r.would_hire_again === true).length;
  const serviceValue = rating > 0 ? `${rating.toFixed(1)}★` : '—';
  const serviceSub = wouldHireAgain > 0 ? `${wouldHireAgain} ממליצים בחום` : ratingCount > 0 ? `${ratingCount} ביקורות` : null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(10,20,50,0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'tcFadeIn 0.18s ease',
      }}
    >
      <style>{`
        @keyframes tcSlideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes tcFadeIn  { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      <div
        dir="rtl"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: '22px 22px 0 0',
          width: '100%', maxWidth: 480,
          padding: '20px 20px',
          paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
          animation: 'tcSlideUp 0.22s cubic-bezier(0.34,1.4,0.64,1)',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.18)',
          maxHeight: '90dvh', overflowY: 'auto',
        }}
      >
        <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 99, margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f1e40' }}>מד אמינות</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>מה בונה את ציון האמון?</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: trustLevel.color }}>{trustScore}%</div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 10, background: '#f1f5f9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={14} color="#94a3b8" />
            </button>
          </div>
        </div>
        <SignalRow icon={<CheckCircle size={15} color={mainColor} strokeWidth={2.5} />} label="משימות שבוצעו" value={taskValue} sub={taskSub} score={taskScore} color={mainColor} />
        <SignalRow icon={<CheckCircle size={15} color={mainColor} strokeWidth={2.5} />} label="זהות מאומתת" value={idValue} sub={idSub} score={idScore} color={mainColor} />
        <SignalRow icon={<Star size={15} color={mainColor} strokeWidth={2} fill={mainColor} />} label="שירות" value={serviceValue} sub={serviceSub} score={serviceScore} color={mainColor} />

        {/* How to improve — toggle */}
        <button
          onClick={() => setShowGuide(v => !v)}
          style={{
            marginTop: 4, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            height: 44, borderRadius: 13, border: `1px solid ${mainColor}33`,
            background: mainColor + '12', color: mainColor, fontWeight: 800, fontSize: 13.5, cursor: 'pointer',
          }}
        >
          <TrendingUp size={16} />
          {showGuide ? 'סגור הוראות' : 'איך להשתפר?'}
          {showGuide ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        {showGuide && (
          <ImprovementGuide user={user} reviews={reviews} tasks={tasks} trustScore={trustScore} mainColor={mainColor} onClose={onClose} />
        )}
      </div>
    </div>,
    document.body
  );
}

// Color that transitions red→orange→yellow→green based on progress 0-100
function getBarColor(w) {
  if (w < 25) return '#ef4444';
  if (w < 45) return '#f97316';
  if (w < 65) return '#eab308';
  if (w < 82) return '#84cc16';
  return '#16a34a';
}

export default function TrustCard({ user, reviews = [], tasks = [] }) {
  const [open, setOpen] = useState(false);
  const [displayWidth, setDisplayWidth] = useState(0);
  const animRef = useRef(null);

  const trustScore = calculateTrustScore(user, { tasks, reviews });
  const trustLevel = getTrustLevel(trustScore);

  useEffect(() => {
    if (!user || trustScore === 0) return;
    let current = 0;
    const target = trustScore;
    const duration = 1200; // ms
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      current = Math.round(eased * target);
      setDisplayWidth(current);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    const t = setTimeout(() => {
      animRef.current = requestAnimationFrame(animate);
    }, 150);

    return () => {
      clearTimeout(t);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [trustScore, user]);

  if (!user || trustScore === 0) return null;

  const barColor = getBarColor(displayWidth);

  return (
    <>
      <div
        dir="rtl"
        onClick={() => setOpen(true)}
        style={{
          background: 'white', border: '1px solid #e8edf5',
          borderRadius: 14, padding: '12px 14px',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: barColor, letterSpacing: -0.5, transition: 'color 0.15s' }}>{displayWidth}%</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: barColor, transition: 'color 0.15s' }}>מד אמינות</span>
        </div>

        {/* Animated progress bar */}
        <div style={{ height: 10, background: '#e8f5e9', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{
            height: '100%',
            width: `${displayWidth}%`,
            borderRadius: 99,
            background: barColor,
            boxShadow: `0 0 10px ${barColor}80`,
            transition: 'background-color 0.1s, box-shadow 0.1s',
          }} />
        </div>

        {/* Trust label */}
        <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: barColor, transition: 'color 0.15s' }}>
          ✨ {trustLevel.label}
        </div>
      </div>

      {open && (
        <DetailsPopup
          user={user} reviews={reviews} tasks={tasks}
          trustScore={trustScore} trustLevel={trustLevel}
          mainColor={barColor}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}