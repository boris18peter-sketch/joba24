import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowRight, MapPin, Clock, Zap, CheckSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import PriceSuggestion from '@/components/PriceSuggestion';

const timeOptions = ['15m', '30m', '1h', '2h', 'custom'];
const categories = [
  { value: 'moving', label: '🚛 הובלה' },
  { value: 'shopping', label: '🛒 קניות' },
  { value: 'repairs', label: '🔧 תיקון' },
  { value: 'cleaning', label: '🧹 ניקיון' },
  { value: 'other', label: '📋 אחר' },
];

export default function CreateTask() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    location_name: '',
    city: '',
    estimated_time: '1h',
    category: 'other',
    requirements: { vehicle: false, two_people: false, experience: false },
  });

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const setReq = (key, val) => setForm(p => ({ ...p, requirements: { ...p.requirements, [key]: val } }));

  const handleSubmit = async () => {
    if (!form.title || !form.price) { toast.error('נא למלא כותרת ומחיר'); return; }
    setLoading(true);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await base44.entities.Task.create({
      ...form,
      price: Number(form.price),
      status: 'OPEN',
      client_id: me?.id,
      client_name: me?.full_name,
      client_rating: me?.rating || 0,
      expires_at: expires,
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

      <div className="px-4 py-5 space-y-5 pb-10">
        {/* Category */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">קטגוריה</Label>
          <div className="flex gap-2 flex-wrap">
            {categories.map(c => (
              <button key={c.value} onClick={() => set('category', c.value)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                  form.category === c.value
                    ? 'bg-black text-white border-black shadow-md'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {c.label}
              </button>
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

        {/* Price */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">מחיר (₪) *</Label>
          <Input type="number" placeholder="100"
            value={form.price} onChange={e => set('price', e.target.value)}
            className="bg-secondary border-0 rounded-xl h-12 text-base font-bold"
          />
          <PriceSuggestion
            category={form.category}
            estimatedTime={form.estimated_time}
            onAccept={p => set('price', String(p))}
          />
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
                  form.estimated_time === t
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {t}
              </button>
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
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-right transition-all border ${
                  form.requirements[key] ? 'bg-black/5 border-black/20' : 'bg-secondary border-transparent'
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                  form.requirements[key] ? 'bg-black border-black' : 'border-gray-300'
                }`}>
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