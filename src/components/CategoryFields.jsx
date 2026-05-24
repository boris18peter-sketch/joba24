import { useState } from 'react';

// ── Chip selector ───────────────────────────────────────────────────
function Chips({ options, value, onChange, multi }) {
  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 6 }}>
      {options.map(opt => {
        const v = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const selected = multi ? (value || []).includes(v) : value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => {
              if (multi) {
                const cur = value || [];
                onChange(selected ? cur.filter(x => x !== v) : [...cur, v]);
              } else {
                onChange(selected ? '' : v);
              }
            }}
            style={{
              padding: '7px 14px', borderRadius: 22, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', border: 'none', transition: 'all 0.15s',
              background: selected ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : 'var(--surface-3)',
              color: selected ? 'white' : 'var(--text-2)',
              boxShadow: selected ? '0 4px 12px rgba(26,111,212,0.3)' : 'none',
            }}
          >{label}</button>
        );
      })}
    </div>
  );
}

// ── Field wrapper ───────────────────────────────────────────────────
function Field({ label, children, optional }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        {optional && <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500 }}>אופציונלי</span>}
      </div>
      {children}
    </div>
  );
}

function TextInput({ placeholder, value, onChange }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '10px 12px', borderRadius: 12,
        background: 'var(--surface-3)', border: '1.5px solid var(--border-1)',
        fontSize: 14, color: 'var(--text-1)', outline: 'none',
        boxSizing: 'border-box',
      }}
    />
  );
}

