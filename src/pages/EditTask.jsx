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
  const isRepostMode = location.state?.repostMode || location.state?.isRepost;

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
        estimated_time: isCustomTime ? 'custom' : (task.estimated_time || '1h'),
        custom_time: isCustomTime ? task.estimated_time : '',
        category: task.category || 'other',
        approval_mode: 'manual',
        expiry_hours: task.expiry_duration_hours || null,
        images: task.images || [],
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

     if (isRepostMode) {
       setShowPayment(true);
       return;
     }

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
       estimated_time: estimatedTime,
       category: form.category,
       expiry_duration_hours: form.expiry_hours,
       expires_at: expires,
       images: form.images,
       requirements: form.requirements,
       status: isRepostMode ? 'OPEN' : undefined,
       });
     queryClient.invalidateQueries({ queryKey: ['task', id] });
     queryClient.invalidateQueries({ queryKey: ['tasks'] });
     if (!isRepostMode) {
       toast.success('המשימה עודכנה! ✅');
       setLoading(false);
       navigate(`/task/${id}`);
     } else {
       setLoading(false);
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
       estimated_time: estimatedTime,
       category: form.category,
       expiry_duration_hours: form.expiry_hours,
       expires_at: expires,
       images: form.images,
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

      <div className="px-4 py-3 space-y-3 pb-28">
        {/* Info */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800 leading-relaxed">
            <strong>חשוב!</strong> ככל שהמשימה מפורטת יותר — כך תקבל match מדויק יותר עם עובד מתאים.
          </p>
        </div>

        {/* Category */}
        <div style={{ background: 'white', borderRadius: 16, padding: '14px 12px', border: '1px solid #e8eef7', boxShadow: '0 1px 8px rgba(26,111,212,0.04)' }}>
          <Label className="text-sm font-bold mb-2 block" style={{ color: '#0f2b6b', fontSize: '12px' }}>קטגוריה</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {CATEGORIES.map(c => (
              <button key={c.value} onClick={() => set('category', c.value)}
                style={{
                  padding: '10px 6px',
                  borderRadius: 12,
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textAlign: 'center',
                  height: '48px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: form.category === c.value ? 'linear-gradient(135deg, #1a6fd4, #0a52b0)' : 'white',
                  color: form.category === c.value ? 'white' : '#555',
                  border: `1px solid ${form.category === c.value ? '#1a6fd4' : '#dce8f5'}`
                }}
              >{c.label}</button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div style={{ background: 'white', borderRadius: 16, padding: '14px 12px', border: '1px solid #e8eef7', boxShadow: '0 1px 8px rgba(26,111,212,0.04)' }}>
          <Label className="text-sm font-bold mb-2 block" style={{ color: '#0f2b6b', fontSize: '12px' }}>מה צריך לעשות? *</Label>
          <Input placeholder="לדוגמה: להרים מקרר לקומה שלישית"
            value={form.title} onChange={e => set('title', e.target.value)}
            style={{ background: '#f4f7fb', border: '1.5px solid #dce8f5', borderRadius: 10, height: 42, fontSize: 14 }}
          />
        </div>

        {/* Description */}
        <div style={{ background: 'white', borderRadius: 16, padding: '14px 12px', border: '1px solid #e8eef7', boxShadow: '0 1px 8px rgba(26,111,212,0.04)' }}>
          <Label className="text-sm font-bold mb-2 block" style={{ color: '#0f2b6b', fontSize: '12px' }}>תיאור מפורט *</Label>
          <Textarea placeholder="תאר את המשימה בפירוט: מה בדיוק צריך לעשות, מה הציפיות, מה יש במקום..."
            value={form.description} onChange={e => set('description', e.target.value)}
            style={{ background: '#f4f7fb', border: '1.5px solid #dce8f5', borderRadius: 10, resize: 'none', padding: '10px 12px' }}
            rows={3}
          />
        </div>

        {/* Images */}
        <div style={{ background: 'white', borderRadius: 16, padding: '14px 12px', border: '1px solid #e8eef7', boxShadow: '0 1px 8px rgba(26,111,212,0.04)' }}>
          <Label className="text-sm font-bold mb-2 block" style={{ color: '#0f2b6b', fontSize: '12px' }}>תמונות (עד 4)</Label>
          <ImageUploader images={form.images} onChange={imgs => set('images', imgs)} />
        </div>

        {/* Price */}
        <div style={{ background: 'white', borderRadius: 16, padding: '14px 12px', border: '1px solid #e8eef7', boxShadow: '0 1px 8px rgba(26,111,212,0.04)' }}>
           <Label className="text-sm font-bold mb-2 block" style={{ color: '#0f2b6b', fontSize: '12px' }}>מחיר (₪) *</Label>
           <Input type="number" placeholder="100"
             value={form.price} onChange={e => task?.status !== 'OPEN' ? null : set('price', e.target.value)}
             disabled={task?.status === 'OPEN'}
             style={{ background: '#f4f7fb', border: `1.5px solid ${task?.status === 'OPEN' ? '#dce8f5' : '#dce8f5'}`, borderRadius: 10, height: 42, fontSize: 15, fontWeight: 800 }}
           />
           {task?.status === 'OPEN' && <p style={{ fontSize: 10, color: '#ef4444', marginTop: 6 }}>לא ניתן לשנות מחיר של משימה שכבר פורסמה</p>}
           {task?.status !== 'OPEN' && <PriceSuggestion category={form.category} estimatedTime={form.estimated_time} onAccept={p => set('price', String(p))} />}
         </div>

        {/* Auto Price Bump */}
        <div style={{ background: 'white', borderRadius: 16, padding: '14px 12px', border: '1px solid #e8eef7', boxShadow: '0 1px 8px rgba(26,111,212,0.04)' }}>
          <button type="button" onClick={() => set('auto_bump_enabled', !form.auto_bump_enabled)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 8px', borderRadius: 10, textAlign: 'right', cursor: 'pointer', background: form.auto_bump_enabled ? '#fffbeb' : '#f4f7fb', border: `1px solid ${form.auto_bump_enabled ? '#fcd34d' : '#dce8f5'}`, transition: 'all 0.15s' }}
          >
            <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${form.auto_bump_enabled ? '#f59e0b' : '#cbd5e1'}`, background: form.auto_bump_enabled ? '#f59e0b' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {form.auto_bump_enabled && <span style={{ color: 'white', fontSize: 10 }}>✓</span>}
            </div>
            <div style={{ textAlign: 'right', flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>⚡ העלאת מחיר אוטומטית</div>
              <div style={{ fontSize: 10, color: '#888', marginTop: 1 }}>אם המשימה לא נלקחת, המחיר יעלה כל 5 דקות</div>
            </div>
          </button>
          {form.auto_bump_enabled && (
            <div style={{ marginTop: 8, padding: '10px 8px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10 }}>
              <Label className="text-sm font-bold block" style={{ color: '#92400e', marginBottom: 6, fontSize: '11px' }}>מחיר מקסימלי (₪)</Label>
              <Input type="number" placeholder="250"
                value={form.max_price} onChange={e => set('max_price', e.target.value)}
                style={{ background: 'white', border: '1px solid #fcd34d', borderRadius: 8, height: 38, fontSize: 14, fontWeight: 700 }}
              />
            </div>
          )}
        </div>



        {/* Expiry */}
        <div style={{ background: 'white', borderRadius: 16, padding: '14px 12px', border: '1px solid #e8eef7', boxShadow: '0 1px 8px rgba(26,111,212,0.04)' }}>
          <Label className="text-sm font-bold mb-2 flex items-center gap-1" style={{ color: '#0f2b6b', fontSize: '12px' }}><Clock size={13} /> תוקף המשימה</Label>
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {EXPIRY_OPTIONS.map(opt => (
              <button key={String(opt.hours)} onClick={() => set('expiry_hours', opt.hours)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 10,
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: `1px solid ${form.expiry_hours === opt.hours ? '#1a6fd4' : '#dce8f5'}`,
                  background: form.expiry_hours === opt.hours ? 'linear-gradient(135deg, #1a6fd4, #0a52b0)' : 'white',
                  color: form.expiry_hours === opt.hours ? 'white' : '#555',
                  transition: 'all 0.15s'
                }}
              >{opt.label}</button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div style={{ background: 'white', borderRadius: 16, padding: '14px 12px', border: '1px solid #e8eef7', boxShadow: '0 1px 8px rgba(26,111,212,0.04)' }}>
          <Label className="text-sm font-bold mb-2 flex items-center gap-1" style={{ color: '#0f2b6b', fontSize: '12px' }}><MapPin size={13} /> מיקום</Label>
          <Input placeholder="כתובת (לדוגמה: רחוב דיזנגוף 50)"
            value={form.location_name} onChange={e => set('location_name', e.target.value)}
            style={{ background: '#f4f7fb', border: '1.5px solid #dce8f5', borderRadius: 10, height: 42, marginBottom: 8, fontSize: 14 }}
          />
          <Input placeholder="עיר *"
            value={form.city} onChange={e => set('city', e.target.value)}
            style={{ background: '#f4f7fb', border: '1.5px solid #dce8f5', borderRadius: 10, height: 42, fontSize: 14 }}
          />
        </div>

        {/* Time */}
        <div style={{ background: 'white', borderRadius: 16, padding: '14px 12px', border: '1px solid #e8eef7', boxShadow: '0 1px 8px rgba(26,111,212,0.04)' }}>
          <Label className="text-sm font-bold mb-2 flex items-center gap-1" style={{ color: '#0f2b6b', fontSize: '12px' }}><Clock size={13} /> זמן ביצוע משוער</Label>
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {timeOptions.map(t => (
              <button key={t} onClick={() => set('estimated_time', t)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 10,
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: `1px solid ${form.estimated_time === t ? '#1a6fd4' : '#dce8f5'}`,
                  background: form.estimated_time === t ? 'linear-gradient(135deg, #1a6fd4, #0a52b0)' : 'white',
                  color: form.estimated_time === t ? 'white' : '#555',
                  transition: 'all 0.15s'
                }}
              >{t === 'custom' ? '⌨️ מותאם' : t}</button>
            ))}
          </div>
          {form.estimated_time === 'custom' && (
            <input
              type="text"
              placeholder="לדוגמה: 3 שעות, יום שלם, שבוע..."
              value={form.custom_time || ''}
              onChange={e => set('custom_time', e.target.value)}
              style={{ marginTop: 8, width: '100%', padding: '10px 12px', borderRadius: 10, background: '#f4f7fb', border: '1.5px solid #dce8f5', fontSize: 13, outline: 'none' }}
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

        {/* Sticky Save Button */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'white',
          borderTop: '1px solid #e8eef7',
          padding: '12px 16px 20px',
          zIndex: 50,
        }}>
          <button onClick={handleSave} disabled={loading}
            style={{
              width: '100%',
              height: 54,
              borderRadius: 16,
              fontSize: 15,
              fontWeight: 900,
              color: 'white',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? 'linear-gradient(135deg, #cbd5e1, #94a3b8)' : 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
              boxShadow: loading ? 'none' : '0 6px 20px rgba(26,111,212,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s',
              opacity: loading ? 0.8 : 1,
            }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : isRepostMode ? <>פרסם ג'ובה<Zap size={18} /></> : <><Save size={18} />שמור</>}
          </button>
        </div>
      </div>

      {showPayment && <PaymentModal taskPrice={Number(form.price)} onSuccess={handlePaymentSuccess} onClose={() => { setShowPayment(false); }} />}
    </div>
  );
}