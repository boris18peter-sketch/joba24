import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, ArrowRight, X, Zap, Briefcase, Coins } from 'lucide-react';

const STEPS = [
  {
    targetId: 'onboarding-create-btn',
    tooltip: 'below',
    icon: <Briefcase size={22} color="#1a6fd4" />,
    badge: 'פרסום משימה',
    title: 'פרסם משימה תוך 30 שניות',
    body: 'לחץ על כפתור הפלוס כדי לפרסם את המשימה שלך. תאר את הצורך, קבע מחיר, בחר מיקום — ועובדים זמינים יגיעו אליך ישירות.',
    highlight: 'כל פרסום חינמי לחלוטין!',
  },
  {
    targetId: 'onboarding-apply-btn',
    tooltip: 'above',
    icon: <Zap size={22} color="#f59e0b" />,
    badge: 'הגשת בקשה',
    title: 'מצאת משהו מעניין? הגש בקשה!',
    body: 'גלול בפיד, מצא משימות שמתאימות לך ולחץ "הגש בקשה". המפרסם יקבל עדכון ויאשר אותך — ואז אפשר לצאת לדרך.',
    highlight: 'אפשר לגלול ימינה/שמאלה כדי לסמן לא רלוונטי.',
  },
  {
    targetId: 'onboarding-credits-pill',
    tooltip: 'below',
    icon: <Coins size={22} color="#d97706" />,
    badge: 'ג\'ובות (קרדיטים)',
    title: 'ג\'ובות — הדלק שלך ב-Joba24',
    body: 'כאן רואים את יתרת הג\'ובות שלך. כעובד, אתה משתמש בג\'ובות כדי להגיש בקשות למשימות. ככל שהמשימה שווה יותר — כך עולה הגישה אליה.',
    highlight: 'קיבלת 50 ג\'ובות בונוס עם ההרשמה!',
    isLast: true,
  },
];

const PAD = 10;

function getRect(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  return el.getBoundingClientRect();
}

