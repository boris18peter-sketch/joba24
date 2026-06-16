import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Zap, MapPin, CreditCard, Clock, Tag, ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORIES } from '@/lib/categories';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import ImageUploader from '@/components/ImageUploader';
import VideoUploader from '@/components/VideoUploader';
import PriceSuggestion from '@/components/PriceSuggestion';
import SelectionSheet from '@/components/SelectionSheet';
import BackButton from '@/components/BackButton';

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'מזומן' }, { value: 'Bit', label: 'Bit' },
  { value: 'PayBox', label: 'PayBox' }, { value: 'Other', label: 'אחר' },
];
const TIME_OPTIONS = [
  { value: '15m', label: '15 דקות' }, { value: '30m', label: '30 דקות' },
  { value: '1h', label: 'שעה' }, { value: '2h', label: 'שעתיים' },
  { value: '3h', label: '3 שעות' }, { value: '4h', label: '4 שעות' },
  { value: '6h', label: '6 שעות' }, { value: 'day', label: 'יום' },
  { value: 'week', label: 'שבוע' }, { value: 'custom', label: 'אחר' },
];

export default function EditTask() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(null);
  const isRepostMode = location.state?.repostMode;

  const { data: task } = useQuery({
    queryKey: ['task', id],
    queryFn: () => base44.entities.Task.filter({ id }),
    select: d => d[0],
  });

  useEffect(() => {
    if (task && !form) {
      const isCustomTime = task.estimated_time && !['15m', '30m', '1h', '2h', '3h', '4h', '6h', 'day', 'week'].includes(task.estimated_time);
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
        expiry_hours: task.expiry_duration_hours || null,
        images: task.images || [],
        video_url: task.video_url || '',
        requirements: task.requirements || {},
        payment_method: task.payment_method || '',
        requires_invoice: task.requires_invoice || false,
        is_story: task.is_story || false,
      });
    }
  }, [task]);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleAddressSelect = ({ location_name, city, lat, lng }) => {
    if (location_name) setForm(p => ({ ...p, location_name, city: city || '', lat, lng }));
  };

  const handleSave = async () => {
    if (!form.title || !form.description || !form.price || !form.location_name || !form.payment_method) {
      toast.error('חובה למלא כותרת, תיאור, מחיר, כתובת ואמצעי תשלום');
      return;
    }
    setLoading(true);
    const estimatedTime = form.estimated_time === 'custom' ? (form.custom_time || 'custom') : form.estimated_time;
    const expires = form.expiry_hours ? new Date(Date.now() + form.expiry_hours * 60 * 60 * 1000).toISOString() : null;

    await base44.entities.Task.update(id, {
      title: form.title, description: form.description,
      price: Number(form.price),
      max_price: form.auto_bump_enabled && form.max_price ? Number(form.max_price) : undefined,
      auto_bump_enabled: form.auto_bump_enabled,
      location_name: form.location_name, city: form.city,
      lat: form.lat || undefined, lng: form.lng || undefined,
      address_building: form.address_building || undefined,
      address_floor: form.address_floor || undefined,
      address_apartment: form.address_apartment || undefined,
      address_notes: form.address_notes || undefined,
      estimated_time: estimatedTime, category: form.category,
      expiry_duration_hours: form.expiry_hours, expires_at: expires,
      images: form.images, video_url: form.video_url || undefined,
      requirements: form.requirements, payment_method: form.payment_method,
      requires_invoice: form.requires_invoice,
      ...(isRepostMode ? { status: 'OPEN', worker_id: null, worker_name: null, worker_status: null } : {}),
    });
    queryClient.invalidateQueries({ queryKey: ['task', id] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['myTasksPage'] });
    queryClient.invalidateQueries({ queryKey: ['myTasks'] });
    setLoading(false);
    toast.success(isRepostMode ? 'ג\'ובה פורסמה מחדש!' : 'המשימה עודכנה! ✅');
    navigate(isRepostMode ? '/my-tasks' : `/task/${id}`);
  };

  const lab = (text, icon) => (
    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>{icon}{text}</div>
  );
  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: 12,
    background: 'var(--input-bg)', border: '1.5px solid var(--border-1)',
    fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
    color: 'var(--text-1)',
  };

  if (!form) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-1)' }} dir="rtl">
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
          <BackButton style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)', boxShadow: 'none' }} iconColor="white" />
          <span style={{ fontWeight: 800, fontSize: 17, color: 'white', flex: 1 }}>
            {isRepostMode ? 'פרסם שוב' : 'עריכת משימה'}
          </span>
        </div>
      </div>

      {/* Form body */}
      <div className="overflow-y-auto px-4 py-3" style={{ paddingBottom: 100 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Title */}
          <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-1)', padding: 12 }}>
            {lab('📝 כותרת')}
            <input value={form.title} onChange={e => set('title', e.target.value)} style={inputStyle} />
          </div>

          {/* Description */}
          <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-1)', padding: 12 }}>
            {lab('📄 תיאור מפורט')}
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} />
          </div>

          {/* Price + Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-1)', padding: 12 }}>
              {lab('💰 מחיר (₪)')}
              <input type="number" value={form.price} onChange={e => set('price', e.target.value)} style={inputStyle} />
              <div style={{ marginTop: 6 }}>
                <PriceSuggestion category={form.category} estimatedTime={form.estimated_time} onAccept={p => set('price', String(p))} />
              </div>
            </div>
            <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-1)', padding: 12 }}>
              {lab('קטגוריה', <Tag size={12} />)}
              <SelectionSheet value={form.category} options={CATEGORIES.map(c => ({ value: c.value, label: c.label }))} onChange={val => set('category', val)} />
            </div>
          </div>

          {/* Location */}
          <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-1)', padding: 12 }}>
            {lab('כתובת', <MapPin size={12} />)}
            <AddressAutocomplete value={form.location_name || ''} onSelect={handleAddressSelect} />
            {form.location_name && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
                <input value={form.address_building} onChange={e => set('address_building', e.target.value)} placeholder="מספר בניין" style={{ ...inputStyle, padding: '10px 12px', fontSize: 13 }} />
                <input value={form.address_floor} onChange={e => set('address_floor', e.target.value)} placeholder="קומה" style={{ ...inputStyle, padding: '10px 12px', fontSize: 13 }} />
                <input value={form.address_apartment} onChange={e => set('address_apartment', e.target.value)} placeholder="דירה" style={{ ...inputStyle, padding: '10px 12px', fontSize: 13 }} />
                <input value={form.address_notes} onChange={e => set('address_notes', e.target.value)} placeholder="הערות" style={{ ...inputStyle, padding: '10px 12px', fontSize: 13 }} />
              </div>
            )}
          </div>

          {/* Payment + Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-1)', padding: 12 }}>
              {lab('אמצעי תשלום', <CreditCard size={12} />)}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                {PAYMENT_METHODS.map(pm => (
                  <button key={pm.value} onClick={() => set('payment_method', pm.value)}
                    style={{
                      padding: '10px 4px', borderRadius: 10, fontSize: 12,
                      fontWeight: form.payment_method === pm.value ? 800 : 500,
                      cursor: 'pointer', border: 'none',
                      background: form.payment_method === pm.value ? '#2563EB' : 'var(--surface-3)',
                      color: form.payment_method === pm.value ? 'white' : 'var(--text-2)',
                    }}>{pm.label}</button>
                ))}
              </div>
            </div>
            <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-1)', padding: 12 }}>
              {lab('זמן משוער', <Clock size={12} />)}
              <SelectionSheet value={form.estimated_time} options={TIME_OPTIONS} onChange={val => set('estimated_time', val)} />
            </div>
          </div>

          {/* Extras */}
          <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-1)', padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>🎯 תוספות</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => set('auto_bump_enabled', !form.auto_bump_enabled)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 700, textAlign: 'right',
                  background: form.auto_bump_enabled ? '#fffbeb' : 'var(--surface-3)',
                  border: `1.5px solid ${form.auto_bump_enabled ? '#fcd34d' : 'var(--border-1)'}`,
                  color: form.auto_bump_enabled ? '#92400e' : 'var(--text-2)' }}>
                <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${form.auto_bump_enabled ? '#f59e0b' : '#94a3b8'}`, background: form.auto_bump_enabled ? '#f59e0b' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {form.auto_bump_enabled && <span style={{ color: 'white', fontSize: 10 }}>✓</span>}
                </div>
                📈 העלאת מחיר אוטומטית
              </button>
              {form.auto_bump_enabled && (
                <input type="number" placeholder="מחיר מקסימלי" value={form.max_price} onChange={e => set('max_price', e.target.value)}
                  style={{ ...inputStyle, marginLeft: 26, width: 'calc(100% - 26px)' }} />
              )}
              <button onClick={() => set('requires_invoice', !form.requires_invoice)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 700, textAlign: 'right',
                  background: form.requires_invoice ? '#f0fdf4' : 'var(--surface-3)',
                  border: `1.5px solid ${form.requires_invoice ? '#bbf7d0' : 'var(--border-1)'}`,
                  color: form.requires_invoice ? '#166534' : 'var(--text-2)' }}>
                <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${form.requires_invoice ? '#16a34a' : '#94a3b8'}`, background: form.requires_invoice ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {form.requires_invoice && <span style={{ color: 'white', fontSize: 10 }}>✓</span>}
                </div>
                🧾 דורש חשבונית מס
              </button>
            </div>
          </div>

          {/* Media */}
          <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-1)', padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
              <ImageIcon size={12} /> תמונות
            </div>
            <ImageUploader images={form.images} onChange={imgs => set('images', imgs)} />
          </div>

          <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-1)', padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>🎬 סרטון</div>
            <VideoUploader videoUrl={form.video_url} onChange={url => set('video_url', url)} />
          </div>

          {/* Save */}
          <button onClick={handleSave} disabled={loading}
            style={{
              width: '100%', height: 56, borderRadius: 18,
              background: loading ? '#94a3b8' : 'linear-gradient(135deg,#059669,#047857)',
              color: 'white', fontWeight: 900, fontSize: 16, border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 8px 28px rgba(5,150,105,0.35)',
            }}>
            {loading ? <Loader2 size={20} className="animate-spin" /> : <><Save size={18} /> שמור שינויים</>}
          </button>
        </div>
      </div>
    </div>
  );
}