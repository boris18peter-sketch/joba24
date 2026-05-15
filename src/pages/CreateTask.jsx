import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MapPin, Clock, Zap, CheckSquare, Loader2, Users, Sparkles, Info, AlertTriangle, Save } from 'lucide-react';
import StripeTaskPaymentSheet from '@/components/StripeTaskPaymentSheet';
import { useVerifyGuard } from '@/hooks/useVerifyGuard';
import BackButton from '@/components/BackButton';
import { toast } from 'sonner';
import PriceSuggestion from '@/components/PriceSuggestion';
import ImageUploader from '@/components/ImageUploader';
import { CATEGORIES } from '@/lib/categories';
import VerifyModal from '@/components/VerifyModal';

const DRAFT_KEY = 'joba24_create_task_draft';
const timeOptions = ['15m', '30m', '1h', '2h', 'custom'];
const EXPIRY_OPTIONS = [
  { label: 'ללא תוקף', hours: null },
  { label: '6 שעות', hours: 6 },
  { label: 'יום', hours: 24 },
  { label: '2 ימים', hours: 48 },
  { label: 'שבוע', hours: 168 },
];

function SocialProofBar() {
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 100),
    staleTime: 60000,
  });
  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length || 238;
  return (
    <div style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <span>🤝</span>
      <span>הצטרף ל-<strong style={{ color: '#1a6fd4' }}>{completedCount}+</strong> משתמשים שכבר ביצעו ג'ובות בהצלחה</span>
    </div>
  );
}

function SectionCard({ children }) {
  return (
    <div style={{ background: 'white', borderRadius: 20, padding: '18px 16px', border: '1px solid #dce8f5', boxShadow: '0 2px 12px rgba(26,111,212,0.06)' }}>
      {children}
    </div>
  );
}

const DEFAULT_FORM = {
  title: '',
  description: '',
  price: '',
  max_price: '',
  auto_bump_enabled: false,
  location_name: '',
  city: '',
  estimated_time: '1h',
  category: 'other',
  approval_mode: 'manual',
  expiry_hours: null,
  custom_time: '',
  is_story: false,
  images: [],
  requirements: { vehicle: false, two_people: false, experience: false },
};

