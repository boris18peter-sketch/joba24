import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Sparkles, Clock, DollarSign, Zap, ArrowUpDown, CreditCard } from 'lucide-react';

const URGENCY_FILTER_TAGS = [
  { value: 'immediate', label: 'דחוף עכשיו' },
  { value: 'few_hours', label: 'שעות הקרובות' },
  { value: 'evening',   label: 'לקראת הערב' },
  { value: 'flexible',  label: 'לא לחוץ' },
];

const timeOptions = [
  { value: '15m', label: '15 דק׳' },
  { value: '30m', label: '30 דק׳' },
  { value: '1h',  label: 'שעה' },
  { value: '2h',  label: '2 שעות' },
];

const cities = ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'ראשון לציון', 'פתח תקווה', 'נתניה', 'הרצליה', 'חולון', 'בת ים'];

const PRICE_OPTIONS = [
  { label: 'הכל',     min: '', max: '' },
  { label: 'עד ₪100', min: '', max: '100' },
  { label: '₪100–300', min: '100', max: '300' },
  { label: '₪300–600', min: '300', max: '600' },
  { label: '₪600+',   min: '600', max: '' },
];

const PAYMENT_METHODS = [
  { value: 'Cash',   label: 'מזומן' },
  { value: 'Bit',    label: 'ביט' },
  { value: 'PayBox', label: 'PayBox' },
];

const SORT_OPTIONS = [
  { val: '',           label: 'רלוונטי' },
  { val: 'newest',     label: 'חדשות' },
  { val: 'price_desc', label: 'מחיר גבוה' },
  { val: 'price_asc',  label: 'מחיר נמוך' },
];

// Chip — grid-aware, full width of its cell
function Chip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '9px 4px',
        borderRadius: 10,
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        transition: 'all 0.15s',
        border: 'none',
        background: active ? '#2563EB' : '#F1F5F9',
        color: active ? 'white' : '#475569',
        boxShadow: active ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {label}
    </button>
  );
}

function SectionLabel({ icon: Icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
      {Icon && <Icon size={14} color="#94a3b8" strokeWidth={1.8} />}
      <span style={{ fontSize: 13, fontWeight: 700, color: '#334155', letterSpacing: -0.1 }}>{children}</span>
    </div>
  );
}

