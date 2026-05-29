import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Clock, Loader2, Save, CheckSquare, Info, MapPin } from 'lucide-react';
import CategoryExtraFields from '@/components/CategoryExtraFields';
import { toast } from 'sonner';
import { CATEGORIES } from '@/lib/categories';
import ImageUploader from '@/components/ImageUploader';
import VideoUploader from '@/components/VideoUploader';
import PriceSuggestion from '@/components/PriceSuggestion';
import PaymentModal from '@/components/PaymentModal';
import BackButton from '@/components/BackButton';
import AddressAutocomplete from '@/components/AddressAutocomplete';

const timeOptions = ['15m', '30m', '1h', '2h', 'custom'];
const EXPIRY_OPTIONS = [
  { label: 'ללא תוקף', hours: null },
  { label: '6 שעות', hours: 6 },
  { label: 'יום', hours: 24 },
  { label: '2 ימים', hours: 48 },
  { label: 'שבוע', hours: 168 },
];
const PAYMENT_METHODS = [
  { value: 'Cash', label: '💵 מזומן' },
  { value: 'Bit', label: '📱 Bit' },
  { value: 'PayBox', label: '📲 PayBox' },
  { value: 'Other', label: '💰 אחר' },
];

function SectionCard({ children }) {
  return (
    <div style={{ background: 'white', borderRadius: 20, padding: '18px 16px', border: '1px solid #dce8f5', boxShadow: '0 2px 12px rgba(26,111,212,0.06)' }}>
      {children}
    </div>
  );
}

