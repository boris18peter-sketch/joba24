/**
 * LiveSearchOverlay — single-page flow:
 *   Step 1: Celebration (logo + map animation)
 *   Step 2: Scanner (radar) — revealed when user taps "המשך"
 *   No portals, no separate pages. Renders inline replacing CreateTask content.
 */
import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

// ── Shared Logo ───────────────────────────────────────────────────────────────
const LOGO = 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg';

const CATEGORY_NAME_PLURAL = {
  plumbing: 'אינסטלטורים', electricity: 'חשמלאים', gardening: 'גננים',
  cleaning: 'מנקים', moving: 'עוזרי הובלה', painting: 'צבעים',
  carpentry: 'נגרים', ac: 'טכנאי מזגנים', locksmith: 'מנעולנים',
  shopping: 'שליחים', delivery: 'שליחים', babysitting: 'מטפלים',
  tutoring: 'מורים פרטיים', it_support: 'תומכי IT', other: 'עובדים'
};

// ── CSS (injected once) ───────────────────────────────────────────────────────
const ANIM_CSS = `
  @keyframes lsoRingSpin { to { transform: rotate(360deg); } }
  @keyframes lsoPulse    { 0%,100%{opacity:.14;transform:scale(1);}50%{opacity:.26;transform:scale(1.06);} }
  @keyframes lsoBlink    { 0%,80%,100%{opacity:0;}40%{opacity:1;} }
  @keyframes lsoSlideUp  { from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);} }
  @keyframes lsoWorkerPing { 0%{transform:scale(.4);opacity:0;}40%{transform:scale(1.4);opacity:1;}100%{transform:scale(1);opacity:.9;} }
  @keyframes lsoFoundPop { 0%{transform:scale(.7);opacity:0;}70%{transform:scale(1.12);}100%{transform:scale(1);opacity:1;} }
  @keyframes lsoLogoFloat { 0%,100%{transform:translateY(0) scale(1);}50%{transform:translateY(-5px) scale(1.03);} }
  @keyframes lsoGlowPulse { 0%,100%{box-shadow:0 6px 28px rgba(251,191,36,.45);}50%{box-shadow:0 10px 44px rgba(251,191,36,.75);} }
  @keyframes lsoOrbit1    { to{transform:rotate(360deg);} }
  @keyframes lsoOrbit2    { to{transform:rotate(-360deg);} }
  @keyframes lsoShake     { 0%,100%{transform:translate(0,0);}20%{transform:translate(-9px,4px);}40%{transform:translate(8px,-4px);}60%{transform:translate(-6px,3px);}80%{transform:translate(5px,-2px);} }
  @keyframes lsoStarTwinkle { 0%,100%{opacity:.12;}50%{opacity:.55;} }
`;

function injectCSS() {
  if (document.getElementById('lso-styles')) return;
  const s = document.createElement('style');
  s.id = 'lso-styles';
  s.textContent = ANIM_CSS;
  document.head.appendChild(s);
}

const CELEBRATION_STATUS_MSGS = [
  'מאותת לעובדים',
  'סורק עובדים בקרבת מקום',
  'מחפש התאמות',
  'מגביר חשיפה',
  'מפיץ את המשימה',
  'מרחיב חשיפה',
];

