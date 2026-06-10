/**
 * 🎮 TaskPublishedCelebration — Coin Master Level Cinematic
 * סגנון אחיד עם Scanner. ללא ניווט אוטומטי — רק כפתור.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const LOGO = 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg';

// ── Palette (same as scanner) ─────────────────────────────────────────────────
const P = {
  bg0: '#05112e',
  bg1: '#0a1f4e',
  bg2: '#0d2a60',
  blue:  '#60a5fa',
  green: '#4ade80',
  gold:  '#fbbf24',
  goldD: '#f59e0b',
  white: '#ffffff',
};

// ── Keyframe injector (once) ──────────────────────────────────────────────────
const STYLES = `
  @keyframes celebRingSpin  { to { transform: rotate(360deg); } }
  @keyframes celebPulse     { 0%,100%{opacity:.15;transform:scale(1);}50%{opacity:.3;transform:scale(1.07);} }
  @keyframes celebBlink     { 0%,80%,100%{opacity:0;}40%{opacity:1;} }
  @keyframes celebSlideUp   { from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);} }
  @keyframes celebGlowPulse { 0%,100%{box-shadow:0 0 18px 4px rgba(96,165,250,.4);} 50%{box-shadow:0 0 38px 12px rgba(96,165,250,.7);} }
  @keyframes celebLogoFloat { 0%,100%{transform:translateY(0) scale(1);} 50%{transform:translateY(-6px) scale(1.04);} }
  @keyframes celebSweep     { to{transform:rotate(360deg);} }
  @keyframes celebTrail     { 0%{opacity:.8;scaleY:1;}100%{opacity:0;scaleY:0;} }
  @keyframes celebBounce    { 0%{transform:scaleY(1);}40%{transform:scaleY(.8) scaleX(1.15);}65%{transform:scaleY(1.1) scaleX(.93);}80%{transform:scaleY(.97);}100%{transform:scaleY(1);} }
  @keyframes celebTada      { 0%{transform:scale(1);}10%{transform:scale(.95) rotate(-3deg);}20%{transform:scale(.95) rotate(-3deg);}30%{transform:scale(1.05) rotate(3deg);}40%{transform:scale(1.05) rotate(-3deg);}50%{transform:scale(1.05) rotate(3deg);}60%{transform:scale(1.05) rotate(-3deg);}70%{transform:scale(1.05) rotate(3deg);}80%{transform:scale(1) rotate(0);}100%{transform:scale(1) rotate(0);} }
  @keyframes celebRipple    { 0%{transform:scale(0.1);opacity:1;}100%{transform:scale(4.5);opacity:0;} }
  @keyframes celebStarSpin  { to{transform:rotate(360deg) scale(1.2);} }
`;

function injectStyles() {
  if (document.getElementById('celeb-styles')) return;
  const s = document.createElement('style');
  s.id = 'celeb-styles';
  s.textContent = STYLES;
  document.head.appendChild(s);
}

// ── Radar rings (scanner aesthetic) ──────────────────────────────────────────
function RadarRings() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {[1, 0.72, 0.48, 0.28].map((r, i) => (
        <div key={i} style={{
          position: 'absolute',
          inset: `${(1 - r) / 2 * 100}%`,
          borderRadius: '50%',
          border: `1px solid rgba(96,165,250,${0.06 + i * 0.04})`,
          animation: `celebPulse ${2.4 + i * 0.45}s ease-in-out infinite`,
          animationDelay: `${i * 0.28}s`,
        }} />
      ))}
    </div>
  );
}

// ── Radar sweep ───────────────────────────────────────────────────────────────
function RadarSweep({ active }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden',
      opacity: active ? 1 : 0, transition: 'opacity 0.5s',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'conic-gradient(from 0deg, transparent 70%, rgba(96,165,250,0.4) 100%)',
        animation: 'celebRingSpin 2.6s linear infinite',
        borderRadius: '50%',
      }} />
    </div>
  );
}

// ── Gold particle burst ───────────────────────────────────────────────────────
function ParticleBurst({ active, count = 32 }) {
  if (!active) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 30 }}>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * 360 + Math.random() * 12;
        const dist  = 55 + Math.random() * 95;
        const tx    = Math.cos((angle * Math.PI) / 180) * dist;
        const ty    = Math.sin((angle * Math.PI) / 180) * dist * 0.75 - 30;
        const isCoin = i < Math.floor(count * 0.45);
        const colors = [P.gold, P.goldD, P.blue, P.green, '#a855f7', '#ef4444', '#06b6d4', '#fde68a'];
        const color  = colors[i % colors.length];
        const size   = isCoin ? 16 + Math.random() * 8 : 6 + Math.random() * 7;
        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, scale: 0.2, opacity: 1, rotate: 0 }}
            animate={{
              x: tx, y: [ty * 0.3, ty + dist * 1.4],
              scale: [1.3, 0.5], opacity: [1, 1, 0],
              rotate: Math.random() * 720 - 360,
            }}
            transition={{ duration: 1.1 + Math.random() * 0.6, delay: Math.random() * 0.14, ease: 'easeOut' }}
            style={{
              position: 'absolute', top: '50%', left: '50%',
              width: size, height: size,
              borderRadius: isCoin ? '50%' : Math.random() > 0.5 ? 2 : '50%',
              background: isCoin
                ? `radial-gradient(circle at 35% 35%, #fde68a, ${color})`
                : color,
              boxShadow: isCoin ? `0 0 8px ${color}99` : 'none',
              transform: 'translate(-50%,-50%)',
              display: isCoin ? 'flex' : undefined,
              alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 900, color: '#7c2d00',
            }}
          >
            {isCoin && '₪'}
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Shockwave ─────────────────────────────────────────────────────────────────
function Shockwave({ trigger }) {
  const [waves, setWaves] = useState([]);
  useEffect(() => {
    if (!trigger) return;
    const id = Date.now();
    setWaves(w => [...w, id]);
    setTimeout(() => setWaves(w => w.filter(x => x !== id)), 800);
  }, [trigger]);

  return (
    <>
      {waves.map(id => (
        <motion.div key={id}
          initial={{ scale: 0.1, opacity: 1 }}
          animate={{ scale: 5.5, opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{
            position: 'absolute', width: 100, height: 100,
            borderRadius: '50%',
            border: `3px solid ${P.gold}`,
            boxShadow: `0 0 24px ${P.gold}88`,
            pointerEvents: 'none', zIndex: 8,
          }}
        />
      ))}
    </>
  );
}

// ── Floating stars ────────────────────────────────────────────────────────────
function StarField() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {Array.from({ length: 35 }).map((_, i) => (
        <motion.div key={i}
          animate={{ opacity: [0.15, 0.7, 0.15] }}
          transition={{ duration: 1.6 + Math.random() * 2.5, repeat: Infinity, delay: Math.random() * 4 }}
          style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: 1.5 + Math.random() * 2, height: 1.5 + Math.random() * 2,
            borderRadius: '50%', background: P.blue,
          }}
        />
      ))}
    </div>
  );
}

// ── Rotating gold ring around logo ───────────────────────────────────────────
function GoldOrbit({ active }) {
  if (!active) return null;
  return (
    <>
      {/* Outer orbit */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute', inset: -18,
          borderRadius: '50%',
          border: '2px dashed rgba(251,191,36,0.5)',
          pointerEvents: 'none',
        }}
      >
        {/* Orbit dot */}
        <div style={{
          position: 'absolute', top: -5, left: '50%',
          transform: 'translateX(-50%)',
          width: 10, height: 10, borderRadius: '50%',
          background: P.gold, boxShadow: `0 0 10px ${P.gold}`,
        }} />
      </motion.div>
      {/* Inner orbit (reverse) */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute', inset: -28,
          borderRadius: '50%',
          border: '1px solid rgba(96,165,250,0.3)',
          pointerEvents: 'none',
        }}
      >
        <div style={{
          position: 'absolute', bottom: -4, left: '50%',
          transform: 'translateX(-50%)',
          width: 7, height: 7, borderRadius: '50%',
          background: P.blue, boxShadow: `0 0 8px ${P.blue}`,
        }} />
      </motion.div>
    </>
  );
}

