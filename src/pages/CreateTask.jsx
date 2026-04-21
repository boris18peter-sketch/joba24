import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowRight, MapPin, Clock, DollarSign, Loader2, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';

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
    estimated_time: '1h',
    category: 'other',
    requirements: { vehicle: false, two_people: false, experience: false },
  });

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const setReq = (key, val) => setForm(p => ({ ...p, requirements: { ...p.requirements, [key]: val } }));

  const handleSubmit = async () => {
    if (!form.title || !form.price) {
      toast.error('נא למלא כותרת ומחיר');
      return;
    }
    setLoading(true);
    await base44.entities.Task.create({
      ...form,
      price: Number(form.price),
      status: 'OPEN',
      client_id: me?.id,
      client_name: me?.full_name,
      client_rating: me?.rating || 0,
    });
    toast.success('המשימה פורסמה בהצלחה! ⚡');
    navigate('/');
  };

  return (
    <div className="min-h-screen" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 pt-12 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowRight className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-bold">פרסום משימה חדשה</h1>
      </div>

      <div className="px-4 py-5 space-y-5 pb-8">
        {/* Category */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">קטגוריה</Label>
          <div className="flex gap-2 flex-wrap">
            {categories.map(c => (
              <button
                key={c.value}
                onClick={() => set('category', c.value)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  form.category === c.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
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
          <Input
            placeholder="לדוגמה: להרים מקרר לקומה שלישית"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            className="bg-secondary border-0 rounded-xl h-12 text-base"
          />
        </div>

        {/* Description */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">תיאור מפורט</Label>
          <Textarea
            placeholder="תאר את המשימה, מה נדרש, איפה..."
            value={form.description}
            onChange={e => set('description', e.target.value)}
            className="bg-secondary border-0 rounded-xl resize-none"
            rows={3}
          />
        </div>

        {/* Price */}
        <div>
          <Label className="text-sm font-semibold mb-2 flex items-center gap-1">
            <DollarSign className="w-4 h-4" /> מחיר (₪) *
          </Label>
          <Input
            type="number"
            placeholder="100"
            value={form.price}
            onChange={e => set('price', e.target.value)}
            className="bg-secondary border-0 rounded-xl h-12 text-base"
          />
        </div>

        {/* Location */}
        <div>
          <Label className="text-sm font-semibold mb-2 flex items-center gap-1">
            <MapPin className="w-4 h-4" /> מיקום
          </Label>
          <Input
            placeholder="לדוגמה: תל אביב, רחוב דיזנגוף 50"
            value={form.location_name}
            onChange={e => set('location_name', e.target.value)}
            className="bg-secondary border-0 rounded-xl h-12"
          />
        </div>

        {/* Estimated Time */}
        <div>
          <Label className="text-sm font-semibold mb-2 flex items-center gap-1">
            <Clock className="w-4 h-4" /> זמן ביצוע משוער
          </Label>
          <div className="flex gap-2 flex-wrap">
            {timeOptions.map(t => (
              <button
                key={t}
                onClick={() => set('estimated_time', t)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  form.estimated_time === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Requirements */}
        <div>
          <Label className="text-sm font-semibold mb-2 flex items-center gap-1">
            <CheckSquare className="w-4 h-4" /> דרישות (אופציונלי)
          </Label>
          <div className="space-y-2">
            {[
              { key: 'vehicle', label: '🚗 דרוש רכב' },
              { key: 'two_people', label: '👥 דרושים שני אנשים' },
              { key: 'experience', label: '🛠️ דרוש ניסיון' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setReq(key, !form.requirements[key])}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-right transition-all ${
                  form.requirements[key] ? 'bg-primary/10 border border-primary/30' : 'bg-secondary'
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                  form.requirements[key] ? 'bg-primary border-primary' : 'border-muted-foreground'
                }`}>
                  {form.requirements[key] && <span className="text-white text-xs">✓</span>}
                </div>
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-14 rounded-2xl text-base font-bold bg-black hover:bg-gray-900 text-white shadow-lg"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '⚡ פרסם משימה'}
        </Button>
      </div>
    </div>
  );
}