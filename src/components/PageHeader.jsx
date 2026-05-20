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
      background: 'rgba(244,247,251,0.97)',
      backdropFilter: 'blur(8px)',
      padding: '14px 16px 12px',
      borderBottom: '1px solid #dce8f5',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <BackButton to={backTo} />
      <span style={{ fontWeight: 800, fontSize: 17, color: '#0f2b6b', flex: 1 }}>{title}</span>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}