export default function OnboardingTutorial({ onDone }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const [visible, setVisible] = useState(false);
  const [animDir, setAnimDir] = useState(1); // 1=forward, -1=back

  const current = STEPS[step];

  const measureTarget = useCallback(() => {
    const r = getRect(current.targetId);
    setRect(r);
  }, [current.targetId]);

  useEffect(() => {
    const t = setTimeout(() => {
      measureTarget();
      setVisible(true);
    }, 400);
    return () => clearTimeout(t);
  }, [step, measureTarget]);

  useEffect(() => {
    window.addEventListener('resize', measureTarget);
    return () => window.removeEventListener('resize', measureTarget);
  }, [measureTarget]);

  const goTo = (nextStep, dir) => {
    setAnimDir(dir);
    setVisible(false);
    setTimeout(() => setStep(nextStep), 200);
  };

  const handleNext = () => {
    if (current.isLast) {
      setVisible(false);
      setTimeout(async () => {
        try { await base44.auth.updateMe({ is_first_login: false }); } catch (_) {}
        onDone();
      }, 220);
    } else {
      goTo(step + 1, 1);
    }
  };

  const handleBack = () => {
    if (step > 0) goTo(step - 1, -1);
  };

  const handleSkip = async () => {
    setVisible(false);
    setTimeout(async () => {
      try { await base44.auth.updateMe({ is_first_login: false }); } catch (_) {}
      onDone();
    }, 220);
  };

  if (!rect) return null;

  const spotX = rect.left - PAD;
  const spotY = rect.top - PAD;
  const spotW = rect.width + PAD * 2;
  const spotH = rect.height + PAD * 2;

  const tooltipWidth = Math.min(320, window.innerWidth - 32);
  const tooltipLeft = Math.max(16, Math.min(
    rect.left + rect.width / 2 - tooltipWidth / 2,
    window.innerWidth - tooltipWidth - 16
  ));

  const isBelow = current.tooltip === 'below';
  const tooltipTop = isBelow
    ? spotY + spotH + 16
    : spotY - 16;

  const progress = ((step + 1) / STEPS.length) * 100;

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        pointerEvents: 'all',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.25s ease',
      }}
      dir="rtl"
    >
      {/* Overlay — 4 sides */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: spotY, background: 'rgba(4,11,31,0.78)' }} />
      <div style={{ position: 'absolute', top: spotY + spotH, left: 0, right: 0, bottom: 0, background: 'rgba(4,11,31,0.78)' }} />
      <div style={{ position: 'absolute', top: spotY, left: 0, width: Math.max(0, spotX), height: spotH, background: 'rgba(4,11,31,0.78)' }} />
      <div style={{ position: 'absolute', top: spotY, left: spotX + spotW, right: 0, height: spotH, background: 'rgba(4,11,31,0.78)' }} />

      {/* Spotlight border + glow */}
      <div style={{
        position: 'absolute',
        top: spotY, left: spotX,
        width: spotW, height: spotH,
        borderRadius: 18,
        boxShadow: '0 0 0 2.5px #fbbf24, 0 0 0 6px rgba(251,191,36,0.18), 0 0 32px 8px rgba(251,191,36,0.35)',
        pointerEvents: 'none',
        transition: 'all 0.35s cubic-bezier(0.34,1.2,0.64,1)',
      }} />

      {/* Top bar: step counter + skip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: spotY,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
      }}>
        {/* Logo / brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, #1a6fd4, #0a3d82)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fbbf24', fontWeight: 900, fontSize: 16 }}>J</span>
          </div>
          <span style={{ color: 'white', fontWeight: 800, fontSize: 15, letterSpacing: -0.3 }}>מדריך מהיר</span>
        </div>

        {/* Step dots + skip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                width: i === step ? 20 : 6,
                height: 6, borderRadius: 99,
                background: i === step ? '#fbbf24' : i < step ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.25)',
                transition: 'all 0.3s ease',
              }} />
            ))}
          </div>
          <button
            onClick={handleSkip}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.75)', borderRadius: 20,
              fontSize: 12, fontWeight: 600, padding: '6px 14px', cursor: 'pointer',
            }}
          >
            <X size={12} /> דלג
          </button>
        </div>
      </div>

      {/* Tooltip card */}
      <div
        key={step}
        style={{
          position: 'absolute',
          top: isBelow ? tooltipTop : undefined,
          bottom: isBelow ? undefined : (window.innerHeight - tooltipTop),
          left: tooltipLeft,
          width: tooltipWidth,
          background: 'white',
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.15)',
          transform: visible ? 'scale(1) translateY(0)' : `scale(0.94) translateY(${animDir * 10}px)`,
          transition: 'transform 0.28s cubic-bezier(0.34,1.2,0.64,1)',
          zIndex: 1,
        }}
      >
        {/* Progress bar */}
        <div style={{ height: 4, background: '#f0f4ff' }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #1a6fd4, #fbbf24)',
            transition: 'width 0.4s ease',
            borderRadius: 2,
          }} />
        </div>

        {/* Card header */}
        <div style={{
          background: 'linear-gradient(135deg, #f0f6ff 0%, #fefce8 100%)',
          padding: '16px 20px 14px',
          display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: '1px solid #e8eef8',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            background: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          }}>
            {current.icon}
          </div>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 800, letterSpacing: 0.8,
              color: '#1a6fd4', textTransform: 'uppercase', marginBottom: 2,
            }}>
              {current.badge}
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#0f1e40', lineHeight: 1.25 }}>
              {current.title}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 20px' }}>
          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: 0 }}>
            {current.body}
          </p>

          {/* Highlight pill */}
          {current.highlight && (
            <div style={{
              marginTop: 12,
              background: 'linear-gradient(135deg, #fef9c3, #fefce8)',
              border: '1.5px solid #fde68a',
              borderRadius: 12, padding: '9px 13px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 14 }}>✨</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>
                {current.highlight}
              </span>
            </div>
          )}

          {/* Step counter */}
          <div style={{ marginTop: 12, fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
            שלב {step + 1} מתוך {STEPS.length}
          </div>
        </div>

        {/* Buttons */}
        <div style={{
          padding: '0 20px 20px',
          display: 'flex', gap: 10,
        }}>
          {/* Back button */}
          <button
            onClick={handleBack}
            disabled={step === 0}
            style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              border: '1.5px solid #dce8f5', background: step === 0 ? '#f8faff' : 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: step === 0 ? 'default' : 'pointer',
              opacity: step === 0 ? 0.35 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            <ArrowRight size={18} color="#1a6fd4" />
          </button>

          {/* Next / Finish */}
          <button
            onClick={handleNext}
            style={{
              flex: 1, height: 48, borderRadius: 14, border: 'none',
              background: current.isLast
                ? 'linear-gradient(135deg, #16a34a, #15803d)'
                : 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
              color: 'white', fontWeight: 900, fontSize: 15,
              cursor: 'pointer', letterSpacing: -0.2,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: current.isLast
                ? '0 4px 20px rgba(22,163,74,0.4)'
                : '0 4px 20px rgba(26,111,212,0.4)',
            }}
          >
            {current.isLast ? (
              <>🚀 יאללה, מתחילים!</>
            ) : (
              <>הבא <ArrowLeft size={16} /></>
            )}
          </button>
        </div>
      </div>

      {/* Caret arrow */}
      <div style={{
        position: 'absolute',
        left: tooltipLeft + tooltipWidth / 2 - 8,
        [isBelow ? 'top' : 'bottom']: isBelow
          ? tooltipTop - 8
          : (window.innerHeight - tooltipTop) - 8,
        width: 0, height: 0,
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        [isBelow ? 'borderBottom' : 'borderTop']: '8px solid white',
        filter: 'drop-shadow(0 -2px 2px rgba(0,0,0,0.08))',
        zIndex: 2,
        transition: 'left 0.3s ease',
      }} />
    </div>,
    document.body
  );
}