import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import CreditIcon from '@/components/CreditIcon';

const STEPS = [
  {
    targetId: 'onboarding-create-btn',
    tooltip: 'below',
    title: 'צריך עובד? לוחצים כאן! 😉',
    body: 'ממלאים את פרטי המשימה בקלות, מפרסמים תוך 30 שניות בלבד, ומתחילים לקבל בקשות מיידיות מעובדים זמינים בסביבה.',
    btnLabel: 'הבא →',
  },
  {
    targetId: 'onboarding-apply-btn',
    tooltip: 'above',
    title: 'רוצה לעבוד ולהרוויח? 💸',
    body: 'מצאת משימה שמתאימה לך? שלח בקשה בלחיצה מהירה, חכה לאישור רשמי מהמפרסם, וצא לדרך!',
    btnLabel: 'הבא →',
  },
  {
    targetId: 'onboarding-credits-pill',
    tooltip: 'below',
    title: 'הדלק שלך באפליקציה: ג\'ובות! 🪙',
    body: 'כאן נמצא הארנק שלך. כעובד, באמצעות הקרדיטים תוכל להגיש בקשות למשימות שוות. כמפרסם, תוכל לתת בוסט לפרסומים שלך ולהקפיץ אותם לראש הפיד!',
    btnLabel: 'יאללה, בוא נתחיל! 🚀',
    isLast: true,
  },
];

const PAD = 8; // spotlight padding around element

function getRect(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  return el.getBoundingClientRect();
}

export default function OnboardingTutorial({ onDone }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const [visible, setVisible] = useState(false);

  const current = STEPS[step];

  const measureTarget = useCallback(() => {
    const r = getRect(current.targetId);
    setRect(r);
  }, [current.targetId]);

  useEffect(() => {
    // Small delay to let layout settle
    const t = setTimeout(() => {
      measureTarget();
      setVisible(true);
    }, 400);
    return () => clearTimeout(t);
  }, [step, measureTarget]);

  // Re-measure on resize
  useEffect(() => {
    window.addEventListener('resize', measureTarget);
    return () => window.removeEventListener('resize', measureTarget);
  }, [measureTarget]);

  const handleNext = async () => {
    if (current.isLast) {
      // Fade out then complete
      setVisible(false);
      setTimeout(async () => {
        try {
          await base44.auth.updateMe({ is_first_login: false });
        } catch (_) {}
        onDone();
      }, 220);
    } else {
      setVisible(false);
      setTimeout(() => {
        setStep(s => s + 1);
      }, 200);
    }
  };

  const handleSkip = async () => {
    setVisible(false);
    setTimeout(async () => {
      try {
        await base44.auth.updateMe({ is_first_login: false });
      } catch (_) {}
      onDone();
    }, 220);
  };

  if (!rect) return null;

  const spotX = rect.left - PAD;
  const spotY = rect.top - PAD;
  const spotW = rect.width + PAD * 2;
  const spotH = rect.height + PAD * 2;

  // Tooltip position
  const tooltipWidth = Math.min(300, window.innerWidth - 32);
  const tooltipLeft = Math.max(16, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 16));
  const isBelow = current.tooltip === 'below';
  const tooltipTop = isBelow ? spotY + spotH + 12 : spotY - 12;

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        pointerEvents: 'all',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.22s ease',
      }}
      dir="rtl"
    >
      {/* Dark overlay via SVG clip or box-shadow trick */}
      {/* Top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: spotY, background: 'rgba(5,15,40,0.72)' }} />
      {/* Bottom */}
      <div style={{ position: 'absolute', top: spotY + spotH, left: 0, right: 0, bottom: 0, background: 'rgba(5,15,40,0.72)' }} />
      {/* Left */}
      <div style={{ position: 'absolute', top: spotY, left: 0, width: spotX, height: spotH, background: 'rgba(5,15,40,0.72)' }} />
      {/* Right */}
      <div style={{ position: 'absolute', top: spotY, left: spotX + spotW, right: 0, height: spotH, background: 'rgba(5,15,40,0.72)' }} />

      {/* Spotlight glow border */}
      <div style={{
        position: 'absolute',
        top: spotY, left: spotX,
        width: spotW, height: spotH,
        borderRadius: 16,
        boxShadow: '0 0 0 3px #fbbf24, 0 0 28px 6px rgba(251,191,36,0.45)',
        pointerEvents: 'none',
        transition: 'all 0.3s cubic-bezier(0.34,1.2,0.64,1)',
      }} />

      {/* Step dots */}
      <div style={{
        position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 6,
      }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 18 : 7,
            height: 7,
            borderRadius: 99,
            background: i === step ? '#fbbf24' : 'rgba(255,255,255,0.35)',
            transition: 'all 0.25s ease',
          }} />
        ))}
      </div>

      {/* Skip button */}
      <button
        onClick={handleSkip}
        style={{
          position: 'absolute', top: 18, left: 16,
          background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
          color: 'rgba(255,255,255,0.7)', borderRadius: 20, fontSize: 12, fontWeight: 600,
          padding: '5px 14px', cursor: 'pointer',
        }}
      >
        דלג
      </button>

      {/* Tooltip card */}
      <div style={{
        position: 'absolute',
        top: isBelow ? tooltipTop : undefined,
        bottom: isBelow ? undefined : window.innerHeight - tooltipTop,
        left: tooltipLeft,
        width: tooltipWidth,
        background: 'white',
        borderRadius: 20,
        padding: '18px 18px 16px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.28)',
        transform: visible ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(8px)',
        transition: 'transform 0.22s cubic-bezier(0.34,1.2,0.64,1)',
        zIndex: 1,
      }}>
        {/* Arrow */}
        <div style={{
          position: 'absolute',
          [isBelow ? 'top' : 'bottom']: -8,
          left: '50%', transform: 'translateX(-50%)',
          width: 16, height: 8,
          overflow: 'hidden',
        }}>
          <div style={{
            width: 12, height: 12,
            background: 'white',
            margin: isBelow ? '-6px auto 0' : '2px auto 0',
            transform: 'rotate(45deg)',
            boxShadow: isBelow ? '-2px -2px 4px rgba(0,0,0,0.08)' : '2px 2px 4px rgba(0,0,0,0.08)',
          }} />
        </div>

        <div style={{ fontSize: 15, fontWeight: 900, color: '#0f2b6b', marginBottom: 7, lineHeight: 1.3 }}>
          {current.title}
        </div>
        <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.65, margin: '0 0 14px' }}>
          {current.body}
        </p>

        <button
          onClick={handleNext}
          style={{
            width: '100%', height: 48, borderRadius: 14,
            background: current.isLast
              ? 'linear-gradient(135deg, #16a34a, #15803d)'
              : 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
            border: 'none', color: 'white',
            fontWeight: 900, fontSize: 15, cursor: 'pointer',
            boxShadow: current.isLast
              ? '0 4px 16px rgba(22,163,74,0.4)'
              : '0 4px 16px rgba(26,111,212,0.4)',
          }}
        >
          {current.btnLabel}
        </button>
      </div>
    </div>,
    document.body
  );
}