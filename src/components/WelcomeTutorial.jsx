import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowLeft, X, Shield, UserCircle2, Plus, Coins, Send } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

/**
 * WelcomeTutorial — contextual spotlight tutorial.
 *
 * Instead of a slideshow, it detects which real UI elements are present on the screen
 * (verification banner, profile-completion banner, create-task FAB, credits pill, apply button),
 * builds a step list from what it finds, and guides the user by highlighting each real
 * element with a glowing golden border over a dimmed background — with a floating white
 * card pointing to it (matching the supplied design reference).
 *
 * Gated by localStorage 'joba_welcome_seen'.
 */

const STORAGE_KEY = 'joba_welcome_seen';
const PAD = 10; // spotlight padding around the target element

// ── Step definitions ──────────────────────────────────────────────────────
// Each step targets a real DOM element by id and only runs if that element exists.
function buildSteps({ isAuthenticated, signupBonus, referralBonus, hasReferral }) {
  const totalBonus = (signupBonus || 0) + (hasReferral ? (referralBonus || 0) : 0);
  const jobasTitle = isAuthenticated
    ? `קיבלתם ${totalBonus} ג'ובות במתנה!`
    : "קבלו ג'ובות במתנה בהרשמה!";

  return [
    {
      id: 'onboarding-verify-banner',
      icon: Shield,
      badge: 'אימות',
      title: 'אמתו את הזהות שלכם',
      body: 'קבלו ווי ירוק של משתמש מאומת ובנו אמון מול משתמשים אחרים. הצוות של Joba24 מאמת פרטים תוך 6 שעות.',
    },
    {
      id: 'onboarding-profile-banner',
      icon: UserCircle2,
      badge: 'פרופיל',
      title: 'השלימו את הפרופיל',
      body: 'תחומי עיסוק וערים מועדפים — פרופיל מלא מגדיל את כמות המשימות הרלוונטיות שתקבלו.',
    },
    {
      id: 'onboarding-create-btn',
      icon: Plus,
      badge: 'פרסום',
      title: 'צריכים עזרה? פרסמו משימה',
      body: 'לחצו על +, הגדירו מה צריך לעשות ואנשים מתאימים באזור שלכם יוכלו להגיש בקשה.',
    },
    {
      id: 'onboarding-credits-pill',
      icon: Coins,
      badge: "ג'ובות",
      title: jobasTitle,
      body: "הג'ובות משמשות להגשת בקשות למשימות. תוכלו לראות את היתרה שלכם כאן.",
    },
    {
      id: 'onboarding-apply-btn',
      icon: Send,
      badge: 'הגשה',
      title: 'מצאתם משימה שמתאימה לכם?',
      body: 'לחצו על "הגש מועמדות" ושלחו בקשה. לא נבחרתם? הג\'ובות יוחזרו אליכם.',
    },
  ];
}

function elementVisible(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  // element must be at least partially within the viewport
  return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
}

function isOverlayOpen() {
  // Detect any portaled popup/sheet/modal sitting on top of the page (z-index ≥ 9999).
  // The tutorial must never render over a popup — it waits until the screen is clear.
  return Array.from(document.body.children).some(child => {
    const style = child.getAttribute('style') || '';
    if (/pointer-events:\s*none/.test(style)) return false;
    return /z-index:\s*9{4,}/.test(style);
  });
}

