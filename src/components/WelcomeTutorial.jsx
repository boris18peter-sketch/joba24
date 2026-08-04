import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, Briefcase, Zap, Coins, ShieldCheck, Sparkles } from 'lucide-react';
import CreditIcon from '@/components/CreditIcon';

/**
 * WelcomeTutorial — premium first-run onboarding overlay shown once on HomeFeed.
 *
 * Flow:
 *   Steps 0-3: full-screen immersive carousel (app essence, post task, find work, jobas & trust)
 *   Step 4: spotlight the real "create task" FAB (id=onboarding-create-btn) with screen dim
 *   Step 5: spotlight the first task card's apply button (id=onboarding-apply-btn), then finish
 *
 * Gated by localStorage 'joba_welcome_seen'. Does not touch existing functionality.
 */

const STORAGE_KEY = 'joba_welcome_seen';
const PAD = 12;

function getRect(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  return el.getBoundingClientRect();
}

const CAROUSEL_STEPS = [
  {
    icon: <Sparkles size={30} color="white" strokeWidth={1.8} />,
    iconBg: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
    badge: 'ברוכים הבאים',
    title: 'Joba24 — הקהילה שעוזרת',
    body: 'Joba24 מחברת בין אנשים שצריכים עזרה למקצוענים בקהילה. כאן תוכל לפרסם משימות ולמצוא עבודה — הכל במקום אחד, מהיר ופשוט.',
    highlight: 'אלפי אנשים כבר עוזרים אחד לשני כל יום 🤝',
    accent: '#1a6fd4',
  },
  {
    icon: <Briefcase size={30} color="white" strokeWidth={1.8} />,
    iconBg: 'linear-gradient(135deg,#059669,#047857)',
    badge: 'פרסום משימה',
    title: 'צריך עזרה? פרסם תוך דקה',
    body: 'לחץ על כפתור הפלוס, תאר את המשימה, קבע מחיר ומיקום — ועובדים זמינים בקהילה יגישו בקשות. אתה בוחר את מי שמתאים ויוצאים לדרך.',
    highlight: 'הפרסום חינמי לחלוטין — תמיד 🎉',
    accent: '#059669',
  },
  {
    icon: <Zap size={30} color="white" strokeWidth={1.8} />,
    iconBg: 'linear-gradient(135deg,#f59e0b,#d97706)',
    badge: 'מציאת עבודה',
    title: 'רוצה לעבוד? הגש בקשה',
    body: 'גלול בפיד, מצא משימות שמתאימות לך ולחץ "הגש מועמדות". המפרסם מקבל עדכון ומאשר אותך — ואז יוצאים לבצע ולהרוויח.',
    highlight: "הג'ובות חוזרות אליך אם לא נבחרת — ללא סיכון ✅",
    accent: '#f59e0b',
  },
  {
    icon: <Coins size={30} color="white" strokeWidth={1.8} />,
    iconBg: 'linear-gradient(135deg,#d97706,#b45309)',
    badge: "ג'ובות",
    title: "ג'ובות — הדלק שלך",
    body: "ג'ובות הן מטבע ההתחייבות שלך להגשת בקשות. ככל שהמשימה שווה יותר — כך עולה דרישת ההתחייבות. קיבלת 50 ג'ובות בונוס עם ההרשמה כדי להתחיל!",
    highlight: null,
    showCredits: true,
    accent: '#d97706',
  },
  {
    icon: <ShieldCheck size={30} color="white" strokeWidth={1.8} />,
    iconBg: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
    badge: 'אמון',
    title: 'אימות זהות וביקורות',
    body: 'אימות זהות חד-פעמי מעניק ווי ירוק ובונה אמון. אחרי כל משימה שני הצדדים מדרגים אחד את השני — ככה בונים מוניטין אמיתי בקהילה.',
    highlight: 'דירוג גבוה = יותר הזדמנויות עבודה ⭐',
    accent: '#7c3aed',
  },
];

const SPOTLIGHT_STEPS = [
  { targetId: 'onboarding-create-btn', tooltip: 'above', badge: 'פרסום', title: 'כאן מפרסמים משימות', body: 'כפתור הפלוס פותח את טופס פרסום המשימה. זה המקום להתחיל כשאתה צריך עזרה.' },
  { targetId: 'onboarding-apply-btn', tooltip: 'below', badge: 'הגשה', title: 'וכאן מגישים בקשות', body: 'בכל כרטיס משימה תמצא כפתור "הגש מועמדות". לחץ עליו כדי לבקש לבצע את המשימה ולהרוויח.', isLast: true },
];

