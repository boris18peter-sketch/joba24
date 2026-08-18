import { useState } from 'react';
import { Shield } from 'lucide-react';
import HomeCtaBanner from '@/components/HomeCtaBanner';
import VerifyModal from '@/components/VerifyModal';
import { isUserVerified } from '@/lib/utils';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * VerificationStatusBanner — unified single-line CTA.
 * Opens the full VerifyModal on tap. Hidden once the user is verified.
 */
export default function VerificationStatusBanner({ me }) {
  const [showVerify, setShowVerify] = useState(false);
  const { t } = useLanguage();
  if (!me || isUserVerified(me)) return null;
  return (
    <>
      <HomeCtaBanner
        id="onboarding-verify-banner"
        theme="green"
        icon={Shield}
        label={t('cta_verify')}
        onClick={() => setShowVerify(true)}
      />
      {showVerify && (
        <VerifyModal onClose={() => setShowVerify(false)} onSuccess={() => setShowVerify(false)} />
      )}
    </>
  );
}