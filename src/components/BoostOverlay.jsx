/**
 * BoostOverlay — purple-themed animation after a task Boost action.
 * Same structure as LiveSearchOverlay but purple palette.
 */
import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const LOGO = 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg';

const CATEGORY_NAME_PLURAL = {
  plumbing: 'אינסטלטורים', electricity: 'חשמלאים', gardening: 'גננים',
  cleaning: 'מנקים', moving: 'עוזרי הובלה', painting: 'צבעים',
  carpentry: 'נגרים', ac: 'טכנאי מזגנים', locksmith: 'מנעולנים',
  shopping: 'שליחים', delivery: 'שליחים', babysitting: 'מטפלים',
  tutoring: 'מורים פרטיים', it_support: 'תומכי IT', other: 'עובדים'
};

const BOOST_CSS = `
  @keyframes boostGlow   { 0%,100%{box-shadow:0 6px 28px rgba(168,85,247,0.45);}50%{box-shadow:0 10px 44px rgba(168,85,247,0.82);} }
  @keyframes boostFloat  { 0%,100%{transform:translateY(0) scale(1);}50%{transform:translateY(-6px) scale(1.04);} }
  @keyframes boostStar   { 0%,100%{opacity:.12;}50%{opacity:.55;} }
  @keyframes radarBoost  { to{transform:rotate(360deg);} }
  @keyframes radarPulseB { 0%,100%{transform:scale(1);opacity:.15;}50%{transform:scale(1.06);opacity:.28;} }
  @keyframes workerDot   { 0%{transform:scale(.4);opacity:0;}40%{transform:scale(1.4);opacity:1;}100%{transform:scale(1);opacity:.9;} }
  @keyframes dotBlinkB   { 0%,80%,100%{opacity:0;}40%{opacity:1;} }
  @keyframes boostOrbit1 { to{transform:rotate(360deg);} }
  @keyframes boostOrbit2 { to{transform:rotate(-360deg);} }
`;

function injectBoostCSS() {
  if (document.getElementById('boost-styles')) return;
  const s = document.createElement('style');
  s.id = 'boost-styles';
  s.textContent = BOOST_CSS;
  document.head.appendChild(s);
}

