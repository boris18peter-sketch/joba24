/**
 * 🎮 TaskPublishedCelebration
 * אנימציית חגיגה בסגנון Coin Master לאחר פרסום משימה.
 * ערוך את celebrationConfig.js לשינוי כל הפרמטרים.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CELEBRATION_CONFIG as C } from './celebrationConfig';

// ── Confetti particle ────────────────────────────────────────────────────────
function ConfettiParticle({ index, total, colors, coinCount, spread, gravity }) {
  const isCoin = index < coinCount;
  const angle = (index / total) * 360 + Math.random() * 30;
  const dist  = (0.4 + Math.random() * 0.6) * spread;
  const tx    = Math.cos((angle * Math.PI) / 180) * dist;
  const ty    = Math.sin((angle * Math.PI) / 180) * dist * 0.6 - spread * 0.4;
  const color = colors[index % colors.length];
  const size  = isCoin ? 14 + Math.random() * 6 : 6 + Math.random() * 8;
  const delay = Math.random() * 0.15;

  return (
    <motion.div
      initial={{ x: 0, y: 0, opacity: 1, scale: 0.3, rotate: 0 }}
      animate={{
        x: tx,
        y: [ty, ty + spread * gravity * 1.8],
        opacity: [1, 1, 0],
        scale: [1, 1, 0.5],
        rotate: Math.random() * 720 - 360,
      }}
      transition={{ duration: 1.2 + Math.random() * 0.4, delay, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: size, height: size,
        borderRadius: isCoin ? '50%' : 2,
        background: isCoin
          ? `radial-gradient(circle at 35% 35%, #fde68a, ${color})`
          : color,
        boxShadow: isCoin ? `0 0 6px ${color}88` : 'none',
        pointerEvents: 'none',
        zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: isCoin ? size * 0.6 : undefined,
      }}
    >
      {isCoin && '₪'}
    </motion.div>
  );
}

// ── Sunburst rays ────────────────────────────────────────────────────────────
function Sunburst({ visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
          animate={{ opacity: [0, 0.55, 0.45, 0], scale: [0.5, 1.6, 1.8, 2], rotate: 180 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2.8, ease: 'easeOut' }}
          style={{
            position: 'absolute', inset: 0,
            background: `conic-gradient(${C.colors.sunburst.map((c, i) =>
              `${c}44 ${i * 25}%, transparent ${i * 25 + 12.5}%`).join(', ')})`,
            borderRadius: '50%',
            margin: 'auto',
            width: '140vw', height: '140vw',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />
      )}
    </AnimatePresence>
  );
}

// ── Shockwave ring ───────────────────────────────────────────────────────────
function Shockwave({ visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="shockwave"
          initial={{ scale: 0.2, opacity: 0.9 }}
          animate={{ scale: 4.5, opacity: 0 }}
          exit={{}}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: 140, height: 140,
            borderRadius: '50%',
            border: `4px solid ${C.colors.shockwave}`,
            boxShadow: `0 0 30px ${C.colors.shockwave}88`,
            pointerEvents: 'none',
            zIndex: 8,
          }}
        />
      )}
    </AnimatePresence>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TaskPublishedCelebration({ visible, taskTitle, taskPrice, onNavigate }) {
  const [phase, setPhase]           = useState('idle');  // idle | sunburst | avatar | slam | title | done
  const [showConfetti, setShowConfetti] = useState(false);
  const [showShockwave, setShowShockwave] = useState(false);
  const [shakeActive, setShakeActive] = useState(false);
  const autoNavRef = useRef(null);

  const t = C.timing;

  useEffect(() => {
    if (!visible) { setPhase('idle'); return; }

    setPhase('sunburst');
    // Haptic: light on entry
    try { navigator.vibrate?.(40); } catch (_) {}

    const timers = [
      setTimeout(() => setPhase('avatar'),                t.avatarDelay),
      setTimeout(() => {
        setPhase('slam');
        setShakeActive(true);
        // Haptic: heavy on slam
        try { navigator.vibrate?.([120, 30, 80]); } catch (_) {}
        setTimeout(() => setShakeActive(false), C.shake.duration * 1000);
      }, t.slamDelay),
      setTimeout(() => setShowShockwave(true),            t.shockwaveDelay),
      setTimeout(() => { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 1400); }, t.confettiDelay),
      setTimeout(() => setPhase('title'),                 t.titleDelay),
    ];

    autoNavRef.current = setTimeout(() => onNavigate?.(), t.autoNavigateDelay);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(autoNavRef.current);
    };
  }, [visible]);

  const handleSkip = () => {
    clearTimeout(autoNavRef.current);
    onNavigate?.();
  };

  const shakeVariants = {
    idle: { x: 0, y: 0 },
    shake: {
      x: [0, -C.shake.intensity, C.shake.intensity, -C.shake.intensity, C.shake.intensity, -C.shake.intensity/2, C.shake.intensity/2, 0],
      y: [0, C.shake.intensity/2, -C.shake.intensity/2, C.shake.intensity/2, 0, 0, 0, 0],
      transition: { duration: C.shake.duration, ease: 'linear' },
    },
  };

  if (!visible) return null;

  return createPortal(
    <div
      dir="rtl"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999999,
        background: C.colors.overlay,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Sunburst */}
      <Sunburst visible={phase !== 'idle'} />

      {/* Camera shake wrapper */}
      <motion.div
        variants={shakeVariants}
        animate={shakeActive ? 'shake' : 'idle'}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', position: 'relative', zIndex: 5,
          width: '100%',
        }}
      >
        {/* Avatar + Flag */}
        <AnimatePresence>
          {(phase === 'avatar' || phase === 'slam' || phase === 'title') && (
            <motion.div
              key="avatar-group"
              initial={{ scale: 0, y: 80, rotate: -15, opacity: 0 }}
              animate={{
                scale: phase === 'slam' || phase === 'title' ? [1.4, 0.9, 1] : [0, 1.4],
                y: phase === 'slam' || phase === 'title' ? [0, 12, 0] : [80, 0],
                rotate: phase === 'slam' || phase === 'title' ? [0, 0] : [-15, 0],
                opacity: 1,
              }}
              transition={phase === 'avatar' ? C.physics.avatarSpring : C.physics.slamSpring}
              style={{
                fontSize: C.avatar.size,
                lineHeight: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                marginBottom: 8,
                position: 'relative',
              }}
            >
              {/* Glow behind avatar */}
              <div style={{
                position: 'absolute', width: 120, height: 120, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)',
                top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
              }} />

              {/* Avatar emoji */}
              <span style={{ fontSize: C.avatar.size, filter: 'drop-shadow(0 4px 12px rgba(251,191,36,0.6))' }}>
                {C.avatar.emoji}
              </span>

              {/* Flag */}
              <motion.span
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.15, ...C.physics.slamSpring }}
                style={{
                  fontSize: C.avatar.flagSize,
                  position: 'absolute',
                  top: -10, left: -8,
                  filter: 'drop-shadow(0 2px 8px rgba(251,191,36,0.8))',
                }}
              >
                {C.avatar.flagEmoji}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Shockwave + Confetti origin */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Shockwave visible={showShockwave} />
          {showConfetti && Array.from({ length: C.confetti.count }).map((_, i) => (
            <ConfettiParticle
              key={i} index={i} total={C.confetti.count}
              colors={C.colors.confetti}
              coinCount={C.confetti.coinCount}
              spread={C.confetti.spread}
              gravity={C.confetti.gravity}
            />
          ))}
        </div>

        {/* Title text */}
        <AnimatePresence>
          {phase === 'title' && (
            <motion.div
              key="title"
              initial={{ opacity: 0, y: 20, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0, ...C.physics.titleSpring }}
              style={{ textAlign: 'center', padding: '0 32px' }}
            >
              <div style={{
                fontSize: 28, fontWeight: 900,
                color: C.colors.title,
                letterSpacing: -0.5,
                lineHeight: 1.25,
                marginBottom: 10,
                textShadow: '0 2px 16px rgba(251,191,36,0.5)',
              }}>
                {C.texts.line1}
              </div>

              {(taskTitle || taskPrice) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: 14, padding: '8px 16px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    fontSize: 14, color: 'rgba(255,255,255,0.9)',
                    fontWeight: 700, marginBottom: 10,
                    maxWidth: 280,
                  }}
                >
                  {taskTitle && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>"{taskTitle}"</span>}
                  {taskPrice && <span style={{ color: '#4ade80', fontWeight: 900, flexShrink: 0 }}>₪{taskPrice}</span>}
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{ fontSize: 15, color: C.colors.subtitle, fontWeight: 600, marginBottom: 6 }}
              >
                {C.texts.line2}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}
              >
                {C.texts.line3}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Skip button */}
      <AnimatePresence>
        {phase === 'title' && (
          <motion.button
            key="skip"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            onClick={handleSkip}
            style={{
              position: 'absolute',
              bottom: 'max(28px, env(safe-area-inset-bottom))',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 99, padding: '10px 24px',
              color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', zIndex: 20,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {C.texts.skipLabel} ›
          </motion.button>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}