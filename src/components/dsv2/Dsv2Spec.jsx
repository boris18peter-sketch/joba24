const COLORS = [
  { hex: '#1a6fd4', name: 'Joba Blue', use: 'פעולה ראשית / מותג' },
  { hex: '#155cb0', name: 'Blue Dark', use: 'מצב לחוץ' },
  { hex: '#0f1e40', name: 'Ink', use: 'טקסט ראשי' },
  { hex: '#5b6b85', name: 'Ink 2', use: 'טקסט משני' },
  { hex: '#93a1b8', name: 'Ink 3', use: 'מטא' },
  { hex: '#ffffff', name: 'Surface', use: 'משטח ראשי' },
  { hex: '#f5f7fb', name: 'Soft', use: 'רקע עמוד' },
  { hex: '#e9eef6', name: 'Line', use: 'קו מפריד' },
  { hex: '#f5b32a', name: 'Joba Yellow', use: 'ג׳ובות / תגמול בלבד' },
  { hex: '#16a34a', name: 'Green', use: 'הצלחה / אימות בלבד' },
  { hex: '#dc2626', name: 'Red', use: 'שגיאה / דחוף בלבד' },
];

const TYPE = [
  { label: 'כותרת עמוד', spec: '22 · 800', style: { fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px' } },
  { label: 'כותרת מקטע', spec: '15 · 700', style: { fontSize: 15, fontWeight: 700 } },
  { label: 'גוף', spec: '15 · 400', style: { fontSize: 15, fontWeight: 400 } },
  { label: 'מטא', spec: '13 · 500', style: { fontSize: 13, fontWeight: 500, color: 'var(--v2-ink-3)' } },
];

function Block({ title, children }) {
  return (
    <div>
      <p className="v2-label">{title}</p>
      <div style={{ marginTop: 14 }}>{children}</div>
    </div>
  );
}

/** The written Design System V2 — tokens and primitives in one sheet. */
export default function Dsv2Spec() {
  return (
    <div className="v2-card" style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 760 }}>

      <Block title="צבעים">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          {COLORS.map(c => (
            <div key={c.hex} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: c.hex, border: '1px solid var(--v2-line)',
              }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--v2-ink)' }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--v2-ink-3)' }}>{c.use}</div>
              </div>
            </div>
          ))}
        </div>
      </Block>

      <Block title="טיפוגרפיה — 4 דרגות בלבד">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {TYPE.map(tp => (
            <div key={tp.label} style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
              <span style={{ width: 110, flexShrink: 0, fontSize: 12, color: 'var(--v2-ink-3)', fontWeight: 600 }}>{tp.label}</span>
              <span style={{ ...tp.style, color: tp.style.color || 'var(--v2-ink)' }}>משימות בקרבתך</span>
              <span style={{ fontSize: 11, color: 'var(--v2-ink-3)', marginInlineStart: 'auto' }}>{tp.spec}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block title="ריווח ופינות">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 18 }}>
          {[8, 16, 24, 32].map(s => (
            <div key={s} style={{ textAlign: 'center' }}>
              <div style={{ width: s, height: s, background: 'var(--v2-blue-soft)', border: '1px solid #cfe0f7', borderRadius: 4 }} />
              <div style={{ fontSize: 11, color: 'var(--v2-ink-3)', marginTop: 6 }}>{s}</div>
            </div>
          ))}
          <span className="v2-meta" style={{ marginInlineStart: 10 }}>רשת של 8px</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {[12, 18, 999].map(r => (
            <div key={r} style={{ textAlign: 'center' }}>
              <div style={{ width: 54, height: 40, background: '#fff', border: '1px solid var(--v2-line)', borderRadius: r }} />
              <div style={{ fontSize: 11, color: 'var(--v2-ink-3)', marginTop: 6 }}>{r}</div>
            </div>
          ))}
          <span className="v2-meta" style={{ marginInlineStart: 10 }}>בקרות · כרטיסים · תגיות</span>
        </div>
      </Block>

      <Block title="כפתורים">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <button className="v2-btn v2-btn-primary">הגש בקשה</button>
          <button className="v2-btn v2-btn-secondary">שמור</button>
          <button className="v2-btn v2-btn-tertiary">ביטול</button>
        </div>
      </Block>

      <Block title="תגיות">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="v2-chip v2-chip-quiet">גמיש</span>
          <span className="v2-chip v2-chip-danger">דחוף</span>
          <span className="v2-chip v2-chip-ok">מאומת</span>
        </div>
      </Block>

      <Block title="קלט">
        <div className="v2-field" style={{ maxWidth: 320 }}>
          <input className="v2-input" placeholder="חיפוש משימה" readOnly />
        </div>
      </Block>

    </div>
  );
}