import PageHeader from '@/components/PageHeader';
import LiveActivityTestPanel from '@/components/liveActivity/LiveActivityTestPanel';

/**
 * LiveActivityTest — admin-only, on-device check for the native widget.
 *
 * Reachable only by an admin (see the AdminRoute wrapper in App.jsx), and only
 * useful inside the native iOS app: in a browser every bridge call reports
 * `not_native` and changes nothing.
 */
export default function LiveActivityTest() {
  return (
    <div style={{ background: 'var(--surface-1)', minHeight: '100%' }}>
      <PageHeader title="Live Activity (local test)" backTo="/admin" />
      <LiveActivityTestPanel />
    </div>
  );
}