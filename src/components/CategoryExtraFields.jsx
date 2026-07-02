import { useState, useEffect } from 'react';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { Navigation } from 'lucide-react';
import { getCategoryConfig, formatCategoryDetails } from '@/lib/taskFlowConfig';

function distKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const aa = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

/**
 * CategoryExtraFields — pure renderer driven by taskFlowConfig.
 *
 * Props:
 *   category: string
 *   originLat, originLng: number (source address coords)
 *   initialValues: object (pre-fill from existing task.category_details — for edit mode)
 *   onChange: (data: object, formattedText: string) => void
 */
export default function CategoryExtraFields({ category, originLat, originLng, initialValues, onChange }) {
  const config = getCategoryConfig(category);
  // Filter out urgency fields — urgency is already handled in the main form (Expiry + Urgency section)
  const fields = (config?.extraFields || []).filter(f => f.key !== 'urgency');
  const [values, setValues] = useState(initialValues || {});
  const [destCoords, setDestCoords] = useState(null);

  // Reset when category changes, but preserve initialValues on first mount (edit mode)
  useEffect(() => {
    setValues(initialValues || {});
    setDestCoords(null);
  }, [category]);

  // If initialValues changes (e.g., edit task loaded), update
  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      setValues(initialValues);
    }
  }, [JSON.stringify(initialValues)]);

  const distance = (category === 'moving' || category === 'delivery') && originLat && destCoords
    ? distKm({ lat: originLat, lng: originLng }, destCoords)
    : null;

  const set = (key, val) => {
    const next = { ...values, [key]: val };
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
      } else {
        lines.push(`${f.label}: ${v}`);
      }
    });
    return lines.join('\n');
  };

  if (!config || !fields.length) return null;

  const inputStyle = {
    width: '100%', background: 'var(--surface-3)', border: '1.5px solid var(--border-1)',
    borderRadius: 12, padding: '10px 12px', fontSize: 14, outline: 'none',
    color: 'var(--text-1)', fontFamily: 'inherit', boxSizing: 'border-box',
  };

  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 20, padding: '18px 16px', border: '1px solid var(--border-1)', boxShadow: '0 2px 12px rgba(26,111,212,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 20 }}>{config.label.split(' ')[0]}</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>{config.label.split(' ').slice(1).join(' ') || config.label}</span>
        <span style={{ fontSize: 11, color: '#1a6fd4', background: '#eff6ff', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>מומלץ למלא</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {fields.map(field => (
          <div key={field.key}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6, display: 'block' }}>{field.label}</label>

            {field.type === 'address' && (
              <AddressAutocomplete
                value={values[field.key] || ''}
                placeholder={field.placeholder}
                onSelect={({ location_name, lat, lng }) => {
                  if (location_name) {
                    setDestCoords({ lat, lng });
                    const next = { ...values, [field.key]: location_name, [`${field.key}_lat`]: lat, [`${field.key}_lng`]: lng };
                    setValues(next);
                    const d = originLat && lat ? distKm({ lat: originLat, lng: originLng }, { lat, lng }) : null;
                    const lines = formatExtra(next, fields, d);
                    onChange?.(next, lines);
                  }
                }}
              />
            )}

            {field.type === 'text' && (
              <input
                value={values[field.key] || ''}
                onChange={e => set(field.key, e.target.value)}
                placeholder={field.placeholder}
                style={inputStyle}
              />
            )}

            {field.type === 'number' && (
              <input
                type="number"
                value={values[field.key] || ''}
                onChange={e => set(field.key, e.target.value)}
                placeholder={field.placeholder}
                style={{ ...inputStyle, width: 120 }}
              />
            )}

            {field.type === 'textarea' && (
              <textarea
                value={values[field.key] || ''}
                onChange={e => set(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                style={{ ...inputStyle, resize: 'none' }}
              />
            )}

            {field.type === 'select' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {field.options.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => set(field.key, values[field.key] === opt ? '' : opt)}
                    style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', border: 'none',
                      background: values[field.key] === opt ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : 'var(--surface-3)',
                      color: values[field.key] === opt ? 'white' : 'var(--text-2)',
                    }}
                  >{opt}</button>
                ))}
              </div>
            )}

            {field.type === 'toggle' && (
              <button
                type="button"
                onClick={() => set(field.key, !values[field.key])}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                  borderRadius: 12, cursor: 'pointer', width: '100%',
                  background: values[field.key] ? '#eff6ff' : 'var(--surface-3)',
                  border: `1.5px solid ${values[field.key] ? '#93c5fd' : 'var(--border-1)'}`,
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  background: values[field.key] ? '#1a6fd4' : 'var(--surface-2)',
                  border: `2px solid ${values[field.key] ? '#1a6fd4' : '#cbd5e1'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {values[field.key] && <span style={{ color: 'white', fontSize: 11 }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: values[field.key] ? '#1e40af' : 'var(--text-2)' }}>{field.label}</span>
              </button>
            )}
          </div>
        ))}

        {/* Distance display for moving/delivery */}
        {distance != null && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Navigation size={15} color="#1a6fd4" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1e40af' }}>
                מרחק ההובלה: {distance < 1 ? `${Math.round(distance * 1000)} מטר` : `${distance.toFixed(1)} ק"מ`}
              </div>
              <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 1 }}>זמן נסיעה משוער: ~{Math.ceil(distance * 3)} דקות</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}