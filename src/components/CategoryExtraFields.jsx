import { useState, useEffect } from 'react';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { Navigation, ChevronDown, ChevronUp } from 'lucide-react';

const CATEGORY_CONFIG = {
  moving: {
    label: 'פרטי ההובלה',
    emoji: '🚛',
    subtitle: 'עובדים זקוקים לפרטים אלה כדי להגיע מוכנים',
    fields: [
      { key: 'to_address', type: 'address', label: 'כתובת יעד — לאן מובילים?', placeholder: 'עיר, רחוב ומספר...', required: true },
      { key: 'from_floor', type: 'number', label: 'קומת מוצא', placeholder: '0 = קרקע', width: 130 },
      { key: 'to_floor', type: 'number', label: 'קומת יעד', placeholder: '0 = קרקע', width: 130 },
      { key: 'elevator_from', type: 'toggle', label: '🛗 יש מעלית בנקודת האיסוף' },
      { key: 'elevator_to', type: 'toggle', label: '🛗 יש מעלית בנקודת המסירה' },
      { key: 'needs_truck', type: 'toggle', label: '🚚 דרוש רכב מסחרי / משאית' },
      { key: 'items', type: 'textarea', label: 'מה מובילים? (פרט ככל האפשר)', placeholder: 'לדוגמה: ספה גדולה, מקרר אמריקאי, 10 ארגזים, שולחן פינת אוכל...' },
    ],
  },
  delivery: {
    label: 'פרטי המשלוח',
    emoji: '📦',
    subtitle: 'פרט כדי שהשליח יגיע עם הציוד הנכון',
    fields: [
      { key: 'to_address', type: 'address', label: 'כתובת מסירה — לאן מספקים?', placeholder: 'עיר, רחוב ומספר...', required: true },
      { key: 'item_size', type: 'select', label: 'גודל הפריט', options: [
        { value: 'small', label: 'קטן — כמו ארנק/מעטפה' },
        { value: 'medium', label: 'בינוני — כמו תיק/קופסה' },
        { value: 'large', label: 'גדול — כמו מזוודה' },
        { value: 'xlarge', label: 'ענק — ריהוט/ציוד' },
      ]},
      { key: 'fragile', type: 'toggle', label: '⚠️ פריט שביר / מחייב זהירות' },
      { key: 'item_desc', type: 'text', label: 'תיאור הפריט (אופציונלי)', placeholder: 'מה בדיוק צריך לשלוח?' },
    ],
  },
  cleaning: {
    label: 'פרטי הניקיון',
    emoji: '🧹',
    subtitle: 'פרטים אלה עוזרים לעובד להעריך זמן ומחיר',
    fields: [
      { key: 'cleaning_type', type: 'select', label: 'סוג הניקיון', options: [
        { value: 'routine', label: 'שוטף (שבועי/דו-שבועי)' },
        { value: 'deep', label: 'ניקיון מעמיק' },
        { value: 'post_reno', label: 'לאחר שיפוץ' },
        { value: 'move', label: 'לפני/אחרי מעבר דירה' },
        { value: 'windows', label: 'ניקוי חלונות בלבד' },
      ]},
      { key: 'rooms', type: 'number', label: 'מספר חדרים', placeholder: 'כולל סלון ומטבח', width: 130 },
      { key: 'area', type: 'number', label: 'שטח (מ"ר)', placeholder: 'למשל 85', width: 130 },
      { key: 'has_materials', type: 'toggle', label: '🧴 ציוד וחומרי ניקוי יסופקו' },
      { key: 'has_animals', type: 'toggle', label: '🐾 יש חיות מחמד בבית' },
    ],
  },
  babysitting: {
    label: 'פרטי הטיפול',
    emoji: '👶',
    subtitle: 'חיוני שהמטפל ידע עם מי הוא עובד',
    fields: [
      { key: 'kids_count', type: 'number', label: 'מספר ילדים', placeholder: 'למשל 2', width: 130 },
      { key: 'kids_ages', type: 'text', label: 'גילאי הילדים', placeholder: 'למשל: שנה וחצי, 4, 7' },
      { key: 'task_type', type: 'select', label: 'סוג הטיפול', options: [
        { value: 'home', label: 'שמרטפות בבית' },
        { value: 'pickup', label: 'איסוף מגן/בית ספר' },
        { value: 'overnight', label: 'לינה' },
        { value: 'animals', label: 'השגחה על חיות מחמד' },
      ]},
      { key: 'has_pets', type: 'toggle', label: '🐾 יש חיות מחמד בבית' },
    ],
  },
  plumbing: {
    label: 'פרטי האינסטלציה',
    emoji: '🔧',
    subtitle: 'פרטים אלה עוזרים לאינסטלטור לדעת מה להביא',
    fields: [
      { key: 'issue_type', type: 'select', label: 'מה הבעיה / מה צריך לעשות?', options: [
        { value: 'leak', label: '💧 נזילה (מיידי)' },
        { value: 'blockage', label: '🚫 סתימה' },
        { value: 'install', label: '🔩 התקנת ברז/מכשיר' },
        { value: 'toilet', label: '🚽 בעיית שירותים' },
        { value: 'boiler', label: '🌡️ דוד שמש / בוילר' },
        { value: 'other', label: '🔧 אחר' },
      ]},
      { key: 'has_shutoff', type: 'toggle', label: '✅ ידוע היכן ברז הניתוק הראשי' },
      { key: 'is_urgent', type: 'toggle', label: '🔥 נזילה פעילה / דחוף מאוד' },
    ],
  },
  electricity: {
    label: 'פרטי עבודת החשמל',
    emoji: '⚡',
    subtitle: 'פרטים בטיחותיים חיוניים לחשמלאי',
    fields: [
      { key: 'issue_type', type: 'select', label: 'מה צריך לעשות?', options: [
        { value: 'fault', label: '⚡ תיקון תקלה / נפילת חשמל' },
        { value: 'socket', label: '🔌 התקנת שקע/מפסק' },
        { value: 'panel', label: '🗄️ לוח חשמל' },
        { value: 'lighting', label: '💡 תאורה (נברשת/ספוטים)' },
        { value: 'ac_wiring', label: '❄️ חיווט מזגן' },
        { value: 'check', label: '🔍 בדיקה כללית' },
      ]},
      { key: 'is_urgent', type: 'toggle', label: '⚠️ אין חשמל כרגע / דחוף' },
      { key: 'has_breaker', type: 'toggle', label: '✅ יש גישה ללוח החשמל' },
    ],
  },
  ac: {
    label: 'פרטי המזגן',
    emoji: '❄️',
    subtitle: 'פרטים שיעזרו לטכנאי להגיע מוכן',
    fields: [
      { key: 'issue_type', type: 'select', label: 'מה נדרש?', options: [
        { value: 'install', label: '🔧 התקנת מזגן חדש' },
        { value: 'repair', label: '🛠️ תיקון מזגן' },
        { value: 'clean', label: '🧹 ניקוי פילטרים' },
        { value: 'dismantle', label: '📦 פירוק מזגן' },
        { value: 'service', label: '⚙️ תחזוקה שנתית' },
      ]},
      { key: 'units', type: 'number', label: 'כמה יחידות מזגן?', placeholder: '1', width: 130 },
      { key: 'brand', type: 'text', label: 'מותג המזגן (אם ידוע)', placeholder: 'למשל: LG, Samsung, Tadiran' },
      { key: 'has_access', type: 'toggle', label: '✅ יש גישה קלה ליחידה החיצונית' },
    ],
  },
  carpentry: {
    label: 'פרטי עבודת הנגרות',
    emoji: '🪚',
    subtitle: 'פרטים שיעזרו לנגר להגיע עם הכלים הנכונים',
    fields: [
      { key: 'issue_type', type: 'select', label: 'מה נדרש?', options: [
        { value: 'assemble', label: '📦 הרכבת ריהוט (IKEA וכדומה)' },
        { value: 'repair', label: '🔨 תיקון ריהוט/דלת' },
        { value: 'custom', label: '🪵 עבודה מותאמת אישית' },
        { value: 'dismantle', label: '🗑️ פירוק ריהוט' },
        { value: 'shelves', label: '📐 מדפים/ארונות' },
      ]},
      { key: 'items_count', type: 'number', label: 'כמה פריטים?', placeholder: '1', width: 130 },
      { key: 'has_materials', type: 'toggle', label: '🪛 חומרים וחלקים יסופקו' },
    ],
  },
  painting: {
    label: 'פרטי הצביעה',
    emoji: '🎨',
    subtitle: 'פרטים שיעזרו לצבע להכין הכמות הנכונה',
    fields: [
      { key: 'area', type: 'number', label: 'שטח משוער לצביעה (מ"ר)', placeholder: 'למשל 60', width: 140 },
      { key: 'rooms', type: 'number', label: 'כמה חדרים/קירות?', placeholder: '2', width: 130 },
      { key: 'surface_type', type: 'select', label: 'מה צובעים?', options: [
        { value: 'interior', label: '🏠 קירות פנים' },
        { value: 'exterior', label: '🌤️ חזית חוץ' },
        { value: 'ceiling', label: '⬆️ תקרה' },
        { value: 'metal', label: '🔩 מתכת (שערים/גדרות)' },
        { value: 'wood', label: '🪵 עץ' },
      ]},
      { key: 'has_paint', type: 'toggle', label: '🪣 צבע יסופק על ידי הלקוח' },
      { key: 'needs_prep', type: 'toggle', label: '🧹 נדרש ניקוי/הכנת משטח לפני' },
    ],
  },
  gardening: {
    label: 'פרטי הגינון',
    emoji: '🌿',
    subtitle: 'פרטים שיעזרו לגנן להגיע מוכן',
    fields: [
      { key: 'garden_type', type: 'select', label: 'סוג הגינה', options: [
        { value: 'private', label: '🏡 גינה פרטית' },
        { value: 'balcony', label: '🪴 מרפסת' },
        { value: 'roof', label: '🏢 גג' },
        { value: 'commercial', label: '🏢 חצר עסק/בניין' },
      ]},
      { key: 'task_type', type: 'select', label: 'מה נדרש?', options: [
        { value: 'trim', label: '✂️ גיזום וסידור' },
        { value: 'mow', label: '🌾 כיסוח דשא' },
        { value: 'plant', label: '🌱 שתילה' },
        { value: 'cleanup', label: '🗑️ ניקוי ופינוי גזם' },
        { value: 'irrigation', label: '💧 השקיה ומערכת טפטוף' },
      ]},
      { key: 'area', type: 'number', label: 'שטח משוער (מ"ר)', placeholder: 'למשל 50', width: 130 },
      { key: 'waste_removal', type: 'toggle', label: '🚛 נדרש פינוי גזם/פסולת' },
    ],
  },
  shopping: {
    label: 'פרטי הקניות',
    emoji: '🛒',
    subtitle: 'פרט כדי שהשליח יוכל לבצע בדיוק מה שצריך',
    fields: [
      { key: 'store', type: 'text', label: 'איפה לקנות?', placeholder: 'שם חנות / סופר / מיקום' },
      { key: 'items', type: 'textarea', label: 'רשימת קניות מפורטת', placeholder: 'חלב 3%, 2 ליטר\nלחם קמח מלא\nעגבניות 1 ק"ג...' },
      { key: 'budget', type: 'number', label: 'תקציב קנייה משוער (₪)', placeholder: 'כמה להוציא', width: 150 },
      { key: 'delivery_needed', type: 'toggle', label: '🏠 נדרשת משלוח עד הדלת' },
    ],
  },
  locksmith: {
    label: 'פרטי המנעולן',
    emoji: '🔐',
    subtitle: 'חיוני שהמנעולן ידע מה לצפות',
    fields: [
      { key: 'issue_type', type: 'select', label: 'מה נדרש?', options: [
        { value: 'locked_out', label: '🔒 נעול מחוץ לדירה' },
        { value: 'replace', label: '🔑 החלפת מנעול' },
        { value: 'duplicate', label: '🗝️ שכפול מפתח' },
        { value: 'install', label: '🚪 התקנת מנעול/בריח חדש' },
        { value: 'safe', label: '🔓 כספת' },
      ]},
      { key: 'is_urgent', type: 'toggle', label: '🚨 נעול מבחוץ / דחוף מאוד' },
      { key: 'door_type', type: 'text', label: 'סוג הדלת / מנעול (אם ידוע)', placeholder: 'למשל: מולטילוק, בית פרטי...' },
    ],
  },
  tutoring: {
    label: 'פרטי השיעור',
    emoji: '📚',
    subtitle: 'פרטים שיעזרו למורה להתכונן',
    fields: [
      { key: 'subject', type: 'text', label: 'מקצוע / נושא', placeholder: 'למשל: מתמטיקה, אנגלית, פיזיקה' },
      { key: 'student_age', type: 'text', label: 'גיל התלמיד/ים', placeholder: 'למשל: 14, כיתה ח' },
      { key: 'lesson_type', type: 'select', label: 'סוג השיעור', options: [
        { value: 'regular', label: '📖 שיעורי עזר שוטפים' },
        { value: 'exam', label: '📝 הכנה לבחינה/בגרות' },
        { value: 'online', label: '💻 שיעור אונליין' },
        { value: 'group', label: '👥 קבוצה (2+ תלמידים)' },
      ]},
      { key: 'sessions', type: 'number', label: 'כמה שיעורים?', placeholder: '1', width: 130 },
    ],
  },
  it_support: {
    label: 'פרטי תמיכת המחשבים',
    emoji: '💻',
    subtitle: 'פרטים שיעזרו לטכנאי לפתור בדיוק',
    fields: [
      { key: 'issue_type', type: 'select', label: 'מה הבעיה?', options: [
        { value: 'slow', label: '🐢 מחשב איטי / תקוע' },
        { value: 'virus', label: '🦠 וירוס / פריצה' },
        { value: 'install', label: '💿 התקנת תוכנה/מערכת' },
        { value: 'network', label: '📡 בעיית אינטרנט/רשת' },
        { value: 'hardware', label: '🔧 תיקון חומרה' },
        { value: 'data', label: '💾 שחזור נתונים' },
        { value: 'setup', label: '🖥️ הגדרת מחשב/טלפון חדש' },
      ]},
      { key: 'device_type', type: 'select', label: 'סוג המכשיר', options: [
        { value: 'pc', label: '🖥️ מחשב נייח' },
        { value: 'laptop', label: '💻 מחשב נייד' },
        { value: 'phone', label: '📱 טלפון/טאבלט' },
        { value: 'router', label: '📡 נתב / ציוד רשת' },
      ]},
      { key: 'remote_ok', type: 'toggle', label: '🌐 מאשר סיוע מרחוק (Remote)' },
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

export default function CategoryExtraFields({ category, originLat, originLng, onChange }) {
  const config = CATEGORY_CONFIG[category];
  const [values, setValues] = useState({});
  const [destCoords, setDestCoords] = useState(null);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    setValues({});
    setDestCoords(null);
    setIsOpen(true);
  }, [category]);

  const distance = (category === 'moving' || category === 'delivery') && originLat && destCoords
    ? distKm({ lat: originLat, lng: originLng }, destCoords)
    : null;

  const set = (key, val) => {
    const next = { ...values, [key]: val };
    setValues(next);
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
      } else if (f.type === 'select') {
        const opt = f.options?.find(o => o.value === v);
        lines.push(`${f.label}: ${opt?.label || v}`);
      } else if (f.type === 'address') {
        if (v) lines.push(`${f.label}: ${v}`);
      } else {
        lines.push(`${f.label}: ${v}`);
      }
    });
    return lines.join('\n');
  };

  if (!config) return null;

  const filledCount = config.fields.filter(f => {
    const v = values[f.key];
    return v !== undefined && v !== '' && v !== null && v !== false;
  }).length;
  const totalRequired = config.fields.filter(f => f.required || !f.type === 'toggle').length;

  const inputStyle = {
    width: '100%', background: 'var(--input-bg)', border: '1.5px solid var(--border-1)',
    borderRadius: 12, padding: '11px 14px', fontSize: 14, outline: 'none',
    color: 'var(--text-1)', fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{
      background: 'var(--card-bg)',
      borderRadius: 20,
      border: '1.5px solid #bfdbfe',
      boxShadow: '0 2px 16px rgba(26,111,212,0.08)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px', background: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
          border: 'none', cursor: 'pointer', textAlign: 'right',
        }}
      >
        <span style={{ fontSize: 22 }}>{config.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1e40af', marginBottom: 1 }}>
            {config.label}
          </div>
          <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>
            {config.subtitle}
          </div>
        </div>
        {filledCount > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 800, background: '#1a6fd4', color: 'white',
            borderRadius: 20, padding: '3px 9px', flexShrink: 0,
          }}>
            {filledCount} / {config.fields.length}
          </span>
        )}
        {!filledCount && (
          <span style={{
            fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#dc2626',
            borderRadius: 20, padding: '3px 9px', flexShrink: 0,
          }}>
            חסר ★
          </span>
        )}
        {isOpen ? <ChevronUp size={16} color="#3b82f6" /> : <ChevronDown size={16} color="#3b82f6" />}
      </button>

      {/* Fields */}
      {isOpen && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {config.fields.map(field => (
            <div key={field.key}>
              <label style={{
                fontSize: 12, fontWeight: 700, color: 'var(--text-2)',
                marginBottom: 7, display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {field.label}
                {field.required && <span style={{ color: '#ef4444', fontSize: 11 }}>*</span>}
              </label>

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
                  style={{ ...inputStyle, width: field.width || 130 }}
                />
              )}

              {field.type === 'textarea' && (
                <textarea
                  value={values[field.key] || ''}
                  onChange={e => set(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
                />
              )}

              {field.type === 'select' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {field.options.map(opt => {
                    const selected = values[field.key] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => set(field.key, selected ? '' : opt.value)}
                        style={{
                          padding: '8px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                          background: selected ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : 'var(--surface-3)',
                          color: selected ? 'white' : 'var(--text-2)',
                          boxShadow: selected ? '0 2px 8px rgba(26,111,212,0.25)' : 'none',
                          transform: selected ? 'scale(1.03)' : 'scale(1)',
                        }}
                      >{opt.label}</button>
                    );
                  })}
                </div>
              )}

              {field.type === 'toggle' && (
                <button
                  type="button"
                  onClick={() => set(field.key, !values[field.key])}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
                    borderRadius: 12, cursor: 'pointer', width: '100%', transition: 'all 0.15s',
                    background: values[field.key] ? '#eff6ff' : 'var(--surface-3)',
                    border: `1.5px solid ${values[field.key] ? '#93c5fd' : 'var(--border-1)'}`,
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                    background: values[field.key] ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : 'var(--surface-2)',
                    border: `2px solid ${values[field.key] ? '#1a6fd4' : '#cbd5e1'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    {values[field.key] && <span style={{ color: 'white', fontSize: 12 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: values[field.key] ? '#1e40af' : 'var(--text-2)' }}>
                    {field.label}
                  </span>
                </button>
              )}
            </div>
          ))}

          {/* Distance badge for moving/delivery */}
          {distance != null && (
            <div style={{
              background: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
              border: '1.5px solid #93c5fd', borderRadius: 14,
              padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Navigation size={18} color="#1a6fd4" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#1e40af' }}>
                  מרחק: {distance < 1 ? `${Math.round(distance * 1000)} מטר` : `${distance.toFixed(1)} ק"מ`}
                </div>
                <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 1 }}>
                  זמן נסיעה משוער: ~{Math.ceil(distance * 3)} דקות
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}