export default function CreateTask() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isRepost = searchParams.get('repost') === '1';
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const draftTimerRef = useRef(null);

  // Initialize form: repost params > saved draft > defaults
  const [form, setForm] = useState(() => {
    if (isRepost) {
      return {
        ...DEFAULT_FORM,
        title: searchParams.get('title') || '',
        description: searchParams.get('description') || '',
        price: searchParams.get('price') || '',
        location_name: searchParams.get('location_name') || '',
        city: searchParams.get('city') || '',
        estimated_time: searchParams.get('estimated_time') || '1h',
        category: searchParams.get('category') || 'other',
        approval_mode: searchParams.get('approval_mode') || 'instant',
      };
    }
    // Try to load saved draft
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return { ...DEFAULT_FORM, ...JSON.parse(saved) };
    } catch (_) {}
    return DEFAULT_FORM;
  });

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { gate, showVerify, onSuccess: onVerifySuccess, onClose: onVerifyClose } = useVerifyGuard(me);
  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const setReq = (key, val) => setForm(p => ({ ...p, requirements: { ...p.requirements, [key]: val } }));
  const [errors, setErrors] = useState({});
  const [showErrorBanner, setShowErrorBanner] = useState(false);

  const fieldRefs = {
    title: useRef(null),
    description: useRef(null),
    price: useRef(null),
    location_name: useRef(null),
    city: useRef(null),
  };

  // Auto-save draft on form change (debounced 1s)
  useEffect(() => {
    if (isRepost) return;
    clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      const draftFields = { title: form.title, description: form.description, price: form.price, location_name: form.location_name, city: form.city, category: form.category, estimated_time: form.estimated_time, approval_mode: form.approval_mode };
      // Only save if user has typed something meaningful
      if (form.title || form.description || form.price) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draftFields));
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2000);
      }
    }, 1000);
    return () => clearTimeout(draftTimerRef.current);
  }, [form.title, form.description, form.price, form.location_name, form.city, form.category, form.estimated_time, form.approval_mode, isRepost]);

  const handleSubmit = () => {
    doSubmit();
  };

  const doSubmit = async () => {
    const newErrors = {};
    if (!form.title) newErrors.title = true;
    if (!form.description) newErrors.description = true;
    if (!form.price) newErrors.price = true;
    if (!form.city) newErrors.city = true;
    if (!form.location_name) newErrors.location_name = true;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShowErrorBanner(true);
      const order = ['title', 'description', 'price', 'location_name', 'city'];
      const firstError = order.find(k => newErrors[k]);
      if (firstError && fieldRefs[firstError]?.current) {
        fieldRefs[firstError].current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        fieldRefs[firstError].current.focus?.();
      }
      return;
    }
    setShowErrorBanner(false);
    setErrors({});
    // Show payment modal first — task created only after successful payment
    setShowPayment(true);
  };

  const handlePaymentSuccess = async () => {
    setLoading(true);
    const expires = form.expiry_hours ? new Date(Date.now() + form.expiry_hours * 60 * 60 * 1000).toISOString() : null;
    const storyExpires = form.is_story ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined;
    const estimatedTime = form.estimated_time === 'custom' ? (form.custom_time || 'custom') : form.estimated_time;

    const created = await base44.entities.Task.create({
      title: form.title,
      description: form.description,
      price: Number(form.price),
      base_price: Number(form.price),
      max_price: form.auto_bump_enabled && form.max_price ? Number(form.max_price) : undefined,
      auto_bump_enabled: form.auto_bump_enabled,
      location_name: form.location_name,
      city: form.city,
      estimated_time: estimatedTime,
      category: form.category,
      approval_mode: form.approval_mode,
      expiry_duration_hours: form.expiry_hours || null,
      expires_at: expires,
      is_story: form.is_story,
      story_expires_at: storyExpires,
      images: form.images,
      requirements: form.requirements,
      status: 'OPEN',
      payment_status: 'funded',
      payment_amount: Number(form.price),
      payment_held: true,
      client_id: me?.id,
      client_name: me?.full_name,
      client_rating: me?.rating || 0,
      client_verified: me?.is_verified || false,
    });

    setLoading(false);
    localStorage.removeItem(DRAFT_KEY);
    toast.success('הג\'ובה פורסמה! ⚡');
    navigate(created?.id ? `/task/${created.id}` : '/my-tasks');
  };

  const handlePaymentCancel = () => {
    // Close modal, stay on edit page with all form data intact
    setShowPayment(false);
  };

  const activeBtn = { background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: 'white', border: '1px solid #1a6fd4' };
  const inactiveBtn = { background: 'white', color: '#555', border: '1px solid #dce8f5' };

  return (
    <div className="min-h-screen" style={{ background: '#f4f7fb' }} dir="rtl">
      {showVerify && (
        <VerifyModal onClose={onVerifyClose} onSuccess={onVerifySuccess} />
      )}
      {showPayment && (
        <StripeTaskPaymentSheet
          taskData={{
            title: form.title,
            price: Number(form.price),
          }}
          onSuccess={handlePaymentSuccess}
          onClose={handlePaymentCancel}
        />
      )}
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', padding: '52px 16px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -20, right: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BackButton style={{ background: 'rgba(255,255,255,0.15)', border: 'none', boxShadow: 'none' }} iconColor="white" />
          <div style={{ flex: 1 }}>
            <h1 style={{ color: 'white', fontSize: 20, fontWeight: 900, margin: 0 }}>{isRepost ? '🔄 פרסם שוב' : "פרסום ג'ובה חדשה"}</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '2px 0 0' }}>{isRepost ? 'הפרטים מולאו מהג\'ובה הקודמת — ערוך ופרסם' : 'מלא את הפרטים ופרסם תוך שניות'}</p>
          </div>
          {/* Draft saved indicator */}
          {draftSaved && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '4px 10px', fontSize: 11, color: 'white', fontWeight: 700 }}>
              <Save size={11} /> נשמר אוטומטית
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-12">
        {/* Draft restore indicator */}
        {!isRepost && form.title && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#166534', fontWeight: 700 }}>
              <Save size={14} /> טיוטה שמורה — המשך מהיכן שעצרת
            </div>
            <button onClick={() => { setForm(DEFAULT_FORM); localStorage.removeItem(DRAFT_KEY); }} style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>מחק</button>
          </div>
        )}

        {/* Error banner */}
        {showErrorBanner && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 16, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: '#dc2626', margin: 0, lineHeight: 1.6, fontWeight: 700 }}>
              ⚠️ חסרים פרטים כדי לפרסם את המשימה — בדוק את השדות המסומנים באדום
            </p>
          </div>
        )}

        {/* Info banner */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 16, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Info size={16} color="#1a6fd4" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: '#1e40af', margin: 0, lineHeight: 1.6 }}>
            <strong>חשוב!</strong> ככל שהג'ובה מפורטת יותר — כך תקבל match מדויק יותר עם עובד מתאים.
          </p>
        </div>

        {/* Category */}
        <SectionCard>
          <Label className="text-sm font-bold mb-3 block" style={{ color: '#0f2b6b' }}>קטגוריה</Label>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(c => (
              <button key={c.value} onClick={() => set('category', c.value)}
                style={{ padding: '7px 14px', borderRadius: 24, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', ...(form.category === c.value ? activeBtn : inactiveBtn) }}
              >{c.label}</button>
            ))}
          </div>
        </SectionCard>

        {/* Title + Description */}
        <SectionCard>
          <Label className="text-sm font-bold mb-2 block" style={{ color: '#0f2b6b' }}>מה צריך לעשות? *</Label>
          <Input ref={fieldRefs.title} placeholder="לדוגמה: להרים מקרר לקומה שלישית"
            value={form.title} onChange={e => { set('title', e.target.value); setErrors(p => ({...p, title: false})); if (showErrorBanner && e.target.value) setShowErrorBanner(false); }}
            style={{ background: '#f4f7fb', border: `1.5px solid ${errors.title ? '#ef4444' : '#dce8f5'}`, borderRadius: 12, height: 48, fontSize: 15, marginBottom: errors.title ? 4 : 14 }}
          />
          {errors.title && <p style={{ fontSize: 11, color: '#ef4444', marginBottom: 10 }}>⚠️ שדה חובה</p>}
          <Label className="text-sm font-bold mb-2 block" style={{ color: '#0f2b6b' }}>תיאור מפורט *</Label>
          <Textarea ref={fieldRefs.description} placeholder="תאר את המשימה בפירוט: מה בדיוק צריך לעשות, מה הציפיות, מה יש במקום..."
            value={form.description} onChange={e => { set('description', e.target.value); setErrors(p => ({...p, description: false})); }}
            style={{ background: '#f4f7fb', border: `1.5px solid ${errors.description ? '#ef4444' : '#dce8f5'}`, borderRadius: 12, resize: 'none' }} rows={4}
          />
          {errors.description && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>⚠️ שדה חובה</p>}
        </SectionCard>

        {/* Images */}
        <SectionCard>
          <Label className="text-sm font-bold mb-2 block" style={{ color: '#0f2b6b' }}>תמונות (עד 4)</Label>
          <ImageUploader images={form.images} onChange={imgs => set('images', imgs)} />
        </SectionCard>

        {/* Price */}
        <SectionCard>
          <Label className="text-sm font-bold mb-2 block" style={{ color: '#0f2b6b' }}>מחיר (₪) *</Label>
          <Input ref={fieldRefs.price} type="number" placeholder="100"
            value={form.price} onChange={e => { set('price', e.target.value); setErrors(p => ({...p, price: false})); }}
            style={{ background: '#f4f7fb', border: `1.5px solid ${errors.price ? '#ef4444' : '#dce8f5'}`, borderRadius: 12, height: 48, fontSize: 18, fontWeight: 800, marginBottom: 8 }}
          />
          {errors.price && <p style={{ fontSize: 11, color: '#ef4444', marginBottom: 6 }}>⚠️ שדה חובה</p>}
          <PriceSuggestion category={form.category} estimatedTime={form.estimated_time} description={form.description} location={form.city || form.location_name} onAccept={p => set('price', String(p))} />

          {/* Auto bump */}
          <button type="button" onClick={() => set('auto_bump_enabled', !form.auto_bump_enabled)}
            style={{ marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, textAlign: 'right', cursor: 'pointer', background: form.auto_bump_enabled ? '#fffbeb' : '#f4f7fb', border: `1px solid ${form.auto_bump_enabled ? '#fcd34d' : '#dce8f5'}` }}
          >
            <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${form.auto_bump_enabled ? '#f59e0b' : '#cbd5e1'}`, background: form.auto_bump_enabled ? '#f59e0b' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {form.auto_bump_enabled && <span style={{ color: 'white', fontSize: 11 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>⚡ העלאת מחיר אוטומטית</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>המחיר יעלה כל 5 דקות עד המקסימום</div>
            </div>
          </button>
          {form.auto_bump_enabled && (
            <div style={{ marginTop: 10, padding: '12px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 14 }}>
              <Label className="text-sm font-semibold block" style={{ color: '#92400e', marginBottom: 8 }}>מחיר מקסימלי (₪)</Label>
              <Input type="number" placeholder="250"
                value={form.max_price} onChange={e => set('max_price', e.target.value)}
                style={{ background: 'white', border: '1px solid #fcd34d', borderRadius: 12, height: 44, fontSize: 16, fontWeight: 700 }}
              />
            </div>
          )}
        </SectionCard>

        {/* Expiry */}
        <SectionCard>
          <Label className="text-sm font-bold mb-3 flex items-center gap-1" style={{ color: '#0f2b6b' }}>
            <Clock size={14} /> תוקף הג'ובה
          </Label>
          <div className="flex gap-2 flex-wrap">
            {EXPIRY_OPTIONS.map(opt => (
              <button key={String(opt.hours)} onClick={() => set('expiry_hours', opt.hours)}
                style={{ padding: '8px 16px', borderRadius: 24, fontSize: 13, fontWeight: 600, cursor: 'pointer', ...(form.expiry_hours === opt.hours ? activeBtn : inactiveBtn) }}
              >{opt.label}</button>
            ))}
          </div>
          {form.expiry_hours && <p style={{ fontSize: 12, color: '#999', marginTop: 8 }}>המשימה תסומן כפגת תוקף אחרי {EXPIRY_OPTIONS.find(o => o.hours === form.expiry_hours)?.label}</p>}
        </SectionCard>

        {/* Story */}
        <div
          onClick={() => set('is_story', !form.is_story)}
          style={{
            background: form.is_story ? 'linear-gradient(135deg,#fdf4ff,#f3e8ff)' : 'white',
            border: `2px solid ${form.is_story ? '#a855f7' : '#dce8f5'}`,
            borderRadius: 20, padding: '16px', cursor: 'pointer',
            boxShadow: form.is_story ? '0 4px 20px rgba(168,85,247,0.2)' : '0 2px 12px rgba(26,111,212,0.06)',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${form.is_story ? '#a855f7' : '#cbd5e1'}`, background: form.is_story ? '#a855f7' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {form.is_story && <span style={{ color: 'white', fontSize: 11 }}>✓</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: form.is_story ? '#7e22ce' : '#111', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={15} color="#a855f7" /> הצג כ-Story
                <span style={{ fontSize: 10, fontWeight: 800, background: '#f59e0b', color: 'white', padding: '2px 7px', borderRadius: 20, marginRight: 4 }}>מומלץ</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: form.is_story ? 'rgba(168,85,247,0.08)' : '#f4f7fb', borderRadius: 12, padding: '10px 12px' }}>
            <span style={{ fontSize: 22 }}>🚀</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: form.is_story ? '#7e22ce' : '#0f2b6b' }}>חשיפה גבוהה פי 3 בשורת ה-Stories</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>הג'ובה תופיע למעלה בפיד למשך 24 שעות · ₪5 בלבד</div>
            </div>
          </div>
        </div>

        {/* Location */}
        <SectionCard>
          <Label className="text-sm font-bold mb-2 flex items-center gap-1" style={{ color: '#0f2b6b' }}>
            <MapPin size={14} /> מיקום
          </Label>
          <Input ref={fieldRefs.location_name} placeholder="לדוגמה: תל אביב, רחוב דיזנגוף 50"
            value={form.location_name} onChange={e => { set('location_name', e.target.value); setErrors(p => ({...p, location_name: false})); }}
            style={{ background: '#f4f7fb', border: `1.5px solid ${errors.location_name ? '#ef4444' : '#dce8f5'}`, borderRadius: 12, height: 48, marginBottom: errors.location_name ? 4 : 10 }}
          />
          {errors.location_name && <p style={{ fontSize: 11, color: '#ef4444', marginBottom: 6 }}>⚠️ שדה חובה</p>}
          <Input ref={fieldRefs.city} placeholder="עיר (לדוגמה: תל אביב)"
            value={form.city} onChange={e => { set('city', e.target.value); setErrors(p => ({...p, city: false})); }}
            style={{ background: '#f4f7fb', border: `1.5px solid ${errors.city ? '#ef4444' : '#dce8f5'}`, borderRadius: 12, height: 42 }}
          />
          {errors.city && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>⚠️ שדה חובה</p>}
        </SectionCard>

        {/* Time */}
        <SectionCard>
          <Label className="text-sm font-bold mb-3 flex items-center gap-1" style={{ color: '#0f2b6b' }}>
            <Clock size={14} /> זמן ביצוע משוער
          </Label>
          <div className="flex gap-2 flex-wrap">
            {timeOptions.map(t => (
              <button key={t} onClick={() => set('estimated_time', t)}
                style={{ padding: '8px 16px', borderRadius: 24, fontSize: 13, fontWeight: 600, cursor: 'pointer', ...(form.estimated_time === t ? activeBtn : inactiveBtn) }}
              >{t === 'custom' ? '⌨️ מותאם' : t}</button>
            ))}
          </div>
          {form.estimated_time === 'custom' && (
            <input type="text" placeholder="לדוגמה: 3 שעות, יום שלם, שבוע..."
              value={form.custom_time} onChange={e => set('custom_time', e.target.value)}
              style={{ marginTop: 10, width: '100%', padding: '12px 14px', borderRadius: 12, background: '#f4f7fb', border: '1px solid #dce8f5', fontSize: 14, outline: 'none' }}
            />
          )}
        </SectionCard>

        {/* Requirements */}
        <SectionCard>
          <Label className="text-sm font-bold mb-3 flex items-center gap-1" style={{ color: '#0f2b6b' }}>
            <CheckSquare size={14} /> דרישות
          </Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { key: 'vehicle', label: '🚗 דרוש רכב' },
              { key: 'two_people', label: '👥 שני אנשים' },
              { key: 'experience', label: '🛠️ ניסיון' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setReq(key, !form.requirements[key])}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, textAlign: 'right', cursor: 'pointer', background: form.requirements[key] ? '#eff6ff' : '#f4f7fb', border: `1px solid ${form.requirements[key] ? '#bfdbfe' : '#dce8f5'}` }}
              >
                <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${form.requirements[key] ? '#1a6fd4' : '#cbd5e1'}`, background: form.requirements[key] ? '#1a6fd4' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {form.requirements[key] && <span style={{ color: 'white', fontSize: 11 }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: form.requirements[key] ? '#1e40af' : '#555' }}>{label}</span>
              </button>
            ))}
            <input type="text" placeholder="דרישה נוספת... (לדוגמה: ניסיון עם מוצרי חשמל)"
              value={form.requirements.custom || ''} onChange={e => setReq('custom', e.target.value)}
              style={{ padding: '12px 14px', borderRadius: 12, background: '#f4f7fb', border: '1px solid #dce8f5', fontSize: 13, outline: 'none' }}
            />
          </div>
        </SectionCard>

        {/* Submit */}
        <div style={{ marginTop: 8, paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}>
          <button onClick={handleSubmit} disabled={loading}
            style={{ width: '100%', height: 60, borderRadius: 18, fontSize: 17, fontWeight: 900, color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', boxShadow: '0 8px 28px rgba(26,111,212,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}
          >
            {loading ? <Loader2 size={22} className="animate-spin" /> : <><Zap size={20} />פרסם ג'ובה חדשה</>}
          </button>
          <SocialProofBar />
        </div>
      </div>
    </div>
  );
}