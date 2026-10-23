/**
 * ChipMultiSelect — the one picker used by every "choose several" control in
 * the simulator (cities, categories, brands).
 *
 * It exists so the Market Maker settings and the manual generator cannot drift
 * apart visually: both draw the same chips, in the same row, with the same
 * selected state. Empty is always meaningful and always spelled out, because
 * "nothing selected" means "all" in some of these and "none" in others.
 */
export default function ChipMultiSelect({
  label, hint, options, value = [], onChange, color = '#0891b2', maxHeight = 128,
}) {
  const toggle = (v) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>
        {label}{value.length > 0 && ` (${value.length} נבחרו)`}
      </label>

      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 4,
        maxHeight, overflowY: 'auto', padding: 4,
        background: '#f8faff', borderRadius: 8, border: '1px solid #dce8f5',
      }}>
        {options.length === 0 && (
          <span style={{ fontSize: 10, color: '#94a3b8', padding: 4 }}>אין אפשרויות זמינות</span>
        )}
        {options.map((o) => {
          const active = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              style={{
                padding: '4px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                cursor: 'pointer',
                background: active ? color : 'white',
                color: active ? 'white' : '#0f2b6b',
                border: `1px solid ${active ? color : '#dce8f5'}`,
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#dc2626', fontSize: 10, fontWeight: 700, cursor: 'pointer', padding: 0 }}
        >
          נקה בחירה
        </button>
      )}

      {hint && <span style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.5 }}>{hint}</span>}
    </div>
  );
}