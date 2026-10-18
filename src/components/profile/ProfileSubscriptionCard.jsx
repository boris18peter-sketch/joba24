import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Settings, Calendar, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';
import {
  isIosNative,
  getServerSubscriptionState,
  openIosManageSubscriptions,
  restoreIosPurchases,
  syncIosSubscriptionEntitlements,
} from '@/lib/iosIap';

// Normalized Joba24 subscription state → translation key + colour tone.
// Apple remains authoritative; this is the server-side projection.
const STATUS_META = {
  active: { key: 'sub_status_active', tone: 'success' },
  cancelled_active: { key: 'sub_status_cancelled', tone: 'warning' },
  billing_issue: { key: 'sub_status_billing', tone: 'danger' },
  grace_period: { key: 'sub_status_grace', tone: 'warning' },
  expired: { key: 'sub_status_expired', tone: 'muted' },
  refunded: { key: 'sub_status_refunded', tone: 'muted' },
  revoked: { key: 'sub_status_revoked', tone: 'muted' },
  unknown: { key: 'sub_status_unknown', tone: 'muted' },
};

const TONE = {
  success: { bg: 'var(--color-success-bg)', color: 'var(--color-success)', border: 'var(--color-success-border)' },
  warning: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', border: 'var(--color-warning-border)' },
  danger: { bg: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: 'var(--color-danger-border)' },
  muted: { bg: 'var(--surface-3)', color: 'var(--text-2)', border: 'var(--border-1)' },
};

// One date format per UI language, so the renewal date is never rendered with a
// Hebrew locale inside an English, Russian or Chinese screen.
const LOCALES = {
  he: 'he-IL', ar: 'ar-IL', en: 'en-GB', es: 'es-ES',
  fr: 'fr-FR', ru: 'ru-RU', fil: 'en-PH', hi: 'hi-IN', zh: 'zh-CN',
};

/**
 * ProfileSubscriptionCard — "המנוי שלי".
 *
 * Reads the SERVER-SIDE normalized entitlement (AppleSubscription), not the
 * device's StoreKit state, so it is correct across reinstalls and devices.
 * Renders nothing on web/Android when the user has no Apple subscription.
 */
export default function ProfileSubscriptionCard() {
  const queryClient = useQueryClient();
  const { t, lang } = useLanguage();
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

  const status = entitlement?.status;
  const meta = STATUS_META[status] || STATUS_META.unknown;

  // ── Does it actually renew? ────────────────────────────────────────────────
  // Only when Apple reports auto-renew as ON. A subscription the user has
  // cancelled is still ENTITLED until the period ends, but it will never renew —
  // so the card must say it expires, never that it renews. Reading "renews on
  // <date>" after cancelling is the one thing this card must not do.
  const willRenew = entitlement?.auto_renew_status === true;
  const isActive = ['active', 'cancelled_active', 'grace_period'].includes(status);

  // A live subscription that will not renew is shown as such, not as a plain
  // green "active".
  const badge = isActive && !willRenew
    ? { key: 'sub_status_cancelled', tone: 'warning' }
    : meta;
  const badgeTone = TONE[badge.tone];

  const periodEnd = (() => {
    if (!entitlement?.period_end) return null;
    try {
      return new Date(entitlement.period_end).toLocaleDateString(LOCALES[lang] || 'he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return null;
    }
  })();

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const res = await restoreIosPurchases();
      await queryClient.invalidateQueries({ queryKey: ['appleSubscription'] });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success(
        res.subscriptions > 0
          ? t('sub_restored_verified')
          : res.recovered > 0
            ? t('sub_restored_recovered')
            : t('sub_restored_none'),
      );
    } catch {
      toast.error(t('sub_restore_failed'));
    } finally {
      setRestoring(false);
    }
  };

  const handleManage = async () => {
    const ok = await openIosManageSubscriptions();
    if (!ok) toast.error(t('sub_manage_failed'));
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
        <Loader2 size={15} className="animate-spin" /> {t('sub_syncing')}
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
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)' }}>{t('sub_title')}</span>
      </div>

      {entitlement ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-1)' }}>
              {entitlement.credits_per_period
                ? t('sub_monthly_n', { n: entitlement.credits_per_period })
                : t('sub_monthly')}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 99,
              background: badgeTone.bg, color: badgeTone.color, border: `1px solid ${badgeTone.border}`, whiteSpace: 'nowrap',
            }}>
              {t(badge.key)}
            </span>
          </div>

          {periodEnd && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-2)', marginBottom: 12 }}>
              <Calendar size={12} />
              {isActive
                ? (willRenew ? t('sub_renews_on', { date: periodEnd }) : t('sub_active_until', { date: periodEnd }))
                : t('sub_ended_on', { date: periodEnd })}
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
          {t('sub_none')}
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
            <Settings size={15} /> {t('sub_manage')}
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
          {t('sub_restore')}
        </button>
      </div>
    </div>
  );
}