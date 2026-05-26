import BackButton from '@/components/BackButton';

/**
 * Unified sticky page header — use on ALL inner pages.
 * Props:
 *   title:   string  — page title
 *   right:   JSX     — optional element on the left side (RTL: visually left)
 *   backTo:  string  — optional explicit back path (default: navigate(-1))
 */
export default function PageHeader({ title, right, backTo }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'var(--header-bg)',
      backdropFilter: 'blur(8px)',
      padding: '14px 16px 12px',
      borderBottom: '1px solid var(--border-1)',
      display: 'flex', alignItems: 'center', gap: 12
    }}>
      <BackButton to={backTo} />
      
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>);

}