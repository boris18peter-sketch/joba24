const ROWS = [
  { key: 'current', label: 'היום', color: '#64748b', bg: '#f1f5f9' },
  { key: 'problem', label: 'הבעיה', color: '#b45309', bg: '#fffbeb' },
  { key: 'v2', label: 'ההצעה', color: '#155cb0', bg: '#eff6ff' },
];

function NoteRow({ row, text }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{
        flexShrink: 0, fontSize: 12, fontWeight: 700, color: row.color, background: row.bg,
        borderRadius: 999, padding: '3px 10px', whiteSpace: 'nowrap',
      }}>{row.label}</span>
      <p className="v2-body" style={{ fontSize: 14, color: 'var(--v2-ink-2)' }}>{text}</p>
    </div>
  );
}

/** Review wrapper: the Current → Problem → V2 reasoning that sits above each prototype. */
export default function Dsv2Section({ title, subtitle, current, problem, v2, children }) {
  return (
    <section style={{ marginTop: 64 }}>
      <h2 className="v2-title">{title}</h2>
      {subtitle && <p className="v2-body" style={{ marginTop: 8, maxWidth: 660 }}>{subtitle}</p>}

      <div style={{
        marginTop: 20, background: '#fff', border: '1px solid var(--v2-line)', borderRadius: 18,
        padding: 22, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760,
      }}>
        <NoteRow row={ROWS[0]} text={current} />
        <NoteRow row={ROWS[1]} text={problem} />
        <NoteRow row={ROWS[2]} text={v2} />
      </div>

      <div style={{ marginTop: 32 }}>{children}</div>
    </section>
  );
}