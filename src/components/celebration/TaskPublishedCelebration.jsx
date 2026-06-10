/**
 * 🎮 TaskPublishedCelebration — Mobile Game Cinematic
 * סרט אנימציה קולנועי: האווטאר יורד מהשמים, נוחת על המפה, נועץ דגל.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { CELEBRATION_CONFIG as C } from './celebrationConfig';

// ── Coin particle ─────────────────────────────────────────────────────────────
function CoinBurst({ active }) {
  if (!active) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
      {Array.from({ length: 18 }).map((_, i) => {
        const angle = (i / 18) * 360;
        const dist = 60 + Math.random() * 80;
        const tx = Math.cos((angle * Math.PI) / 180) * dist;
        const ty = Math.sin((angle * Math.PI) / 180) * dist * 0.7 - 40;
        const isCoin = i < 10;
        const size = isCoin ? 18 + Math.random() * 8 : 7 + Math.random() * 6;
        const colors = ['#fbbf24','#f59e0b','#10b981','#3b82f6','#a855f7','#ef4444'];
        const color = colors[i % colors.length];
        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, scale: 0.2, opacity: 1 }}
            animate={{ x: tx, y: [ty - 10, ty + dist * 1.2], scale: [1.2, 0.6], opacity: [1, 1, 0] }}
            transition={{ duration: 1.1 + Math.random() * 0.5, delay: Math.random() * 0.12, ease: 'easeOut' }}
            style={{
              position: 'absolute', top: '50%', left: '50%',
              width: size, height: size,
              borderRadius: isCoin ? '50%' : 2,
              background: isCoin
                ? `radial-gradient(circle at 35% 35%, #fde68a, ${color})`
                : color,
              boxShadow: isCoin ? `0 0 8px ${color}88` : 'none',
              fontSize: isCoin ? 11 : undefined,
              display: isCoin ? 'flex' : undefined,
              alignItems: isCoin ? 'center' : undefined,
              justifyContent: isCoin ? 'center' : undefined,
              fontWeight: 900, color: '#7c2d00',
              transform: 'translate(-50%,-50%)',
            }}
          >
            {isCoin && '₪'}
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Shockwave ring ────────────────────────────────────────────────────────────
function Shockwave({ trigger }) {
  const [key, setKey] = useState(0);
  useEffect(() => { if (trigger) setKey(k => k + 1); }, [trigger]);
  if (!trigger) return null;
  return (
    <motion.div
      key={key}
      initial={{ scale: 0.1, opacity: 1 }}
      animate={{ scale: 5, opacity: 0 }}
      transition={{ duration: 0.65, ease: 'easeOut' }}
      style={{
        position: 'absolute', width: 100, height: 100,
        borderRadius: '50%',
        border: '4px solid #fbbf24',
        boxShadow: '0 0 30px #fbbf2488',
        pointerEvents: 'none', zIndex: 8,
      }}
    />
  );
}

// ── Map mini card ─────────────────────────────────────────────────────────────
function MapCard({ visible, locationName, lat, lng }) {
  // Static map tile from OpenStreetMap
  const zoom = 15;
  const tileUrl = lat && lng
    ? `https://tile.openstreetmap.org/${zoom}/${Math.floor((lng + 180) / 360 * Math.pow(2, zoom))}/${Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))}.png`
    : null;

  // Use a simple placeholder map visual when no coords
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="mapcard"
          initial={{ scale: 0.5, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 14, stiffness: 160, delay: 0.1 }}
          style={{
            width: 220, height: 130,
            borderRadius: 22,
            overflow: 'hidden',
            border: '3px solid #fbbf24',
            boxShadow: '0 0 0 4px rgba(251,191,36,0.25), 0 16px 48px rgba(0,0,0,0.55)',
            position: 'relative',
            background: '#1a3a2a',
          }}
        >
          {/* Grid lines — fake map look */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }}>
            {[20,40,60,80,100,120].map(y => <line key={y} x1="0" y1={y} x2="220" y2={y} stroke="#4ade80" strokeWidth="1" />)}
            {[20,50,80,110,140,170,200].map(x => <line key={x} x1={x} y1="0" x2={x} y2="130" stroke="#4ade80" strokeWidth="1" />)}
          </svg>

          {/* Road shapes */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }}>
            <path d="M0 65 Q55 55 110 65 Q165 75 220 65" stroke="#6ee7b7" strokeWidth="8" fill="none" />
            <path d="M110 0 Q105 35 110 65 Q115 95 110 130" stroke="#6ee7b7" strokeWidth="6" fill="none" />
            <path d="M0 95 Q70 88 140 95 Q180 100 220 92" stroke="#34d399" strokeWidth="4" fill="none" />
          </svg>

          {/* Block shapes */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.25 }}>
            <rect x="20" y="15" width="55" height="35" rx="4" fill="#4ade80" />
            <rect x="90" y="20" width="40" height="30" rx="4" fill="#34d399" />
            <rect x="145" y="10" width="55" height="42" rx="4" fill="#4ade80" />
            <rect x="15" y="75" width="70" height="40" rx="4" fill="#34d399" />
            <rect x="140" y="80" width="65" height="38" rx="4" fill="#4ade80" />
          </svg>

          {/* Center pin pulse */}
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0.2, 0.6] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(251,191,36,0.35)',
              border: '2px solid rgba(251,191,36,0.5)',
            }}
          />

          {/* Pin dot */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 12, height: 12, borderRadius: '50%',
            background: '#fbbf24',
            boxShadow: '0 0 12px #fbbf24',
          }} />

          {/* Location label */}
          {locationName && (
            <div style={{
              position: 'absolute', bottom: 8, left: 0, right: 0,
              textAlign: 'center',
              fontSize: 10, fontWeight: 800, color: '#fde68a',
              background: 'rgba(0,0,0,0.55)',
              padding: '3px 8px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              📍 {locationName}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Sunburst ──────────────────────────────────────────────────────────────────
function Sunburst({ visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.3, rotate: 0 }}
          animate={{ opacity: [0, 0.5, 0.4, 0], scale: [0.3, 2, 2.2, 2.4], rotate: 90 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 3, ease: 'easeOut' }}
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `conic-gradient(${
              ['#f59e0b','#fbbf24','#fcd34d','#fde68a'].map((c, i) =>
                `${c}44 ${i * 25}%, transparent ${i * 25 + 12.5}%`).join(', ')
            })`,
            borderRadius: '50%',
            width: '180vw', height: '180vw',
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}
    </AnimatePresence>
  );
}

// ── Stars burst ───────────────────────────────────────────────────────────────
function StarsBurst({ active }) {
  if (!active) return null;
  return (
    <>
      {['✨','⭐','💫','✨','⭐','💫','✨','⭐'].map((s, i) => {
        const angle = (i / 8) * 360;
        const dist = 90 + Math.random() * 50;
        const tx = Math.cos((angle * Math.PI) / 180) * dist;
        const ty = Math.sin((angle * Math.PI) / 180) * dist * 0.8 - 20;
        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{ x: tx, y: ty, scale: [0, 1.4, 0.8], opacity: [1, 1, 0] }}
            transition={{ duration: 0.9 + Math.random() * 0.4, delay: i * 0.04, ease: 'easeOut' }}
            style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              fontSize: 20, pointerEvents: 'none', zIndex: 25,
            }}
          >
            {s}
          </motion.div>
        );
      })}
    </>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function TaskPublishedCelebration({
  visible, taskTitle, taskPrice, taskLocation, onNavigate
}) {
  // Cinematic phases:
  // idle → zoom_out → descend → land → plant_flag → explode → reveal → done
  const [phase, setPhase] = useState('idle');
  const [showMap, setShowMap] = useState(false);
  const [showShockwave, setShowShockwave] = useState(false);
  const [showCoins, setShowCoins] = useState(false);
  const [showStars, setShowStars] = useState(false);
  const [shakeActive, setShakeActive] = useState(false);
  const autoNavRef = useRef(null);

  useEffect(() => {
    if (!visible) { setPhase('idle'); setShowMap(false); return; }

    // Haptic: entry
    try { navigator.vibrate?.(30); } catch (_) {}

    const timers = [];
    const T = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };

    // Phase timeline (cinematic)
    setPhase('zoom_out');          // bg zooms out, map card appears

    T(() => setShowMap(true), 200);

    T(() => {
      setPhase('descend');         // avatar enters from top
    }, 400);

    T(() => {
      setPhase('land');            // avatar reaches map
      try { navigator.vibrate?.([60]); } catch (_) {}
    }, 1400);

    T(() => {
      setPhase('plant_flag');      // flag slams down
      setShakeActive(true);
      setShowShockwave(true);
      // Heavy haptic on slam
      try { navigator.vibrate?.([150, 30, 100, 20, 60]); } catch (_) {}
      T(() => setShakeActive(false), 350);
    }, 1900);

    T(() => {
      setShowCoins(true);
      setShowStars(true);
      T(() => setShowCoins(false), 1400);
      T(() => setShowStars(false), 1000);
    }, 2050);

    T(() => {
      setPhase('reveal');          // text reveal
    }, 2300);

    autoNavRef.current = T(() => onNavigate?.(), 5200);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(autoNavRef.current);
    };
  }, [visible]);

  const handleSkip = () => {
    clearTimeout(autoNavRef.current);
    onNavigate?.();
  };

  if (!visible) return null;

  // Avatar Y position: starts above screen (-280), descends to hover above map (-30), then lands (0)
  const avatarY = phase === 'idle' || phase === 'zoom_out'
    ? -300
    : phase === 'descend'
    ? -40
    : 0;

  const avatarScale = phase === 'land' || phase === 'plant_flag' || phase === 'reveal'
    ? 1
    : phase === 'descend'
    ? 1
    : 0.6;

  return createPortal(
    <div
      dir="rtl"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999999,
        background: 'radial-gradient(ellipse at 50% 60%, #0a1f4e 0%, #020c20 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Animated stars bg */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 1.5 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 3 }}
            style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: 2 + Math.random() * 2, height: 2 + Math.random() * 2,
              borderRadius: '50%', background: 'white',
            }}
          />
        ))}
      </div>

      {/* Sunburst */}
      <Sunburst visible={phase !== 'idle' && phase !== 'zoom_out'} />

      {/* Camera shake wrapper */}
      <motion.div
        animate={shakeActive ? {
          x: [0,-8,8,-8,8,-5,5,0],
          y: [0,4,-4,3,-3,2,-2,0],
          transition: { duration: 0.35, ease: 'linear' }
        } : { x: 0, y: 0 }}
        style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          position: 'relative', width: '100%',
          gap: 0,
        }}
      >
        {/* ── CINEMATIC SCENE ── */}
        <div style={{
          position: 'relative',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center',
          width: 260,
          height: 280,
        }}>

          {/* Speed lines — visible during descent */}
          <AnimatePresence>
            {phase === 'descend' && (
              <motion.div
                key="speedlines"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                style={{
                  position: 'absolute', inset: -60,
                  pointerEvents: 'none', zIndex: 1,
                  background: 'repeating-conic-gradient(rgba(255,255,255,0.06) 0deg 3deg, transparent 3deg 18deg)',
                  borderRadius: '50%',
                }}
              />
            )}
          </AnimatePresence>

          {/* Avatar — animated entry + landing */}
          <motion.div
            animate={{
              y: avatarY,
              scale: avatarScale,
              rotate: phase === 'descend' ? [0, -8, 8, -4, 0] : 0,
            }}
            transition={
              phase === 'descend'
                ? { type: 'spring', damping: 6, stiffness: 60, duration: 1 }
                : phase === 'land'
                ? { type: 'spring', damping: 12, stiffness: 200 }
                : phase === 'plant_flag'
                ? { type: 'spring', damping: 6, stiffness: 300 }
                : { duration: 0 }
            }
            style={{
              fontSize: 72,
              lineHeight: 1,
              position: 'absolute',
              top: '30%',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 15,
              filter: phase === 'descend'
                ? 'drop-shadow(0 12px 30px rgba(251,191,36,0.9))'
                : 'drop-shadow(0 4px 16px rgba(251,191,36,0.6))',
              willChange: 'transform',
            }}
          >
            {/* Descent trail */}
            {phase === 'descend' && (
              <motion.div
                animate={{ scaleY: [0.2, 1, 0.2], opacity: [0, 0.5, 0] }}
                transition={{ duration: 0.6, repeat: 2 }}
                style={{
                  position: 'absolute', top: '100%', left: '50%',
                  transform: 'translateX(-50%)',
                  width: 8, height: 50,
                  background: 'linear-gradient(to bottom, rgba(251,191,36,0.8), transparent)',
                  borderRadius: 4, pointerEvents: 'none',
                }}
              />
            )}

            {C.avatar.emoji}

            {/* Flag — appears on plant_flag */}
            <AnimatePresence>
              {(phase === 'plant_flag' || phase === 'reveal') && (
                <motion.span
                  key="flag"
                  initial={{ scale: 0, y: 20, rotate: -45 }}
                  animate={{ scale: [0, 1.4, 1], y: [20, -8, 0], rotate: [-45, 5, 0] }}
                  transition={{ type: 'spring', damping: 7, stiffness: 280 }}
                  style={{
                    fontSize: C.avatar.flagSize,
                    position: 'absolute',
                    top: -14, left: -12,
                    filter: 'drop-shadow(0 2px 10px rgba(251,191,36,0.9))',
                    zIndex: 16,
                  }}
                >
                  {C.avatar.flagEmoji}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Map card — the landing target */}
          <div style={{
            position: 'absolute', bottom: 0, left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            {/* Impact dust cloud on land */}
            <AnimatePresence>
              {(phase === 'plant_flag' || phase === 'reveal') && (
                <motion.div
                  key="dust"
                  initial={{ scaleX: 0.2, opacity: 0.8 }}
                  animate={{ scaleX: [0.2, 2.5, 3], opacity: [0.8, 0.4, 0] }}
                  exit={{}}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  style={{
                    position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
                    width: 180, height: 20,
                    background: 'radial-gradient(ellipse, rgba(251,191,36,0.4) 0%, transparent 70%)',
                    borderRadius: '50%', pointerEvents: 'none', zIndex: 12,
                  }}
                />
              )}
            </AnimatePresence>

            {/* Shockwave + coins origin */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 0 }}>
              <Shockwave trigger={showShockwave} />
              <CoinBurst active={showCoins} />
              <div style={{ position: 'relative' }}>
                <StarsBurst active={showStars} />
              </div>
            </div>

            <MapCard
              visible={showMap}
              locationName={taskLocation}
            />
          </div>
        </div>

        {/* ── TEXT REVEAL ── */}
        <AnimatePresence>
          {phase === 'reveal' && (
            <motion.div
              key="text"
              initial={{ opacity: 0, y: 28, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', damping: 14, stiffness: 160 }}
              style={{ textAlign: 'center', padding: '0 28px', marginTop: 24, position: 'relative', zIndex: 20 }}
            >
              {/* Main headline */}
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 9, stiffness: 200 }}
                style={{
                  fontSize: 30, fontWeight: 900,
                  color: '#ffffff',
                  letterSpacing: -0.5, lineHeight: 1.2,
                  marginBottom: 10,
                  textShadow: '0 2px 20px rgba(251,191,36,0.6)',
                }}
              >
                {C.texts.line1}
              </motion.div>

              {/* Task pill */}
              {(taskTitle || taskPrice) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 14, padding: '8px 16px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    fontSize: 14, color: 'rgba(255,255,255,0.9)',
                    fontWeight: 700, marginBottom: 10,
                    maxWidth: 280,
                  }}
                >
                  {taskTitle && (
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 }}>
                      "{taskTitle}"
                    </span>
                  )}
                  {taskPrice && (
                    <span style={{ color: '#4ade80', fontWeight: 900, flexShrink: 0 }}>
                      ₪{taskPrice}
                    </span>
                  )}
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: 4 }}
              >
                {C.texts.line2}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}
              >
                {C.texts.line3}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Skip CTA */}
      <AnimatePresence>
        {phase === 'reveal' && (
          <motion.button
            key="skip"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            onClick={handleSkip}
            style={{
              position: 'absolute',
              bottom: 'max(32px, env(safe-area-inset-bottom))',
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              border: 'none',
              borderRadius: 99, padding: '14px 32px',
              color: '#7c2d00', fontSize: 16, fontWeight: 900,
              cursor: 'pointer', zIndex: 30,
              boxShadow: '0 8px 28px rgba(251,191,36,0.5)',
              WebkitTapHighlightColor: 'transparent',
              letterSpacing: 0.2,
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