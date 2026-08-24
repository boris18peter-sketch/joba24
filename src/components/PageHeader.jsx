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
      // Respect the device safe area (notch / status bar) so the back button is
      // always tappable even on pages with no upper header (Terms/Privacy opened
      // from the login / waiting pages).
      paddingTop: 'max(7px, env(safe-area-inset-top))',
      paddingRight: 12,
      paddingBottom: 6,
      paddingLeft: 12,
      borderBottom: '1px solid var(--border-1)',
      display: 'flex', alignItems: 'center', gap: 12
    }}>
      <BackButton to={backTo} />
      
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>);

}