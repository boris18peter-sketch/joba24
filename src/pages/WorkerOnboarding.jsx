import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, Check, Loader2, Camera, Briefcase,
  MapPin, FileText, Phone, Tag
} from 'lucide-react';
import { CATEGORIES, getCategoryLabel } from '@/lib/categories';
import LoginPromptModal from '@/components/LoginPromptModal';

const JOIN_COMPLETED_KEY = 'joba24_join_completed';
const JOIN_BONUS_GRANTED_KEY = 'joba24_join_bonus_granted';

const STEPS = [
  { key: 'profession', icon: Briefcase, title: 'מה המקצוע שלך?', subtitle: 'לדוגמה: אינסטלטור, חשמלאי, מנקה...', type: 'text', placeholder: 'לדוגמה: אינסטלטור' },
  { key: 'preferred_categories', icon: Tag, title: 'איזה סוגי משימות תרצה לראות?', subtitle: 'בחר קטגוריות — הפיד שלך יתאים את עצמו בהתאם 🎯', type: 'chips' },
  { key: 'preferred_cities', icon: MapPin, title: 'באילו ערים אתה עובד?', subtitle: 'הפרד בפסיק', type: 'text', placeholder: 'תל אביב, רמת גן, גבעתיים' },
  { key: 'bio', icon: FileText, title: 'ספר קצת על עצמך', subtitle: 'ניסיון, התמחות, זמינות...', type: 'textarea', placeholder: 'בעל 10 שנות ניסיון באינסטלציה, מתמחה בתיקון נזילות והתקנת ברזים...' },
  { key: 'phone', icon: Phone, title: 'מספר טלפון', subtitle: 'ליצירת קשר עם לקוחות', type: 'phone', placeholder: '050-1234567' },
  { key: 'profile_photo', icon: Camera, title: 'תמונת פרופיל', subtitle: 'אופציונלי — אבל מומלץ!', type: 'photo' },
];