// ── Category field configs ─────────────────────────────────────────
const CONFIGS = {
  moving: ({ val, set }) => (
    <>
      <Field label="🚗 איזה רכב דרוש?">
        <Chips
          value={val('vehicle_type')} onChange={set('vehicle_type')}
          options={[{ value: 'car', label: 'רכב רגיל' }, { value: 'van', label: 'טנדר' }, { value: 'truck', label: 'משאית' }]}
        />
      </Field>
      <Field label="📦 מה צריך להעביר?" optional>
        <TextInput placeholder="לדוגמה: ספה, מקרר, קרטונים..." value={val('items')} onChange={set('items')} />
      </Field>
      <Field label="🏠 קומה מוצא">
        <Chips value={val('floor_from')} onChange={set('floor_from')} options={['קרקע', '1', '2', '3', '4+']} />
      </Field>
      <Field label="🏢 קומת יעד">
        <Chips value={val('floor_to')} onChange={set('floor_to')} options={['קרקע', '1', '2', '3', '4+']} />
      </Field>
      <Field label="🛗 יש מעלית?">
        <Chips value={val('elevator')} onChange={set('elevator')} options={[{ value: 'yes', label: 'כן ✅' }, { value: 'no', label: 'אין ❌' }, { value: 'one_side', label: 'רק בצד אחד' }]} />
      </Field>
    </>
  ),

  cleaning: ({ val, set }) => (
    <>
      <Field label="📐 גודל הנכס">
        <Chips value={val('space')} onChange={set('space')} options={['סטודיו', '2 חדרים', '3 חדרים', '4 חדרים', '5+ חדרים']} />
      </Field>
      <Field label="🧹 סוג ניקיון">
        <Chips value={val('cleaning_type')} onChange={set('cleaning_type')} options={[{ value: 'basic', label: 'ניקיון שוטף' }, { value: 'deep', label: 'ניקיון עמוק' }, { value: 'move_in', label: 'כניסה לדירה' }]} />
      </Field>
      <Field label="🧴 ציוד ניקיון">
        <Chips value={val('equipment')} onChange={set('equipment')} options={[{ value: 'worker_brings', label: 'מביא ציוד ✅' }, { value: 'client_has', label: 'יש לי ציוד' }]} />
      </Field>
      <Field label="🛁 מה לנקות?" optional>
        <Chips
          value={val('areas')} onChange={set('areas')} multi
          options={['סלון', 'מטבח', 'שירותים', 'חדרי שינה', 'ממ"ד', 'מרפסת']}
        />
      </Field>
    </>
  ),

  tutoring: ({ val, set }) => (
    <>
      <Field label="📚 מקצוע">
        <Chips
          value={val('subject')} onChange={set('subject')}
          options={['מתמטיקה', 'אנגלית', 'פיזיקה', 'כימיה', 'עברית', 'היסטוריה', 'אחר']}
        />
      </Field>
      <Field label="🎓 רמה">
        <Chips value={val('level')} onChange={set('level')} options={[{ value: 'elementary', label: 'יסודי' }, { value: 'middle', label: 'חטב' }, { value: 'high', label: 'תיכון' }, { value: 'adult', label: 'מבוגר' }]} />
      </Field>
      <Field label="💻 פורמט">
        <Chips value={val('mode')} onChange={set('mode')} options={[{ value: 'physical', label: '📍 פיזי' }, { value: 'online', label: '💻 אונליין' }]} />
      </Field>
      <Field label="⏱️ משך שיעור">
        <Chips value={val('duration')} onChange={set('duration')} options={['45 דקות', 'שעה', 'שעה וחצי', '2 שעות']} />
      </Field>
    </>
  ),

  babysitting: ({ val, set }) => (
    <>
      <Field label="👶 מספר ילדים">
        <Chips value={val('num_children')} onChange={set('num_children')} options={['1', '2', '3', '4+']} />
      </Field>
      <Field label="🎂 גיל הילדים">
        <Chips value={val('age_range')} onChange={set('age_range')} options={['תינוק', '1-3', '3-6', '6-10', '10+']} multi />
      </Field>
      <Field label="⏰ כמה שעות?">
        <Chips value={val('hours')} onChange={set('hours')} options={['1-2', '3-4', '5-6', 'לילה']} />
      </Field>
      <Field label="🐾 פרטים נוספים" optional>
        <TextInput placeholder="לדוגמה: ילד עם צרכים מיוחדים, יש כלב..." value={val('notes')} onChange={set('notes')} />
      </Field>
    </>
  ),

  plumbing: ({ val, set }) => (
    <>
      <Field label="⚡ דחיפות">
        <Chips value={val('urgency')} onChange={set('urgency')} options={[{ value: 'urgent', label: '🚨 דחוף' }, { value: 'today', label: 'היום' }, { value: 'flexible', label: 'גמיש' }]} />
      </Field>
      <Field label="🔧 סוג תקלה">
        <Chips value={val('issue')} onChange={set('issue')} options={['נזילה', 'פקק', 'ברז שבור', 'דוד שמש', 'קולר', 'אחר']} />
      </Field>
    </>
  ),

  electricity: ({ val, set }) => (
    <>
      <Field label="⚡ דחיפות">
        <Chips value={val('urgency')} onChange={set('urgency')} options={[{ value: 'urgent', label: '🚨 דחוף' }, { value: 'today', label: 'היום' }, { value: 'flexible', label: 'גמיש' }]} />
      </Field>
      <Field label="💡 סוג עבודה">
        <Chips value={val('work_type')} onChange={set('work_type')} options={['תיקון תקלה', 'התקנת שקע', 'פנל חשמל', 'תאורה', 'מאוורר', 'אחר']} />
      </Field>
    </>
  ),

  ac: ({ val, set }) => (
    <>
      <Field label="❄️ סוג שירות">
        <Chips value={val('service_type')} onChange={set('service_type')} options={[{ value: 'install', label: '🔧 התקנה' }, { value: 'repair', label: '🛠 תיקון' }, { value: 'clean', label: '🧹 ניקוי' }]} />
      </Field>
      <Field label="📦 מספר יחידות">
        <Chips value={val('num_units')} onChange={set('num_units')} options={['1', '2', '3', '4+']} />
      </Field>
      <Field label="🏠 סוג מזגן" optional>
        <Chips value={val('ac_type')} onChange={set('ac_type')} options={['מפוצל', 'ניידת', 'מרכזי']} />
      </Field>
    </>
  ),

  locksmith: ({ val, set }) => (
    <>
      <Field label="🚨 דחיפות">
        <Chips value={val('urgency')} onChange={set('urgency')} options={[{ value: 'now', label: '🚨 עכשיו!' }, { value: 'today', label: 'היום' }, { value: 'flexible', label: 'גמיש' }]} />
      </Field>
      <Field label="🔑 סוג שירות">
        <Chips value={val('service_type')} onChange={set('service_type')} options={['נעילת חוץ', 'החלפת מנעול', 'כפל מפתח', 'פריצת דלת', 'אחר']} />
      </Field>
    </>
  ),

  gardening: ({ val, set }) => (
    <>
      <Field label="🌿 סוג עבודה">
        <Chips value={val('work_type')} onChange={set('work_type')} multi options={['גיזום', 'כריתה', 'שתילה', 'עשבייה', 'ריסוס']} />
      </Field>
      <Field label="📐 גודל הגינה">
        <Chips value={val('size')} onChange={set('size')} options={['קטנה', 'בינונית', 'גדולה', 'ענק']} />
      </Field>
    </>
  ),

  painting: ({ val, set }) => (
    <>
      <Field label="🖌️ מה לצבוע?">
        <Chips value={val('what')} onChange={set('what')} multi options={['חדר שינה', 'סלון', 'מטבח', 'חזית', 'גדר', 'כל הדירה']} />
      </Field>
      <Field label="📐 שטח משוער">
        <Chips value={val('area')} onChange={set('area')} options={['עד 20 מ"ר', '20-50', '50-100', '100+']} />
      </Field>
      <Field label="🎨 יש צבע?" optional>
        <Chips value={val('has_paint')} onChange={set('has_paint')} options={[{ value: 'yes', label: 'יש לי צבע' }, { value: 'no', label: 'צריך לקנות' }]} />
      </Field>
    </>
  ),

  carpentry: ({ val, set }) => (
    <>
      <Field label="🪚 סוג עבודה">
        <Chips value={val('work_type')} onChange={set('work_type')} options={['הרכבת רהיטים', 'תיקון רהיטים', 'מדפים', 'ארון', 'עבודה מותאמת']} />
      </Field>
      <Field label="📦 פרטים" optional>
        <TextInput placeholder="לדוגמה: ארון IKEA PAX, 2 דלתות..." value={val('details')} onChange={set('details')} />
      </Field>
    </>
  ),

  shopping: ({ val, set }) => (
    <>
      <Field label="🏪 איפה לקנות?">
        <Chips value={val('store_type')} onChange={set('store_type')} options={['סופר', 'פארם', 'אמזון', 'מחסני חשמל', 'אחר']} />
      </Field>
      <Field label="📋 כמה פריטים?">
        <Chips value={val('list_size')} onChange={set('list_size')} options={['1-5', '5-15', '15-30', '30+']} />
      </Field>
    </>
  ),

  delivery: ({ val, set }) => (
    <>
      <Field label="📦 גודל החבילה">
        <Chips value={val('package_size')} onChange={set('package_size')} options={[{ value: 'small', label: 'קטנה 📦' }, { value: 'medium', label: 'בינונית' }, { value: 'large', label: 'גדולה 📫' }, { value: 'very_large', label: 'ענקית' }]} />
      </Field>
      <Field label="⚡ דחיפות">
        <Chips value={val('urgency')} onChange={set('urgency')} options={[{ value: 'urgent', label: 'מיידי' }, { value: 'today', label: 'היום' }, { value: 'flexible', label: 'גמיש' }]} />
      </Field>
    </>
  ),

  it_support: ({ val, set }) => (
    <>
      <Field label="💻 סוג מכשיר">
        <Chips value={val('device')} onChange={set('device')} options={['מחשב נייד', 'מחשב שולחני', 'טלפון', 'טאבלט', 'רשת', 'אחר']} />
      </Field>
      <Field label="🛠 סוג תקלה">
        <Chips value={val('issue')} onChange={set('issue')} options={['וירוס/איטיות', 'התקנה', 'איפוס', 'תיקון חומרה', 'רשת/WiFi', 'אחר']} />
      </Field>
      <Field label="📍 פורמט">
        <Chips value={val('mode')} onChange={set('mode')} options={[{ value: 'physical', label: '📍 פיזי' }, { value: 'remote', label: '💻 מרחוק' }]} />
      </Field>
    </>
  ),
};

