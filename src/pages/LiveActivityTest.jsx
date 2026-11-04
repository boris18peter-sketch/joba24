import PageHeader from '@/components/PageHeader';
import LiveActivityTestPanel from '@/components/liveActivity/LiveActivityTestPanel';
import RealTaskDiagnostics from '@/components/liveActivity/RealTaskDiagnostics';

/**
 * LiveActivityTest — admin-only, on-device check for the native widget.
 *
 * Reachable only by an admin (see the AdminRoute wrapper in App.jsx), and only
 * useful inside the native iOS app: in a browser every bridge call reports
 * `not_native` and changes nothing.
 *
 * TWO SEPARATE THINGS LIVE HERE, on purpose:
 *  • the local demo panel — a made-up task driven by hand, unchanged;
 *  • the real-task diagnostics — the allowlist and the evidence for REAL tasks.
 * Neither borrows the other's state, so the demo keeps working exactly as it
 * did while the real-task path is tested.
 */
export default function LiveActivityTest() {
  return (
    <div style={{ background: 'var(--surface-1)', minHeight: '100%' }}>
      <PageHeader title="Live Activity — בדיקה מקומית" backTo="/admin" />
      <LiveActivityTestPanel />
      <RealTaskDiagnostics />
    </div>
  );
}