// ── Map landing pad ───────────────────────────────────────────────────────────
function MapPad({ visible, locationName }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ scale: 0.4, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ type: 'spring', damping: 14, stiffness: 150 }}
          style={{
            width: 210, height: 110,
            borderRadius: 20,
            background: 'linear-gradient(145deg, #071a42, #0d2860)',
            border: `2px solid ${P.gold}`,
            boxShadow: `0 0 0 3px rgba(251,191,36,0.18), 0 14px 40px rgba(0,0,0,0.6)`,
            position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Grid */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.12 }}>
            {[22,44,66,88].map(y => <line key={y} x1="0" y1={y} x2="210" y2={y} stroke={P.blue} strokeWidth="1" />)}
            {[26,52,78,104,132,158,184].map(x => <line key={x} x1={x} y1="0" x2={x} y2="110" stroke={P.blue} strokeWidth="1" />)}
          </svg>

          {/* Road strokes */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.45 }}>
            <path d="M0 55 Q52 44 105 55 Q158 66 210 55" stroke={P.green} strokeWidth="7" fill="none" strokeLinecap="round"/>
            <path d="M105 0 Q100 28 105 55 Q110 82 105 110"  stroke={P.green} strokeWidth="5" fill="none" strokeLinecap="round"/>
            <path d="M0 82 Q65 74 130 82 Q170 88 210 80"   stroke="#34d399" strokeWidth="3" fill="none" strokeLinecap="round"/>
          </svg>

          {/* Blocks */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.2 }}>
            <rect x="18" y="10" width="52" height="30" rx="4" fill={P.green} />
            <rect x="88" y="14" width="36" height="26" rx="4" fill="#34d399" />
            <rect x="140" y="8" width="54" height="36" rx="4" fill={P.green} />
            <rect x="14" y="68" width="66" height="32" rx="4" fill="#34d399" />
            <rect x="138" y="72" width="60" height="30" rx="4" fill={P.green} />
          </svg>

          {/* Ping circle */}
          <motion.div
            animate={{ scale: [1, 1.7, 1], opacity: [0.5, 0.1, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              width: 34, height: 34, borderRadius: '50%',
              background: `rgba(251,191,36,0.3)`,
              border: `2px solid rgba(251,191,36,0.5)`,
            }}
          />
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 11, height: 11, borderRadius: '50%',
            background: P.gold, boxShadow: `0 0 14px ${P.gold}`,
          }} />

          {/* Label */}
          {locationName && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              textAlign: 'center', fontSize: 10, fontWeight: 800,
              color: P.gold, background: 'rgba(5,17,46,0.75)',
              padding: '4px 8px', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              📍 {locationName}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Dot trail (speed-lines during descent) ────────────────────────────────────
function DescentTrail({ active }) {
  if (!active) return null;
  return (
    <motion.div
      initial={{ scaleY: 0.2, opacity: 0.9 }}
      animate={{ scaleY: [0.3, 1, 0.2], opacity: [0.8, 0.6, 0] }}
      transition={{ duration: 0.55, repeat: 2, ease: 'easeOut' }}
      style={{
        position: 'absolute', top: '100%', left: '50%',
        transform: 'translateX(-50%)',
        width: 6, height: 55,
        background: `linear-gradient(to bottom, ${P.gold}cc, transparent)`,
        borderRadius: 3, pointerEvents: 'none', originY: 0,
      }}
    />
  );
}

// ── Flag pole slam ────────────────────────────────────────────────────────────
function FlagSlam({ active }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="flag"
          initial={{ scale: 0, y: 20, rotate: -50, opacity: 0 }}
          animate={{ scale: [0, 1.5, 1], y: [20, -12, 0], rotate: [-50, 8, 0], opacity: 1 }}
          transition={{ type: 'spring', damping: 6, stiffness: 260 }}
          style={{
            position: 'absolute', top: -16, right: -14, fontSize: 38,
            filter: `drop-shadow(0 0 12px ${P.gold})`,
            zIndex: 20,
          }}
        >
          🚩
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function TaskPublishedCelebration({
  visible, taskTitle, taskPrice, taskLocation, onNavigate
}) {
  const [phase, setPhase] = useState('idle');
  // idle → enter → descend → land → slam → explode → reveal
  const [showMap, setShowMap]           = useState(false);
  const [showFlag, setShowFlag]         = useState(false);
  const [showShockwave, setShowShockwave] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [shakeActive, setShakeActive]   = useState(false);
  const [orbitActive, setOrbitActive]   = useState(false);
  const [descending, setDescending]     = useState(false);

  useEffect(() => {
    if (!visible) {
      setPhase('idle');
      setShowMap(false); setShowFlag(false);
      setShowShockwave(false); setShowParticles(false);
      setShakeActive(false); setOrbitActive(false);
      setDescending(false);
      return;
    }

    injectStyles();
    try { navigator.vibrate?.(30); } catch (_) {}

    const T = (fn, ms) => setTimeout(fn, ms);
    const timers = [];
    const sched = (fn, ms) => { timers.push(T(fn, ms)); };

    // ── Timeline ──────────────────────────────────────────
    setPhase('enter');                               // 0ms — logo zooms in from center

    sched(() => { setOrbitActive(true); }, 400);    // 400ms — orbits appear

    sched(() => {                                    // 700ms — descent begins
      setPhase('descend');
      setDescending(true);
    }, 700);

    sched(() => {                                    // 1400ms — map pad appears
      setShowMap(true);
    }, 1300);

    sched(() => {                                    // 1700ms — land on map
      setPhase('land');
      setDescending(false);
      try { navigator.vibrate?.([70]); } catch (_) {}
    }, 1700);

    sched(() => {                                    // 2100ms — SLAM flag + shake + boom
      setPhase('slam');
      setShowFlag(true);
      setShakeActive(true);
      setShowShockwave(true);
      try { navigator.vibrate?.([180, 25, 100, 15, 60]); } catch (_) {}
    }, 2100);

    sched(() => {                                    // 2200ms — coins + particles
      setShowParticles(true);
    }, 2200);

    sched(() => { setShakeActive(false); }, 2450);  // shake off

    sched(() => { setShowParticles(false); }, 3600); // particles done

    sched(() => { setPhase('reveal'); }, 2600);      // 2600ms — title text reveals

    return () => timers.forEach(clearTimeout);
  }, [visible]);

  if (!visible) return null;

  // ── Avatar vertical position ──────────────────────────────────────────────
  const logoY       = phase === 'idle'                   ? 0
                    : phase === 'enter'                  ? 0
                    : phase === 'descend'                ? 0
                    : 0; // stays at 0 in scene coords; scene itself moves

  // Whole scene: logo starts in center, then moves up to make room for map
  const sceneY = (phase === 'land' || phase === 'slam' || phase === 'reveal') ? -30 : 0;

  // Logo pos inside scene: starts center (y=0), descends to land on map
  const logoAnimY = phase === 'idle'    ? 0
                  : phase === 'enter'   ? 0
                  : phase === 'descend' ? 0   // animates to ~130 below
                  : 110; // landed

  return createPortal(
    <div
      dir="rtl"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999999,
        background: `linear-gradient(160deg, ${P.bg0} 0%, ${P.bg1} 55%, ${P.bg2} 100%)`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <StarField />

      {/* Radar rings (decorative, scanner feel) */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ position: 'relative', width: 320, height: 320 }}>
          <RadarRings />
          <RadarSweep active={phase === 'enter' || phase === 'descend'} />
        </div>
      </div>

      {/* Rotating conic glow — replaces sunburst, same color as scanner */}
      <AnimatePresence>
        {(phase === 'slam' || phase === 'explode' || phase === 'reveal') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 0.4, 0.3, 0], scale: [0.4, 2, 2.2] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: 'easeOut' }}
            style={{
              position: 'absolute', pointerEvents: 'none',
              width: '170vw', height: '170vw',
              background: `conic-gradient(${P.gold}33 0%, transparent 18%, ${P.blue}22 36%, transparent 54%, ${P.gold}22 72%, transparent 90%, ${P.blue}22 100%)`,
              borderRadius: '50%',
              top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* ── CAMERA SHAKE ── */}
      <motion.div
        animate={shakeActive ? {
          x: [0, -10, 10, -9, 9, -6, 6, -3, 3, 0],
          y: [0,   5, -5,  4,-4,  3,-3,  1,-1, 0],
          transition: { duration: 0.38, ease: 'linear' },
        } : { x: 0, y: 0 }}
        style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', position: 'relative',
          width: '100%', zIndex: 5,
        }}
      >
        {/* ── SCENE (logo + map together) ── */}
        <motion.div
          animate={{ y: sceneY }}
          transition={{ type: 'spring', damping: 16, stiffness: 140 }}
          style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', width: 280, height: 320 }}
        >
          {/* Logo container — moves from center down onto map */}
          <motion.div
            animate={{ y: logoAnimY }}
            transition={
              phase === 'descend'
                ? { type: 'spring', damping: 5.5, stiffness: 55 }
                : phase === 'land'
                ? { type: 'spring', damping: 9, stiffness: 260 }
                : phase === 'slam'
                ? { type: 'spring', damping: 6, stiffness: 320 }
                : { duration: 0 }
            }
            style={{
              position: 'absolute', top: 40, left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {/* Glow ring */}
            <motion.div
              animate={phase === 'enter' || phase === 'descend'
                ? { scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }
                : { scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }
              }
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute', width: 108, height: 108, borderRadius: '50%',
                background: `radial-gradient(circle, rgba(251,191,36,0.35) 0%, transparent 70%)`,
                pointerEvents: 'none',
              }}
            />

            {/* Descent trail */}
            <DescentTrail active={phase === 'descend'} />

            {/* Speed lines during descent */}
            {phase === 'descend' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.55, 0] }}
                transition={{ duration: 0.8, repeat: 1 }}
                style={{
                  position: 'absolute', inset: -50, pointerEvents: 'none',
                  background: 'repeating-conic-gradient(rgba(96,165,250,0.07) 0deg 4deg, transparent 4deg 22deg)',
                  borderRadius: '50%',
                }}
              />
            )}

            {/* Orbit rings */}
            <GoldOrbit active={orbitActive && phase !== 'descend'} />

            {/* Logo image */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={
                phase === 'enter'
                  ? { scale: [0, 1.35, 1], rotate: [-20, 6, 0] }
                  : phase === 'land'
                  ? { scale: [1, 1.2, 0.92, 1], rotate: 0 }
                  : phase === 'slam'
                  ? { scale: [1, 1.35, 0.88, 1.05, 1], rotate: 0 }
                  : { scale: 1, rotate: 0 }
              }
              transition={
                phase === 'enter'
                  ? { type: 'spring', damping: 7, stiffness: 130 }
                  : { type: 'spring', damping: 6, stiffness: 280 }
              }
              style={{
                width: 86, height: 86, borderRadius: '50%',
                overflow: 'hidden',
                border: `3px solid ${P.gold}`,
                boxShadow: `0 0 0 4px rgba(251,191,36,0.25), 0 0 30px rgba(251,191,36,0.5)`,
                position: 'relative',
                animation: phase === 'reveal' ? 'celebLogoFloat 2.2s ease-in-out infinite' : 'none',
              }}
            >
              <img
                src={LOGO}
                alt="Joba24"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </motion.div>

            {/* Flag */}
            <FlagSlam active={showFlag} />
          </motion.div>

          {/* Shockwave + particles — positioned at map landing zone */}
          <div style={{
            position: 'absolute', bottom: 55, left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shockwave trigger={showShockwave} />
            <ParticleBurst active={showParticles} count={36} />

            {/* Dust puff on land */}
            <AnimatePresence>
              {(phase === 'land' || phase === 'slam') && (
                <motion.div
                  key="dust"
                  initial={{ scaleX: 0.1, opacity: 0.9 }}
                  animate={{ scaleX: [0.1, 3, 3.5], opacity: [0.9, 0.5, 0] }}
                  exit={{}}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    width: 160, height: 18,
                    background: `radial-gradient(ellipse, rgba(251,191,36,0.45) 0%, transparent 70%)`,
                    borderRadius: '50%', pointerEvents: 'none', top: 0,
                  }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Map pad — landing target */}
          <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)' }}>
            <MapPad visible={showMap} locationName={taskLocation} />
          </div>
        </motion.div>

        {/* ── TEXT REVEAL ── */}
        <AnimatePresence>
          {phase === 'reveal' && (
            <motion.div
              key="text"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 14, stiffness: 150 }}
              style={{
                textAlign: 'center', padding: '0 28px',
                marginTop: 12, position: 'relative', zIndex: 20,
              }}
            >
              {/* Main title — scanner style */}
              <motion.div
                initial={{ opacity: 0, scale: 0.65 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 8, stiffness: 200 }}
                style={{
                  fontSize: 28, fontWeight: 900,
                  color: P.white,
                  letterSpacing: -0.5, lineHeight: 1.25,
                  marginBottom: 8,
                  textShadow: `0 0 28px ${P.gold}88`,
                  animation: 'celebTada 0.9s ease',
                }}
              >
                🚀 המשימה שלך באוויר!
              </motion.div>

              {/* Task pill — same bkg as scanner pills */}
              {(taskTitle || taskPrice) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                  style={{
                    background: `rgba(96,165,250,0.10)`,
                    borderRadius: 14, padding: '8px 16px',
                    border: `1px solid rgba(96,165,250,0.25)`,
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    fontSize: 14, color: 'rgba(255,255,255,0.9)',
                    fontWeight: 700, marginBottom: 10,
                    maxWidth: 280,
                  }}
                >
                  {taskTitle && (
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 195 }}>
                      "{taskTitle}"
                    </span>
                  )}
                  {taskPrice && (
                    <span style={{ color: P.green, fontWeight: 900, flexShrink: 0 }}>
                      ₪{taskPrice}
                    </span>
                  )}
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.32 }}
                style={{
                  fontSize: 14, color: 'rgba(255,255,255,0.6)',
                  fontWeight: 600, marginBottom: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: P.green, display: 'inline-block', animation: 'celebBlink 1.2s 0.1s infinite' }} />
                עובדים באזור כבר רואים אותה
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}
              >
                🔍 מחפשים את הבנאדם המושלם...
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── CTA BUTTON (no auto-nav) ── */}
      <AnimatePresence>
        {phase === 'reveal' && (
          <motion.button
            key="cta"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.65, type: 'spring', damping: 12, stiffness: 180 }}
            onClick={() => onNavigate?.()}
            style={{
              position: 'absolute',
              bottom: 'max(32px, env(safe-area-inset-bottom))',
              background: `linear-gradient(135deg, ${P.gold}, ${P.goldD})`,
              border: 'none',
              borderRadius: 99, padding: '15px 36px',
              color: '#5a1800', fontSize: 16, fontWeight: 900,
              cursor: 'pointer', zIndex: 30,
              boxShadow: `0 8px 32px rgba(251,191,36,0.55)`,
              WebkitTapHighlightColor: 'transparent',
              letterSpacing: 0.3,
              animation: 'celebGlowPulse 2s ease-in-out infinite',
            }}
          >
            📋 לפרטי המשימה ›
          </motion.button>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}