export default function WelcomeTutorial() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const [animDir, setAnimDir] = useState(1);
  const [spotReady, setSpotReady] = useState(false);

  const totalSteps = CAROUSEL_STEPS.length + SPOTLIGHT_STEPS.length;

  // Show only once — gated by localStorage
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  const isCarousel = step < CAROUSEL_STEPS.length;
  const isSpotlight = step >= CAROUSEL_STEPS.length;
  const spotIdx = step - CAROUSEL_STEPS.length;
  const currentSpot = isSpotlight ? SPOTLIGHT_STEPS[spotIdx] : null;

  // Measure spotlight target. Retries a few times in case the target mounts late
  // (e.g. task cards still loading). ALWAYS becomes "ready" so the overlay never
  // stays invisible-and-blocking — if the target isn't found, a centered fallback
  // tooltip is shown instead, with a visible dim and a finish button.
  const measureTarget = useCallback(() => {
    if (!isSpotlight || !currentSpot) { setRect(null); setSpotReady(true); return; }
    const r = getRect(currentSpot.targetId);
    setRect(r);
    setSpotReady(true);
  }, [isSpotlight, currentSpot]);

  useEffect(() => {
    if (!visible || !isSpotlight || !currentSpot) return;
    setSpotReady(false);
    setRect(null);
    let attempts = 0;
    let timer;
    const tryMeasure = () => {
      const r = getRect(currentSpot.targetId);
      if (r || attempts >= 4) {
        setRect(r);
        setSpotReady(true);
        return;
      }
      attempts++;
      timer = setTimeout(tryMeasure, 250);
    };
    timer = setTimeout(tryMeasure, 200);
    return () => clearTimeout(timer);
  }, [step, visible, isSpotlight, currentSpot]);

  useEffect(() => {
    if (!visible || !isSpotlight) return;
    const handler = () => measureTarget();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [visible, isSpotlight, measureTarget]);

  const finish = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, '1');
    }, 250);
  }, []);

  const goTo = (nextStep, dir) => {
    setAnimDir(dir);
    setSpotReady(false);
    setRect(null);
    setStep(nextStep);
  };

  const handleNext = () => {
    if (step >= totalSteps - 1) {
      finish();
    } else {
      goTo(step + 1, 1);
    }
  };

  const handleBack = () => {
    if (step > 0) goTo(step - 1, -1);
  };

  if (!visible) return null;

  // ── Spotlight rendering ──
  if (isSpotlight) {
    const hasRect = !!rect;
    const spotX = hasRect ? rect.left - PAD : 0;
    const spotY = hasRect ? rect.top - PAD : 0;
    const spotW = hasRect ? rect.width + PAD * 2 : 0;
    const spotH = hasRect ? rect.height + PAD * 2 : 0;

    const tooltipWidth = Math.min(330, window.innerWidth - 32);
    let tooltipLeft, tooltipTop;
    if (hasRect) {
      tooltipLeft = Math.max(16, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 16));
      const isBelowSpot = currentSpot.tooltip === 'below';
      tooltipTop = isBelowSpot ? spotY + spotH + 18 : Math.max(80, spotY - 18);
    } else {
      tooltipLeft = (window.innerWidth - tooltipWidth) / 2;
      tooltipTop = window.innerHeight / 2 - 80;
    }

    const isBelow = currentSpot.tooltip === 'below';

    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 999999, pointerEvents: spotReady ? 'all' : 'none', opacity: spotReady ? 1 : 0, transition: 'opacity 0.3s ease' }} dir="rtl">
        {hasRect && <>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: spotY, background: 'rgba(4,11,31,0.82)' }} />
          <div style={{ position: 'absolute', top: spotY + spotH, left: 0, right: 0, bottom: 0, background: 'rgba(4,11,31,0.82)' }} />
          <div style={{ position: 'absolute', top: spotY, left: 0, width: Math.max(0, spotX), height: spotH, background: 'rgba(4,11,31,0.82)' }} />
          <div style={{ position: 'absolute', top: spotY, left: spotX + spotW, right: 0, height: spotH, background: 'rgba(4,11,31,0.82)' }} />
        </>}
        {!hasRect && <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,11,31,0.82)' }} />}

        {hasRect && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            style={{
              position: 'absolute', top: spotY, left: spotX, width: spotW, height: spotH,
              borderRadius: 16, pointerEvents: 'none',
              boxShadow: '0 0 0 3px #fbbf24, 0 0 0 8px rgba(251,191,36,0.2), 0 0 36px 10px rgba(251,191,36,0.4)',
            }}
          />
        )}

        {hasRect && (
          <motion.div
            animate={{ y: [0, isBelow ? -8 : 8, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              left: spotX + spotW / 2 - 14,
              top: isBelow ? spotY + spotH + 20 : spotY - 36,
              zIndex: 3,
            }}
          >
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(251,191,36,0.5)' }}>
              <span style={{ fontSize: 16, color: '#78350f', fontWeight: 900 }}>{isBelow ? '↑' : '↓'}</span>
            </div>
          </motion.div>
        )}

        {/* Top bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#1a6fd4,#0a3d82)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fbbf24', fontWeight: 900, fontSize: 15 }}>J</span>
            </div>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 14 }}>סיור מהיר</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} style={{ width: i === step ? 18 : 5, height: 5, borderRadius: 99, background: i === step ? '#fbbf24' : i < step ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.25)', transition: 'all 0.3s' }} />
              ))}
            </div>
            <button onClick={finish} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.75)', borderRadius: 20, fontSize: 12, fontWeight: 600, padding: '6px 12px', cursor: 'pointer' }}>
              <X size={11} /> דלג
            </button>
          </div>
        </div>

        {/* Tooltip card */}
        <motion.div
          key={`spot_${spotIdx}`}
          initial={{ opacity: 0, scale: 0.94, y: animDir * 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          style={{
            position: 'absolute',
            top: isBelow ? tooltipTop : undefined,
            bottom: isBelow ? undefined : (window.innerHeight - tooltipTop),
            left: tooltipLeft,
            width: tooltipWidth,
            background: 'white', borderRadius: 22, overflow: 'hidden',
            boxShadow: '0 20px 56px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.15)',
            zIndex: 2,
          }}
        >
          <div style={{ background: 'linear-gradient(135deg,#f0f6ff,#fefce8)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #e8eef8' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={20} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 0.8, color: '#1a6fd4', textTransform: 'uppercase', marginBottom: 2 }}>{currentSpot.badge}</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#0f1e40', lineHeight: 1.25 }}>{currentSpot.title}</div>
            </div>
          </div>
          <div style={{ padding: '13px 18px' }}>
            <p style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.6, margin: 0 }}>{currentSpot.body}</p>
          </div>
          <div style={{ padding: '0 18px 16px', display: 'flex', gap: 10 }}>
            <button onClick={handleBack} disabled={step === 0} style={{ width: 46, height: 46, borderRadius: 13, flexShrink: 0, border: '1.5px solid #dce8f5', background: step === 0 ? '#f8faff' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: step === 0 ? 'default' : 'pointer', opacity: step === 0 ? 0.35 : 1 }}>
              <ArrowLeft size={18} color="#1a6fd4" style={{ transform: 'scaleX(-1)' }} />
            </button>
            <button onClick={handleNext} style={{ flex: 1, height: 46, borderRadius: 13, border: 'none', background: currentSpot.isLast ? 'linear-gradient(135deg,#16a34a,#15803d)' : 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: 'white', fontWeight: 900, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: currentSpot.isLast ? '0 4px 20px rgba(22,163,74,0.4)' : '0 4px 20px rgba(26,111,212,0.4)' }}>
              {currentSpot.isLast ? <>🚀 יאללה, מתחילים!</> : <>הבא <ArrowLeft size={16} /></>}
            </button>
          </div>
        </motion.div>
      </div>,
      document.body
    );
  }

  // ── Carousel (full-screen immersive) ──
  const current = CAROUSEL_STEPS[step];
  const progress = ((step + 1) / totalSteps) * 100;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(4,11,31,0.9)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column' }}
      dir="rtl"
    >
      {/* Top bar */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#1a6fd4,#0a3d82)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fbbf24', fontWeight: 900, fontSize: 16 }}>J</span>
          </div>
          <span style={{ color: 'white', fontWeight: 800, fontSize: 15, letterSpacing: -0.3 }}>מדריך התחלה</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} style={{ width: i === step ? 22 : 6, height: 6, borderRadius: 99, background: i === step ? '#fbbf24' : i < step ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.25)', transition: 'all 0.3s' }} />
            ))}
          </div>
          <button onClick={finish} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.75)', borderRadius: 20, fontSize: 12, fontWeight: 600, padding: '6px 14px', cursor: 'pointer' }}>
            <X size={12} /> דלג
          </button>
        </div>
      </div>

      {/* Animated content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        <AnimatePresence mode="wait" custom={animDir}>
          <motion.div
            key={step}
            custom={animDir}
            initial={{ opacity: 0, x: animDir > 0 ? 60 : -60, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: animDir > 0 ? -60 : 60, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            style={{ width: '100%', maxWidth: 380, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ position: 'relative', marginBottom: 28 }}
            >
              <div style={{ position: 'absolute', inset: -20, borderRadius: '50%', background: `radial-gradient(circle, ${current.accent}40 0%, transparent 70%)`, filter: 'blur(20px)' }} />
              <motion.div
                initial={{ scale: 0.6, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 14, stiffness: 200, delay: 0.1 }}
                style={{
                  width: 92, height: 92, borderRadius: 28,
                  background: current.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 16px 40px ${current.accent}66, 0 4px 12px rgba(0,0,0,0.3)`,
                  position: 'relative',
                }}
              >
                {current.icon}
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: '#fbbf24', textTransform: 'uppercase', marginBottom: 8, padding: '4px 14px', background: 'rgba(251,191,36,0.12)', borderRadius: 20, border: '1px solid rgba(251,191,36,0.25)' }}
            >
              {current.badge}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: '0 0 14px', lineHeight: 1.2, letterSpacing: -0.5 }}
            >
              {current.title}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              style={{ fontSize: 15, color: 'rgba(255,255,255,0.78)', lineHeight: 1.65, margin: 0, maxWidth: 340 }}
            >
              {current.body}
            </motion.p>

            {current.highlight && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', damping: 18 }}
                style={{ marginTop: 20, background: 'linear-gradient(135deg,rgba(251,191,36,0.18),rgba(251,191,36,0.08))', border: '1.5px solid rgba(251,191,36,0.35)', borderRadius: 14, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 8, maxWidth: 320 }}
              >
                <span style={{ fontSize: 15 }}>✨</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fde68a' }}>{current.highlight}</span>
              </motion.div>
            )}

            {current.showCredits && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, type: 'spring', damping: 18 }}
                style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg,rgba(251,191,36,0.15),rgba(217,119,6,0.1))', border: '1.5px solid rgba(251,191,36,0.3)', borderRadius: 16, padding: '14px 22px' }}
              >
                <CreditIcon size={34} />
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#fbbf24', lineHeight: 1 }}>50</div>
                  <div style={{ fontSize: 11, color: 'rgba(251,191,36,0.7)', fontWeight: 600 }}>ג׳ובות בונוס 🎁</div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '0 24px', flexShrink: 0 }}>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
          <motion.div style={{ height: '100%', background: 'linear-gradient(90deg,#1a6fd4,#fbbf24)' }} animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>
      </div>

      {/* Bottom controls */}
      <div style={{ padding: '20px 24px 32px', display: 'flex', gap: 12, flexShrink: 0 }}>
        <button onClick={handleBack} disabled={step === 0} style={{ width: 54, height: 52, borderRadius: 15, flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.15)', background: step === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: step === 0 ? 'default' : 'pointer', opacity: step === 0 ? 0.3 : 1 }}>
          <ArrowLeft size={19} color="white" style={{ transform: 'scaleX(-1)' }} />
        </button>
        <button onClick={handleNext} style={{ flex: 1, height: 52, borderRadius: 15, border: 'none', background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: 'white', fontWeight: 900, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: -0.2, boxShadow: '0 6px 24px rgba(26,111,212,0.5)' }}>
          {step === CAROUSEL_STEPS.length - 1 ? <>הכירו את הכפתורים <ArrowLeft size={17} /></> : <>המשך <ArrowLeft size={17} /></>}
        </button>
      </div>
    </motion.div>,
    document.body
  );
}