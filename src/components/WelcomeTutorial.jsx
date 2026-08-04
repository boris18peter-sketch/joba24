import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, Briefcase, Coins, Zap, ShieldCheck, Plus, Send, CheckCircle2, UserCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { isUserVerified } from '@/lib/utils';
import CreditIcon from '@/components/CreditIcon';

/**
 * WelcomeTutorial — concise 4-step first-run onboarding overlay shown once on HomeFeed.
 *
 * Steps (all use the same immersive slide layout with a UI mockup):
 *   1. פרסום משימה  — shows the "+" FAB mockup
 *   2. ג'ובות       — shows the credit-balance pill mockup (synced to the user's bonus)
 *   3. הגשת בקשה   — shows a task card with the apply button mockup
 *   4. אימות ואמון  — synced: verified → celebration; not verified → verify banner mockup; profile incomplete → profile banner mockup
 *
 * Gated by localStorage 'joba_welcome_seen'.
 */

const STORAGE_KEY = 'joba_welcome_seen';

// ── Mockups (realistic app-UI snippets) ──────────────────────────────────

function PostTaskMockup() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 32px rgba(26,111,212,0.5)' }}>
        <Plus size={32} color="white" strokeWidth={2.6} />
      </div>
      <span style={{ fontSize: 11, color: '#1a6fd4', fontWeight: 800 }}>פרסם משימה</span>
    </div>
  );
}

function JobasMockup({ amount }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fbbf24', borderRadius: 14, padding: '0 16px', height: 48, boxShadow: '0 8px 24px rgba(251,191,36,0.45)' }}>
      <CreditIcon size={22} />
      <span style={{ fontSize: 22, fontWeight: 900, color: '#1a3a6b', minWidth: 34, textAlign: 'center' }}>{amount}</span>
      <span style={{ fontSize: 22, color: '#1a3a6b', fontWeight: 800 }}>+</span>
    </div>
  );
}

