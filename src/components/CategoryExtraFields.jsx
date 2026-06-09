import { useState, useEffect } from 'react';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { MapPin, Navigation, Truck, Layers } from 'lucide-react';

// Category-specific field definitions
const CATEGORY_CONFIG = {
  moving: {
    label: 'פרטי הובלה',
    emoji: '🚛',
    fields: [
      { key: 'to_address', type: 'address', label: 'כתובת יעד — לאן מובילים? *', placeholder: 'עיר, רחוב...' },
      { key: 'from_floor', type: 'number', label: 'קומת מוצא', placeholder: '0 = קרקע' },
      { key: 'to_floor', type: 'number', label: 'קומת יעד', placeholder: '0 = קרקע' },
      { key: 'elevator_from', type: 'toggle', label: 'יש מעלית במוצא' },
      { key: 'elevator_to', type: 'toggle', label: 'יש מעלית ביעד' },
      { key: 'needs_truck', type: 'toggle', label: 'דרושה משאית' },
      { key: 'items', type: 'textarea', label: 'מה מובילים?', placeholder: 'ספה, מקרר, 5 ארגזים...' },
    ],
  },
  delivery: {
    label: 'פרטי משלוח',
    emoji: '📦',
    fields: [
      { key: 'to_address', type: 'address', label: 'כתובת מסירה *', placeholder: 'לאן מספקים?' },
      { key: 'item_size', type: 'select', label: 'גודל הפריט', options: ['קטן (כמו ארנק)', 'בינוני (כמו תיק)', 'גדול (כמו מזוודה)', 'ענק (רהיט/ציוד)'] },
    ],
  },
  cleaning: {
    label: 'פרטי ניקיון',
    emoji: '🧹',
    fields: [
      { key: 'rooms', type: 'number', label: 'מספר חדרים', placeholder: 'למשל: 3' },
      { key: 'area', type: 'number', label: 'שטח בערך (מ"ר)', placeholder: 'למשל: 80' },
      { key: 'has_materials', type: 'toggle', label: 'יש חומרי ניקוי' },
      { key: 'cleaning_type', type: 'select', label: 'סוג ניקוי', options: ['ניקיון שוטף', 'ניקיון לאחר שיפוץ', 'ניקיון לפני מעבר', 'ניקוי חלונות', 'שטיחים'] },
    ],
  },
  babysitting: {
    label: 'פרטי השמרטפות',
    emoji: '👶',
    fields: [
      { key: 'kids_count', type: 'number', label: 'כמה ילדים?', placeholder: 'למשל: 2' },
      { key: 'kids_ages', type: 'text', label: 'גילאי הילדים', placeholder: 'למשל: 2, 5, 8' },
      { key: 'has_pets', type: 'toggle', label: 'יש חיות מחמד' },
    ],
  },
  plumbing: {
    label: 'פרטי אינסטלציה',
    emoji: '🔧',
    fields: [
      { key: 'issue_type', type: 'select', label: 'סוג הבעיה', options: ['נזילה', 'סתימה', 'התקנת ברז/מכשיר', 'הרחבת צנרת', 'בדיקה', 'אחר'] },
      { key: 'urgency', type: 'select', label: 'דחיפות', options: ['מיידי (נזילה פעילה)', 'היום', 'תוך יום-יומיים', 'גמיש'] },
    ],
  },
  electricity: {
    label: 'פרטי עבודת חשמל',
    emoji: '⚡',
    fields: [
      { key: 'issue_type', type: 'select', label: 'סוג העבודה', options: ['תיקון תקלה', 'התקנת שקע/מפסק', 'לוח חשמל', 'חיווט', 'בדיקה', 'אחר'] },
      { key: 'urgency', type: 'select', label: 'דחיפות', options: ['מיידי', 'היום', 'גמיש'] },
    ],
  },
  ac: {
    label: 'פרטי מזגן',
    emoji: '❄️',
    fields: [
      { key: 'issue_type', type: 'select', label: 'סוג העבודה', options: ['התקנה', 'תיקון', 'ניקוי', 'פירוק', 'אחר'] },
      { key: 'units', type: 'number', label: 'כמה יחידות?', placeholder: '1' },
    ],
  },
  carpentry: {
    label: 'פרטי נגרות',
    emoji: '🪚',
    fields: [
      { key: 'issue_type', type: 'select', label: 'סוג העבודה', options: ['הרכבת רהיטים', 'תיקון', 'ייצור', 'פירוק', 'אחר'] },
    ],
  },
  painting: {
    label: 'פרטי צביעה',
    emoji: '🎨',
    fields: [
      { key: 'rooms', type: 'number', label: 'כמה חדרים/קירות?', placeholder: 'למשל: 2' },
      { key: 'area', type: 'number', label: 'שטח משוער (מ"ר)', placeholder: 'למשל: 50' },
      { key: 'has_paint', type: 'toggle', label: 'יש צבע' },
    ],
  },
  shopping: {
    label: 'פרטי קניות',
    emoji: '🛒',
    fields: [
      { key: 'store', type: 'text', label: 'איפה לקנות?', placeholder: 'שם חנות / מיקום' },
      { key: 'items', type: 'textarea', label: 'רשימת קניות', placeholder: 'חלב, לחם, עגבניות...' },
    ],
  },
};

function distKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const aa = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

/**
 * CategoryExtraFields
 * Props:
 *   category: string
 *   originLat, originLng: number (source address coords)
 *   onChange: (data: object, formattedText: string) => void
 */
export default function CategoryExtraFields({ category, originLat, originLng, onChange }) {
  const config = CATEGORY_CONFIG[category];
  const [values, setValues] = useState({});
  const [destCoords, setDestCoords] = useState(null);

  useEffect(() => {
    setValues({});
    setDestCoords(null);
  }, [category]);

  const distance = (category === 'moving' || category === 'delivery') && originLat && destCoords
    ? distKm({ lat: originLat, lng: originLng }, destCoords)
    : null;

  const set = (key, val) => {
    const next = { ...values, [key]: val };
    setValues(next);
    // Build formatted text
    const lines = formatExtra(next, config?.fields || [], distance);
    onChange?.(next, lines);
  };

  const formatExtra = (vals, fields, dist) => {
    const lines = [];
    if (config) lines.push(`--- ${config.emoji} ${config.label} ---`);
    if (dist != null) lines.push(`📍 מרחק: ${dist < 1 ? `${Math.round(dist * 1000)} מטר` : `${dist.toFixed(1)} ק"מ`}`);
    fields.forEach(f => {
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

  if (!config) return null;

  const inputStyle = {
    width: '100%', background: 'var(--surface-3)', border: '1.5px solid var(--border-1)',
    borderRadius: 12, padding: '10px 12px', fontSize: 14, outline: 'none',
    color: 'var(--text-1)', fontFamily: 'inherit', boxSizing: 'border-box',
  };

  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 20, padding: '18px 16px', border: '1px solid var(--border-1)', boxShadow: '0 2px 12px rgba(26,111,212,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 20 }}>{config.emoji}</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>{config.label}</span>
        <span style={{ fontSize: 11, color: '#1a6fd4', background: '#eff6ff', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>מומלץ למלא</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {config.fields.map(field => (
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
                    const lines = formatExtra(next, config.fields, d);
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