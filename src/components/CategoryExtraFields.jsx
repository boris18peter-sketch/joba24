import { useState, useEffect } from 'react';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { Navigation, MapPin, ChevronDown } from 'lucide-react';
import { getCategoryConfig, formatCategoryDetails } from '@/lib/taskFlowConfig';
import SchedulePicker from '@/components/SchedulePicker';

function distKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const aa = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

// ── Field type renderers ─────────────────────────────────────────────────────

function SelectField({ field, value, onChange }) {
  const [showAll, setShowAll] = useState(false);
  const opts = field.options || [];
  const visible = showAll ? opts : opts.slice(0, 6);
  const hasMore = opts.length > 6;

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {visible.map(opt => {
          const isActive = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(isActive ? '' : opt)}
              style={{
                padding: '8px 14px', borderRadius: 99, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', border: 'none', transition: 'all 0.18s ease',
                background: isActive ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : 'var(--surface-3)',
                color: isActive ? 'white' : 'var(--text-2)',
                boxShadow: isActive ? '0 3px 12px rgba(26,111,212,0.28)' : 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >{opt}</button>
          );
        })}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll(v => !v)}
          style={{
            marginTop: 6, background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700,
            color: '#1a6fd4', padding: 0,
          }}
        >
          {showAll ? 'הצג פחות' : `עוד ${opts.length - 6} אפשרויות`}
          <ChevronDown size={13} style={{ transform: showAll ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      )}
    </>
  );
}