export default function EditTask() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [extraFieldsText, setExtraFieldsText] = useState('');
  const isRepostMode = location.state?.repostMode;

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: task } = useQuery({
    queryKey: ['task', id],
    queryFn: () => base44.entities.Task.filter({ id }),
    select: d => d[0],
  });

  const { data: taskApplications = [] } = useQuery({
    queryKey: ['applications', id],
    queryFn: () => base44.entities.TaskApplication.filter({ task_id: id }),
    enabled: !!id,
  });

  const hasActiveApplications = taskApplications.some(a => a.status === 'pending' || a.status === 'approved');

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
        lat: task.lat || null,
        lng: task.lng || null,
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
        payment_method: task.payment_method || '',
      });
      setAddressConfirmed(!!(task.lat && task.lng));
    }
  }, [task]);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const setReq = (key, val) => setForm(p => ({ ...p, requirements: { ...p.requirements, [key]: val } }));

  const activeBtn = { background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: 'white', border: '1px solid #1a6fd4' };
  const inactiveBtn = { background: 'white', color: '#555', border: '1px solid #dce8f5' };

  const handleSave = async () => {
    if (!form.title) { toast.error('חובה למלא כותרת'); return; }
    if (!form.description) { toast.error('חובה למלא תיאור מפורט'); return; }
    if (!form.price) { toast.error('חובה למלא מחיר'); return; }
    if (!form.location_name) { toast.error('חובה למלא מיקום'); return; }
    if (me?.id !== task?.client_id) { toast.error('אין לך הרשאה לערוך משימה זו'); return; }

    setLoading(true);
    const estimatedTime = form.estimated_time === 'custom' ? (form.custom_time || 'custom') : form.estimated_time;
    const expires = form.expiry_hours ? new Date(Date.now() + form.expiry_hours * 60 * 60 * 1000).toISOString() : null;
    const finalDescription = extraFieldsText
      ? (form.description ? form.description + '\n\n' + extraFieldsText : extraFieldsText)
      : form.description;

    await base44.entities.Task.update(id, {
      title: form.title,
      description: finalDescription,
      price: Number(form.price),
      max_price: form.auto_bump_enabled && form.max_price ? Number(form.max_price) : undefined,
      auto_bump_enabled: form.auto_bump_enabled,
      location_name: form.location_name,
      city: form.city,
      lat: form.lat || undefined,
      lng: form.lng || undefined,
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
      payment_method: form.payment_method || undefined,
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
      location_name: form.location_name,
      city: form.city,
      lat: form.lat || undefined,
      lng: form.lng || undefined,
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
    <div className="min-h-screen" style={{ background: '#f4f7fb' }} dir="rtl">
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px 14px' }}>
          <BackButton style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)', boxShadow: 'none' }} iconColor="white" />
          <span style={{ fontWeight: 800, fontSize: 17, color: 'white', flex: 1 }}>
            {isRepostMode ? '🔄 פרסם שוב' : '✏️ עריכת משימה'}
          </span>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 40 }}>
        {/* Info banner */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 16, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Info size={16} color="#1a6fd4" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: '#1e40af', margin: 0, lineHeight: 1.6 }}>
            <strong>חשוב!</strong> ככל שהמשימה מפורטת יותר — כך תקבל match מדויק יותר עם עובד מתאים.
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

        {/* Category Extra Fields */}
        <CategoryExtraFields
          key={form.category}
          category={form.category}
          originLat={form.lat}
          originLng={form.lng}
          onChange={(_data, text) => setExtraFieldsText(text)}
        />

        {/* Title + Description */}
        <SectionCard>
          <Label className="text-sm font-bold mb-2 block" style={{ color: '#0f2b6b' }}>מה צריך לעשות? *</Label>
          <Input
            placeholder="לדוגמה: להרים מקרר לקומה שלישית"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            style={{ background: '#f4f7fb', border: '1.5px solid #dce8f5', borderRadius: 12, height: 48, fontSize: 15, marginBottom: 14 }}
          />
          <Label className="text-sm font-bold mb-2 block" style={{ color: '#0f2b6b' }}>תיאור מפורט *</Label>
          <Textarea
            placeholder="תאר את המשימה בפירוט: מה בדיוק צריך לעשות, מה הציפיות, מה יש במקום..."
            value={form.description}
            onChange={e => set('description', e.target.value)}
            style={{ background: '#f4f7fb', border: '1.5px solid #dce8f5', borderRadius: 12, resize: 'none' }}
            rows={4}
          />
        </SectionCard>

        {/* Images + Video */}
        <SectionCard>
          <Label className="text-sm font-bold mb-2 block" style={{ color: '#0f2b6b' }}>תמונות (עד 4)</Label>
          <ImageUploader images={form.images} onChange={imgs => set('images', imgs)} />
          <div style={{ marginTop: 14 }}>
            <Label className="text-sm font-bold mb-2 block" style={{ color: '#0f2b6b' }}>סרטון (אופציונלי)</Label>
            <VideoUploader videoUrl={form.video_url} onChange={url => set('video_url', url)} />
          </div>
        </SectionCard>

        {/* Price */}
        <SectionCard>
          <Label className="text-sm font-bold mb-2 block" style={{ color: '#0f2b6b' }}>מחיר (₪) *</Label>
          <Input
            type="number"
            placeholder="100"
            value={form.price}
            onChange={e => hasActiveApplications ? null : set('price', e.target.value)}
            disabled={hasActiveApplications}
            style={{ background: '#f4f7fb', border: '1.5px solid #dce8f5', borderRadius: 12, height: 48, fontSize: 18, fontWeight: 800, marginBottom: 8, opacity: hasActiveApplications ? 0.5 : 1 }}
          />
          {hasActiveApplications && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 6 }}>⛔ לא ניתן לשנות מחיר — קיימות בקשות פעילות</p>}
          {!hasActiveApplications && <PriceSuggestion category={form.category} estimatedTime={form.estimated_time} onAccept={p => set('price', String(p))} />}

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
            <Clock size={14} /> תוקף המשימה
          </Label>
          <div className="flex gap-2 flex-wrap">
            {EXPIRY_OPTIONS.map(opt => (
              <button key={String(opt.hours)} onClick={() => set('expiry_hours', opt.hours)}
                style={{ padding: '8px 16px', borderRadius: 24, fontSize: 13, fontWeight: 600, cursor: 'pointer', ...(form.expiry_hours === opt.hours ? activeBtn : inactiveBtn) }}
              >{opt.label}</button>
            ))}
          </div>
        </SectionCard>

        {/* Location */}
        <SectionCard>
          <Label className="text-sm font-bold mb-2 flex items-center gap-1" style={{ color: '#0f2b6b' }}>
            <MapPin size={14} /> מיקום *
          </Label>
          <AddressAutocomplete
            value={form.location_name}
            onSelect={({ location_name, city, lat, lng }) => {
              if (location_name) {
                set('location_name', location_name);
                set('city', city);
                set('lat', lat);
                set('lng', lng);
                setAddressConfirmed(true);
              } else {
                setAddressConfirmed(false);
              }
            }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            <div>
              <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>בניין / מספר בית</p>
              <Input placeholder="12" value={form.address_building || ''} onChange={e => set('address_building', e.target.value)}
                style={{ background: '#f4f7fb', border: '1.5px solid #dce8f5', borderRadius: 12, height: 42 }} />
            </div>
            <div>
              <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>קומה</p>
              <Input placeholder="3" value={form.address_floor || ''} onChange={e => set('address_floor', e.target.value)}
                style={{ background: '#f4f7fb', border: '1.5px solid #dce8f5', borderRadius: 12, height: 42 }} />
            </div>
            <div>
              <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>דירה</p>
              <Input placeholder="5" value={form.address_apartment || ''} onChange={e => set('address_apartment', e.target.value)}
                style={{ background: '#f4f7fb', border: '1.5px solid #dce8f5', borderRadius: 12, height: 42 }} />
            </div>
            <div>
              <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>הערות ניווט</p>
              <Input placeholder="כניסה אחורית" value={form.address_notes || ''} onChange={e => set('address_notes', e.target.value)}
                style={{ background: '#f4f7fb', border: '1.5px solid #dce8f5', borderRadius: 12, height: 42 }} />
            </div>
          </div>
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
              value={form.custom_time || ''} onChange={e => set('custom_time', e.target.value)}
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
          </div>
        </SectionCard>

        {/* Payment Method */}
        <SectionCard>
          <Label className="text-sm font-bold mb-3 block" style={{ color: '#0f2b6b' }}>💳 אמצעי תשלום</Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {PAYMENT_METHODS.map(pm => (
              <button key={pm.value} onClick={() => set('payment_method', pm.value)}
                style={{ padding: '12px 8px', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', ...(form.payment_method === pm.value ? activeBtn : inactiveBtn) }}
              >{pm.label}</button>
            ))}
          </div>
        </SectionCard>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={loading}
          style={{ width: '100%', height: 58, borderRadius: 18, background: loading ? '#94a3b8' : 'linear-gradient(135deg,#059669,#047857)', color: 'white', fontWeight: 900, fontSize: 16, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 28px rgba(5,150,105,0.35)' }}
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : <><Save size={18} /> {isRepostMode ? 'שמור ופרסם' : 'שמור שינויים'}</>}
        </button>
      </div>

      {showPayment && <PaymentModal amount={Number(form.price)} onSuccess={handlePaymentSuccess} onCancel={() => setShowPayment(false)} closeOnBackdropClick={false} />}
    </div>
  );
}