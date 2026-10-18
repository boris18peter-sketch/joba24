import { useProfessionalScope } from '@/lib/brand/professionalScope';

/**
 * The ONE profession picker.
 *
 * The first-run worker-profile flow and the profile edit screen offer the same
 * professions, translated, from the same source — so the two screens can never
 * drift apart again. A Brand only ever sees the top-level categories it offers,
 * and a category the user already has outside that scope stays stored globally.
 */
export default function ProfessionalCategoryPicker({ selected = [], onToggle, disabled = false }) {
  const scope = useProfessionalScope();

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {scope.professions.map((p) => {
        const active = selected.includes(p.value);
        return (
          <button
            key={p.value}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onToggle?.(p.value)}
            style={{
              padding: '8px 14px', borderRadius: 99,
              cursor: disabled ? 'default' : 'pointer',
              fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
              background: active ? 'var(--brand-primary)' : 'var(--surface-2)',
              color: active ? 'var(--brand-btn-primary-text, white)' : 'var(--text-2)',
              border: `1.5px solid ${active ? 'var(--brand-primary)' : 'var(--border-1)'}`,
              boxShadow: active ? '0 2px 8px rgba(26,111,212,0.25)' : '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'all 0.15s',
              minHeight: 'unset',
            }}
          >
            {active && '✓ '}{p.label}
          </button>
        );
      })}
    </div>
  );
}