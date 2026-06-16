import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Zap, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import BoostOverlay from '@/components/BoostOverlay';

const BOOST_COST = 5;
const HOUR_MS = 60 * 60 * 1000;

/**
 * BoostPill — fills over 1 hour since last boost (or task creation).
 * When full (charged), clicking opens a confirm sheet → calls boostTask backend function.
 * 
 * Props:
 *   task        — full task object (needs id, title, price, category, last_boost_at, created_date)
 *   size        — 'sm' (42×42, for card) | 'md' (54×54, for detail banner)
 *   onBoostDone — optional callback after successful boost
 */
export default function BoostPill({ task, size = 'sm', onBoostDone }) {
  const queryClient = useQueryClient();
  const [pct, setPct] = useState(0);
  const [charged, setCharged] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const intervalRef = useRef(null);

  const calcPct = () => {
    // Use last_boost_at if exists, otherwise count from task creation (first boost)
    const startTime = task.last_boost_at || task.created_date;
    if (!startTime) return { pct: 0, charged: false };
    const elapsed = Date.now() - new Date(startTime).getTime();
    if (elapsed >= HOUR_MS) return { pct: 100, charged: true };
    return { pct: Math.round((elapsed / HOUR_MS) * 100), charged: false };
  };

  // Update every second — restart cleanly whenever the task timestamps change
  useEffect(() => {
    const id = setInterval(() => {
      const { pct: newPct, charged: newCharged } = calcPct();
      setPct(newPct);
      setCharged(newCharged);
    }, 1000);
    // Run once immediately on mount / timestamp change
    const { pct: initPct, charged: initCharged } = calcPct();
    setPct(initPct);
    setCharged(initCharged);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.last_boost_at, task.created_date, task.id]);

  const handleBoost = async () => {
    if (loading) return;
    setLoading(true);
    const res = await base44.functions.invoke('boostTask', { taskId: task.id });
    setLoading(false);
    if (res.data?.error === 'insufficient_credits') {
      toast.error(`אין מספיק ג'ובות — נדרשות ${BOOST_COST}`);
      return;
    }
    if (!res.data?.success) {
      toast.error('שגיאה בשיגור האיתות, נסה שוב');
      return;
    }
    // Reset pill — re-count from now
    setPct(0);
    setCharged(false);
    queryClient.invalidateQueries({ queryKey: ['me'] });
    queryClient.invalidateQueries({ queryKey: ['task', task.id] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    setShowOverlay(true);
    onBoostDone?.();
  };

  const dim = size === 'md' ? 54 : 42;
  const radius = size === 'md' ? 14 : 10;
  const iconSize = size === 'md' ? 16 : 14;
  const textSize = size === 'md' ? 9 : 8;
  const iconColor = pct > 50 ? 'white' : (size === 'md' ? 'rgba(255,255,255,0.9)' : '#7c3aed');
  const borderColor = charged
    ? (size === 'md' ? 'rgba(192,132,252,0.9)' : '#7c3aed')
    : (size === 'md' ? 'rgba(192,132,252,0.45)' : '#c4b5fd');
  const bg = size === 'md' ? 'rgba(255,255,255,0.07)' : '#f5f3ff';

  return (
    <>
      <div
        onClick={(e) => { e.stopPropagation(); if (charged && !loading) setShowConfirm(true); }}
        title={charged ? `שגר איתות — ${BOOST_COST} ג'ובות` : `טוען... ${pct}%`}
        style={{
          width: dim, height: dim, borderRadius: radius,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', position: 'relative',
          border: `1.5px solid ${borderColor}`,
          background: bg,
          cursor: charged ? 'pointer' : 'default',
          flexShrink: 0,
        }}
      >
        {/* Fill bar — height % driven by state, updates every second */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: `${pct}%`,
          background: charged
            ? (size === 'md'
                ? 'linear-gradient(180deg,rgba(168,85,247,0.85),rgba(124,58,237,0.9))'
                : 'linear-gradient(180deg,#a855f7,#7c3aed)')
            : (size === 'md'
                ? 'linear-gradient(180deg,rgba(192,132,252,0.65),rgba(168,85,247,0.75))'
                : 'linear-gradient(180deg,rgba(192,132,252,0.9),rgba(168,85,247,0.95))'),
          borderRadius: pct >= 98 ? radius : `0 0 ${radius}px ${radius}px`,
          transition: 'height 0.9s linear',
          overflow: 'hidden',
        }}>
          {/* Wave top edge */}
          {!charged && <>
            <div style={{ position: 'absolute', top: -5, left: 0, right: 0, height: 10, background: 'rgba(255,255,255,0.22)', borderRadius: '50% 50% 0 0 / 100% 100% 0 0', animation: 'bpWave1 1.6s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', top: -4, left: 0, right: 0, height: 8, background: 'rgba(255,255,255,0.15)', borderRadius: '50% 50% 0 0 / 100% 100% 0 0', animation: 'bpWave2 2.1s ease-in-out infinite reverse' }} />
          </>}
          {/* Bubbles */}
          {!charged && [
            { s: 3, l: '22%', d: '0s', dur: '1.8s' },
            { s: 2, l: '60%', d: '0.6s', dur: '2.2s' },
          ].map((b, i) => (
            <div key={i} style={{ position: 'absolute', bottom: '5%', width: b.s, height: b.s, borderRadius: '50%', background: 'rgba(255,255,255,0.7)', left: b.l, animation: `bpRise ${b.dur} ease-in infinite`, animationDelay: b.d }} />
          ))}
        </div>

        {/* Icon + % */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          {loading
            ? <Loader2 size={iconSize} color={iconColor} className="animate-spin" />
            : <Zap size={iconSize} color={iconColor} fill={charged ? iconColor : 'none'} strokeWidth={charged ? 0 : 2} />
          }
          {!charged && !loading && (
            <span style={{ fontSize: textSize, fontWeight: 900, color: iconColor, lineHeight: 1 }}>{pct}%</span>
          )}
        </div>
      </div>

      {/* Confirm sheet */}
      {showConfirm && createPortal(
        <div className="mobile-sheet-overlay" onClick={() => setShowConfirm(false)}>
          <div dir="rtl" className="mobile-sheet" style={{ width: '100%', maxWidth: 480, padding: '24px 20px 0' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 20px' }} />
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>⚡</div>
              <div style={{ fontSize: 19, fontWeight: 900, color: '#0f1e40', marginBottom: 10 }}>שגר איתות נוסף</div>
              <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 16 }}>
                האיתות ישלח לכל העובדים הרלוונטיים באזור שלך — על בסיס קטגוריה, ניסיון והיסטוריית פעילות.
              </div>
              <div style={{ background: '#faf5ff', border: '1.5px solid #d8b4fe', borderRadius: 14, padding: '12px 16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>עלות: {BOOST_COST} ג'ובות</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
              <button
                onClick={() => { setShowConfirm(false); handleBoost(); }}
                disabled={loading}
                style={{ width: '100%', height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', border: 'none', color: 'white', fontWeight: 900, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 18px rgba(124,58,237,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <><Zap size={16} fill="white" /> שגר עכשיו — {BOOST_COST} ג'ובות</>}
              </button>
              <button onClick={() => setShowConfirm(false)}
                style={{ width: '100%', height: 46, borderRadius: 16, background: 'none', border: '1px solid #e8edf5', color: '#64748b', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                ביטול
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Boost overlay animation */}
      {showOverlay && (
        <BoostOverlay
          taskId={task.id}
          taskTitle={task.title}
          taskPrice={task.price}
          taskCategory={task.category}
          onDismiss={() => setShowOverlay(false)}
        />
      )}

      <style>{`
        @keyframes bpWave1 { 0%{transform:translateX(0%) scaleY(1)} 50%{transform:translateX(-8%) scaleY(1.4)} 100%{transform:translateX(0%) scaleY(1)} }
        @keyframes bpWave2 { 0%{transform:translateX(0%) scaleY(1)} 50%{transform:translateX(8%) scaleY(1.6)} 100%{transform:translateX(0%) scaleY(1)} }
        @keyframes bpRise  { 0%{transform:translateY(0) scale(1);opacity:0.8} 80%{opacity:0.6} 100%{transform:translateY(-80px) scale(0.4);opacity:0} }
      `}</style>
    </>
  );
}