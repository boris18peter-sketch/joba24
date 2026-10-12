import ProfileSheet from './ProfileSheet';
import ProfileSubscriptionCard from './ProfileSubscriptionCard';
import SubscriptionManager from '@/components/credits/SubscriptionManager';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * SubscriptionSheet — everything subscription-related, unchanged.
 *
 * ProfileSubscriptionCard keeps its own Apple entitlement state, Manage
 * Subscription and Restore Purchases; SubscriptionManager keeps the recurring
 * plan view. Both simply render inside a sheet now.
 */
export default function SubscriptionSheet({ onClose }) {
  const { t } = useLanguage();

  return (
    <ProfileSheet title={t('pr_my_subscription')} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 8 }}>
        <ProfileSubscriptionCard />
        <SubscriptionManager />
      </div>
    </ProfileSheet>
  );
}