function RotatingStatusMsgs() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setIdx(i => (i + 1) % CELEBRATION_STATUS_MSGS.length), 2800);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          style={{
            fontSize: 13, color: 'rgba(255,255,255,.6)', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'lsoBlink 1.2s .1s infinite', flexShrink: 0 }} />
          {CELEBRATION_STATUS_MSGS[idx]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Celebration
// ─────────────────────────────────────────────────────────────────────────────
function CelebrationStep({ taskTitle, taskPrice, taskLocation, onContinue }) {
  const [phase, setPhase] = useState('idle');
  // idle → enter → descend → land → slam → reveal
  const [showMap,       setShowMap]       = useState(false);
  const [showFlag,      setShowFlag]      = useState(false);
  const [shakeActive,   setShakeActive]   = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [showShockwave, setShowShockwave] = useState(false);
  const [waveKey,       setWaveKey]       = useState(0);

  useEffect(() => {
    injectCSS();
    try { navigator.vibrate?.(30); } catch (_) {}

    const T = [];
    const s = (fn, ms) => { const id = setTimeout(fn, ms); T.push(id); };

    setPhase('enter');
    s(() => setPhase('descend'),              600);
    s(() => setShowMap(true),                1200);
    s(() => { setPhase('land'); },           1650);
    s(() => {
      setPhase('slam');
      setShowFlag(true);
      setShakeActive(true);
      setShowShockwave(true);
      setWaveKey(k => k + 1);
      try { navigator.vibrate?.([160, 20, 80, 15, 50]); } catch (_) {}
    }, 2050);
    s(() => setShowParticles(true),          2150);
    s(() => setShakeActive(false),           2420);
    s(() => setShowParticles(false),         3600);
    s(() => setPhase('reveal'),              2500);

    return () => T.forEach(clearTimeout);
  }, []);

  const logoY = (phase === 'land' || phase === 'slam' || phase === 'reveal') ? 105 : 0;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'space-between', height: '100%', width: '100%',
      padding: '0 0 24px',
    }}>
      {/* Stars bg */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: 28 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: 1.5 + Math.random() * 2,
            height: 1.5 + Math.random() * 2,
            borderRadius: '50%', background: '#60a5fa',
            animation: `lsoStarTwinkle ${1.5 + Math.random() * 3}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
          }} />
        ))}
      </div>

      {/* Radar rings */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        {[1, 0.72, 0.48, 0.28].map((r, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: `${r * 320}px`, height: `${r * 320}px`,
            borderRadius: '50%',
            border: `1px solid rgba(96,165,250,${0.06 + i * 0.04})`,
            animation: `lsoPulse ${2.4 + i * 0.45}s ease-in-out infinite`,
            animationDelay: `${i * 0.28}s`,
          }} />
        ))}
      </div>

      {/* ── Scene ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', position: 'relative' }}>

        {/* Camera shake wrapper */}
        <div style={{
          animation: shakeActive ? 'lsoShake 0.38s ease' : 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          position: 'relative', width: 260, height: 280,
          left: '50%', transform: 'translateX(-50%)',
        }}>

          {/* Logo — animates down onto map */}
          <motion.div
            animate={{ y: logoY }}
            transition={
              phase === 'descend' ? { type: 'spring', damping: 5.5, stiffness: 52 }
                : (phase === 'land' || phase === 'slam') ? { type: 'spring', damping: 7, stiffness: 280 }
                : { duration: 0 }
            }
            style={{
              position: 'absolute', top: 28, left: '50%', transform: 'translateX(-50%)',
              zIndex: 15,
            }}
          >
            {/* Descent trail */}
            {phase === 'descend' && (
              <motion.div
                initial={{ scaleY: 0.1, opacity: 0.9 }}
                animate={{ scaleY: [0.3, 1, 0], opacity: [0.8, 0.5, 0] }}
                transition={{ duration: 0.65, repeat: 1 }}
                style={{
                  position: 'absolute', top: '100%', left: '50%',
                  transform: 'translateX(-50%)',
                  width: 5, height: 50, originY: 0,
                  background: 'linear-gradient(to bottom, rgba(251,191,36,.8), transparent)',
                  borderRadius: 3, pointerEvents: 'none',
                }}
              />
            )}

            {/* Orbit 1 */}
            {phase !== 'descend' && (
              <div style={{
                position: 'absolute', inset: -18, borderRadius: '50%',
                border: '1.5px dashed rgba(251,191,36,.45)',
                animation: 'lsoOrbit1 3s linear infinite',
                pointerEvents: 'none',
              }}>
                <div style={{
                  position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%)',
                  width: 9, height: 9, borderRadius: '50%',
                  background: '#fbbf24', boxShadow: '0 0 8px #fbbf24',
                }} />
              </div>
            )}
            {/* Orbit 2 */}
            {phase !== 'descend' && (
              <div style={{
                position: 'absolute', inset: -28, borderRadius: '50%',
                border: '1px solid rgba(96,165,250,.28)',
                animation: 'lsoOrbit2 2s linear infinite',
                pointerEvents: 'none',
              }}>
                <div style={{
                  position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#60a5fa', boxShadow: '0 0 7px #60a5fa',
                }} />
              </div>
            )}

            {/* Glow */}
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.35, 0.6, 0.35] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                position: 'absolute', width: 100, height: 100, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(251,191,36,.3) 0%, transparent 70%)',
                top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                pointerEvents: 'none',
              }}
            />

            {/* Logo image */}
            <motion.div
              initial={{ scale: 0, rotate: -18 }}
              animate={
                phase === 'enter'   ? { scale: [0, 1.3, 1], rotate: [-18, 5, 0] }
                  : (phase === 'land' || phase === 'slam') ? { scale: [1, 1.25, 0.9, 1.04, 1] }
                  : { scale: 1 }
              }
              transition={{ type: 'spring', damping: 7, stiffness: 140 }}
              style={{
                width: 82, height: 82, borderRadius: '50%', overflow: 'hidden',
                border: '2.5px solid #fbbf24',
                boxShadow: '0 0 0 4px rgba(251,191,36,.22), 0 0 28px rgba(251,191,36,.5)',
                animation: phase === 'reveal' ? 'lsoLogoFloat 2.2s ease-in-out infinite' : 'none',
                position: 'relative',
              }}
            >
              <img src={LOGO} alt="Joba24" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </motion.div>

            {/* Flag */}
            <AnimatePresence>
              {showFlag && (
                <motion.div
                  key="flag"
                  initial={{ scale: 0, y: 18, rotate: -50, opacity: 0 }}
                  animate={{ scale: [0, 1.4, 1], y: [18, -10, 0], rotate: [-50, 7, 0], opacity: 1 }}
                  transition={{ type: 'spring', damping: 6, stiffness: 260 }}
                  style={{
                    position: 'absolute', top: -14, right: -12, fontSize: 30,
                    filter: 'drop-shadow(0 0 10px rgba(251,191,36,.7))',
                    zIndex: 20,
                  }}
                >
                  🚩
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Shockwave */}
          <AnimatePresence>
            {showShockwave && (
              <motion.div
                key={waveKey}
                initial={{ scale: 0.15, opacity: 1 }}
                animate={{ scale: 5.5, opacity: 0 }}
                exit={{}}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                style={{
                  position: 'absolute', bottom: 72, left: '50%', transform: 'translateX(-50%)',
                  width: 90, height: 90, borderRadius: '50%',
                  border: '2.5px solid rgba(251,191,36,.85)',
                  pointerEvents: 'none', zIndex: 8,
                }}
              />
            )}
          </AnimatePresence>

          {/* Particles burst */}
          {showParticles && (
            <div style={{ position: 'absolute', bottom: 72, left: '50%', transform: 'translateX(-50%)', zIndex: 30 }}>
              {Array.from({ length: 30 }).map((_, i) => {
                const angle = (i / 30) * 360;
                const dist  = 40 + Math.random() * 80;
                const tx    = Math.cos((angle * Math.PI) / 180) * dist;
                const ty    = Math.sin((angle * Math.PI) / 180) * dist * 0.7 - 20;
                const colors = ['#fbbf24', '#f59e0b', '#60a5fa', '#4ade80', '#a855f7', '#ef4444', '#fde68a'];
                const color  = colors[i % colors.length];
                const isCoin = i < 13;
                const size   = isCoin ? 14 + Math.random() * 6 : 5 + Math.random() * 6;
                return (
                  <motion.div
                    key={i}
                    initial={{ x: 0, y: 0, scale: 0.2, opacity: 1 }}
                    animate={{ x: tx, y: [ty * 0.3, ty + dist], scale: [1.2, 0.4], opacity: [1, 1, 0], rotate: Math.random() * 720 }}
                    transition={{ duration: 1 + Math.random() * 0.5, delay: Math.random() * 0.12 }}
                    style={{
                      position: 'absolute', width: size, height: size,
                      borderRadius: isCoin ? '50%' : 2,
                      background: isCoin ? `radial-gradient(circle at 35% 35%, #fde68a, ${color})` : color,
                      boxShadow: isCoin ? `0 0 6px ${color}88` : 'none',
                      top: 0, left: 0,
                      display: isCoin ? 'flex' : undefined,
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: 8, fontWeight: 900, color: '#7c2d00',
                    }}
                  >
                    {isCoin && '₪'}
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Dust puff */}
          <AnimatePresence>
            {(phase === 'land' || phase === 'slam') && (
              <motion.div
                key="dust"
                initial={{ scaleX: 0.1, opacity: 0.85 }}
                animate={{ scaleX: [0.1, 3.2, 4], opacity: [0.85, 0.45, 0] }}
                exit={{}}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{
                  position: 'absolute', bottom: 74, left: '50%', transform: 'translateX(-50%)',
                  width: 140, height: 16, borderRadius: '50%',
                  background: 'radial-gradient(ellipse, rgba(251,191,36,.4) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }}
              />
            )}
          </AnimatePresence>

          {/* Map pad */}
          <AnimatePresence>
            {showMap && (
              <motion.div
                key="map"
                initial={{ scale: 0.5, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ type: 'spring', damping: 14, stiffness: 150 }}
                style={{
                  position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 200, height: 105, borderRadius: 18,
                  background: 'linear-gradient(145deg, #071a42, #0d2860)',
                  border: '2px solid #fbbf24',
                  boxShadow: '0 0 0 3px rgba(251,191,36,.15), 0 12px 36px rgba(0,0,0,.55)',
                  overflow: 'hidden', position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                }}
              >
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.12 }}>
                  {[22,44,66,88].map(y => <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="#60a5fa" strokeWidth="1" />)}
                  {[25,50,75,100,125,150,175].map(x => <line key={x} x1={x} y1="0" x2={x} y2="105" stroke="#60a5fa" strokeWidth="1" />)}
                </svg>
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.42 }}>
                  <path d="M0 52 Q50 42 100 52 Q150 62 200 52" stroke="#4ade80" strokeWidth="7" fill="none" strokeLinecap="round" />
                  <path d="M100 0 Q96 26 100 52 Q104 78 100 105" stroke="#4ade80" strokeWidth="5" fill="none" strokeLinecap="round" />
                  <path d="M0 78 Q60 70 125 78 Q165 84 200 76" stroke="#34d399" strokeWidth="3" fill="none" strokeLinecap="round" />
                </svg>
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.2 }}>
                  <rect x="14" y="8"  width="48" height="28" rx="4" fill="#4ade80" />
                  <rect x="82" y="12" width="34" height="24" rx="4" fill="#34d399" />
                  <rect x="132" y="6" width="52" height="34" rx="4" fill="#4ade80" />
                  <rect x="12" y="64" width="62" height="30" rx="4" fill="#34d399" />
                  <rect x="132" y="68" width="58" height="28" rx="4" fill="#4ade80" />
                </svg>
                {/* Ping dot */}
                <motion.div
                  animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0.1, 0.5] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%,-50%)',
                    width: 30, height: 30, borderRadius: '50%',
                    background: 'rgba(251,191,36,.28)', border: '1.5px solid rgba(251,191,36,.5)',
                  }}
                />
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%,-50%)',
                  width: 10, height: 10, borderRadius: '50%',
                  background: '#fbbf24', boxShadow: '0 0 12px #fbbf24',
                }} />
                {taskLocation && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    textAlign: 'center', fontSize: 10, fontWeight: 800, color: '#fbbf24',
                    background: 'rgba(5,17,46,.72)', padding: '3px 8px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {taskLocation}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Text block ── */}
        <AnimatePresence>
          {phase === 'reveal' && (
            <motion.div
              key="text"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 14, stiffness: 150 }}
              style={{ textAlign: 'center', padding: '0 28px', marginTop: 20, width: '100%' }}
            >
              {/* Title */}
              <div style={{
                fontSize: 26, fontWeight: 900, color: '#ffffff',
                letterSpacing: -0.5, lineHeight: 1.25, marginBottom: 10,
                textShadow: '0 0 24px rgba(251,191,36,.6)',
              }}>
                המשימה שלך באוויר
              </div>

              {/* Task pill */}
              {(taskTitle || taskPrice) && (
                <div style={{
                  background: 'rgba(96,165,250,.1)',
                  border: '1px solid rgba(96,165,250,.25)',
                  borderRadius: 12, padding: '7px 16px',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  fontSize: 14, color: 'rgba(255,255,255,.88)', fontWeight: 700,
                  marginBottom: 14, maxWidth: 280,
                }}>
                  {taskTitle && (
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 188 }}>
                      "{taskTitle}"
                    </span>
                  )}
                  {taskPrice && (
                    <span style={{ color: '#4ade80', fontWeight: 900, flexShrink: 0 }}>
                      ₪{taskPrice}
                    </span>
                  )}
                </div>
              )}

              {/* Rotating status messages */}
              <RotatingStatusMsgs />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── CTA ── */}
      <AnimatePresence>
        {phase === 'reveal' && (
          <motion.button
            key="cta"
            initial={{ opacity: 0, y: 18, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.55, type: 'spring', damping: 12, stiffness: 180 }}
            onClick={onContinue}
            style={{
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              border: 'none', borderRadius: 14,
              padding: '15px 0', width: 'calc(100% - 48px)',
              color: '#5a1800', fontSize: 16, fontWeight: 900,
              cursor: 'pointer', zIndex: 30,
              letterSpacing: 0.2,
              animation: 'lsoGlowPulse 2s ease-in-out infinite',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            המשך
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Scanner
// ─────────────────────────────────────────────────────────────────────────────
function ScannerStep({ taskId, taskTitle, taskPrice, taskCategory, taskLocation, onNavigate }) {
  const navigate = useNavigate();
  const [workerCount,       setWorkerCount]       = useState(0);
  const [pulseWorkers,      setPulseWorkers]       = useState([]);
  const [firstAppReceived,  setFirstAppReceived]   = useState(false);
  const [statusMsg,         setStatusMsg]           = useState('שולח התראות לעובדים...');

  const goToTask = () => {
    onNavigate?.();
    navigate(`/task/${taskId}`);
  };

  const { data: allUsers = [] } = useQuery({
    queryKey: ['workerPool'],
    queryFn: () => base44.entities.User.list('-last_active_at', 500),
    staleTime: 5 * 60 * 1000,
  });

  const categoryWorkerCount = (() => {
    if (!taskCategory || !allUsers.length) return 0;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return allUsers.filter(u =>
      u.preferred_categories?.includes(taskCategory) &&
      u.last_active_at && new Date(u.last_active_at) >= sevenDaysAgo
    ).length;
  })();

  useEffect(() => {
    if (!taskId) return;
    base44.entities.TaskApplication.filter({ task_id: taskId })
      .then(apps => setWorkerCount(apps.length));
  }, [taskId]);

  useEffect(() => {
    const msgs = [
      'מאותת לעובדים...',
      'סורק עובדים בקרבת מקום',
      'מחפש התאמות',
      'מגביר חשיפה',
      'מפיץ את המשימה',
      'מרחיב חשיפה',
    ];
    let i = 0;
    const iv = setInterval(() => {
      if (i < msgs.length) { setStatusMsg(msgs[i]); i++; }
      else clearInterval(iv);
    }, 3200);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseWorkers(prev => [...prev.slice(-6), {
        id: Date.now(),
        angle: Math.random() * 360,
        dist: 35 + Math.random() * 45,
      }]);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!taskId) return;
    const unsub = base44.entities.TaskApplication.subscribe((event) => {
      if (event.data?.task_id === taskId && event.type === 'create') {
        setWorkerCount(c => c + 1);
        setFirstAppReceived(true);
        setStatusMsg('התקבלה מועמדות ראשונה');
      }
    });
    return () => unsub();
  }, [taskId]);

  // Auto-navigate to task detail after 8 seconds
  useEffect(() => {
    const t = setTimeout(() => goToTask(), 8000);
    return () => clearTimeout(t);
  }, []);

  const dotX = (a, d) => 50 + d * Math.cos((a * Math.PI) / 180);
  const dotY = (a, d) => 50 + d * Math.sin((a * Math.PI) / 180);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'space-between', height: '100%', width: '100%',
      padding: '0 0 24px',
    }}>
      <style>{`
        @keyframes radarSpin   { to { transform: rotate(360deg); } }
        @keyframes radarPulse2 { 0%,100%{transform:scale(1);opacity:.15;}50%{transform:scale(1.06);opacity:.26;} }
        @keyframes workerPing2 { 0%{transform:scale(.4);opacity:0;}40%{transform:scale(1.4);opacity:1;}100%{transform:scale(1);opacity:.9;} }
        @keyframes dotBlink2   { 0%,80%,100%{opacity:0;}40%{opacity:1;} }
        @keyframes slideUpIn2  { from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);} }
        @keyframes foundPop2   { 0%{transform:scale(.7);opacity:0;}70%{transform:scale(1.12);}100%{transform:scale(1);opacity:1;} }
      `}</style>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ textAlign: 'center', paddingTop: 12, padding: '12px 24px 0', width: '100%' }}
      >
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginBottom: 5, letterSpacing: 1, fontWeight: 600, textTransform: 'uppercase' }}>
          {firstAppReceived ? 'נמצא עובד' : 'שוק חי · Joba24'}
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#ffffff', lineHeight: 1.25, marginBottom: 6 }}>
          {firstAppReceived
            ? <span style={{ animation: 'foundPop2 0.5s ease' }}>התקבלה מועמדות</span>
            : 'מחפשים את העובד המושלם'}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {taskTitle && <span style={{ fontWeight: 700, color: 'rgba(255,255,255,.75)' }}>"{taskTitle}"</span>}
          {taskPrice && <><span style={{ color: 'rgba(255,255,255,.3)' }}>·</span><span style={{ color: '#4ade80', fontWeight: 800 }}>₪{taskPrice}</span></>}
        </div>
      </motion.div>

      {/* Radar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        style={{ position: 'relative', width: 230, height: 230 }}
      >
        {[100, 78, 56, 36].map((size, i) => (
          <div key={i} style={{
            position: 'absolute', inset: `${(100 - size) / 2}%`, borderRadius: '50%',
            border: `1px solid rgba(99,179,237,${0.08 + i * 0.04})`,
            animation: `radarPulse2 ${2.5 + i * 0.4}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }} />
        ))}
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'conic-gradient(from 0deg, transparent 75%, rgba(99,179,237,.32) 100%)',
            animation: 'radarSpin 2.8s linear infinite', borderRadius: '50%',
          }} />
        </div>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 13, height: 13, borderRadius: '50%', background: '#60a5fa',
          boxShadow: '0 0 16px #60a5fa, 0 0 36px rgba(96,165,250,.4)',
        }} />
        {pulseWorkers.map(w => (
          <div key={w.id} style={{
            position: 'absolute',
            left: `${dotX(w.angle, w.dist)}%`, top: `${dotY(w.angle, w.dist)}%`,
            transform: 'translate(-50%,-50%)',
            width: 9, height: 9, borderRadius: '50%', background: '#4ade80',
            boxShadow: '0 0 9px #4ade80', animation: 'workerPing2 1.4s ease-out forwards',
          }} />
        ))}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.08 }}>
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#63b3ed" strokeWidth="1" />
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#63b3ed" strokeWidth="1" />
        </svg>
      </motion.div>

      {/* Status + pills */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%', padding: '0 24px' }}
      >
        <div key={statusMsg} style={{
          fontSize: 14, fontWeight: 700, color: '#ffffff', textAlign: 'center',
          animation: 'slideUpIn2 0.3s ease',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        }}>
          {!firstAppReceived && (
            <span style={{ display: 'flex', gap: 3 }}>
              {[0.1, 0.3, 0.5].map((d, i) => (
                <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#60a5fa', display: 'inline-block', animation: `dotBlink2 1.2s ${d}s infinite` }} />
              ))}
            </span>
          )}
          {statusMsg}
        </div>

        {categoryWorkerCount > 0 && !firstAppReceived && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.28)',
            borderRadius: 99, padding: '7px 16px',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'dotBlink2 1.2s .1s infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#4ade80' }}>
              {categoryWorkerCount} {CATEGORY_NAME_PLURAL[taskCategory] || 'עובדים'} יכולים להגיש בקשה
            </span>
          </div>
        )}

        {workerCount > 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#60a5fa', letterSpacing: -2 }}>{workerCount}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', fontWeight: 600 }}>מועמדויות שהתקבלו</div>
          </div>
        )}
      </motion.div>

      {/* Button */}
      <motion.button
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        onClick={goToTask}
        style={{
          background: 'rgba(96,165,250,.12)',
          border: '1px solid rgba(96,165,250,.35)',
          borderRadius: 14, padding: '14px 0',
          width: 'calc(100% - 48px)',
          color: '#ffffff', fontSize: 15, fontWeight: 700,
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        עבור לפרטי המשימה
      </motion.button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN — renders inline (no portal), full-screen
// ─────────────────────────────────────────────────────────────────────────────
export default function LiveSearchOverlay({
  taskId, taskTitle, taskPrice, taskCategory, taskLocation, onDismiss
}) {
  const [step, setStep] = useState('celebration'); // 'celebration' | 'scanner'
  const navigate = useNavigate();

  const handleDismiss = () => {
    onDismiss?.();
    navigate(`/task/${taskId}`);
  };

  return createPortal(
    <div
      dir="rtl"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999998,
        background: 'linear-gradient(160deg, #05112e 0%, #0a1f4e 58%, #0d2a60 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        paddingTop: 'max(20px, env(safe-area-inset-top))',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <AnimatePresence mode="wait">
        {step === 'celebration' ? (
          <motion.div
            key="celebration"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.32, ease: 'easeInOut' }}
            style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
          >
            <CelebrationStep
              taskTitle={taskTitle}
              taskPrice={taskPrice}
              taskLocation={taskLocation}
              onContinue={() => setStep('scanner')}
            />
          </motion.div>
        ) : (
          <motion.div
            key="scanner"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: 'easeInOut' }}
            style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}
          >
            {/* Back to celebration */}
            <button
              onClick={() => setStep('celebration')}
              style={{
                position: 'absolute', top: 0, left: 16,
                background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)',
                borderRadius: 20, padding: '7px 14px', color: 'rgba(255,255,255,.8)', fontSize: 13,
                fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                zIndex: 10,
              }}
            >
              <ChevronLeft size={14} /> חזור
            </button>

            <ScannerStep
              taskId={taskId}
              taskTitle={taskTitle}
              taskPrice={taskPrice}
              taskCategory={taskCategory}
              taskLocation={taskLocation}
              onNavigate={onDismiss}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}