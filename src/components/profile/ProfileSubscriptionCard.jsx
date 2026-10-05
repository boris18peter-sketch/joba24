import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Settings, Calendar, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  isIosNative,
  getServerSubscriptionState,
  openIosManageSubscriptions,
  restoreIosPurchases,
  syncIosSubscriptionEntitlements,
} from '@/lib/iosIap';

// Normalized Joba24 subscription state → label + colour.
// Apple remains authoritative; this is the server-side projection.
const STATUS_META = {
  active: { label: 'פעיל', bg: 'var(--color-success-bg)', color: 'var(--color-success)', border: 'var(--color-success-border)' },
  cancelled_active: { label: 'מבוטל — פעיל עד תום התקופה', bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', border: 'var(--color-warning-border)' },
  billing_issue: { label: 'בעיית חיוב', bg: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: 'var(--color-danger-border)' },
  grace_period: { label: 'בתקופת חסד', bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', border: 'var(--color-warning-border)' },
  expired: { label: 'פג תוקף', bg: 'var(--surface-3)', color: 'var(--text-2)', border: 'var(--border-1)' },
  refunded: { label: 'הוחזר', bg: 'var(--surface-3)', color: 'var(--text-2)', border: 'var(--border-1)' },
  revoked: { label: 'בוטל על ידי Apple', bg: 'var(--surface-3)', color: 'var(--text-2)', border: 'var(--border-1)' },
  unknown: { label: 'לא ידוע', bg: 'var(--surface-3)', color: 'var(--text-2)', border: 'var(--border-1)' },
};

function formatDate(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return null;
  }
}

/**
 * ProfileSubscriptionCard — "המנוי שלי".
 *
 * Reads the SERVER-SIDE normalized entitlement (AppleSubscription), not the
 * device's StoreKit state, so it is correct across reinstalls and devices.
 * Renders nothing on web/Android when the user has no Apple subscription.
 */
export default function ProfileSubscriptionCard() {
  const queryClient = useQueryClient();
  const ios = isIosNative();
  const [restoring, setRestoring] = useState(false);

  // THE source of truth for Apple subscription state: the backend's normalized
  // entitlement (AppleSubscription). StoreKit on the device is used ONLY to
  // reconcile the backend — never to render a second, possibly-contradicting
  // state next to this one.
  const { data: sub, isLoading } = useQuery({
    queryKey: ['appleSubscription'],
    queryFn: getServerSubscriptionState,
    staleTime: 30000,
    enabled: ios,
  });

  // StoreKit can know about an active subscription the backend has not recorded
  // yet (server-side verification is what creates the record). Rather than claim
  // "no active subscription" during that window, reconcile once from Apple and
  // read the backend again. This is a RECONCILIATION, not a grant: the backend
  // is idempotent per Apple transaction, so an already-processed period adds 0
  // Jobas. It reuses the app's existing sync path — no new credit logic.
  const { data: reconciled, isFetching: reconciling } = useQuery({
    queryKey: ['appleSubscriptionReconcile'],
    queryFn: async () => {
      await syncIosSubscriptionEntitlements();
      const fresh = await getServerSubscriptionState();
      queryClient.setQueryData(['appleSubscription'], fresh);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      return fresh;
    },
    enabled: ios && !isLoading && !sub,
    staleTime: Infinity,
    retry: 0,
  });

  const entitlement = sub || reconciled || null;
  const syncing = ios && !entitlement && (isLoading || reconciling);

  const meta = STATUS_META[entitlement?.status] || STATUS_META.unknown;
  const periodEnd = formatDate(entitlement?.period_end);
  const isActive = ['active', 'cancelled_active', 'grace_period'].includes(entitlement?.status);

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const res = await restoreIosPurchases();
      await queryClient.invalidateQueries({ queryKey: ['appleSubscription'] });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success(
        res.subscriptions > 0
          ? 'המנוי אומת מול Apple'
          : res.recovered > 0
            ? 'שוחזרו רכישות שלא הושלמו'
            : 'לא נמצאו רכישות לשחזור',
      );
    } catch {
      toast.error('השחזור נכשל, נסו שוב');
    } finally {
      setRestoring(false);
    }
  };

  const handleManage = async () => {
    const ok = await openIosManageSubscriptions();
    if (!ok) toast.error('לא ניתן לפתוח את ניהול המנוי');
  };

  // Nothing to show: not on iOS and no server-side subscription.
  if (!ios && !entitlement) return null;
  if (syncing) {
    return (
      <div style={{
        background: 'var(--brand-card-bg, var(--surface-2))',
        borderRadius: 14, border: '1px solid var(--border-1)', padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)',
      }}>
        <Loader2 size={15} className="animate-spin" /> מסנכרן מנוי מול Apple…
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--brand-card-bg, var(--surface-2))',
      borderRadius: 14,
      border: '1px solid var(--border-1)',
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <CheckCircle2 size={13} color="var(--text-3)" />
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)' }}>המנוי שלי</span>
      </div>

      {entitlement ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-1)' }}>
              {entitlement.credits_per_period ? `מנוי ${entitlement.credits_per_period} ג'ובות בחודש` : 'מנוי חודשי'}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 99,
              background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, whiteSpace: 'nowrap',
            }}>
              {meta.label}
            </span>
          </div>

          {periodEnd && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-2)', marginBottom: 12 }}>
              <Calendar size={12} />
              {isActive
                ? (entitlement.auto_renew_status === false ? `פעיל עד ${periodEnd}` : `מתחדש ב-${periodEnd}`)
                : `הסתיים ב-${periodEnd}`}
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
          לא נמצא מנוי פעיל המשויך לחשבון זה.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {entitlement && (
          <button
            onClick={handleManage}
            style={{
              width: '100%', height: 44, borderRadius: 12,
              background: 'var(--surface-3)', border: '1px solid var(--border-1)',
              color: 'var(--text-1)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Settings size={15} /> ניהול המנוי
          </button>
        )}
        <button
          onClick={handleRestore}
          disabled={restoring}
          style={{
            width: '100%', height: 44, borderRadius: 12,
            background: 'var(--surface-3)', border: '1px solid var(--border-1)',
            color: 'var(--text-1)', fontWeight: 700, fontSize: 14,
            cursor: restoring ? 'not-allowed' : 'pointer', opacity: restoring ? 0.6 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {restoring ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          שחזור רכישות
        </button>
      </div>
    </div>
  );
}