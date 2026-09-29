import { Pencil } from 'lucide-react';
import { NAME_MAX_LENGTH } from '@/lib/displayName';

/**
 * The profile name, edited in place — the only place the name is changed.
 * Sits right where the name is displayed; the page's top Save button persists it.
 */
export default function InlineNameField({ value, onChange, error, placeholder }) {
  return (
    <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          type="text"
          value={value}
          maxLength={NAME_MAX_LENGTH}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="j-input"
          style={{
            width: '100%',
            height: 46,
            padding: '0 42px',
            textAlign: 'center',
            fontSize: 17,
            fontWeight: 900,
            borderColor: error ? 'var(--color-danger)' : undefined,
          }}
        />
        <Pencil
          size={15}
          color="#1a6fd4"
          style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', insetInlineEnd: 14, pointerEvents: 'none' }}
        />
      </div>
      {error && (
        <div style={{ fontSize: 12, color: 'var(--color-danger)', fontWeight: 600, marginTop: 6 }}>{error}</div>
      )}
    </div>
  );
}