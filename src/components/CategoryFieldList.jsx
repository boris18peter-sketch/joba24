import { Label } from '@/components/ui/label';

/**
 * ONE rendered task form — a category's questions, exactly as the publisher
 * meets them.
 *
 * It is its own component because there are now TWO places that must render a
 * category's form, and they must never drift apart:
 *
 *   · the publish form itself (BrandCategoryFields), which resolves the
 *     category's fields from the global catalogue and translates them, and
 *   · the LIVE PREVIEW inside Admin → Categories, where the whole point is that
 *     the admin sees the form they are editing as the publisher will see it.
 *
 * The preview cannot reuse the publish path directly: that path reads the SAVED
 * catalogue, so it would show the form as it was before the admin's edits — the
 * opposite of a preview. Both therefore render through this one component, which
 * takes the fields as a prop: resolved-and-translated in the form, raw and
 * in-progress in the editor.
 */
export default function CategoryFieldList({ fields = [], values = {}, onChange, tr = (s) => s }) {
  if (!fields.length) return null;

  const set = (key, value) => onChange?.(key, value);
  const inputStyle = {
    width: '100%', padding: '11px 13px',
    borderRadius: 'var(--brand-input-radius, 12px)',
    border: '1.5px solid var(--brand-input-border, var(--border-1))',
    background: 'var(--brand-input-bg, var(--surface-1))',
    fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    color: 'var(--brand-input-text, var(--text-1))',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {fields.map((f) => {
        const value = values[f.key];
        const label = tr(f.label) || f.key;
        return (
          <div key={f.key}>
            <Label className="text-sm font-bold mb-2 block" style={{ color: 'var(--text-1)' }}>
              {label}{f.required ? ' *' : ''}
            </Label>
            {f.description && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6, lineHeight: 1.5 }}>
                {tr(f.description)}
              </div>
            )}

            {f.type === 'boolean' ? (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-1)', cursor: 'pointer' }}>
                <input type="checkbox" checked={value === true} onChange={(e) => set(f.key, e.target.checked)} />
                {label}
              </label>
            ) : f.type === 'select' ? (
              <select style={inputStyle} value={value ?? ''} onChange={(e) => set(f.key, e.target.value)}>
                <option value="">—</option>
                {(f.options || []).map((o) => <option key={o} value={o}>{tr(o)}</option>)}
              </select>
            ) : f.type === 'multiselect' ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(f.options || []).map((o) => {
                  const list = Array.isArray(value) ? value : [];
                  const on = list.includes(o);
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => set(f.key, on ? list.filter((x) => x !== o) : [...list, o])}
                      style={{
                        padding: '9px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                        cursor: 'pointer',
                        border: `1.5px solid ${on ? 'var(--brand-primary)' : 'var(--border-1)'}`,
                        background: on ? 'var(--brand-primary-light)' : 'var(--surface-1)',
                        color: on ? 'var(--brand-primary)' : 'var(--text-2)',
                      }}
                    >
                      {tr(o)}
                    </button>
                  );
                })}
              </div>
            ) : f.type === 'textarea' ? (
              <textarea
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
                value={value ?? ''}
                onChange={(e) => set(f.key, e.target.value)}
              />
            ) : (
              <input
                type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'time' ? 'time' : 'text'}
                style={inputStyle}
                value={value ?? ''}
                onChange={(e) => set(f.key, e.target.value)}
                {...(f.validation?.min !== undefined ? { min: f.validation.min } : {})}
                {...(f.validation?.max !== undefined ? { max: f.validation.max } : {})}
                {...(f.validation?.max_length !== undefined ? { maxLength: f.validation.max_length } : {})}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}