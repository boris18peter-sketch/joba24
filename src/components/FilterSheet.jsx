import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin } from 'lucide-react';

const timeOptions = ['15m', '30m', '1h', '2h'];
const cities = ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'ראשון לציון', 'פתח תקווה', 'נתניה', 'הרצליה'];

const PRICE_OPTIONS = [
  { label: 'הכל', min: '', max: '' },
  { label: 'עד ₪100', min: '', max: '100' },
  { label: '₪100–300', min: '100', max: '300' },
  { label: '₪300–600', min: '300', max: '600' },
  { label: '₪600+', min: '600', max: '' },
];

function Chip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
        cursor: 'pointer', transition: 'all 0.15s',
        background: active ? '#1a6fd4' : 'white',
        color: active ? 'white' : '#555',
        border: active ? '1px solid #1a6fd4' : '1px solid #dce8f5',
        flexShrink: 0,
      }}
    >{label}</button>
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 800, color: '#0f2b6b', marginBottom: 10 }}>{children}</div>;
}

export default function FilterSheet({ open, onClose, filters, onApply }) {
  const [local, setLocal] = useState({ minPrice: '', maxPrice: '', time: '', city: '', approvalMode: '', sortBy: '', ...filters });

  const activePriceOption = PRICE_OPTIONS.find(o => o.min === (local.minPrice || '') && o.max === (local.maxPrice || '')) || null;

  const handleApply = () => { onApply(local); onClose(); };
  const handleReset = () => {
    const reset = { minPrice: '', maxPrice: '', time: '', city: '', approvalMode: '', sortBy: '', category: '' };
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
          boxShadow: '0 -16px 60px rgba(0,0,0,0.25)',
          paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle + Header */}
        <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid #f0f4fb', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 14px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#0f2b6b' }}>פילטרים</div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: '#f1f5f9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={15} color="#64748b" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20, overscrollBehavior: 'contain' }}>

          {/* Price */}
          <div>
            <SectionLabel>💰 מחיר</SectionLabel>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRICE_OPTIONS.map(opt => (
                <Chip key={opt.label} label={opt.label}
                  active={activePriceOption?.label === opt.label}
                  onClick={() => setLocal(p => ({ ...p, minPrice: opt.min, maxPrice: opt.max }))}
                />
              ))}
            </div>
          </div>

          {/* Time */}
          <div>
            <SectionLabel>⏱️ זמן ביצוע</SectionLabel>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {timeOptions.map(t => (
                <Chip key={t} label={t}
                  active={local.time === t}
                  onClick={() => setLocal(p => ({ ...p, time: p.time === t ? '' : t }))}
                />
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <SectionLabel>🔃 מיון</SectionLabel>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[{ val: '', label: 'רלוונטי' }, { val: 'newest', label: '🆕 חדשות קודם' }, { val: 'price_desc', label: '💰 מחיר גבוה' }, { val: 'price_asc', label: '💸 מחיר נמוך' }].map(opt => (
                <Chip key={opt.val} label={opt.label}
                  active={local.sortBy === opt.val}
                  onClick={() => setLocal(p => ({ ...p, sortBy: opt.val }))}
                />
              ))}
            </div>
          </div>

          {/* City */}
          <div>
            <SectionLabel><MapPin size={13} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />עיר</SectionLabel>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
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
              style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid #dce8f5', background: '#f4f7fb', fontSize: 16, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Footer buttons */}
        <div style={{ padding: '14px 20px 16px', borderTop: '1px solid #f0f4fb', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={handleReset}
            style={{ flex: 1, height: 50, borderRadius: 14, background: 'white', border: '1.5px solid #dce8f5', color: '#0f2b6b', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >איפוס</button>
          <button onClick={handleApply}
            style={{ flex: 2, height: 50, borderRadius: 14, background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', color: 'white', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(26,111,212,0.3)' }}
          >החל פילטרים</button>
        </div>
      </div>
    </div>,
    document.body
  );
}