// ── Main export ────────────────────────────────────────────────────
export default function CategoryFields({ category, values, onChange }) {
  if (!category || !CONFIGS[category]) return null;

  const val = key => values?.[key] ?? '';
  const set = key => v => onChange({ ...(values || {}), [key]: v });

  const Config = CONFIGS[category];

  return (
    <div
      style={{
        background: 'var(--surface-2)',
        borderRadius: 20,
        padding: '18px 16px',
        border: '1px solid var(--border-1)',
        boxShadow: '0 2px 12px rgba(26,111,212,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        animation: 'catFieldsIn 0.22s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: -4 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1a6fd4' }} />
        <span style={{ fontSize: 12, fontWeight: 800, color: '#1a6fd4', letterSpacing: 0.5 }}>
          פרטים לקטגוריה זו
        </span>
      </div>
      <Config val={val} set={set} />
      <style>{`@keyframes catFieldsIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// ── Helper to format fields as text for description ──────────────
export function formatCategoryFields(category, fields) {
  if (!fields || Object.keys(fields).length === 0) return '';

  const LABELS = {
    vehicle_type: { label: 'רכב', car: 'רכב רגיל', van: 'טנדר', truck: 'משאית' },
    items: { label: 'מה להעביר' },
    floor_from: { label: 'קומה מוצא' },
    floor_to: { label: 'קומת יעד' },
    elevator: { label: 'מעלית', yes: 'יש', no: 'אין', one_side: 'צד אחד בלבד' },
    space: { label: 'גודל נכס' },
    cleaning_type: { label: 'סוג ניקיון', basic: 'שוטף', deep: 'עמוק', move_in: 'כניסה לדירה' },
    equipment: { label: 'ציוד', worker_brings: 'מביא ציוד', client_has: 'יש ציוד' },
    areas: { label: 'אזורים לניקיון' },
    subject: { label: 'מקצוע' },
    level: { label: 'רמה', elementary: 'יסודי', middle: 'חטב', high: 'תיכון', adult: 'מבוגר' },
    mode: { label: 'פורמט', physical: 'פיזי', online: 'אונליין', remote: 'מרחוק' },
    duration: { label: 'משך' },
    num_children: { label: 'מספר ילדים' },
    age_range: { label: 'גיל' },
    hours: { label: 'שעות' },
    notes: { label: 'הערות' },
    urgency: { label: 'דחיפות', urgent: 'דחוף', today: 'היום', flexible: 'גמיש', now: 'עכשיו' },
    issue: { label: 'תקלה' },
    work_type: { label: 'עבודה' },
    service_type: { label: 'שירות', install: 'התקנה', repair: 'תיקון', clean: 'ניקוי' },
    num_units: { label: 'יחידות' },
    ac_type: { label: 'סוג מזגן' },
    what: { label: 'מה לצבוע' },
    area: { label: 'שטח' },
    has_paint: { label: 'צבע', yes: 'יש צבע', no: 'צריך לקנות' },
    size: { label: 'גודל' },
    details: { label: 'פרטים' },
    store_type: { label: 'חנות' },
    list_size: { label: 'כמות פריטים' },
    package_size: { label: 'גודל חבילה', small: 'קטנה', medium: 'בינונית', large: 'גדולה', very_large: 'ענקית' },
    device: { label: 'מכשיר' },
  };

  const lines = Object.entries(fields)
    .filter(([, v]) => v && (Array.isArray(v) ? v.length > 0 : v !== ''))
    .map(([k, v]) => {
      const meta = LABELS[k] || { label: k };
      const display = Array.isArray(v) ? v.join(', ') : (meta[v] || v);
      return `• ${meta.label}: ${display}`;
    });

  return lines.length > 0 ? lines.join('\n') : '';
}