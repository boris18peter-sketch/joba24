import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Mic, MicOff, Sparkles, ChevronLeft, MapPin, Loader2, Zap, Edit3, CheckCircle2, ArrowLeft } from 'lucide-react';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { useAuth } from '@/lib/AuthContext';
import BackButton from '@/components/BackButton';
import { toast } from 'sonner';
import ImageUploader from '@/components/ImageUploader';
import LoginPromptModal from '@/components/LoginPromptModal';
import BuyCreditsModal from '@/components/BuyCreditsModal';
import { moderateText } from '@/hooks/useModeration';

// ── Quick suggestion chips shown on input screen ─────────────────
const QUICK_IDEAS = [
  '🚚 הובלת רהיטים', '🧹 ניקיון דירה', '📚 שיעור פרטי',
  '🔧 תיקון אינסטלציה', '🐶 טיול כלב', '🖥️ עזרה טכנית',
  '🎨 צביעת חדר', '🛒 קניות', '❄️ התקנת מזגן',
];

const PAYMENT_METHODS = [
  { value: 'Cash', label: '💵 מזומן' },
  { value: 'Bit', label: '📱 Bit' },
  { value: 'PayBox', label: '📲 PayBox' },
];

// ── Main component ────────────────────────────────────────────────
export default function CreateTask() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, login } = useAuth();
  const isRepost = searchParams.get('repost') === '1';

  // Multi-step state
  const [step, setStep] = useState('input'); // input | analyzing | questions | details | preview | publishing
  const [freeText, setFreeText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [aiResult, setAiResult] = useState(null);        // parsed AI output
  const [answers, setAnswers] = useState({});             // follow-up answers
  const [details, setDetails] = useState({               // price/location/payment
    price: '', location_name: '', city: '', lat: null, lng: null,
    payment_method: '', images: [],
    address_building: '', address_floor: '', address_apartment: '',
  });
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [priceError, setPriceError] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [paymentError, setPaymentError] = useState(false);
  const recognitionRef = useRef(null);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  // Pre-fill on repost
  useEffect(() => {
    if (isRepost) {
      const t = searchParams.get('title') || '';
      const d = searchParams.get('description') || '';
      setFreeText([t, d].filter(Boolean).join(' — '));
    }
  }, []);

  // ── Voice recording ───────────────────────────────────────────
  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('הדפדפן שלך לא תומך בהקלטת קול'); return; }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const rec = new SR();
    rec.lang = 'he-IL';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = e => {
      const text = e.results[0][0].transcript;
      setFreeText(p => p ? `${p} ${text}` : text);
    };
    rec.onerror = () => { setIsRecording(false); toast.error('שגיאה בהקלטה'); };
    rec.onend = () => setIsRecording(false);
    rec.start();
    recognitionRef.current = rec;
    setIsRecording(true);
  };

  // ── AI analysis ───────────────────────────────────────────────
  const analyzeTask = async () => {
    if (!freeText.trim() || freeText.trim().length < 5) {
      toast.error('נא לתאר מה צריך לעשות');
      return;
    }
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }
    setStep('analyzing');

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `אתה עוזר ב-Joba24 — פלטפורמה שמחברת בין אנשים שצריכים עזרה לבין עובדים שמגיעים לבצע את הג'ובה תוך דקות.
המשתמש תיאר משימה: "${freeText}"

נתח את הבקשה וזהה:
1. כותרת קצרה ומדויקת למשימה (עד 8 מילים)
2. קטגוריה מתוך: plumbing | electricity | gardening | cleaning | moving | painting | carpentry | ac | locksmith | shopping | delivery | babysitting | tutoring | it_support | other
3. תיאור מפורט של המשימה
4. הערכת מחיר (min ו-max בשקלים)
5. עד 3 שאלות חכמות שחסרות כדי להבין את המשימה טוב יותר — רק מה שבאמת חשוב וחסר, לא מה שכבר ידוע
   כל שאלה עם 2-4 תשובות מהירות לבחירה
6. זמן משוער לביצוע
7. האם יש מיקום בטקסט?

חשוב: אל תשאל שאלות שהתשובה כבר קיימת בתיאור. רק מה שחסר באמת.`,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          category: { type: 'string' },
          description: { type: 'string' },
          budget_min: { type: 'number' },
          budget_max: { type: 'number' },
          estimated_time: { type: 'string' },
          has_location: { type: 'boolean' },
          location_hint: { type: 'string' },
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                question: { type: 'string' },
                options: { type: 'array', items: { type: 'string' } },
                optional: { type: 'boolean' },
              }
            }
          },
          summary: { type: 'string' },
        }
      }
    });

    setAiResult(res);

    // Pre-fill price suggestion
    if (res.budget_min) {
      setDetails(p => ({ ...p, price: String(Math.round((res.budget_min + (res.budget_max || res.budget_min)) / 2)) }));
    }

    // If no questions → skip to details
    if (!res.questions || res.questions.length === 0) {
      setStep('details');
    } else {
      setStep('questions');
    }
  };

  // ── Publish ───────────────────────────────────────────────────
  const publish = async () => {
    let hasError = false;
    if (!details.price) { setPriceError(true); hasError = true; }
    if (!details.location_name || !addressConfirmed) { setLocationError(true); hasError = true; }
    if (!details.payment_method) { setPaymentError(true); hasError = true; }
    if (hasError) { toast.error('נא למלא את כל השדות החובה'); return; }

    if (!isAuthenticated) { setShowLoginPrompt(true); return; }

    // Build enriched description
    const answersText = Object.entries(answers)
      .filter(([, v]) => v)
      .map(([q, a]) => `• ${q}: ${a}`)
      .join('\n');

    const fullDescription = [
      aiResult?.description || freeText,
      answersText ? `\nפרטים נוספים:\n${answersText}` : '',
    ].filter(Boolean).join('');

    // Moderate
    const [titleCheck, descCheck] = await Promise.all([
      moderateText(aiResult?.title || freeText),
      moderateText(fullDescription),
    ]);
    if (titleCheck.flagged || descCheck.flagged) {
      toast.error('🛡️ התוכן אינו עומד בכללי הקהילה');
      return;
    }

    setStep('publishing');

    await base44.entities.Task.create({
      title: aiResult?.title || freeText.slice(0, 80),
      description: fullDescription,
      price: Number(details.price),
      base_price: Number(details.price),
      location_name: details.location_name,
      city: details.city,
      lat: details.lat || undefined,
      lng: details.lng || undefined,
      address_building: details.address_building || undefined,
      address_floor: details.address_floor || undefined,
      address_apartment: details.address_apartment || undefined,
      estimated_time: aiResult?.estimated_time || '1h',
      category: aiResult?.category || 'other',
      approval_mode: 'manual',
      payment_method: details.payment_method,
      images: details.images,
      status: 'OPEN',
      client_id: me?.id,
      client_name: me?.full_name,
      client_rating: me?.rating || 0,
      client_verified: me?.is_verified || false,
    });

    toast.success("הג'ובה פורסמה! עובדים יגיעו תוך דקות ⚡");
    navigate('/');
  };

  // ── Render helpers ────────────────────────────────────────────
  const setAnswer = (questionId, question, value) => {
    setAnswers(p => ({ ...p, [question]: value }));
  };

  const answeredCount = Object.keys(answers).length;
  const requiredQCount = aiResult?.questions?.filter(q => !q.optional).length || 0;
  const canProceedFromQuestions = answeredCount >= requiredQCount;

  // ── STEP: input ───────────────────────────────────────────────
  if (step === 'input') {
    return (
      <div style={{ background: 'var(--surface-1)', minHeight: '100%', display: 'flex', flexDirection: 'column' }} dir="rtl">
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BackButton style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)', boxShadow: 'none' }} iconColor="white" />
            <span style={{ fontWeight: 800, fontSize: 17, color: 'white', flex: 1 }}>
              {isRepost ? '🔄 פרסם שוב' : "פרסם ג'ובה"}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 10px' }}>
              <Sparkles size={12} color="#fbbf24" />
              <span style={{ fontSize: 11, color: 'white', fontWeight: 700 }}>AI</span>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Hero text */}
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.25 }}>
              מה צריך לעשות?
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 6 }}>
              תאר בחופשיות — הבינה המלאכותית תבין ותכין הכל עבורך
            </div>
          </div>

          {/* Info tip */}
          <div style={{ background: 'linear-gradient(135deg, #eff6ff, #e0f2fe)', borderRadius: 16, padding: '12px 14px', border: '1px solid #bfdbfe', display: 'flex', gap: 10 }}>
            <span style={{ fontSize: 18 }}>💡</span>
            <div style={{ fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
              <strong>ככל שתפרט יותר — כך עובדים יבינו בדיוק מה צריך</strong> וישלחו בקשות מתאימות יותר. פחות שאלות בצ'אט, יותר עבודה מהירה.
            </div>
          </div>

          {/* Main textarea + voice */}
          <div style={{ position: 'relative' }}>
            <textarea
              autoFocus
              value={freeText}
              onChange={e => setFreeText(e.target.value)}
              placeholder={'לדוגמה: "צריך מישהו להעביר ספה וכורסא מדירה בתל אביב לרמת גן, קומה 3, יש מעלית"'}
              rows={5}
              style={{
                width: '100%', borderRadius: 18, padding: '16px 52px 16px 16px',
                background: 'var(--surface-2)', border: '2px solid var(--border-1)',
                fontSize: 15, color: 'var(--text-1)', outline: 'none', resize: 'none',
                lineHeight: 1.6, boxSizing: 'border-box', fontFamily: 'inherit',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#1a6fd4'}
              onBlur={e => e.target.style.borderColor = 'var(--border-1)'}
            />
            {/* Voice button */}
            <button
              onClick={toggleVoice}
              style={{
                position: 'absolute', top: 12, left: 12,
                width: 36, height: 36, borderRadius: 10,
                background: isRecording ? '#ef4444' : '#eff6ff',
                border: `1.5px solid ${isRecording ? '#ef4444' : '#bfdbfe'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: isRecording ? '0 0 0 4px rgba(239,68,68,0.2)' : 'none',
              }}
            >
              {isRecording
                ? <MicOff size={16} color="white" />
                : <Mic size={16} color="#1a6fd4" />}
            </button>
          </div>

          {isRecording && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: 13, fontWeight: 700, marginTop: -12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
              מקליט... דבר בעברית
            </div>
          )}

          {/* Quick ideas */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginBottom: 8 }}>רעיונות מהירים</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {QUICK_IDEAS.map(idea => (
                <button
                  key={idea}
                  onClick={() => setFreeText(idea.split(' ').slice(1).join(' '))}
                  style={{
                    padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: 'var(--surface-2)', border: '1px solid var(--border-1)',
                    color: 'var(--text-2)', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >{idea}</button>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{ marginTop: 'auto', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
            <button
              onClick={analyzeTask}
              disabled={!freeText.trim()}
              style={{
                width: '100%', height: 58, borderRadius: 18,
                background: freeText.trim()
                  ? 'linear-gradient(135deg, #1a6fd4, #0a52b0)'
                  : 'var(--surface-3)',
                color: freeText.trim() ? 'white' : 'var(--text-3)',
                border: 'none', fontSize: 17, fontWeight: 900,
                cursor: freeText.trim() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'all 0.25s',
                boxShadow: freeText.trim() ? '0 8px 28px rgba(26,111,212,0.4)' : 'none',
              }}
            >
              <Sparkles size={20} />
              המשך עם AI
            </button>
          </div>
        </div>

        {showLoginPrompt && (
          <LoginPromptModal
            onLogin={() => { setShowLoginPrompt(false); login('/create-task'); }}
            onClose={() => setShowLoginPrompt(false)}
            type="publish"
          />
        )}
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      </div>
    );
  }

  // ── STEP: analyzing ───────────────────────────────────────────
  if (step === 'analyzing') {
    return (
      <div style={{ background: 'var(--surface-1)', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32 }} dir="rtl">
        <div style={{ width: 72, height: 72, borderRadius: 22, background: 'linear-gradient(135deg, #1a6fd4, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 40px rgba(26,111,212,0.35)', animation: 'aiPulse 1.5s ease-in-out infinite' }}>
          <Sparkles size={32} color="white" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)' }}>הAI מנתח את הבקשה...</div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 6 }}>מזהה קטגוריה, מחיר מומלץ ומה חסר</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#1a6fd4', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
        <style>{`
          @keyframes aiPulse{0%,100%{box-shadow:0 12px 40px rgba(26,111,212,0.35)}50%{box-shadow:0 12px 60px rgba(26,111,212,0.6)}}
          @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        `}</style>
      </div>
    );
  }

  // ── STEP: questions ───────────────────────────────────────────
  if (step === 'questions' && aiResult) {
    return (
      <div style={{ background: 'var(--surface-1)', minHeight: '100%', display: 'flex', flexDirection: 'column' }} dir="rtl">
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setStep('input')} style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ArrowLeft size={17} color="white" />
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'white' }}>עוד כמה שאלות</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>כדי שהעובד יבין בדיוק מה צריך</div>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>{answeredCount}/{aiResult.questions.length}</div>
          </div>
        </div>

        {/* AI title preview */}
        <div style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-1)', padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <Sparkles size={14} color="#1a6fd4" />
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>AI זיהה: {aiResult.title}</div>
            {aiResult.budget_min && (
              <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>
                מחיר מומלץ: ₪{aiResult.budget_min}–₪{aiResult.budget_max || aiResult.budget_min}
              </div>
            )}
          </div>
          <button onClick={() => setStep('input')} style={{ marginRight: 'auto', fontSize: 11, color: '#1a6fd4', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Edit3 size={11} /> ערוך
          </button>
        </div>

        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {aiResult.questions.map((q, idx) => {
            const answered = answers[q.question];
            return (
              <div key={q.id || idx} style={{ animation: `slideIn 0.2s ease ${idx * 0.06}s both` }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
                  {answered && <CheckCircle2 size={16} color="#16a34a" />}
                  {q.question}
                  {q.optional && <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500 }}>אופציונלי</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {q.options?.map(opt => {
                    const selected = answered === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => setAnswer(q.id, q.question, opt)}
                        style={{
                          padding: '9px 16px', borderRadius: 24, fontSize: 13, fontWeight: 600,
                          cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                          background: selected ? 'linear-gradient(135deg, #1a6fd4, #0a52b0)' : 'var(--surface-2)',
                          color: selected ? 'white' : 'var(--text-2)',
                          boxShadow: selected ? '0 4px 14px rgba(26,111,212,0.35)' : '0 1px 4px rgba(0,0,0,0.06)',
                          transform: selected ? 'scale(1.04)' : 'scale(1)',
                        }}
                      >{opt}</button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div style={{ marginTop: 'auto', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
            <button
              onClick={() => setStep('details')}
              style={{
                width: '100%', height: 56, borderRadius: 18,
                background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
                color: 'white', border: 'none', fontSize: 16, fontWeight: 900,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 8px 28px rgba(26,111,212,0.35)',
              }}
            >
              {canProceedFromQuestions ? 'המשך' : 'דלג על השאלות'}
              <ChevronLeft size={18} />
            </button>
          </div>
        </div>
        <style>{`@keyframes slideIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      </div>
    );
  }

  // ── STEP: details ─────────────────────────────────────────────
  if (step === 'details') {
    return (
      <div style={{ background: 'var(--surface-1)', minHeight: '100%', display: 'flex', flexDirection: 'column' }} dir="rtl">
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setStep(aiResult?.questions?.length ? 'questions' : 'input')} style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ArrowLeft size={17} color="white" />
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'white' }}>פרטים אחרונים</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>מחיר, מיקום ואיך לשלם</div>
            </div>
          </div>
        </div>

        {/* AI summary card */}
        {aiResult && (
          <div style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-1)', padding: '12px 16px' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#1a6fd4,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sparkles size={16} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-1)' }}>{aiResult.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2, lineHeight: 1.5 }}>{aiResult.summary || aiResult.description?.slice(0, 100)}</div>
              </div>
              <button onClick={() => setStep('input')} style={{ fontSize: 11, color: '#1a6fd4', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>ערוך</button>
            </div>
          </div>
        )}

        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Price */}
          <div style={{ background: 'var(--surface-2)', borderRadius: 18, padding: '16px', border: `1.5px solid ${priceError ? '#ef4444' : 'var(--border-1)'}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 10 }}>💰 כמה אתה מוכן לשלם?</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-1)' }}>₪</span>
              <input
                type="number"
                value={details.price}
                onChange={e => { setDetails(p => ({ ...p, price: e.target.value })); setPriceError(false); }}
                placeholder="0"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 28, fontWeight: 900, color: 'var(--text-1)', direction: 'ltr', textAlign: 'right',
                }}
              />
            </div>
            {aiResult?.budget_min && (
              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[aiResult.budget_min, Math.round((aiResult.budget_min + (aiResult.budget_max || aiResult.budget_min)) / 2), aiResult.budget_max].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).map(v => (
                  <button key={v} onClick={() => { setDetails(p => ({ ...p, price: String(v) })); setPriceError(false); }}
                    style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${details.price == v ? '#1a6fd4' : 'var(--border-1)'}`, background: details.price == v ? '#eff6ff' : 'var(--surface-3)', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: details.price == v ? '#1a6fd4' : 'var(--text-2)' }}
                  >₪{v}</button>
                ))}
              </div>
            )}
          </div>

          {/* Location */}
          <div style={{ background: 'var(--surface-2)', borderRadius: 18, padding: '16px', border: `1.5px solid ${locationError ? '#ef4444' : 'var(--border-1)'}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={14} color="#1a6fd4" /> איפה?
            </div>
            <AddressAutocomplete
              value={details.location_name}
              error={locationError}
              onSelect={({ location_name, city, lat, lng }) => {
                if (location_name) {
                  setDetails(p => ({ ...p, location_name, city, lat, lng }));
                  setAddressConfirmed(true);
                  setLocationError(false);
                } else {
                  setAddressConfirmed(false);
                }
              }}
            />
            {addressConfirmed && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                {[
                  { key: 'address_building', placeholder: 'בניין/מספר' },
                  { key: 'address_floor', placeholder: 'קומה' },
                ].map(({ key, placeholder }) => (
                  <input key={key} type="text" placeholder={placeholder} value={details[key] || ''}
                    onChange={e => setDetails(p => ({ ...p, [key]: e.target.value }))}
                    style={{ padding: '9px 12px', borderRadius: 12, background: 'var(--surface-3)', border: '1px solid var(--border-1)', fontSize: 14, color: 'var(--text-1)', outline: 'none' }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Payment */}
          <div style={{ background: 'var(--surface-2)', borderRadius: 18, padding: '16px', border: `1.5px solid ${paymentError ? '#ef4444' : 'var(--border-1)'}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 10 }}>💳 איך לשלם?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {PAYMENT_METHODS.map(pm => {
                const selected = details.payment_method === pm.value;
                return (
                  <button key={pm.value} onClick={() => { setDetails(p => ({ ...p, payment_method: pm.value })); setPaymentError(false); }}
                    style={{
                      flex: 1, padding: '11px 8px', borderRadius: 14, fontSize: 14, fontWeight: 700,
                      cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', border: 'none',
                      background: selected ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : 'var(--surface-3)',
                      color: selected ? 'white' : 'var(--text-2)',
                      boxShadow: selected ? '0 4px 14px rgba(26,111,212,0.3)' : 'none',
                    }}
                  >{pm.label}</button>
                );
              })}
            </div>
          </div>

          {/* Images optional */}
          <div style={{ background: 'var(--surface-2)', borderRadius: 18, padding: '16px', border: '1px solid var(--border-1)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>📷 תמונות <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)' }}>— אופציונלי</span></div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10 }}>תמונה = עובד מבין מיד מה צריך</div>
            <ImageUploader images={details.images} onChange={imgs => setDetails(p => ({ ...p, images: imgs }))} />
          </div>

          {/* Publish button */}
          <div style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
            <button
              onClick={publish}
              style={{
                width: '100%', height: 60, borderRadius: 18,
                background: 'linear-gradient(135deg, #059669, #047857)',
                color: 'white', border: 'none', fontSize: 17, fontWeight: 900,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: '0 8px 28px rgba(5,150,105,0.4)',
              }}
            >
              <Zap size={22} />
              פרסם ג'ובה — עובדים יגיעו תוך דקות!
            </button>
          </div>
        </div>

        {showNoCreditsModal && <BuyCreditsModal creditsNeeded={10} onClose={() => setShowNoCreditsModal(false)} />}
        {showLoginPrompt && (
          <LoginPromptModal
            onLogin={() => { setShowLoginPrompt(false); login('/create-task'); }}
            onClose={() => setShowLoginPrompt(false)}
            type="publish"
          />
        )}
      </div>
    );
  }

  // ── STEP: publishing ──────────────────────────────────────────
  if (step === 'publishing') {
    return (
      <div style={{ background: 'var(--surface-1)', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32 }} dir="rtl">
        <div style={{ width: 72, height: 72, borderRadius: 22, background: 'linear-gradient(135deg, #059669, #047857)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 40px rgba(5,150,105,0.4)' }}>
          <Zap size={32} color="white" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)' }}>מפרסם את הג'ובה...</div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 6 }}>עובדים בקרבתך יראו אותה תוך שניות</div>
        </div>
        <Loader2 size={28} color="#1a6fd4" style={{ animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return null;
}