export default function WorkerOnboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [step, setStep] = useState(-1); // -1 = welcome, 0..N-1 = steps, N = done
  const [direction, setDirection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [data, setData] = useState({
    profession: '',
    preferred_categories: [],
    preferred_cities: [],
    bio: '',
    phone: '',
    profile_photo: '',
  });
  const photoInputRef = useRef(null);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Pre-fill from existing profile
  useEffect(() => {
    if (me) {
      setData({
        profession: me.profession || '',
        preferred_categories: me.preferred_categories || [],
        preferred_cities: me.preferred_cities || [],
        bio: me.bio || '',
        phone: me.phone || '',
        profile_photo: me.profile_photo || '',
      });
    }
  }, [me]);

  // Auto-advance to step 0 once authenticated (handles post-OAuth redirect)
  useEffect(() => {
    if (isAuthenticated && step === -1) {
      setDirection(1);
      setStep(0);
    }
  }, [isAuthenticated]);

  const totalSteps = STEPS.length;

  const handleNext = async () => {
    const isLastStep = step === totalSteps - 1;
    if (step >= 0 && step < totalSteps) {
      const stepKey = STEPS[step].key;
      setSaving(true);
      try {
        const updateData = {};
        if (stepKey === 'preferred_cities') {
          updateData.preferred_cities = (data.preferred_cities || '').split(',').map(c => c.trim()).filter(Boolean);
        } else {
          updateData[stepKey] = data[stepKey];
        }
        await base44.auth.updateMe(updateData);
        queryClient.invalidateQueries({ queryKey: ['me'] });

        // On last step — mark join completed + grant 25 credits bonus (once per user, server-checked)
        if (isLastStep && me?.id) {
          localStorage.setItem(JOIN_COMPLETED_KEY, '1');
          const bonusKey = JOIN_BONUS_GRANTED_KEY + '_' + me.id;
          // Fast path: localStorage says already granted
          if (!localStorage.getItem(bonusKey)) {
            // Server-side guard: check if a Signup_Bonus transaction already exists for this user
            const existingBonus = await base44.entities.CreditTransaction.filter({
              user_id: me.id,
              type: 'Signup_Bonus',
            });
            if (existingBonus.length === 0) {
              const freshMe = await base44.auth.me();
              const currentCredits = freshMe.worker_credits ?? 100;
              await base44.auth.updateMe({ worker_credits: currentCredits + 25 });
              await base44.entities.CreditTransaction.create({
                user_id: me.id,
                amount: 25,
                type: 'Signup_Bonus',
                note: 'בונוס מילוי פרופיל עובד',
                balance_after: currentCredits + 25,
              });
              queryClient.invalidateQueries({ queryKey: ['me'] });
            }
            // Mark locally so we skip the server check next time
            localStorage.setItem(bonusKey, '1');
          }
        }
      } catch (e) {
        console.error('Save error:', e);
      }
      setSaving(false);
    }
    setDirection(1);
    setStep(s => s + 1);
  };

  const handleBack = () => {
    setDirection(-1);
    setStep(s => s - 1);
  };

  const toggleCategory = (cat) => {
    setData(prev => {
      const cats = prev.preferred_categories || [];
      return {
        ...prev,
        preferred_categories: cats.includes(cat) ? cats.filter(c => c !== cat) : [...cats, cat],
      };
    });
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setData(prev => ({ ...prev, profile_photo: file_url }));
    } catch (err) {
      console.error('Upload error:', err);
    }
    setUploadingPhoto(false);
  };

  // ── Loading ──
  if (isLoadingAuth) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-1)' }}>
        <Loader2 size={28} className="animate-spin" color="#1a6fd4" />
      </div>
    );
  }

  // ── Not authenticated — landing hero with inline login ──
  if (!isAuthenticated) {
    return (
      <div dir="rtl" style={{ minHeight: '100dvh', background: 'linear-gradient(165deg, #0a1f4e 0%, #0f2b6b 35%, #1a6fd4 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'max(40px, env(safe-area-inset-top)) 24px max(40px, env(safe-area-inset-bottom))', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {showLogin && <LoginPromptModal onClose={() => setShowLogin(false)} />}

        {/* Decorative blurred glow circles */}
        <div style={{ position: 'absolute', top: '-10%', right: '-15%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.18) 0%, transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-15%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,111,212,0.3) 0%, transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />

        {/* Brand logo */}
        <div style={{ width: 80, height: 80, borderRadius: 22, overflow: 'hidden', marginBottom: 20, border: '2px solid rgba(255,255,255,0.25)', boxShadow: '0 12px 40px rgba(0,0,0,0.3)', position: 'relative', zIndex: 1 }}>
          <img src="https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg" alt="Joba24" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        <div style={{ fontSize: 15, fontWeight: 900, color: 'rgba(255,255,255,0.6)', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8, position: 'relative', zIndex: 1 }}>
          Joba24
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: 0, marginBottom: 12, lineHeight: 1.25, position: 'relative', zIndex: 1 }}>
          רוצים יותר עבודות?
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', margin: 0, marginBottom: 8, lineHeight: 1.65, maxWidth: 340, position: 'relative', zIndex: 1 }}>
          הצטרפו ל־Joba24 והיו מוכנים לקבל גישה לאלפי משימות שיפורסמו על ידי אנשים שמחפשים עזרה ובעלי מקצוע.
        </p>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', margin: 0, marginBottom: 28, lineHeight: 1.65, maxWidth: 340, position: 'relative', zIndex: 1, fontWeight: 700 }}>
          זה הזמן להירשם ולהכין את הפרופיל שלכם.
        </p>

        {/* Single CTA */}
        <div style={{ width: '100%', maxWidth: 340, position: 'relative', zIndex: 1 }}>
          <button
            onClick={() => setShowLogin(true)}
            style={{ width: '100%', padding: '18px 0', borderRadius: 16, background: 'white', color: '#0f2b6b', fontSize: 18, fontWeight: 900, border: 'none', cursor: 'pointer', boxShadow: '0 10px 36px rgba(0,0,0,0.25)' }}
          >
            הרשם עכשיו 🚀
          </button>
          <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
            *הגדרת פרופיל לוקחת פחות מדקה
          </div>
        </div>
      </div>
    );
  }

  // ── Just authenticated — useEffect will advance to step 0, show spinner meanwhile ──
  if (step === -1) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-1)' }}>
        <Loader2 size={28} className="animate-spin" color="#1a6fd4" />
      </div>
    );
  }

  // ── Done step — bonus already granted in handleNext ──
  if (step >= totalSteps) {
    const handleGoToApp = async () => {
      // Force-refresh me so Layout gets fresh is_approved value
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      await queryClient.refetchQueries({ queryKey: ['me'] });
      navigate('/');
    };

    return (
      <div dir="rtl" style={{ minHeight: '100dvh', background: 'var(--surface-1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'max(40px, env(safe-area-inset-top)) 24px max(40px, env(safe-area-inset-bottom))', textAlign: 'center' }}>
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #16a34a, #15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: '0 8px 32px rgba(22,163,74,0.3)' }}>
          <Check size={40} color="white" strokeWidth={3} />
        </motion.div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-1)', margin: 0, marginBottom: 8 }}>הפרופיל מוכן! 🎉</h1>
        <p style={{ fontSize: 15, color: 'var(--text-2)', margin: 0, marginBottom: 20, lineHeight: 1.6 }}>
          {me?.full_name ? `${me.full_name}, ` : ''}הפרופיל שלך נשמר — ממתין לאישור מנהל.
        </p>
        {/* Bonus badge */}
        <div style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', borderRadius: 16, padding: '14px 24px', marginBottom: 32, boxShadow: '0 4px 20px rgba(251,191,36,0.4)' }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>🎁</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#1a3a6b' }}>קיבלת 25 ג'ובות!</div>
          <div style={{ fontSize: 13, color: '#1a3a6b', opacity: 0.75, marginTop: 2 }}>בונוס על מילוי הפרופיל</div>
        </div>
        <button
          onClick={handleGoToApp}
          style={{ width: '100%', maxWidth: 320, padding: '16px 0', borderRadius: 16, background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', color: 'white', fontSize: 17, fontWeight: 900, border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(26,111,212,0.3)' }}
        >
          המשך לאפליקציה 🚀
        </button>
      </div>
    );
  }

  // ── Stepper ──
  const currentStep = STEPS[step];
  const Icon = currentStep.icon;
  const progress = ((step + 1) / (totalSteps + 1)) * 100;
  const isPhotoStep = currentStep.type === 'photo';
  const canSkip = isPhotoStep;

  return (
    <div dir="rtl" style={{ height: '100dvh', background: 'var(--surface-1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ── Header with progress ── */}
      <div style={{ padding: 'max(12px, env(safe-area-inset-top)) 16px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          {step > 0 ? (
            <button onClick={handleBack} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={18} color="var(--text-2)" />
            </button>
          ) : (
            <div style={{ width: 36, height: 36 }} />
          )}
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)' }}>{step + 1} / {totalSteps}</span>
          <button onClick={() => navigate('/')} style={{ marginRight: 'auto', background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>דלג</button>
        </div>
        {/* Progress bar */}
        <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ height: '100%', background: 'linear-gradient(90deg, #1a6fd4, #0a52b0)', borderRadius: 99 }}
          />
        </div>
      </div>

      {/* ── Step content ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={{
              enter: (dir) => ({ x: dir > 0 ? '100%' : '-30%', opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (dir) => ({ x: dir > 0 ? '-30%' : '100%', opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            {/* Fixed header area — icon + title + subtitle */}
            <div style={{ padding: '24px 20px 0', flexShrink: 0 }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '1px solid #bfdbfe' }}>
                <Icon size={26} color="#1a6fd4" />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)', margin: 0, marginBottom: 4, lineHeight: 1.3 }}>{currentStep.title}</h2>
              <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0, marginBottom: 16, lineHeight: 1.5 }}>{currentStep.subtitle}</p>

              {/* Selected count badge for chips */}
              {currentStep.type === 'chips' && (data.preferred_categories || []).length > 0 && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 99, padding: '4px 12px', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#1a6fd4' }}>✓ {(data.preferred_categories || []).length} נבחרו</span>
                </div>
              )}
            </div>

            {/* Scrollable input area */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 16px' }}>
              {currentStep.type === 'text' && (
                <input
                  type="text"
                  value={data[currentStep.key] || ''}
                  onChange={e => setData(prev => ({ ...prev, [currentStep.key]: e.target.value }))}
                  placeholder={currentStep.placeholder}
                  autoFocus
                  dir="rtl"
                  style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: '1.5px solid var(--border-1)', background: 'var(--surface-2)', fontSize: 16, outline: 'none', color: 'var(--text-1)', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              )}

              {currentStep.type === 'textarea' && (
                <textarea
                  value={data[currentStep.key] || ''}
                  onChange={e => setData(prev => ({ ...prev, [currentStep.key]: e.target.value }))}
                  placeholder={currentStep.placeholder}
                  autoFocus
                  rows={5}
                  style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: '1.5px solid var(--border-1)', background: 'var(--surface-2)', fontSize: 16, outline: 'none', color: 'var(--text-1)', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'none', lineHeight: 1.6 }}
                />
              )}

              {currentStep.type === 'phone' && (
                <input
                  type="tel"
                  value={data[currentStep.key] || ''}
                  onChange={e => setData(prev => ({ ...prev, [currentStep.key]: e.target.value.replace(/[^0-9\-+]/g, '') }))}
                  placeholder={currentStep.placeholder}
                  autoFocus
                  dir="ltr"
                  style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: '1.5px solid var(--border-1)', background: 'var(--surface-2)', fontSize: 16, outline: 'none', color: 'var(--text-1)', boxSizing: 'border-box', fontFamily: 'inherit', textAlign: 'right' }}
                />
              )}

              {currentStep.type === 'chips' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {CATEGORIES.filter(c => c.value !== 'other').map(cat => {
                    const active = (data.preferred_categories || []).includes(cat.value);
                    return (
                      <button
                        key={cat.value}
                        onClick={() => toggleCategory(cat.value)}
                        style={{
                          padding: '8px 14px', borderRadius: 99, cursor: 'pointer',
                          fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
                          background: active ? '#1a6fd4' : 'var(--surface-2)',
                          color: active ? 'white' : 'var(--text-2)',
                          border: `1.5px solid ${active ? '#1a6fd4' : 'var(--border-1)'}`,
                          boxShadow: active ? '0 2px 8px rgba(26,111,212,0.25)' : '0 1px 3px rgba(0,0,0,0.04)',
                          transition: 'all 0.15s',
                          minHeight: 'unset',
                        }}
                      >
                        {active && '✓ '}{getCategoryLabel(cat.value)}
                      </button>
                    );
                  })}
                </div>
              )}

              {currentStep.type === 'photo' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <div
                    onClick={() => photoInputRef.current?.click()}
                    style={{
                      width: 120, height: 120, borderRadius: '50%',
                      background: data.profile_photo ? 'transparent' : 'var(--surface-3)',
                      border: '2px dashed var(--border-2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', overflow: 'hidden',
                    }}
                  >
                    {uploadingPhoto ? (
                      <Loader2 size={28} className="animate-spin" color="#1a6fd4" />
                    ) : data.profile_photo ? (
                      <img src={data.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Camera size={32} color="var(--text-3)" />
                    )}
                  </div>
                  <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    style={{ padding: '10px 20px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border-1)', color: 'var(--text-2)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {data.profile_photo ? 'החלף תמונה' : 'בחר תמונה'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Footer with Next button — always visible ── */}
      <div style={{ flexShrink: 0, padding: '12px 20px max(12px, env(safe-area-inset-bottom))', background: 'var(--surface-2)', borderTop: '1px solid var(--border-1)' }}>
        <button
          onClick={handleNext}
          disabled={saving}
          style={{
            width: '100%', padding: '15px 0', borderRadius: 16,
            background: saving ? '#94a3b8' : 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
            color: 'white', fontSize: 17, fontWeight: 900, border: 'none',
            cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: '0 8px 24px rgba(26,111,212,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {saving ? <><Loader2 size={20} className="animate-spin" /> שומר...</> : <>
            {step === totalSteps - 1 ? 'סיום ✓' : 'הבא'}
            <ChevronLeft size={20} />
          </>}
        </button>
      </div>
    </div>
  );
}