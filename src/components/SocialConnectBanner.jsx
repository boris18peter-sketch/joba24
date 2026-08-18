import { Link } from 'react-router-dom';
import HomeCtaBanner from '@/components/HomeCtaBanner';
import { hasSocialVerified } from '@/lib/utils';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * SocialConnectBanner — unified gold CTA with the official gold-check badge icon.
 * Prompts the user to connect a social network to earn the gold badge.
 * Hidden once any social network is verified.
 */
export default function SocialConnectBanner({ me }) {
  const { t } = useLanguage();
  if (!me || hasSocialVerified(me)) return null;
  return (
    <Link to="/profile" id="onboarding-social-banner" style={{ textDecoration: 'none', display: 'block' }}>
      <HomeCtaBanner theme="gold" iconType="social" label={t('cta_social')} />
    </Link>
  );
}