// ── Launch Scene ──────────────────────────────────────────────────────────────
function LaunchScene({ taskTitle, taskPrice, onContinue }) {
  const [phase, setPhase] = useState('idle');
  const [showParticles, setShowParticles] = useState(false);

  useEffect(() => {
    injectBoostCSS();
    try { navigator.vibrate?.([80, 30, 120, 20, 60]); } catch (_) {}
    const T = [];
    const s = (fn, ms) => { const id = setTimeout(fn, ms); T.push(id); };
    setPhase('enter');
    s(() => setShowParticles(true), 400);
    s(() => setShowParticles(false), 1800);
    s(() => setPhase('reveal'), 900);
    return () => T.forEach(clearTimeout);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', height: '100%', width: '100%', padding: '0 0 24px' }}>
      {/* Stars */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} style={{ position: 'absolute', left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, width: 1.5 + Math.random() * 2, height: 1.5 + Math.random() * 2, borderRadius: '50%', background: '#d8b4fe', animation: `boostStar ${1.5 + Math.random() * 3}s ease-in-out infinite`, animationDelay: `${Math.random() * 3}s` }} />
        ))}
      </div>

      {/* Radar rings */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        {[1, 0.72, 0.48, 0.28].map((r, i) => (
          <div key={i} style={{ position: 'absolute', width: `${r * 320}px`, height: `${r * 320}px`, borderRadius: '50%', border: `1px solid rgba(168,85,247,${0.08 + i * 0.04})`, animation: `radarPulseB ${2.4 + i * 0.45}s ease-in-out infinite`, animationDelay: `${i * 0.28}s` }} />
        ))}
      </div>

      {/* Logo + orbits */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <motion.div initial={{ scale: 0, rotate: -18 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 8, stiffness: 140 }} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Orbit 1 */}
          <div style={{ position: 'absolute', inset: -22, borderRadius: '50%', border: '1.5px dashed rgba(168,85,247,.45)', animation: 'boostOrbit1 3s linear infinite', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%)', width: 9, height: 9, borderRadius: '50%', background: '#c084fc', boxShadow: '0 0 8px #c084fc' }} />
          </div>
          {/* Orbit 2 */}
          <div style={{ position: 'absolute', inset: -34, borderRadius: '50%', border: '1px solid rgba(192,132,252,.28)', animation: 'boostOrbit2 2.4s linear infinite', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 6, height: 6, borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 7px #a855f7' }} />
          </div>
          {/* Logo */}
          <div style={{ width: 92, height: 92, borderRadius: '50%', overflow: 'hidden', border: '2.5px solid #c084fc', boxShadow: '0 0 0 4px rgba(192,132,252,.22), 0 0 28px rgba(168,85,247,.55)', animation: 'boostFloat 2.2s ease-in-out infinite' }}>
            <img src={LOGO} alt="Joba24" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          {/* Particles burst */}
          {showParticles && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', zIndex: 30 }}>
              {Array.from({ length: 24 }).map((_, i) => {
                const angle = (i / 24) * 360;
                const dist = 40 + Math.random() * 65;
                const tx = Math.cos((angle * Math.PI) / 180) * dist;
                const ty = Math.sin((angle * Math.PI) / 180) * dist * 0.7;
                const colors = ['#c084fc', '#a855f7', '#e879f9', '#7c3aed', '#f0abfc', '#ddd6fe'];
                return (
                  <motion.div key={i} initial={{ x: 0, y: 0, scale: 0.2, opacity: 1 }} animate={{ x: tx, y: ty, scale: [1.1, 0.3], opacity: [1, 0] }} transition={{ duration: 1.0 + Math.random() * 0.4, delay: Math.random() * 0.1 }}
                    style={{ position: 'absolute', width: 6 + Math.random() * 5, height: 6 + Math.random() * 5, borderRadius: '50%', background: colors[i % colors.length], transform: 'translate(-50%,-50%)' }} />
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Text block */}
      <AnimatePresence>
        {phase === 'reveal' && (
          <motion.div key="text" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 14, stiffness: 150 }} style={{ textAlign: 'center', padding: '0 28px', width: '100%', marginBottom: 16 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#ffffff', letterSpacing: -0.5, lineHeight: 1.25, marginBottom: 12, textShadow: '0 0 24px rgba(168,85,247,.7)' }}>
              האיתות שוגר! ⚡
            </div>
            {(taskTitle || taskPrice) && (
              <div style={{ background: 'rgba(168,85,247,.12)', border: '1px solid rgba(168,85,247,.3)', borderRadius: 12, padding: '7px 16px', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'rgba(255,255,255,.88)', fontWeight: 700, marginBottom: 14, maxWidth: 280 }}>
                {taskTitle && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 188 }}>"{taskTitle}"</span>}
                {taskPrice && <span style={{ color: '#c084fc', fontWeight: 900, flexShrink: 0 }}>₪{taskPrice}</span>}
              </div>
            )}
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', fontWeight: 600 }}>פופאפ נשלח לכל העובדים המתאימים</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <AnimatePresence>
        {phase === 'reveal' && (
          <motion.button key="cta" initial={{ opacity: 0, y: 18, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.3, type: 'spring', damping: 12, stiffness: 180 }}
            onClick={onContinue}
            style={{ background: 'linear-gradient(135deg,#c084fc,#a855f7)', border: 'none', borderRadius: 14, padding: '15px 0', width: 'calc(100% - 48px)', color: 'white', fontSize: 16, fontWeight: 900, cursor: 'pointer', zIndex: 30, animation: 'boostGlow 2s ease-in-out infinite', WebkitTapHighlightColor: 'transparent' }}>
            המשך ›
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Boost Scanner ──────────────────────────────────────────────────────────────
function BoostScanner({ taskId, taskTitle, taskPrice, taskCategory, onNavigate }) {
  const [workerCount, setWorkerCount] = useState(0);
  const [pulseWorkers, setPulseWorkers] = useState([]);
  const [statusMsg, setStatusMsg] = useState('שולח פופאפ לעובדים מתאימים...');

  const goToTask = () => { onNavigate?.(); };

  const { data: allUsers = [] } = useQuery({
    queryKey: ['workerPool'],
    queryFn: () => base44.entities.User.list('-last_active_at', 500),
    staleTime: 5 * 60 * 1000,
  });

  const categoryWorkerCount = (() => {
    if (!taskCategory || !allUsers.length) return 0;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return allUsers.filter(u => u.preferred_categories?.includes(taskCategory) && u.last_active_at && new Date(u.last_active_at) >= sevenDaysAgo).length;
  })();

  useEffect(() => {
    if (!taskId) return;
    base44.entities.TaskApplication.filter({ task_id: taskId }).then(apps => setWorkerCount(apps.length));
  }, [taskId]);

  useEffect(() => {
    const msgs = ['שולח פופאפ לעובדים מתאימים...', 'מחפש עובדים מתאימים לפי קטגוריה', 'מגביר חשיפה בפיד', 'סורק פרופילים מתאימים', 'מרחיב חשיפה לעובדים פעילים'];
    let i = 0;
    const iv = setInterval(() => { if (i < msgs.length) { setStatusMsg(msgs[i]); i++; } else clearInterval(iv); }, 2800);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseWorkers(prev => [...prev.slice(-6), { id: Date.now(), angle: Math.random() * 360, dist: 35 + Math.random() * 45 }]);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!taskId) return;
    const unsub = base44.entities.TaskApplication.subscribe((event) => {
      if (event.data?.task_id === taskId && event.type === 'create') {
        setWorkerCount(c => c + 1);
        setStatusMsg('התקבלה מועמדות ראשונה! 🎯');
      }
    });
    return () => unsub();
  }, [taskId]);

  useEffect(() => { const t = setTimeout(() => goToTask(), 8000); return () => clearTimeout(t); }, []);

  const dotX = (a, d) => 50 + d * Math.cos((a * Math.PI) / 180);
  const dotY = (a, d) => 50 + d * Math.sin((a * Math.PI) / 180);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', height: '100%', width: '100%', padding: '0 0 24px' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ textAlign: 'center', padding: '12px 24px 0', width: '100%' }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginBottom: 5, letterSpacing: 1, fontWeight: 600, textTransform: 'uppercase' }}>Boost · Joba24</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#ffffff', lineHeight: 1.25, marginBottom: 6 }}>מרחיב חשיפה לעובדים מתאימים</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {taskTitle && <span style={{ fontWeight: 700, color: 'rgba(255,255,255,.75)' }}>"{taskTitle}"</span>}
          {taskPrice && <><span style={{ color: 'rgba(255,255,255,.3)' }}>·</span><span style={{ color: '#c084fc', fontWeight: 800 }}>₪{taskPrice}</span></>}
        </div>
      </motion.div>

      {/* Radar — purple themed */}
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, duration: 0.4 }} style={{ position: 'relative', width: 230, height: 230 }}>
        {[100, 78, 56, 36].map((size, i) => (
          <div key={i} style={{ position: 'absolute', inset: `${(100 - size) / 2}%`, borderRadius: '50%', border: `1px solid rgba(192,132,252,${0.08 + i * 0.04})`, animation: `radarPulseB ${2.5 + i * 0.4}s ease-in-out infinite`, animationDelay: `${i * 0.3}s` }} />
        ))}
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'conic-gradient(from 0deg, transparent 75%, rgba(192,132,252,.35) 100%)', animation: 'radarBoost 2.8s linear infinite', borderRadius: '50%' }} />
        </div>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 13, height: 13, borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 16px #a855f7, 0 0 36px rgba(168,85,247,.4)' }} />
        {pulseWorkers.map(w => (
          <div key={w.id} style={{ position: 'absolute', left: `${dotX(w.angle, w.dist)}%`, top: `${dotY(w.angle, w.dist)}%`, transform: 'translate(-50%,-50%)', width: 9, height: 9, borderRadius: '50%', background: '#c084fc', boxShadow: '0 0 9px #c084fc', animation: 'workerDot 1.4s ease-out forwards' }} />
        ))}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.08 }}>
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#c084fc" strokeWidth="1" />
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#c084fc" strokeWidth="1" />
        </svg>
      </motion.div>

      {/* Status */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%', padding: '0 24px' }}>
        <div key={statusMsg} style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', textAlign: 'center', animation: 'slideUpIn2 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          <span style={{ display: 'flex', gap: 3 }}>
            {[0.1, 0.3, 0.5].map((d, i) => (
              <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#c084fc', display: 'inline-block', animation: `dotBlinkB 1.2s ${d}s infinite` }} />
            ))}
          </span>
          {statusMsg}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(192,132,252,.1)', border: '1px solid rgba(192,132,252,.28)', borderRadius: 99, padding: '7px 16px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c084fc', display: 'inline-block', animation: 'dotBlinkB 1.2s .1s infinite' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#c084fc' }}>{CATEGORY_NAME_PLURAL[taskCategory] || 'עובדים'} מקבלים את האיתות</span>
        </div>
      </motion.div>

      <motion.button initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        onClick={goToTask}
        style={{ background: 'rgba(192,132,252,.12)', border: '1px solid rgba(192,132,252,.35)', borderRadius: 14, padding: '14px 0', width: 'calc(100% - 48px)', color: '#ffffff', fontSize: 15, fontWeight: 700, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
        המשך
      </motion.button>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function BoostOverlay({ taskId, taskTitle, taskPrice, taskCategory, onDismiss }) {
  const [step, setStep] = useState('launch'); // 'launch' | 'scanner'

  const handleDismiss = () => { onDismiss?.(); };

  return createPortal(
    <div onClick={handleDismiss} dir="rtl" style={{ position: 'fixed', inset: 0, zIndex: 9999998, background: 'linear-gradient(160deg, #1a0535 0%, #2d0a5e 55%, #3b0d78 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingTop: 'max(20px, env(safe-area-inset-top))', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <AnimatePresence mode="wait">
          {step === 'launch' ? (
            <motion.div key="launch" onClick={e => e.stopPropagation()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.32 }} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <LaunchScene taskTitle={taskTitle} taskPrice={taskPrice} onContinue={() => setStep('scanner')} />
            </motion.div>
          ) : (
            <motion.div key="scanner" onClick={e => e.stopPropagation()} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.32 }} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
              <button onClick={handleDismiss} style={{ position: 'absolute', top: 0, left: 16, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 20, padding: '7px 14px', color: 'rgba(255,255,255,.8)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, zIndex: 10 }}>
                <X size={14} /> סגור
              </button>
              <BoostScanner taskId={taskId} taskTitle={taskTitle} taskPrice={taskPrice} taskCategory={taskCategory} onNavigate={onDismiss} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>,
    document.body
  );
}