export default function WelcomeTutorial() {
  const { user: me, isAuthenticated } = useAuth();
  const [visible, setVisible] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [steps, setSteps] = useState([]);
  const [rect, setRect] = useState(null);
  const [cardPlacement, setCardPlacement] = useState('center'); // 'above' | 'below' | 'center'
  const rafRef = useRef(null);

  // Fetch JobaSettings to sync the bonus message
  const { data: settings } = useQuery({
    queryKey: ['jobaSettings'],
    queryFn: () => base44.entities.JobaSettings.list('-updated_date', 1).then(r => r[0] || null),
    staleTime: 300000,
  });

  const signupBonus = settings?.signup_bonus ?? 60;
  const referralBonus = settings?.referral_signup_bonus ?? 40;
  const hasReferral = !!(me?.referred_by_agent_code) || !!localStorage.getItem('joba24_ref_code');

  // Detect available steps once (after a short delay for layout to settle)
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const candidates = buildSteps({ isAuthenticated, signupBonus, referralBonus, hasReferral });

    const startedAt = Date.now();
    const MAX_WAIT = 60000; // keep waiting while a popup/sheet covers the screen
    const detect = () => {
      // Wait while any overlay (popup/sheet/modal) is open — the tutorial must
      // never appear over a popup. Re-check until the screen is clear, then start.
      if (Date.now() - startedAt > MAX_WAIT) return;
      if (isOverlayOpen()) { setTimeout(detect, 350); return; }
      const found = candidates.filter(s => elementVisible(document.getElementById(s.id)));
      if (found.length >= 2 || found.length === candidates.length) {
        if (found.length > 0) {
          setSteps(found);
          setVisible(true);
        }
        return;
      }
      setTimeout(detect, 300);
    };
    const t = setTimeout(detect, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, signupBonus, referralBonus]);

  const currentStep = steps[stepIdx];

  // Measure the current target element + decide card placement
  const measure = useCallback(() => {
    if (!currentStep) return;
    const el = document.getElementById(currentStep.id);
    if (!el) return;
    // Scroll into view first (within scroll containers), then measure after a tick
    const r = el.getBoundingClientRect();
    if (!elementVisible(el)) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    const compute = () => {
      const rr = el.getBoundingClientRect();
      setRect({ left: rr.left, top: rr.top, right: rr.right, bottom: rr.bottom, width: rr.width, height: rr.height });
      // Decide placement: prefer above the target, else below, else center
      const spaceAbove = rr.top;
      const spaceBelow = window.innerHeight - rr.bottom;
      const cardEstimate = 210; // approx card height
      if (spaceAbove > cardEstimate + 24) setCardPlacement('above');
      else if (spaceBelow > cardEstimate + 24) setCardPlacement('below');
      else setCardPlacement('center');
    };
    compute();
    // Re-measure shortly after any smooth scroll settles
    rafRef.current = setTimeout(compute, 260);
  }, [currentStep]);

  useEffect(() => {
    if (!visible || !currentStep) return;
    measure();
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
      if (rafRef.current) clearTimeout(rafRef.current);
    };
  }, [visible, currentStep, measure]);

  if (!visible || !currentStep || !rect) return null;

  const Icon = currentStep.icon;
  const isLast = stepIdx === steps.length - 1;

  const finish = () => {
    setVisible(false);
    setTimeout(() => localStorage.setItem(STORAGE_KEY, '1'), 250);
  };

  const next = () => {
    if (isLast) finish();
    else setStepIdx(stepIdx + 1);
  };
  const back = () => {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  };

  // Spotlight rectangle (with padding), clamped to viewport
  const spotLeft = Math.max(PAD, rect.left - PAD);
  const spotTop = Math.max(PAD, rect.top - PAD);
  const spotWidth = Math.min(rect.width + PAD * 2, window.innerWidth - spotLeft - PAD);
  const spotHeight = Math.min(rect.height + PAD * 2, window.innerHeight - spotTop - PAD);

  // Card position
  const cardWidth = Math.min(340, window.innerWidth - 32);
  const cardLeft = Math.max(16, Math.min((window.innerWidth - cardWidth) / 2, window.innerWidth - cardWidth - 16));
  let cardStyle = {};
  if (cardPlacement === 'above') {
    const bottom = window.innerHeight - spotTop + 18;
    cardStyle = { left: cardLeft, bottom, width: cardWidth };
  } else if (cardPlacement === 'below') {
    cardStyle = { left: cardLeft, top: spotTop + spotHeight + 18, width: cardWidth };
  } else {
    cardStyle = { left: cardLeft, top: '50%', transform: 'translateY(-50%)', width: cardWidth };
  }

  // Arrow
  const arrowAtBottom = cardPlacement === 'above';
  const arrowAtTop = cardPlacement === 'below';
  const arrowLeft = Math.max(40, Math.min(spotLeft + spotWidth / 2 - cardLeft, cardWidth - 40));

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 999999, pointerEvents: 'none' }} dir="rtl">
      {/* Dim layer with a hole (SVG mask) */}
      <svg width="100%" height="100%" style={{ position: 'fixed', inset: 0, pointerEvents: 'auto' }}>
        <defs>
          <mask id="jt-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect x={spotLeft} y={spotTop} width={spotWidth} height={spotHeight} rx="16" fill="black" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.72)" mask="url(#jt-mask)" pointerEvents="all" />
        {/* Transparent rect over the hole to block interaction with the target */}
        <rect x={spotLeft} y={spotTop} width={spotWidth} height={spotHeight} rx="16" fill="transparent" pointerEvents="all" />
      </svg>

      {/* Spotlight border (animated) */}
      <motion.div
        initial={false}
        animate={{ left: spotLeft, top: spotTop, width: spotWidth, height: spotHeight }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
        style={{
          position: 'fixed',
          borderRadius: 16,
          border: '3px solid #ffc107',
          boxShadow: '0 0 18px 3px rgba(255,193,7,0.7), 0 0 0 1px rgba(255,255,255,0.25) inset',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      >
        {/* Pulsing ring */}
        <div style={{ position: 'absolute', inset: -3, borderRadius: 16, border: '2px solid rgba(255,193,7,0.4)', animation: 'jtPulse 1.6s ease-in-out infinite' }} />
      </motion.div>

      {/* Floating card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, y: arrowAtBottom ? 14 : arrowAtTop ? -14 : 0, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
          style={{
            position: 'fixed',
            ...cardStyle,
            background: '#ffffff',
            borderRadius: 18,
            boxShadow: '0 12px 40px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.12)',
            padding: 18,
            pointerEvents: 'auto',
            zIndex: 3,
            boxSizing: 'border-box',
          }}
        >
          {/* Arrow pointing to target */}
          {arrowAtBottom && (
            <div style={{ position: 'absolute', bottom: -10, left: arrowLeft, width: 0, height: 0, borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderTop: '12px solid #ff9800' }} />
          )}
          {arrowAtTop && (
            <div style={{ position: 'absolute', top: -10, left: arrowLeft, width: 0, height: 0, borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderBottom: '12px solid #ff9800' }} />
          )}

          {/* Header: badge (right) + icon box (left) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: '#1a6fd4', letterSpacing: 0.3 }}>
              {currentStep.badge}
            </span>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={20} color="#1a6fd4" strokeWidth={1.9} />
            </div>
          </div>

          {/* Main heading */}
          <h2 style={{ fontSize: 19, fontWeight: 900, color: '#0f1e40', margin: '0 0 8px', lineHeight: 1.3, letterSpacing: -0.3, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon size={18} color="#1a6fd4" strokeWidth={2} />
            {currentStep.title}
          </h2>

          {/* Body */}
          <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: '0 0 16px' }}>
            {currentStep.body}
          </p>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
            {steps.map((_, i) => (
              <div key={i} style={{ width: i === stepIdx ? 22 : 6, height: 6, borderRadius: 99, background: i === stepIdx ? '#1a6fd4' : i < stepIdx ? 'rgba(26,111,212,0.4)' : '#e2e8f0', transition: 'all 0.3s' }} />
            ))}
          </div>

          {/* Footer: back (small, right) + next (primary) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {stepIdx > 0 ? (
              <button onClick={back} style={{ width: 48, height: 46, borderRadius: 13, flexShrink: 0, background: '#f1f5f9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowLeft size={18} color="#475569" style={{ transform: 'scaleX(-1)' }} />
              </button>
            ) : (
              <div style={{ width: 48, height: 46, flexShrink: 0 }} />
            )}
            <button onClick={next} style={{ flex: 1, height: 46, borderRadius: 13, border: 'none', background: '#1456a3', color: 'white', fontWeight: 900, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(20,86,163,0.35)' }}>
              {isLast ? 'סיום' : 'הבא'}
              <ArrowLeft size={18} color="white" />
            </button>
            <button onClick={finish} style={{ height: 46, padding: '0 16px', borderRadius: 13, flexShrink: 0, background: 'transparent', border: '1px solid #e2e8f0', color: '#64748b', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <X size={14} color="#94a3b8" /> דלג
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      <style>{`
        @keyframes jtPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.15; transform: scale(1.04); }
        }
      `}</style>
    </div>,
    document.body
  );
}