function ApplyMockup() {
  return (
    <div style={{ width: 260, background: 'white', borderRadius: 18, border: '1px solid #e8eef8', boxShadow: '0 16px 40px rgba(0,0,0,0.28)', padding: 14, direction: 'rtl' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Briefcase size={18} color="#1a6fd4" /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f1e40' }}>תיקון ברז דולף</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>תל אביב · ₪250</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <div style={{ background: '#1a6fd4', color: 'white', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(26,111,212,0.35)' }}>
          <Send size={12} /> הגש מועמדות <span style={{ fontSize: 10, opacity: 0.9, display: 'inline-flex', alignItems: 'center', gap: 2 }}>3 <CreditIcon size={9} /></span>
        </div>
      </div>
    </div>
  );
}

function VerifyBannerMockup() {
  return (
    <div style={{ width: 280, borderRadius: 16, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', padding: 14, boxShadow: '0 16px 40px rgba(0,0,0,0.3)', direction: 'rtl', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldCheck size={20} color="white" /></div>
        <div style={{ fontSize: 14, fontWeight: 900, color: 'white' }}>אימות זהות</div>
      </div>
      <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, marginBottom: 10 }}>אימות חד־פעמי פותח ווי ירוק ובונה אמון.</div>
      <div style={{ height: 38, borderRadius: 11, background: '#fbbf24', color: '#1a3a6b', fontWeight: 900, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>אמת זהות עכשיו</div>
    </div>
  );
}

function ProfileBannerMockup() {
  return (
    <div style={{ width: 280, borderRadius: 16, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', padding: 14, boxShadow: '0 16px 40px rgba(0,0,0,0.3)', direction: 'rtl', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserCircle2 size={20} color="white" /></div>
        <div style={{ fontSize: 14, fontWeight: 900, color: 'white' }}>השלם פרופיל עובד</div>
      </div>
      <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, marginBottom: 10 }}>פרופיל מלא מגדיל הזדמנויות עבודה.</div>
      <div style={{ height: 38, borderRadius: 11, background: '#fbbf24', color: '#1a3a6b', fontWeight: 900, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎁 השלם פרופיל וקבל בונוס</div>
    </div>
  );
}

function VerifiedMockup() {
  return (
    <div style={{ width: 280, borderRadius: 16, background: 'linear-gradient(135deg,#059669,#047857)', padding: 16, boxShadow: '0 16px 40px rgba(5,150,105,0.45)', direction: 'rtl', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={26} color="white" /></div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 900, color: 'white' }}>מאומת ✅</div>
        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.88)', marginTop: 2 }}>ווי ירוק פעיל — כל הכבוד!</div>
      </div>
    </div>
  );
}

export default function WelcomeTutorial() {
  const { user: me, isAuthenticated } = useAuth();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [animDir, setAnimDir] = useState(1);

  // Fetch JobaSettings to sync the bonus message (signup_bonus + referral_signup_bonus)
  const { data: settings } = useQuery({
    queryKey: ['jobaSettings'],
    queryFn: () => base44.entities.JobaSettings.list('-updated_date', 1).then(r => r[0] || null),
    staleTime: 300000,
  });

  const signupBonus = settings?.signup_bonus ?? 60;
  const referralBonus = settings?.referral_signup_bonus ?? 40;
  const hasReferral = !!(me?.referred_by_agent_code) || !!localStorage.getItem('joba24_ref_code');
  const totalBonus = signupBonus + (hasReferral ? referralBonus : 0);

  const isVerified = !!(me && isUserVerified(me));
  const profileComplete = !!(me?.preferred_categories?.length > 0 && me?.preferred_cities?.length > 0);

  // Show only once — gated by localStorage
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  // Build step 4 content dynamically based on user state
  const verifyStep = (() => {
    if (isVerified && profileComplete) {
      return {
        icon: <ShieldCheck size={30} color="white" strokeWidth={1.8} />,
        iconBg: 'linear-gradient(135deg,#059669,#047857)',
        badge: 'אימות',
        title: 'כל הכבוד — מאומת!',
        body: 'אתה משתמש מאומת עם ווי ירוק ✅ ופרופיל מלא. דירוג גבוה אחרי כל משימה יפתח עוד הזדמנויות עבודה.',
        accent: '#059669',
        mockup: <VerifiedMockup />,
        isLast: true,
      };
    }
    if (isVerified && !profileComplete) {
      return {
        icon: <UserCircle2 size={30} color="white" strokeWidth={1.8} />,
        iconBg: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
        badge: 'השלמת פרופיל',
        title: 'מאומת — עכשיו השלם פרופיל',
        body: 'כל הכבוד על האימות ✅. עכשיו השלם את פרופיל העובד כדי לקבל משימות רלוונטיות ולהגדיל את הסיכוי שיבחרו בך.',
        accent: '#1a6fd4',
        mockup: <ProfileBannerMockup />,
        isLast: true,
      };
    }
    // Not verified
    return {
      icon: <ShieldCheck size={30} color="white" strokeWidth={1.8} />,
      iconBg: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
      badge: 'אימות',
      title: 'אימות ואמון',
      body: 'אימות זהות חד־פעמי מעניק ווי ירוק ובונה אמון. אחרי כל משימה שני הצדדים מדרגים — ככה בונים מוניטין אמיתי. השלם גם את הפרופיל כדי לקבל יותר משימות.',
      accent: '#7c3aed',
      mockup: <VerifyBannerMockup />,
      isLast: true,
    };
  })();

  const STEPS = [
    {
      icon: <Briefcase size={30} color="white" strokeWidth={1.8} />,
      iconBg: 'linear-gradient(135deg,#059669,#047857)',
      badge: 'פרסום משימה',
      title: 'צריך עזרה? פרסם תוך דקה',
      body: 'לחץ על כפתור הפלוס, תאר את המשימה, קבע מחיר ומיקום — ועובדים יגישו בקשות. אתה בוחר את מי שמתאים.',
      accent: '#059669',
      mockup: <PostTaskMockup />,
    },
    {
      icon: <Coins size={30} color="white" strokeWidth={1.8} />,
      iconBg: 'linear-gradient(135deg,#d97706,#b45309)',
      badge: "ג'ובות",
      title: "ג'ובות — מטבע ההתחייבות",
      body: isAuthenticated
        ? (hasReferral
            ? `קיבלת ${signupBonus} ג'ובות בונוס הצטרפות + ${referralBonus} מהפניית סוכן = ${totalBonus} סה״כ 🎁 ככל שהמשימה גדולה — כך עולה דרישת ההתחייבות.`
            : `קיבלת ${signupBonus} ג'ובות בונוס הצטרפות 🎁 ככל שהמשימה גדולה — כך עולה דרישת ההתחייבות.`)
        : `תקבל ${signupBonus} ג'ובות בונוס הצטרפות עם ההרשמה 🎁 ככל שהמשימה גדולה — כך עולה דרישת ההתחייבות.`,
      accent: '#d97706',
      mockup: <JobasMockup amount={isAuthenticated ? totalBonus : signupBonus} />,
    },
    {
      icon: <Zap size={30} color="white" strokeWidth={1.8} />,
      iconBg: 'linear-gradient(135deg,#f59e0b,#d97706)',
      badge: 'הגשת בקשה',
      title: 'רוצה לעבוד? הגש בקשה',
      body: 'בכל כרטיס משימה תמצא כפתור "הגש מועמדות". לחץ עליו — והמפרסם יאשר. לא נבחרת? הג\'ובות חוזרות אליך, ללא סיכון.',
      accent: '#f59e0b',
      mockup: <ApplyMockup />,
    },
    verifyStep,
  ];

  const totalSteps = STEPS.length;
  const current = STEPS[step];
  const progress = ((step + 1) / totalSteps) * 100;

  const finish = () => {
    setVisible(false);
    setTimeout(() => localStorage.setItem(STORAGE_KEY, '1'), 250);
  };

  const goTo = (nextStep, dir) => {
    setAnimDir(dir);
    setStep(nextStep);
  };

  const handleNext = () => {
    if (step >= totalSteps - 1) finish();
    else goTo(step + 1, 1);
  };

  const handleBack = () => {
    if (step > 0) goTo(step - 1, -1);
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(4,11,31,0.92)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column' }}
      dir="rtl"
    >
      {/* Top bar */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#1a6fd4,#0a3d82)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fbbf24', fontWeight: 900, fontSize: 16 }}>J</span>
          </div>
          <span style={{ color: 'white', fontWeight: 800, fontSize: 15, letterSpacing: -0.3 }}>מדריך מהיר · צעד {step + 1}/{totalSteps}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {STEPS.map((_, i) => (
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
            initial={{ opacity: 0, x: animDir > 0 ? 50 : -50, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: animDir > 0 ? -50 : 50, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            style={{ width: '100%', maxWidth: 380, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            {/* Mockup hero (the real UI element preview) */}
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.12, type: 'spring', damping: 16, stiffness: 220 }}
              style={{ marginBottom: 24, position: 'relative', display: 'flex', justifyContent: 'center' }}
            >
              <div style={{ position: 'absolute', inset: -28, borderRadius: '50%', background: `radial-gradient(circle, ${current.accent}40 0%, transparent 70%)`, filter: 'blur(24px)' }} />
              <div style={{ position: 'relative' }}>
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {current.mockup}
                </motion.div>
              </div>
            </motion.div>

            {/* Icon + badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 11, background: current.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 22px ${current.accent}55` }}>
                {current.icon}
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: '#fbbf24', textTransform: 'uppercase', padding: '5px 14px', background: 'rgba(251,191,36,0.12)', borderRadius: 20, border: '1px solid rgba(251,191,36,0.25)' }}>
                {current.badge}
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24 }}
              style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: '0 0 12px', lineHeight: 1.2, letterSpacing: -0.5 }}
            >
              {current.title}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, margin: 0, maxWidth: 340 }}
            >
              {current.body}
            </motion.p>
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
        <button onClick={handleNext} style={{ flex: 1, height: 52, borderRadius: 15, border: 'none', background: step === totalSteps - 1 ? 'linear-gradient(135deg,#16a34a,#15803d)' : 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: 'white', fontWeight: 900, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: -0.2, boxShadow: step === totalSteps - 1 ? '0 6px 24px rgba(22,163,74,0.5)' : '0 6px 24px rgba(26,111,212,0.5)' }}>
          {step === totalSteps - 1 ? <>🚀 יאללה, מתחילים!</> : <>המשך <ArrowLeft size={17} /></>}
        </button>
      </div>
    </motion.div>,
    document.body
  );
}