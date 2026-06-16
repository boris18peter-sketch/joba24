import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, MapPin, CreditCard, Clock, Tag, FileText, Pencil, X, Check, ImageIcon, Video } from 'lucide-react';
import SelectionSheet from '@/components/SelectionSheet';
import { toast } from 'sonner';
import { CATEGORIES } from '@/lib/categories';
import ImageUploader from '@/components/ImageUploader';
import VideoUploader from '@/components/VideoUploader';
import PriceSuggestion from '@/components/PriceSuggestion';
import BackButton from '@/components/BackButton';
import AddressAutocomplete from '@/components/AddressAutocomplete';

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'מזומן' },
  { value: 'Bit', label: 'Bit' },
  { value: 'PayBox', label: 'PayBox' },
  { value: 'Other', label: 'אחר' },
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
  const [editingField, setEditingField] = useState(null);
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
      });
    }
  }, [task]);

  const set = (key, val) => { setForm(p => ({ ...p, [key]: val })); setEditingField(null); };

  const handleSave = async () => {
    if (!form.title) { toast.error('חובה למלא כותרת'); return; }
    if (!form.description) { toast.error('חובה למלא תיאור'); return; }
    if (!form.price) { toast.error('חובה למלא מחיר'); return; }
    if (!form.location_name) { toast.error('חובה למלא מיקום'); return; }

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
      requires_invoice: form.requires_invoice,
      ...(isRepostMode ? { status: 'OPEN', worker_id: null, worker_name: null, worker_status: null } : {}),
    });
    queryClient.invalidateQueries({ queryKey: ['task', id] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['myTasksPage'] });
    setLoading(false);
    toast.success(isRepostMode ? 'ג\'ובה פורסמה מחדש!' : 'המשימה עודכנה! ✅');
    navigate(isRepostMode ? '/my-tasks' : `/task/${id}`);
  };

  if (!form) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const categoryLabel = CATEGORIES.find(c => c.value === form.category)?.label || 'אחר';

  // ── Inline editor ────────────────
  const InlineEdit = ({ field, label, children }) => (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border-1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-2)', fontSize: 11, fontWeight: 700 }}>
          {label}
        </div>
        <button onClick={() => setEditingField(editingField === field ? null : field)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: editingField === field ? '#ef4444' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}>
          {editingField === field ? <X size={13} /> : <Pencil size={13} />}
          {editingField === field ? 'ביטול' : 'ערוך'}
        </button>
      </div>
      {editingField === field ? children : (
        <div style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 500, marginTop: 4, lineHeight: 1.5 }}>
          {field === 'price' ? `₪${form.price}` :
           field === 'payment_method' ? (PAYMENT_METHODS.find(p => p.value === form.payment_method)?.label || form.payment_method || '—') :
           field === 'expiry' ? (form.expiry_hours ? `${form.expiry_hours} שעות` : 'ללא תוקף') :
           field === 'time' ? (TIME_OPTIONS.find(t => t.value === form.estimated_time)?.label || form.custom_time || '—') :
           form[field] || '—'}
        </div>
      )}
    </div>
  );

  // ── Edit content per field ────────
  const renderEditContent = (field) => {
    switch (field) {
      case 'title':
        return <input autoFocus value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && set('title', form.title)}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 12, background: 'var(--input-bg)', border: '1.5px solid var(--ring)', fontSize: 14, outline: 'none', boxSizing: 'border-box', color: 'var(--text-1)', marginTop: 6 }} />;
      case 'description':
        return <textarea autoFocus value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          rows={4} style={{ width: '100%', padding: '10px 14px', borderRadius: 12, background: 'var(--input-bg)', border: '1.5px solid var(--ring)', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box', color: 'var(--text-1)', marginTop: 6 }} />;
      case 'price':
        return <div style={{ marginTop: 6 }}>
          <input autoFocus type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 12, background: 'var(--input-bg)', border: '1.5px solid var(--ring)', fontSize: 14, outline: 'none', boxSizing: 'border-box', color: 'var(--text-1)', marginBottom: 8 }} />
          <PriceSuggestion category={form.category} estimatedTime={form.estimated_time} onAccept={p => { setForm(prev => ({ ...prev, price: String(p) })); setEditingField(null); }} />
        </div>;
      case 'location_name':
        return <div style={{ marginTop: 6 }}><AddressAutocomplete value={form.location_name} onSelect={({ location_name, city, lat, lng }) => { setForm(p => ({ ...p, location_name: location_name || p.location_name, city, lat, lng })); setEditingField(null); }} /></div>;
      case 'payment_method':
        return <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {PAYMENT_METHODS.map(pm => (
            <button key={pm.value} onClick={() => set('payment_method', pm.value)}
              style={{ padding: '10px 4px', borderRadius: 10, fontSize: 13, fontWeight: form.payment_method === pm.value ? 800 : 500, cursor: 'pointer', border: 'none', background: form.payment_method === pm.value ? '#2563EB' : 'var(--surface-3)', color: form.payment_method === pm.value ? 'white' : 'var(--text-2)' }}>
              {pm.label}
            </button>
          ))}
        </div>;
      case 'category':
        return <div style={{ marginTop: 6 }}><SelectionSheet value={form.category} options={CATEGORIES.map(c => ({ value: c.value, label: c.label }))} onChange={val => set('category', val)} /></div>;
      case 'time':
        return <div style={{ marginTop: 6 }}><SelectionSheet value={form.estimated_time} options={TIME_OPTIONS} onChange={val => set('estimated_time', val)} /></div>;
      case 'expiry':
        return <div style={{ marginTop: 6 }}><SelectionSheet value={form.expiry_hours === null ? 'null' : String(form.expiry_hours)}
          options={[{ value: 'null', label: 'ללא תוקף' }, { value: '0.5', label: '30 דק׳' }, { value: '1', label: 'שעה' }, { value: '2', label: 'שעתיים' }, { value: '4', label: '4 שעות' }, { value: '6', label: '6 שעות' }, { value: '24', label: 'יום' }, { value: '48', label: 'יומיים' }, { value: '168', label: 'שבוע' }]}
          onChange={v => set('expiry_hours', v === 'null' ? null : parseFloat(v))} /></div>;
      case 'auto_bump':
        return <div style={{ marginTop: 6 }}>
          <button onClick={() => setForm(p => ({ ...p, auto_bump_enabled: !p.auto_bump_enabled }))} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, width: '100%', cursor: 'pointer', background: form.auto_bump_enabled ? '#fffbeb' : 'var(--surface-3)', border: `1.5px solid ${form.auto_bump_enabled ? '#fcd34d' : 'var(--border-1)'}`, textAlign: 'right', fontSize: 13, fontWeight: 700, color: form.auto_bump_enabled ? '#92400e' : 'var(--text-2)' }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${form.auto_bump_enabled ? '#f59e0b' : '#94a3b8'}`, background: form.auto_bump_enabled ? '#f59e0b' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {form.auto_bump_enabled && <span style={{ color: 'white', fontSize: 10 }}>✓</span>}
            </div>
            📈 העלאת מחיר אוטומטית
          </button>
          {form.auto_bump_enabled && (
            <input type="number" placeholder="מחיר מקסימלי" value={form.max_price} onChange={e => setForm(p => ({ ...p, max_price: e.target.value }))}
              style={{ width: '100%', marginTop: 8, padding: '10px 14px', borderRadius: 12, background: '#fffbeb', border: '1.5px solid #fcd34d', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontWeight: 700, color: '#92400e' }} />
          )}
        </div>;
      case 'invoice':
        return <div style={{ marginTop: 6 }}>
          <button onClick={() => setForm(p => ({ ...p, requires_invoice: !p.requires_invoice }))}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, cursor: 'pointer', background: form.requires_invoice ? '#f0fdf4' : 'var(--surface-3)', border: `1.5px solid ${form.requires_invoice ? '#bbf7d0' : 'var(--border-1)'}`, fontSize: 13, fontWeight: 700, color: form.requires_invoice ? '#166534' : 'var(--text-2)' }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${form.requires_invoice ? '#16a34a' : '#94a3b8'}`, background: form.requires_invoice ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {form.requires_invoice && <span style={{ color: 'white', fontSize: 10 }}>✓</span>}
            </div>
            🧾 דורש חשבונית מס
          </button>
        </div>;
      case 'media':
        return <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>תמונות</div>
            <ImageUploader images={form.images} onChange={imgs => setForm(p => ({ ...p, images: imgs }))} /></div>
          <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>סרטון</div>
            <VideoUploader videoUrl={form.video_url} onChange={url => setForm(p => ({ ...p, video_url: url }))} /></div>
        </div>;
      default: return null;
    }
  };

  // ── Confirm button for each field ──
  const EditActions = ({ field }) => (
    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
      <button onClick={() => set(field, form[field])} className="btn-tap" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 10, background: '#059669', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
        <Check size={12} /> שמור
      </button>
      <button onClick={() => setEditingField(null)} className="btn-tap" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 10, background: 'var(--surface-3)', color: 'var(--text-2)', border: '1px solid var(--border-1)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
        <X size={12} /> בטל
      </button>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-1)' }} dir="rtl">
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
          <BackButton style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)', boxShadow: 'none' }} iconColor="white" />
          <span style={{ fontWeight: 800, fontSize: 17, color: 'white', flex: 1 }}>
            {isRepostMode ? 'פרסם שוב' : 'מפרט המשימה'}
          </span>
        </div>
      </div>

      {/* Document body */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 100 }}>
        
        {/* Status & Meta */}
        <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag size={16} color="#94a3b8" />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>קטגוריה</span>
            </div>
            <button onClick={() => setEditingField(editingField === 'category' ? null : 'category')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <Pencil size={13} color="#94a3b8" />
            </button>
          </div>
          {editingField === 'category' ? (
            <>{renderEditContent('category')}<EditActions field="category" /></>
          ) : (
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)', marginTop: 4 }}>{categoryLabel}</div>
          )}
        </div>

        {/* Title */}
        <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
          <InlineEdit field="title" label={<><FileText size={12} /> כותרת</>} />
          {renderEditContent('title')}
          {editingField === 'title' && <EditActions field="title" />}
        </div>

        {/* Description */}
        <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
          <InlineEdit field="description" label={<>📝 תיאור מפורט</>} />
          {renderEditContent('description')}
          {editingField === 'description' && <EditActions field="description" />}
        </div>

        {/* Price */}
        <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
          <InlineEdit field="price" label={<>💰 מחיר</>} />
          {renderEditContent('price')}
          {editingField === 'price' && <EditActions field="price" />}
          {editingField === 'auto_bump' && renderEditContent('auto_bump')}
        </div>

        {/* Location */}
        <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
          <InlineEdit field="location_name" label={<><MapPin size={12} /> כתובת</>} />
          {renderEditContent('location_name')}
          {editingField === 'location_name' && <EditActions field="location_name" />}
        </div>

        {/* Payment */}
        <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
          <InlineEdit field="payment_method" label={<><CreditCard size={12} /> אמצעי תשלום</>} />
          {renderEditContent('payment_method')}
          {editingField === 'payment_method' && <EditActions field="payment_method" />}
        </div>

        {/* Time */}
        <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
          <InlineEdit field="time" label={<><Clock size={12} /> זמן משוער</>} />
          {renderEditContent('time')}
          {editingField === 'time' && <EditActions field="time" />}
        </div>

        {/* Expiry */}
        <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
          <InlineEdit field="expiry" label={<>⏰ תוקף</>} />
          {renderEditContent('expiry')}
          {editingField === 'expiry' && <EditActions field="expiry" />}
        </div>

        {/* Boost */}
        <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
              📈 העלאת מחיר אוטומטית
            </div>
            <button onClick={() => setEditingField(editingField === 'auto_bump' ? null : 'auto_bump')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <Pencil size={13} color="#94a3b8" />
            </button>
          </div>
          <div style={{ fontSize: 14, color: form.auto_bump_enabled ? '#92400e' : 'var(--text-2)', fontWeight: 500, marginTop: 4 }}>
            {form.auto_bump_enabled ? `פעיל — מקסימום ₪${form.max_price || '—'}` : 'לא פעיל'}
          </div>
          {editingField === 'auto_bump' && renderEditContent('auto_bump')}
        </div>

        {/* Invoice */}
        <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
              🧾 חשבונית מס
            </div>
            <button onClick={() => setEditingField(editingField === 'invoice' ? null : 'invoice')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <Pencil size={13} color="#94a3b8" />
            </button>
          </div>
          <div style={{ fontSize: 14, color: form.requires_invoice ? '#166534' : 'var(--text-2)', fontWeight: 500, marginTop: 4 }}>
            {form.requires_invoice ? 'המשימה דורשת חשבונית מס' : 'לא נדרש'}
          </div>
          {editingField === 'invoice' && renderEditContent('invoice')}
        </div>

        {/* Media */}
        <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ImageIcon size={12} /> מדיה
            </div>
            <button onClick={() => setEditingField(editingField === 'media' ? null : 'media')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <Pencil size={13} color="#94a3b8" />
            </button>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
            {form.images?.length > 0 && `${form.images.length} תמונות`}
            {form.images?.length > 0 && form.video_url && ' • '}
            {form.video_url && '🎬 סרטון'}
            {!form.images?.length && !form.video_url && 'ללא מדיה'}
          </div>
          {editingField === 'media' && renderEditContent('media')}
        </div>

        {/* Save button */}
        <div style={{ position: 'sticky', bottom: 16, background: 'var(--surface-1)', padding: '0 0 8px' }}>
          <button onClick={handleSave} disabled={loading}
            style={{ width: '100%', height: 56, borderRadius: 18, background: loading ? '#94a3b8' : 'linear-gradient(135deg,#059669,#047857)', color: 'white', fontWeight: 900, fontSize: 16, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 28px rgba(5,150,105,0.35)' }}>
            {loading ? <Loader2 size={20} className="animate-spin" /> : <><Save size={18} /> שמור שינויים</>}
          </button>
        </div>
      </div>
    </div>
  );
}