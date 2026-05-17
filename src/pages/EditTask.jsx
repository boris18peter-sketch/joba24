import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowRight, MapPin, Clock, Loader2, Save, Zap, Users, CheckSquare, Info } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORIES } from '@/lib/categories';
import ImageUploader from '@/components/ImageUploader';
import VideoUploader from '@/components/VideoUploader';
import PriceSuggestion from '@/components/PriceSuggestion';
import PaymentModal from '@/components/PaymentModal';

const timeOptions = ['15m', '30m', '1h', '2h', 'custom'];
const EXPIRY_OPTIONS = [
  { label: 'ללא תוקף', hours: null },
  { label: '6 שעות', hours: 6 },
  { label: 'יום', hours: 24 },
  { label: '2 ימים', hours: 48 },
  { label: 'שבוע', hours: 168 },
];

export default function EditTask() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const isRepostMode = location.state?.repostMode;

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: task } = useQuery({
    queryKey: ['task', id],
    queryFn: () => base44.entities.Task.filter({ id }),
    select: d => d[0],
  });

  useEffect(() => {
    if (task && !form) {
      const isCustomTime = task.estimated_time && !['15m', '30m', '1h', '2h'].includes(task.estimated_time);
      setForm({
        title: task.title || '',
        description: task.description || '',
        price: String(task.price || ''),
        max_price: String(task.max_price || ''),
        auto_bump_enabled: task.auto_bump_enabled || false,
        location_name: task.location_name || '',
        city: task.city || '',
        address_building: task.address_building || '',
        address_floor: task.address_floor || '',
        address_apartment: task.address_apartment || '',
        address_notes: task.address_notes || '',
        estimated_time: isCustomTime ? 'custom' : (task.estimated_time || '1h'),
        custom_time: isCustomTime ? task.estimated_time : '',
        category: task.category || 'other',
        approval_mode: 'manual',
        expiry_hours: task.expiry_duration_hours || null,
        images: task.images || [],
        video_url: task.video_url || '',
        requirements: task.requirements || { vehicle: false, two_people: false, experience: false },
      });
    }
  }, [task]);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const setReq = (key, val) => setForm(p => ({ ...p, requirements: { ...p.requirements, [key]: val } }));

  const handleSave = async () => {
     if (!form.title) { toast.error('חובה למלא כותרת'); return; }
     if (!form.description) { toast.error('חובה למלא תיאור מפורט'); return; }
     if (!form.price) { toast.error('חובה למלא מחיר'); return; }
     if (!form.city) { toast.error('חובה למלא עיר'); return; }
     if (me?.id !== task?.client_id) { toast.error('אין לך הרשאה לערוך משימה זו'); return; }

     setLoading(true);
     const estimatedTime = form.estimated_time === 'custom' ? (form.custom_time || 'custom') : form.estimated_time;
     const expires = form.expiry_hours ? new Date(Date.now() + form.expiry_hours * 60 * 60 * 1000).toISOString() : null;

     await base44.entities.Task.update(id, {
       title: form.title,
       description: form.description,
       price: Number(form.price),
       max_price: form.auto_bump_enabled && form.max_price ? Number(form.max_price) : undefined,
       auto_bump_enabled: form.auto_bump_enabled,
       location_name: form.location_name,
       city: form.city,
       address_building: form.address_building || undefined,
       address_floor: form.address_floor || undefined,
       address_apartment: form.address_apartment || undefined,
       address_notes: form.address_notes || undefined,
       estimated_time: estimatedTime,
       category: form.category,
       expiry_duration_hours: form.expiry_hours,
       expires_at: expires,
       images: form.images,
       video_url: form.video_url || undefined,
       requirements: form.requirements,
       ...(isRepostMode ? { status: 'OPEN', worker_id: null, worker_name: null, worker_status: null } : {}),
     });
     queryClient.invalidateQueries({ queryKey: ['task', id] });
     queryClient.invalidateQueries({ queryKey: ['tasks'] });
     queryClient.invalidateQueries({ queryKey: ['myTasksPage'] });
     setLoading(false);
     if (isRepostMode) {
       toast.success('הג\'ובה פורסמה מחדש! ✅');
       navigate('/my-tasks');
     } else {
       toast.success('המשימה עודכנה! ✅');
       navigate(`/task/${id}`);
     }
   };

  const handlePaymentSuccess = async () => {
     setLoading(true);
     const estimatedTime = form.estimated_time === 'custom' ? (form.custom_time || 'custom') : form.estimated_time;
     const expires = form.expiry_hours ? new Date(Date.now() + form.expiry_hours * 60 * 60 * 1000).toISOString() : null;

     await base44.entities.Task.update(id, {
       title: form.title,
       description: form.description,
       price: Number(form.price),
       max_price: form.auto_bump_enabled && form.max_price ? Number(form.max_price) : undefined,
       auto_bump_enabled: form.auto_bump_enabled,
       location_name: form.location_name,
       city: form.city,
       address_building: form.address_building || undefined,
       address_floor: form.address_floor || undefined,
       address_apartment: form.address_apartment || undefined,
       address_notes: form.address_notes || undefined,
       estimated_time: estimatedTime,
       category: form.category,
       expiry_duration_hours: form.expiry_hours,
       expires_at: expires,
       images: form.images,
       video_url: form.video_url || undefined,
       requirements: form.requirements,
       status: 'OPEN',
       payment_status: 'funded',
       payment_held: true,
     });
     queryClient.invalidateQueries({ queryKey: ['task', id] });
     queryClient.invalidateQueries({ queryKey: ['tasks'] });
     queryClient.invalidateQueries({ queryKey: ['myTasks'] });
     queryClient.invalidateQueries({ queryKey: ['myTasksPage'] });
     toast.success('המשימה פורסמה מחדש! ✅');
     setLoading(false);
     setShowPayment(false);
     navigate('/');
   };

  if (!form) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen" dir="rtl">
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(244,247,251,0.97)', borderBottom: '1px solid #dce8f5', backdropFilter: 'blur(8px)', padding: '44px 16px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ width: 38, height: 38, borderRadius: 12, background: 'white', border: '1px solid #dce8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
          <ArrowRight size={18} color="#1a6fd4" />
        </button>
        <h1 style={{ fontSize: 16, fontWeight: 800, color: '#0f2b6b', margin: 0 }}>{isRepostMode ? 'פרסום מחדש' : 'עריכת משימה'}</h1>
      </div>

      <div className="px-4 py-5 space-y-5 pb-12">
        {/* Info */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800 leading-relaxed">
            <strong>חשוב!</strong> ככל שהמשימה מפורטת יותר — כך תקבל match מדויק יותר עם עובד מתאים.
          </p>
        </div>

        {/* Category */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">קטגוריה</Label>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(c => (
              <button key={c.value} onClick={() => set('category', c.value)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                  form.category === c.value ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200'
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
          <Label className="text-sm font-semibold mb-2 block">תיאור מפורט *</Label>
          <Textarea placeholder="תאר את המשימה בפירוט: מה בדיוק צריך לעשות, מה הציפיות, מה יש במקום..."
            value={form.description} onChange={e => set('description', e.target.value)}
            className="bg-secondary border-0 rounded-xl resize-none" rows={4}
          />
        </div>

        {/* Images + Video */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">תמונות (עד 4)</Label>
          <ImageUploader images={form.images} onChange={imgs => set('images', imgs)} />
        </div>
        <div>
          <Label className="text-sm font-semibold mb-2 block">סרטון (אופציונלי)</Label>
          <VideoUploader videoUrl={form.video_url} onChange={url => set('video_url', url)} />
        </div>

        {/* Price */}
         <div>
           <Label className="text-sm font-semibold mb-2 block">מחיר (₪) *</Label>
           <Input type="number" placeholder="100"
             value={form.price} onChange={e => task?.status !== 'OPEN' ? null : set('price', e.target.value)}
             disabled={task?.status === 'OPEN'}
             className={`bg-secondary border-0 rounded-xl h-12 text-base font-bold ${task?.status === 'OPEN' ? 'opacity-50 cursor-not-allowed' : ''}`}
           />
           {task?.status === 'OPEN' && <p className="text-xs text-red-600 mt-2">לא ניתן לשנות מחיר של משימה שכבר פורסמה</p>}
           {task?.status !== 'OPEN' && <PriceSuggestion category={form.category} estimatedTime={form.estimated_time} onAccept={p => set('price', String(p))} />}
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
              <div className="text-xs text-gray-500 mt-0.5">אם המשימה לא נלקחת, המחיר יעלה כל 5 דקות</div>
            </div>
          </button>
          {form.auto_bump_enabled && (
            <div className="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <Label className="text-sm font-semibold block text-amber-800 mb-2">מחיר מקסימלי (₪)</Label>
              <Input type="number" placeholder="250"
                value={form.max_price} onChange={e => set('max_price', e.target.value)}
                className="bg-white border-amber-200 rounded-xl h-11 text-base font-bold"
              />
            </div>
          )}
        </div>



        {/* Expiry */}
        <div>
          <Label className="text-sm font-semibold mb-2 flex items-center gap-1"><Clock className="w-4 h-4" /> תוקף המשימה</Label>
          <div className="flex gap-2 flex-wrap">
            {EXPIRY_OPTIONS.map(opt => (
              <button key={String(opt.hours)} onClick={() => set('expiry_hours', opt.hours)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                  form.expiry_hours === opt.hours ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200'
                }`}
              >{opt.label}</button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <Label className="text-sm font-semibold mb-2 flex items-center gap-1"><MapPin className="w-4 h-4" /> מיקום</Label>
          <Input placeholder="כתובת (לדוגמה: רחוב דיזנגוף 50)"
            value={form.location_name} onChange={e => set('location_name', e.target.value)}
            className="bg-secondary border-0 rounded-xl h-12 mb-2"
          />
          <Input placeholder="עיר *"
            value={form.city} onChange={e => set('city', e.target.value)}
            className="bg-secondary border-0 rounded-xl h-10 text-sm mb-2"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="בניין / מספר בית"
              value={form.address_building || ''} onChange={e => set('address_building', e.target.value)}
              className="bg-secondary border-0 rounded-xl h-10 text-sm"
            />
            <Input placeholder="קומה"
              value={form.address_floor || ''} onChange={e => set('address_floor', e.target.value)}
              className="bg-secondary border-0 rounded-xl h-10 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Input placeholder="דירה"
              value={form.address_apartment || ''} onChange={e => set('address_apartment', e.target.value)}
              className="bg-secondary border-0 rounded-xl h-10 text-sm"
            />
            <Input placeholder="הערות ניווט"
              value={form.address_notes || ''} onChange={e => set('address_notes', e.target.value)}
              className="bg-secondary border-0 rounded-xl h-10 text-sm"
            />
          </div>
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
              >{t === 'custom' ? '⌨️ מותאם' : t}</button>
            ))}
          </div>
          {form.estimated_time === 'custom' && (
            <input
              type="text"
              placeholder="לדוגמה: 3 שעות, יום שלם, שבוע..."
              value={form.custom_time || ''}
              onChange={e => set('custom_time', e.target.value)}
              className="mt-2 w-full px-4 py-3 rounded-xl bg-secondary border-0 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          )}
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
            <input
              type="text"
              placeholder="דרישה נוספת... (לדוגמה: ניסיון עם מוצרי חשמל)"
              value={form.requirements.custom || ''}
              onChange={e => setReq('custom', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-secondary border-0 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading}
           className="w-full h-14 rounded-2xl text-base font-bold bg-black hover:bg-gray-900 text-white shadow-xl"
         >
           {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isRepostMode ? <><Save className="w-5 h-5 ml-1" />שמור ופרסם</> : <><Save className="w-5 h-5 ml-1" />שמור שינויים</>}
         </Button>
      </div>

      {showPayment && <PaymentModal amount={Number(form.price)} onSuccess={handlePaymentSuccess} onCancel={() => { setShowPayment(false); }} closeOnBackdropClick={false} />}
    </div>
  );
}