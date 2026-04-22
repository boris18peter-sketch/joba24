import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowRight, MapPin, Clock, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

const timeOptions = ['15m', '30m', '1h', '2h', 'custom'];
const categories = [
  { value: 'moving', label: '🚛 הובלה' },
  { value: 'shopping', label: '🛒 קניות' },
  { value: 'repairs', label: '🔧 תיקון' },
  { value: 'cleaning', label: '🧹 ניקיון' },
  { value: 'other', label: '📋 אחר' },
];

export default function EditTask() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(null);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: task } = useQuery({
    queryKey: ['task', id],
    queryFn: () => base44.entities.Task.filter({ id }),
    select: d => d[0],
  });

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        price: String(task.price || ''),
        location_name: task.location_name || '',
        city: task.city || '',
        estimated_time: task.estimated_time || '1h',
        category: task.category || 'other',
        requirements: task.requirements || { vehicle: false, two_people: false, experience: false },
      });
    }
  }, [task]);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const setReq = (key, val) => setForm(p => ({ ...p, requirements: { ...p.requirements, [key]: val } }));

  const handleSave = async () => {
    if (!form.title || !form.price) { toast.error('נא למלא כותרת ומחיר'); return; }
    if (me?.id !== task?.client_id) { toast.error('אין לך הרשאה לערוך משימה זו'); return; }
    setLoading(true);
    await base44.entities.Task.update(id, { ...form, price: Number(form.price) });
    queryClient.invalidateQueries({ queryKey: ['task', id] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    toast.success('המשימה עודכנה! ✅');
    setLoading(false);
    navigate(`/task/${id}`);
  };

  if (!form) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen" dir="rtl">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 pt-12 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowRight className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-bold">עריכת משימה</h1>
      </div>

      <div className="px-4 py-5 space-y-5 pb-10">
        <div>
          <Label className="text-sm font-semibold mb-2 block">קטגוריה</Label>
          <div className="flex gap-2 flex-wrap">
            {categories.map(c => (
              <button key={c.value} onClick={() => set('category', c.value)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                  form.category === c.value ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200'
                }`}
              >{c.label}</button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-sm font-semibold mb-2 block">כותרת *</Label>
          <Input value={form.title} onChange={e => set('title', e.target.value)}
            className="bg-secondary border-0 rounded-xl h-12 text-base"
          />
        </div>

        <div>
          <Label className="text-sm font-semibold mb-2 block">תיאור</Label>
          <Textarea value={form.description} onChange={e => set('description', e.target.value)}
            className="bg-secondary border-0 rounded-xl resize-none" rows={3}
          />
        </div>

        <div>
          <Label className="text-sm font-semibold mb-2 block">מחיר (₪) *</Label>
          <Input type="number" value={form.price} onChange={e => set('price', e.target.value)}
            className="bg-secondary border-0 rounded-xl h-12 text-base font-bold"
          />
        </div>

        <div>
          <Label className="text-sm font-semibold mb-2 flex items-center gap-1"><MapPin className="w-4 h-4" /> מיקום</Label>
          <Input value={form.location_name} onChange={e => set('location_name', e.target.value)}
            placeholder="כתובת" className="bg-secondary border-0 rounded-xl h-12 mb-2"
          />
          <Input value={form.city} onChange={e => set('city', e.target.value)}
            placeholder="עיר" className="bg-secondary border-0 rounded-xl h-10 text-sm"
          />
        </div>

        <div>
          <Label className="text-sm font-semibold mb-2 flex items-center gap-1"><Clock className="w-4 h-4" /> זמן ביצוע</Label>
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

        <div>
          <Label className="text-sm font-semibold mb-2 block">דרישות</Label>
          <div className="space-y-2">
            {[{ key: 'vehicle', label: '🚗 רכב' }, { key: 'two_people', label: '👥 שני אנשים' }, { key: 'experience', label: '🛠️ ניסיון' }].map(({ key, label }) => (
              <button key={key} onClick={() => setReq(key, !form.requirements[key])}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-right transition-all border ${
                  form.requirements[key] ? 'bg-black/5 border-black/20' : 'bg-secondary border-transparent'
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${form.requirements[key] ? 'bg-black border-black' : 'border-gray-300'}`}>
                  {form.requirements[key] && <span className="text-white text-xs">✓</span>}
                </div>
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading}
          className="w-full h-14 rounded-2xl text-base font-bold bg-black hover:bg-gray-900 text-white shadow-xl"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 ml-1" />שמור שינויים</>}
        </Button>
      </div>
    </div>
  );
}