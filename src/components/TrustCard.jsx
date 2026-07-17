import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { calculateTrustScore, getTrustLevel } from '@/lib/trustScore';
import { isUserVerified } from '@/lib/utils';
import { CheckCircle, Star, X } from 'lucide-react';

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

function DetailsPopup({ user, reviews, tasks, trustScore, trustLevel, mainColor, onClose }) {
  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;

  const taskScore = Math.min(Math.round((completedCount / 20) * 100), 100);
  const taskValue = `${completedCount}`;
  const taskSub = completedCount >= 5 ? 'ניסיון מוכח בשטח' : completedCount > 0 ? 'מתחיל לצבור ניסיון' : 'אין משימות עדיין';

  const _verified = isUserVerified(user);
  const idScore = _verified ? 100 : user.is_phone_verified ? 50 : 0;
  const idValue = _verified ? '✓ אומת' : user.is_phone_verified ? 'טלפון' : 'לא';
  const idSub = _verified ? 'מסמכי זהות אומתו' : null;

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
      // ease-out cubic
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