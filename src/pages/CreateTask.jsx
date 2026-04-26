import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowRight, MapPin, Clock, Zap, CheckSquare, Loader2, Users, Sparkles, BookmarkCheck } from 'lucide-react';
import { toast } from 'sonner';
import PriceSuggestion from '@/components/PriceSuggestion';
import ImageUploader from '@/components/ImageUploader';
import { CATEGORIES } from '@/lib/categories';

const timeOptions = ['15m', '30m', '1h', '2h', 'custom'];

const EXPIRY_OPTIONS = [
  { label: '6 שעות', hours: 6 },
  { label: 'יום', hours: 24 },
  { label: '2 ימים', hours: 48 },
  { label: 'שבוע', hours: 168 },
];

export default function CreateTask() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    max_price: '',
    auto_bump_enabled: false,
    location_name: '',
    city: '',
    estimated_time: '1h',
    category: 'other',
    approval_mode: 'instant',
    expiry_hours: 24,
    is_story: false,
    images: [],
    requirements: { vehicle: false, two_people: false, experience: false },
  });

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const setReq = (key, val) => setForm(p => ({ ...p, requirements: { ...p.requirements, [key]: val } }));

  const handleSubmit = async () => {
    if (!form.title || !form.price) { toast.error('נא למלא כותרת ומחיר'); return; }
    setLoading(true);
    const expires = new Date(Date.now() + form.expiry_hours * 60 * 60 * 1000).toISOString();
    const storyExpires = form.is_story ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined;

    await base44.entities.Task.create({
      title: form.title,
      description: form.description,
      price: Number(form.price),
      base_price: Number(form.price),
      max_price: form.auto_bump_enabled && form.max_price ? Number(form.max_price) : undefined,
      auto_bump_enabled: form.auto_bump_enabled,
      location_name: form.location_name,
      city: form.city,
      estimated_time: form.estimated_time,
      category: form.category,
      approval_mode: form.approval_mode,
      expiry_duration_hours: form.expiry_hours,
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
    toast.success('המשימה פורסמה! ⚡');
    setLoading(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen" dir="rtl">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 pt-12 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowRight className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-bold">פרסום משימה חדשה</h1>
      </div>

      <div className="px-4 py-5 space-y-5 pb-12">
        {/* Category */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">קטגוריה</Label>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(c => (
              <button key={c.value} onClick={() => set('category', c.value)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                  form.category === c.value
                    ? 'bg-black text-white border-black shadow-md'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >{c.label}</button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">מה צריך לעשות? *</Label>
          <Input placeholder="לדוגמה: להרים מקרר לקומה שלישית"
            value={form.title} onChange={e => set('title', e.target.value)}
            className="bg-secondary border-0 rounded-xl h-12 text-base"
          />
        </div>

        {/* Description */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">תיאור מפורט</Label>
          <Textarea placeholder="תאר את המשימה, מה נדרש, איפה..."
            value={form.description} onChange={e => set('description', e.target.value)}
            className="bg-secondary border-0 rounded-xl resize-none" rows={3}
          />
        </div>

        {/* Images */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">תמונות (עד 4)</Label>
          <ImageUploader images={form.images} onChange={imgs => set('images', imgs)} />
        </div>

        {/* Price */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">מחיר (₪) *</Label>
          <Input type="number" placeholder="100"
            value={form.price} onChange={e => set('price', e.target.value)}
            className="bg-secondary border-0 rounded-xl h-12 text-base font-bold"
          />
          <PriceSuggestion category={form.category} estimatedTime={form.estimated_time} onAccept={p => set('price', String(p))} />
        </div>

        {/* Auto Price Bump */}
        <div>
          <button type="button" onClick={() => set('auto_bump_enabled', !form.auto_bump_enabled)}
            className={`w-full flex items-center gap-3 p-4 rounded-xl text-right transition-all border ${form.auto_bump_enabled ? 'bg-amber-50 border-amber-300' : 'bg-secondary border-transparent'}`}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${form.auto_bump_enabled ? 'bg-amber-500 border-amber-500' : 'border-gray-300'}`}>
              {form.auto_bump_enabled && <span className="text-white text-xs">✓</span>}
            </div>
            <div className="text-right flex-1">
              <div className="text-sm font-semibold">⚡ העלאת מחיר אוטומטית</div>
              <div className="text-xs text-gray-500 mt-0.5">אם המשימה לא נלקחת, המחיר יעלה כל 5 דקות עד המקסימום</div>
            </div>
          </button>
          {form.auto_bump_enabled && (
            <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <Label className="text-sm font-semibold block text-amber-800">מחיר מקסימלי (₪)</Label>
              <Input type="number" placeholder="250"
                value={form.max_price} onChange={e => set('max_price', e.target.value)}
                className="bg-white border-amber-200 rounded-xl h-11 text-base font-bold"
              />
            </div>
          )}
        </div>

        {/* Approval Mode */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">אופן אישור עובד</Label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => set('approval_mode', 'instant')}
              className={`p-3 rounded-xl border text-right transition-all ${form.approval_mode === 'instant' ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-700'}`}
            >
              <Zap className="w-4 h-4 mb-1" />
              <div className="text-sm font-bold">אישור מיידי</div>
              <div className={`text-xs mt-0.5 ${form.approval_mode === 'instant' ? 'text-white/70' : 'text-gray-400'}`}>ראשון שלוקח — זוכה</div>
            </button>
            <button onClick={() => set('approval_mode', 'manual')}
              className={`p-3 rounded-xl border text-right transition-all ${form.approval_mode === 'manual' ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-700'}`}
            >
              <Users className="w-4 h-4 mb-1" />
              <div className="text-sm font-bold">אני בוחר</div>
              <div className={`text-xs mt-0.5 ${form.approval_mode === 'manual' ? 'text-white/70' : 'text-gray-400'}`}>אראה מועמדים ואבחר</div>
            </button>
          </div>
        </div>

        {/* Expiry */}
        <div>
          <Label className="text-sm font-semibold mb-2 flex items-center gap-1"><Clock className="w-4 h-4" /> תוקף המשימה</Label>
          <div className="flex gap-2 flex-wrap">
            {EXPIRY_OPTIONS.map(opt => (
              <button key={opt.hours} onClick={() => set('expiry_hours', opt.hours)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                  form.expiry_hours === opt.hours ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200'
                }`}
              >{opt.label}</button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">אחרי {EXPIRY_OPTIONS.find(o => o.hours === form.expiry_hours)?.label || form.expiry_hours + ' שעות'} המשימה תסומן כפגת תוקף</p>
        </div>

        {/* Story */}
        <div>
          <button type="button" onClick={() => set('is_story', !form.is_story)}
            className={`w-full flex items-center gap-3 p-4 rounded-xl text-right transition-all border ${form.is_story ? 'bg-purple-50 border-purple-300' : 'bg-secondary border-transparent'}`}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${form.is_story ? 'bg-purple-500 border-purple-500' : 'border-gray-300'}`}>
              {form.is_story && <span className="text-white text-xs">✓</span>}
            </div>
            <div className="text-right flex-1">
              <div className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" /> הצג כ-Story
              </div>
              <div className="text-xs text-gray-500 mt-0.5">המשימה תופיע בשורת Stories למשך 24 שעות (₪5 — יחויב בהמשך)</div>
            </div>
          </button>
        </div>

        {/* Location */}
        <div>
          <Label className="text-sm font-semibold mb-2 flex items-center gap-1"><MapPin className="w-4 h-4" /> מיקום</Label>
          <Input placeholder="לדוגמה: תל אביב, רחוב דיזנגוף 50"
            value={form.location_name} onChange={e => set('location_name', e.target.value)}
            className="bg-secondary border-0 rounded-xl h-12 mb-2"
          />
          <Input placeholder="עיר (לדוגמה: תל אביב)"
            value={form.city} onChange={e => set('city', e.target.value)}
            className="bg-secondary border-0 rounded-xl h-10 text-sm"
          />
        </div>

        {/* Time */}
        <div>
          <Label className="text-sm font-semibold mb-2 flex items-center gap-1"><Clock className="w-4 h-4" /> זמן ביצוע משוער</Label>
          <div className="flex gap-2 flex-wrap">
            {timeOptions.map(t => (
              <button key={t} onClick={() => set('estimated_time', t)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                  form.estimated_time === t ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200'
                }`}
              >{t}</button>
            ))}
          </div>
        </div>

        {/* Requirements */}
        <div>
          <Label className="text-sm font-semibold mb-2 flex items-center gap-1"><CheckSquare className="w-4 h-4" /> דרישות</Label>
          <div className="space-y-2">
            {[
              { key: 'vehicle', label: '🚗 דרוש רכב' },
              { key: 'two_people', label: '👥 שני אנשים' },
              { key: 'experience', label: '🛠️ ניסיון' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setReq(key, !form.requirements[key])}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-right transition-all border ${form.requirements[key] ? 'bg-black/5 border-black/20' : 'bg-secondary border-transparent'}`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${form.requirements[key] ? 'bg-black border-black' : 'border-gray-300'}`}>
                  {form.requirements[key] && <span className="text-white text-xs">✓</span>}
                </div>
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={loading}
          className="w-full h-14 rounded-2xl text-base font-bold bg-black hover:bg-gray-900 text-white shadow-xl"
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Zap className="w-5 h-5 ml-1" />פרסם משימה</>}
        </Button>
      </div>
    </div>
  );
}