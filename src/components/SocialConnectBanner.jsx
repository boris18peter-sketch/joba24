import { useState } from 'react';
import HomeCtaBanner from '@/components/HomeCtaBanner';
import SocialConnectSheet from '@/components/SocialConnectSheet';
import { hasSocialVerified } from '@/lib/utils';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * SocialConnectBanner — unified gold CTA with the official gold-check badge icon.
 * Used on the Home feed: clicking opens the social-connect sheet directly so the
 * user can start the process without navigating to the profile page.
 * Hidden once any social network is verified.
 */
export default function SocialConnectBanner({ me }) {
  const { t } = useLanguage();
  const [showConnect, setShowConnect] = useState(false);
  if (!me || hasSocialVerified(me)) return null;
  return (
    <>
      <div id="onboarding-social-banner" onClick={() => setShowConnect(true)}>
        <HomeCtaBanner theme="gold" iconType="social" label={t('cta_social')} />
      </div>
      {showConnect && (
        <SocialConnectSheet user={me} onClose={() => setShowConnect(false)} />
      )}
    </>
  );
}