function MultiSelectField({ field, value, onChange }) {
  const selected = Array.isArray(value) ? value : [];
  const opts = field.options || [];
  const toggle = (opt) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(v => v !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
      {opts.map(opt => {
        const isActive = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            style={{
              padding: '8px 14px', borderRadius: 99, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', border: isActive ? 'none' : '1px solid var(--border-1)', transition: 'all 0.18s ease',
              background: isActive ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : 'var(--surface-3)',
              color: isActive ? 'white' : 'var(--text-2)',
              boxShadow: isActive ? '0 3px 12px rgba(26,111,212,0.28)' : 'none',
              WebkitTapHighlightColor: 'transparent',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            {isActive && <span style={{ fontSize: 10 }}>✓</span>}
            {opt}
          </button>
        );
      })}
      {selected.length > 0 && (
        <button type="button" onClick={() => onChange([])} style={{ padding: '8px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid var(--border-1)', background: 'transparent', color: '#94a3b8' }}>
          נקה ({selected.length})
        </button>
      )}
    </div>
  );
}

function ToggleField({ field, value, onChange }) {
  const isActive = !!value;
  return (
    <button
      type="button"
      onClick={() => onChange(!isActive)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
        borderRadius: 12, cursor: 'pointer', width: '100%',
        background: isActive ? 'rgba(26,111,212,0.06)' : 'var(--surface-3)',
        border: `1.5px solid ${isActive ? '#93c5fd' : 'var(--border-1)'}`,
        transition: 'all 0.18s ease',
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: 7, flexShrink: 0,
        background: isActive ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : 'var(--surface-2)',
        border: `2px solid ${isActive ? '#1a6fd4' : '#cbd5e1'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isActive ? '0 2px 8px rgba(26,111,212,0.3)' : 'none',
        transition: 'all 0.18s ease',
      }}>
        {isActive && <span style={{ color: 'white', fontSize: 12, fontWeight: 900 }}>✓</span>}
      </div>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: isActive ? '#1e40af' : 'var(--text-2)' }}>{field.label}</span>
    </button>
  );
}

function NumberField({ field, value, onChange }) {
  return (
    <div style={{ position: 'relative', maxWidth: 200 }}>
      <input
        type="number"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder || ''}
        style={{
          width: '100%', height: 46, borderRadius: 12,
          border: '1.5px solid var(--border-1)', background: 'var(--surface-3)',
          padding: '0 14px', fontSize: 16, fontWeight: 700, color: 'var(--text-1)',
          outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => { e.target.style.borderColor = '#1a6fd4'; }}
        onBlur={e => { e.target.style.borderColor = 'var(--border-1)'; }}
      />
    </div>
  );
}

function TextField({ field, value, onChange }) {
  return (
    <input
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder || ''}
      style={{
        width: '100%', height: 46, borderRadius: 12,
        border: '1.5px solid var(--border-1)', background: 'var(--surface-3)',
        padding: '0 14px', fontSize: 14, color: 'var(--text-1)',
        outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
        transition: 'border-color 0.15s',
      }}
      onFocus={e => { e.target.style.borderColor = '#1a6fd4'; }}
      onBlur={e => { e.target.style.borderColor = 'var(--border-1)'; }}
    />
  );
}

function TextareaField({ field, value, onChange }) {
  return (
    <textarea
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder || ''}
      rows={3}
      style={{
        width: '100%', borderRadius: 12, resize: 'none',
        border: '1.5px solid var(--border-1)', background: 'var(--surface-3)',
        padding: '10px 14px', fontSize: 14, color: 'var(--text-1)',
        outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
        transition: 'border-color 0.15s', lineHeight: 1.5,
      }}
      onFocus={e => { e.target.style.borderColor = '#1a6fd4'; }}
      onBlur={e => { e.target.style.borderColor = 'var(--border-1)'; }}
    />
  );
}

function AddressField({ field, value, onChange, onCoords, originLat, originLng }) {
  return (
    <AddressAutocomplete
      value={value || ''}
      placeholder={field.placeholder || 'התחל להקליד כתובת...'}
      onSelect={({ location_name, lat, lng }) => {
        if (location_name) {
          onCoords?.({ lat, lng });
          const next = { [field.key]: location_name, [`${field.key}_lat`]: lat, [`${field.key}_lng`]: lng };
          onChange(location_name, next);
        }
      }}
    />
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function CategoryExtraFields({ category, originLat, originLng, initialValues, onChange }) {
  const config = getCategoryConfig(category);
  const [values, setValues] = useState(initialValues || {});
  // Filter out urgency fields — urgency is already handled in the main form
  // Also filter by showWhen conditions (conditional fields based on other values)
  const fields = (config?.extraFields || []).filter(f => {
    if (f.key === 'urgency') return false;
    if (f.showWhen) {
      const curVal = values[f.showWhen.field];
      if (f.showWhen.equals !== undefined && curVal !== f.showWhen.equals) return false;
      if (f.showWhen.notEquals !== undefined && curVal === f.showWhen.notEquals) return false;
      if (f.showWhen.in && !f.showWhen.in.includes(curVal)) return false;
      if (f.showWhen.notIn && f.showWhen.notIn.includes(curVal)) return false;
    }
    return true;
  });
  const [destCoords, setDestCoords] = useState(null);

  useEffect(() => {
    setValues(initialValues || {});
    setDestCoords(null);
  }, [category]);

  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      setValues(initialValues);
    }
  }, [JSON.stringify(initialValues)]);

  const distance = (category === 'moving' || category === 'delivery' || category === 'transportation') && originLat && destCoords
    ? distKm({ lat: originLat, lng: originLng }, destCoords)
    : null;

  const set = (key, val, extraMerge) => {
    const next = { ...values, [key]: val, ...extraMerge };
    setValues(next);
    const lines = formatExtra(next, fields, distance);
    onChange?.(next, lines);
  };

  const formatExtra = (vals, fieldList, dist) => {
    const lines = [];
    if (config) lines.push(`--- ${config.label} ---`);
    if (dist != null) lines.push(`📍 מרחק: ${dist < 1 ? `${Math.round(dist * 1000)} מטר` : `${dist.toFixed(1)} ק"מ`}`);
    fieldList.forEach(f => {
      const v = vals[f.key];
      if (v === undefined || v === '' || v === null) return;
      if (f.type === 'toggle') {
        if (v) lines.push(`✓ ${f.label}`);
      } else if (f.type === 'address') {
        if (v) lines.push(`${f.label}: ${v}`);
      } else if (f.type === 'schedule') {
        if (Array.isArray(v) && v.length > 0) {
          const slotsText = v.map(s => `${s.date} ${s.start}–${s.end}`).join('; ');
          lines.push(`${f.label}: ${slotsText}`);
        }
      } else if (Array.isArray(v)) {
        if (v.length > 0) lines.push(`${f.label}: ${v.join(', ')}`);
      } else {
        lines.push(`${f.label}: ${v}`);
      }
    });
    return lines.join('\n');
  };

  if (!config || !fields.length) return null;

  const emoji = config.label?.split(' ')[0] || '📋';
  const labelName = config.label?.split(' ').slice(1).join(' ') || config.label;

  return (
    <div style={{
      background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden',
      border: '1px solid var(--border-1)', boxShadow: '0 2px 12px rgba(26,111,212,0.06)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        background: 'linear-gradient(135deg, rgba(26,111,212,0.04), rgba(26,111,212,0.01))',
        borderBottom: '1px solid var(--border-1)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
          border: '1px solid #bfdbfe',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>{emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.2 }}>{labelName}</div>
          <div style={{ fontSize: 11, color: '#1a6fd4', fontWeight: 600, marginTop: 1 }}>פרטים מקצועיים — יוצגו לעובדים</div>
        </div>
      </div>

      {/* Fields */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {fields.map((field, idx) => (
          <div key={field.key} style={idx > 0 ? { paddingTop: 16, borderTop: '1px solid var(--border-1)' } : {}}>
            <label style={{
              fontSize: 13, fontWeight: 700, color: 'var(--text-1)',
              marginBottom: 8, display: 'block', lineHeight: 1.3,
            }}>
              {field.label}
            </label>

            {field.type === 'select' && (
              <SelectField field={field} value={values[field.key]} onChange={v => set(field.key, v)} />
            )}

            {field.type === 'multi' && (
              <MultiSelectField field={field} value={values[field.key]} onChange={v => set(field.key, v)} />
            )}

            {field.type === 'toggle' && (
              <ToggleField field={field} value={values[field.key]} onChange={v => set(field.key, v)} />
            )}

            {field.type === 'number' && (
              <NumberField field={field} value={values[field.key]} onChange={v => set(field.key, v)} />
            )}

            {field.type === 'text' && (
              <TextField field={field} value={values[field.key]} onChange={v => set(field.key, v)} />
            )}

            {field.type === 'textarea' && (
              <TextareaField field={field} value={values[field.key]} onChange={v => set(field.key, v)} />
            )}

            {field.type === 'address' && (
              <AddressField
                field={field}
                value={values[field.key]}
                originLat={originLat}
                originLng={originLng}
                onChange={(val, extra) => set(field.key, val, extra)}
                onCoords={setDestCoords}
              />
            )}

            {field.type === 'schedule' && (
              <SchedulePicker value={values[field.key]} onChange={v => set(field.key, v)} />
            )}
          </div>
        ))}

        {/* Distance display for moving/delivery/transportation */}
        {distance != null && (
          <div style={{
            background: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
            border: '1px solid #bfdbfe', borderRadius: 14,
            padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Navigation size={17} color="#1a6fd4" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1e40af' }}>
                {distance < 1 ? `${Math.round(distance * 1000)} מטר` : `${distance.toFixed(1)} ק"מ`}
              </div>
              <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 1, fontWeight: 500 }}>
                זמן נסיעה משוער: ~{Math.ceil(distance * 3)} דקות
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}