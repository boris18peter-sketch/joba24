import { useLocation } from 'react-router-dom';
import BackButton from '@/components/BackButton';

/**
 * Unified sticky page header — use on ALL inner pages.
 * Props:
 *   title:   string  — page title
 *   right:   JSX     — optional element on the left side (RTL: visually left)
 *   backTo:  string  — optional explicit back path (default: navigate(-1))
 */
export default function PageHeader({ title, right, backTo }) {
  const location = useLocation();
  // A link that recorded where it came from wins: Back then returns the visitor
  // to the exact screen they left — the welcome flow or the join flow — instead
  // of a fixed destination that is only right for one of them.
  const target = location.state?.from || backTo;

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'var(--brand-header-bg, var(--header-bg))',
      color: 'var(--brand-header-text, var(--text-1))',
      backdropFilter: 'blur(8px)',
      // Small fixed top padding. Safe-area (notch) is handled by the Layout
      // wrapper on public pages that render WITHOUT AppHeader (Terms/Privacy/FAQ
      // opened from the login / waiting pages), so the back button clears the
      // notch. Inner pages render below AppHeader, which already provides the
      // top spacing — adding env() here caused a large gap below the AppHeader.
      paddingTop: 8,
      paddingRight: 12,
      paddingBottom: 6,
      paddingLeft: 12,
      borderBottom: '1px solid var(--border-1)',
      display: 'flex', alignItems: 'center', gap: 12
    }}>
      <BackButton to={target} />
      
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>);

}