import { Loader2 } from 'lucide-react';

/**
 * TaskActionButton — the ONE button contract for the task experience.
 *
 * One primary action per surface, one secondary style, one ghost style, all at
 * the same height and radius with the same press feedback. Role-aware labels
 * are supplied by the caller; the visual weight is decided here, so no screen
 * can invent a competing primary action of its own.
 */
const VARIANTS = {
  primary: {
    background: 'var(--brand-btn-primary-bg, var(--brand-primary))',
    color: 'var(--brand-btn-primary-text, #ffffff)',
    border: 'none',
    boxShadow: '0 4px 14px rgba(26,111,212,0.22)',
  },
  success: {
    background: 'linear-gradient(135deg,#059669,#047857)',
    color: '#ffffff',
    border: 'none',
    boxShadow: '0 4px 14px rgba(5,150,105,0.28)',
  },
  secondary: {
    background: 'var(--surface-2)',
    color: 'var(--text-1)',
    border: '1.5px solid var(--border-1)',
    boxShadow: 'none',
  },
  ghost: {
    background: 'var(--surface-3)',
    color: 'var(--text-2)',
    border: '1px solid var(--border-1)',
    boxShadow: 'none',
  },
  danger: {
    background: 'var(--color-danger-bg)',
    color: 'var(--color-danger)',
    border: '1px solid var(--color-danger-border)',
    boxShadow: 'none',
  },
};

export default function TaskActionButton({
  variant = 'primary', icon = null, loading = false, disabled = false,
  height = 46, children, style, ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const off = disabled || loading;
  return (
    <button
      disabled={off}
      style={{
        width: '100%', height,
        borderRadius: 'var(--r-md)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        fontSize: 14, fontWeight: 800,
        cursor: off ? 'not-allowed' : 'pointer',
        opacity: off ? 0.6 : 1,
        WebkitTapHighlightColor: 'transparent',
        ...v,
        ...style,
      }}
      {...rest}
    >
      {loading ? <Loader2 size={17} className="animate-spin" /> : <>{icon}{children}</>}
    </button>
  );
}