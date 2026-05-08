import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MapPin, Clock, Zap, CheckSquare, Loader2, Users, Sparkles, Info } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { toast } from 'sonner';
import PriceSuggestion from '@/components/PriceSuggestion';
import ImageUploader from '@/components/ImageUploader';
import { CATEGORIES } from '@/lib/categories';
import VerifyModal from '@/components/VerifyModal';

const timeOptions = ['15m', '30m', '1h', '2h', 'custom'];

const EXPIRY_OPTIONS = [
  { label: 'ללא תוקף', hours: null },
  { label: '6 שעות', hours: 6 },
  { label: 'יום', hours: 24 },
  { label: '2 ימים', hours: 48 },
  { label: 'שבוע', hours: 168 },
];

function SectionCard({ children }) {
  return (
    <div style={{ background: 'white', borderRadius: 20, padding: '18px 16px', border: '1px solid #dce8f5', boxShadow: '0 2px 12px rgba(26,111,212,0.06)' }}>
      {children}
    </div>
  );
}

export default function CreateTask() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isRepost = searchParams.get('repost') === '1';
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: searchParams.get('title') || '',
    description: searchParams.get('description') || '',
    price: searchParams.get('price') || '',
    max_price: '',
    auto_bump_enabled: false,
    location_name: searchParams.get('location_name') || '',
    city: searchParams.get('city') || '',
    estimated_time: searchParams.get('estimated_time') || '1h',
    category: searchParams.get('category') || 'other',
    approval_mode: searchParams.get('approval_mode') || 'instant',
    expiry_hours: null,
    custom_time: '',
    is_story: false,
    images: [],
    requirements: { vehicle: false, two_people: false, experience: false },
  });

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const setReq = (key, val) => setForm(p => ({ ...p, requirements: { ...p.requirements, [key]: val } }));

  const [errors, setErrors] = useState({});

  const handleSubmit = async () => {
    // Require verification
    if (!me?.is_verified) {
      setShowVerifyModal(true);
      return;
    }
    const newErrors = {};
    if (!form.title) newErrors.title = true;
    if (!form.description) newErrors.description = true;
    if (!form.price) newErrors.price = true;
    if (!form.city) newErrors.city = true;
    if (!form.location_name) newErrors.location_name = true;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('חסרים פרטים לפתיחת משימה');
      return;
    }
    setErrors({});
    setLoading(true);
    const expires = form.expiry_hours ? new Date(Date.now() + form.expiry_hours * 60 * 60 * 1000).toISOString() : null;
    const storyExpires = form.is_story ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined;
    const estimatedTime = form.estimated_time === 'custom' ? (form.custom_time || 'custom') : form.estimated_time;

    await base44.entities.Task.create({
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
      client_id: me?.id,
      client_name: me?.full_name,
      client_rating: me?.rating || 0,
    });
    const created = await base44.entities.Task.list('-created_date', 1);
    toast.success('הג\'ובה פורסמה! ⚡');
    setLoading(false);
    if (created?.[0]?.id) {
      navigate(`/task/${created[0].id}`);
    } else {
      navigate('/my-tasks');
    }
  };

  const activeBtn = { background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: 'white', border: '1px solid #1a6fd4' };
  const inactiveBtn = { background: 'white', color: '#555', border: '1px solid #dce8f5' };

  return (
    <div className="min-h-screen" style={{ background: '#f4f7fb' }} dir="rtl">
      {showVerifyModal && (
        <VerifyModal
          onClose={() => setShowVerifyModal(false)}
          onSuccess={() => { setShowVerifyModal(false); handleSubmit(); }}
        />
      )}
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)',
        padding: '52px 16px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -20, right: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BackButton style={{ background: 'rgba(255,255,255,0.15)', border: 'none', boxShadow: 'none' }} iconColor="white" />
          <div>
            <h1 style={{ color: 'white', fontSize: 20, fontWeight: 900, margin: 0 }}>{isRepost ? '🔄 פרסם שוב' : "פרסום ג'ובה חדשה"}</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '2px 0 0' }}>{isRepost ? 'הפרטים מולאו מהג\'ובה הקודמת — ערוך ופרסם' : 'מלא את הפרטים ופרסם תוך שניות'}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-12">
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
          <Input placeholder="לדוגמה: להרים מקרר לקומה שלישית"
            value={form.title} onChange={e => { set('title', e.target.value); setErrors(p => ({...p, title: false})); }}
            style={{ background: '#f4f7fb', border: `1px solid ${errors.title ? '#ef4444' : '#dce8f5'}`, borderRadius: 12, height: 48, fontSize: 15, marginBottom: 14 }}
          />
          <Label className="text-sm font-bold mb-2 block" style={{ color: '#0f2b6b' }}>תיאור מפורט *</Label>
          <Textarea placeholder="תאר את המשימה בפירוט: מה בדיוק צריך לעשות, מה הציפיות, מה יש במקום..."
            value={form.description} onChange={e => { set('description', e.target.value); setErrors(p => ({...p, description: false})); }}
            style={{ background: '#f4f7fb', border: `1px solid ${errors.description ? '#ef4444' : '#dce8f5'}`, borderRadius: 12, resize: 'none' }} rows={4}
          />
        </SectionCard>

        {/* Images */}
        <SectionCard>
          <Label className="text-sm font-bold mb-2 block" style={{ color: '#0f2b6b' }}>תמונות (עד 4)</Label>
          <ImageUploader images={form.images} onChange={imgs => set('images', imgs)} />
        </SectionCard>

        {/* Price */}
        <SectionCard>
          <Label className="text-sm font-bold mb-2 block" style={{ color: '#0f2b6b' }}>מחיר (₪) *</Label>
          <Input type="number" placeholder="100"
            value={form.price} onChange={e => { set('price', e.target.value); setErrors(p => ({...p, price: false})); }}
            style={{ background: '#f4f7fb', border: `1px solid ${errors.price ? '#ef4444' : '#dce8f5'}`, borderRadius: 12, height: 48, fontSize: 18, fontWeight: 800, marginBottom: 8 }}
          />
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

        {/* Approval Mode */}
        <SectionCard>
          <Label className="text-sm font-bold mb-3 block" style={{ color: '#0f2b6b' }}>אופן אישור עובד</Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={() => set('approval_mode', 'instant')}
              style={{ padding: '14px 12px', borderRadius: 14, textAlign: 'right', cursor: 'pointer', ...(form.approval_mode === 'instant' ? activeBtn : inactiveBtn) }}
            >
              <Zap size={16} style={{ marginBottom: 6 }} />
              <div style={{ fontSize: 13, fontWeight: 800 }}>אישור מיידי</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>ראשון שלוקח — זוכה</div>
            </button>
            <button onClick={() => set('approval_mode', 'manual')}
              style={{ padding: '14px 12px', borderRadius: 14, textAlign: 'right', cursor: 'pointer', ...(form.approval_mode === 'manual' ? activeBtn : inactiveBtn) }}
            >
              <Users size={16} style={{ marginBottom: 6 }} />
              <div style={{ fontSize: 13, fontWeight: 800 }}>אני בוחר</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>אראה מועמדים ואבחר</div>
            </button>
          </div>
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
        <SectionCard>
          <button type="button" onClick={() => set('is_story', !form.is_story)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right' }}
          >
            <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${form.is_story ? '#a855f7' : '#cbd5e1'}`, background: form.is_story ? '#a855f7' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {form.is_story && <span style={{ color: 'white', fontSize: 11 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} color="#a855f7" /> הצג כ-Story
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>הג'ובה תופיע בשורת Stories למשך 24 שעות (₪5 — יחויב בהמשך)</div>
            </div>
          </button>
        </SectionCard>

        {/* Location */}
        <SectionCard>
          <Label className="text-sm font-bold mb-2 flex items-center gap-1" style={{ color: '#0f2b6b' }}>
            <MapPin size={14} /> מיקום
          </Label>
          <Input placeholder="לדוגמה: תל אביב, רחוב דיזנגוף 50"
            value={form.location_name} onChange={e => { set('location_name', e.target.value); setErrors(p => ({...p, location_name: false})); }}
            style={{ background: '#f4f7fb', border: `1px solid ${errors.location_name ? '#ef4444' : '#dce8f5'}`, borderRadius: 12, height: 48, marginBottom: 10 }}
          />
          <Input placeholder="עיר (לדוגמה: תל אביב)"
            value={form.city} onChange={e => { set('city', e.target.value); setErrors(p => ({...p, city: false})); }}
            style={{ background: '#f4f7fb', border: `1px solid ${errors.city ? '#ef4444' : '#dce8f5'}`, borderRadius: 12, height: 42 }}
          />
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
        <button onClick={handleSubmit} disabled={loading}
          style={{ width: '100%', height: 56, borderRadius: 18, fontSize: 16, fontWeight: 900, color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', boxShadow: '0 8px 28px rgba(26,111,212,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {loading ? <Loader2 size={22} className="animate-spin" /> : <><Zap size={20} />פרסם ג'ובה</>}
        </button>
      </div>
    </div>
  );
}