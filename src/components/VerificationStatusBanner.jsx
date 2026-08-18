import { useState } from 'react';
import HomeCtaBanner from '@/components/HomeCtaBanner';
import VerifyModal from '@/components/VerifyModal';
import { isUserVerified } from '@/lib/utils';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * VerificationStatusBanner — unified CTA, status-aware.
 * Text adapts to kyc_status: unverified / pending (awaiting review) / rejected.
 * Uses the official green-check badge icon. Used on both Home feed and Profile
 * so the banner is identical everywhere.
 */
export default function VerificationStatusBanner({ me }) {
  const [showVerify, setShowVerify] = useState(false);
  const { t } = useLanguage();
  if (!me || isUserVerified(me)) return null;

  const status = me?.kyc_status;
  let label, sublabel;
  if (status === 'pending') {
    label = t('pr_verify_pending');
    sublabel = t('pr_verify_pending_sub');
  } else if (status === 'rejected') {
    label = t('pr_verify_rejected');
    sublabel = t('pr_verify_rejected_sub');
  } else {
    label = t('cta_verify');
    sublabel = t('verify_sub');
  }

  return (
    <>
      <HomeCtaBanner
        id="onboarding-verify-banner"
        theme="green"
        iconType="verify"
        label={label}
        sublabel={sublabel}
        onClick={() => setShowVerify(true)}
      />
      {showVerify && (
        <VerifyModal onClose={() => setShowVerify(false)} onSuccess={() => setShowVerify(false)} />
      )}
    </>
  );
}