export default function FilterSheet({ open, onClose, filters, onApply, hasForYou = false }) {
  const [local, setLocal] = useState({
    minPrice: '', maxPrice: '', time: '', city: '',
    approvalMode: '', sortBy: '', urgency_tag: '',
    payment_method: '', forYou: false,
    ...filters,
  });

  const activePriceOption = PRICE_OPTIONS.find(o => o.min === (local.minPrice || '') && o.max === (local.maxPrice || '')) || null;

  const handleApply = () => { onApply(local); onClose(); };
  const handleReset = () => {
    const reset = { minPrice: '', maxPrice: '', time: '', city: '', approvalMode: '', sortBy: '', category: '', urgency_tag: '', payment_method: '', forYou: false };
    setLocal(reset); onApply(reset); onClose();
  };

  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(5,15,40,0.65)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(6px)',
        touchAction: 'none',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        dir="rtl"
        style={{
          background: 'white',
          borderRadius: '28px 28px 0 0',
          width: '100%',
          maxWidth: 480,
          maxHeight: '90dvh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -16px 60px rgba(0,0,0,0.22)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle + Header */}
        <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: '#e2e8f0', margin: '0 auto 14px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>פילטרים</div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: '#f1f5f9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={15} color="#64748b" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 22, overscrollBehavior: 'contain' }}>

          {/* For You */}
          {hasForYou && (
            <div
              style={{
                background: local.forYou ? '#fffbeb' : '#fafafa',
                border: `1.5px solid ${local.forYou ? '#f59e0b' : '#e2e8f0'}`,
                borderRadius: 14, padding: '13px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer',
              }}
              onClick={() => setLocal(p => ({ ...p, forYou: !p.forYou }))}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: local.forYou ? 'linear-gradient(135deg,#f59e0b,#d97706)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={16} color={local.forYou ? 'white' : '#94a3b8'} strokeWidth={1.8} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: local.forYou ? '#92400e' : '#334155' }}>For You</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>משימות שהמערכת לומדת שמתאימות לך</div>
                </div>
              </div>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: local.forYou ? '#f59e0b' : '#e2e8f0',
                border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>
                {local.forYou && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />}
              </div>
            </div>
          )}

          {/* Price — 3-col grid (skip "הכל" as separate row) */}
          <div>
            <SectionLabel icon={DollarSign}>טווח שכר</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
              {PRICE_OPTIONS.map(opt => (
                <Chip key={opt.label} label={opt.label}
                  active={activePriceOption?.label === opt.label}
                  onClick={() => setLocal(p => ({ ...p, minPrice: opt.min, maxPrice: opt.max }))}
                />
              ))}
            </div>
          </div>

          {/* Time — 4-col grid */}
          <div>
            <SectionLabel icon={Clock}>זמן ביצוע</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
              {timeOptions.map(t => (
                <Chip key={t.value} label={t.label}
                  active={local.time === t.value}
                  onClick={() => setLocal(p => ({ ...p, time: p.time === t.value ? '' : t.value }))}
                />
              ))}
            </div>
          </div>

          {/* Urgency — 2-col grid */}
          <div>
            <SectionLabel icon={Zap}>דחיפות המשימה</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 7 }}>
              {URGENCY_FILTER_TAGS.map(tag => (
                <Chip key={tag.value} label={tag.label}
                  active={local.urgency_tag === tag.value}
                  onClick={() => setLocal(p => ({ ...p, urgency_tag: p.urgency_tag === tag.value ? '' : tag.value }))}
                />
              ))}
            </div>
          </div>

          {/* Payment method — 3-col grid */}
          <div>
            <SectionLabel icon={CreditCard}>אמצעי תשלום</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
              {PAYMENT_METHODS.map(pm => (
                <Chip key={pm.value} label={pm.label}
                  active={local.payment_method === pm.value}
                  onClick={() => setLocal(p => ({ ...p, payment_method: p.payment_method === pm.value ? '' : pm.value }))}
                />
              ))}
            </div>
          </div>

          {/* Sort — 3-col + 1 row */}
          <div>
            <SectionLabel icon={ArrowUpDown}>סינון ומיון</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
              {SORT_OPTIONS.map(opt => (
                <Chip key={opt.val} label={opt.label}
                  active={local.sortBy === opt.val}
                  onClick={() => setLocal(p => ({ ...p, sortBy: opt.val }))}
                />
              ))}
            </div>
          </div>

          {/* City */}
          <div>
            <SectionLabel icon={MapPin}>מיקום</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7, marginBottom: 10 }}>
              {cities.map(c => (
                <Chip key={c} label={c}
                  active={local.city === c}
                  onClick={() => setLocal(p => ({ ...p, city: p.city === c ? '' : c }))}
                />
              ))}
            </div>
            <input
              placeholder="עיר אחרת..."
              value={!cities.includes(local.city) ? local.city : ''}
              onChange={e => setLocal(p => ({ ...p, city: e.target.value }))}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 16, outline: 'none', boxSizing: 'border-box', color: '#334155' }}
            />
          </div>

        </div>

        {/* Sticky Footer */}
        <div style={{
          padding: '12px 20px',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid #f1f5f9',
        }}>
          {/* Reset — text button */}
          <button onClick={handleReset}
            style={{ flexShrink: 0, height: 48, padding: '0 16px', borderRadius: 12, background: 'none', border: 'none', color: '#64748b', fontWeight: 600, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            נקה הכל
          </button>
          {/* Apply — full remaining width */}
          <button onClick={handleApply}
            style={{ flex: 1, height: 48, borderRadius: 12, background: '#2563EB', color: 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
          >
            החל פילטרים
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}