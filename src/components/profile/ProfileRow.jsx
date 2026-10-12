import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * ProfileSection — a hairline-separated group of rows with an optional title.
 * No card, no shadow: the grouping itself carries the structure.
 */
export function ProfileSection({ title, children }) {
  return (
    <div style={{ marginTop: 26 }}>
      {title && (
        <div style={{
          padding: '0 20px 8px',
          fontSize: 12.5, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.2,
        }}>
          {title}
        </div>
      )}
      <div style={{ borderTop: '1px solid var(--border-1)' }}>{children}</div>
    </div>
  );
}

/**
 * ProfileRow — the single row primitive of the Profile page.
 * One icon, one label, an optional value, one subtle navigation indicator.
 */
export default function ProfileRow({
  icon: Icon,
  iconColor,
  label,
  value,
  valueColor,
  onClick,
  to,
  danger,
  last,
}) {
  const { isRTL } = useLanguage();
  const Chevron = isRTL ? ChevronLeft : ChevronRight;
  const interactive = !!(onClick || to);

  const inner = (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '0 20px', minHeight: 54,
        background: 'var(--surface-2)',
        borderBottom: last ? 'none' : '1px solid var(--border-1)',
        cursor: interactive ? 'pointer' : 'default',
      }}
    >
      {Icon && (
        <Icon
          size={19}
          strokeWidth={1.9}
          color={iconColor || (danger ? 'var(--color-danger)' : 'var(--text-2)')}
          style={{ flexShrink: 0 }}
        />
      )}

      <span style={{
        flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600,
        color: danger ? 'var(--color-danger)' : 'var(--text-1)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {label}
      </span>

      {value && (
        <span style={{
          fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
          color: valueColor || 'var(--text-3)',
        }}>
          {value}
        </span>
      )}

      {interactive && (
        <Chevron size={17} color="var(--text-3)" style={{ flexShrink: 0, opacity: 0.7 }} />
      )}
    </div>
  );

  if (to) {
    return <Link to={to} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>;
  }
  return <div onClick={onClick}>{inner}</div>;
}