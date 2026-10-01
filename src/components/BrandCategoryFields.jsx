import { useBrandCategories } from '@/lib/brand/brandCategories';
import { Label } from '@/components/ui/label';

/**
 * BrandCategoryFields — renders the GLOBAL task form for the selected category.
 *
 * The fields come from `GlobalCategory.fields` (Admin → Categories), not from
 * the Brand. That is the whole point of the global form model: improving the
 * Events form once changes it for Joba24, Save A Date and every future Brand
 * that offers Events.
 *
 * Values are merged into the task's `category_details`, so they travel with the
 * Task exactly like the platform's own category extras.
 */
export default function BrandCategoryFields({ category, values = {}, onChange }) {
  const { formFieldsFor } = useBrandCategories();
  const fields = formFieldsFor(category);

  if (!fields.length) return null;

  const set = (key, value) => onChange(key, value);
  const inputStyle = {
    width: '100%', padding: '11px 13px',
    borderRadius: 'var(--brand-input-radius, 12px)',
    border: '1.5px solid var(--brand-input-border, var(--border-1))',
    background: 'var(--brand-input-bg, var(--surface-1))',
    fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    color: 'var(--text-1)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {fields.map((f) => {
        const value = values[f.key];
        const label = f.label || f.key;
        return (
          <div key={f.key}>
            <Label className="text-sm font-bold mb-2 block" style={{ color: 'var(--text-1)' }}>
              {label}{f.required ? ' *' : ''}
            </Label>
            {f.description && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6, lineHeight: 1.5 }}>
                {f.description}
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
                {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
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
                      {o}
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