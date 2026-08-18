import { Link } from 'react-router-dom';
import { Award } from 'lucide-react';
import HomeCtaBanner from '@/components/HomeCtaBanner';
import { hasSocialVerified } from '@/lib/utils';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * SocialConnectBanner — unified single-line gold CTA.
 * Prompts the user to connect a social network to earn the gold badge.
 * Hidden once any social network is verified.
 */
export default function SocialConnectBanner({ me }) {
  const { t } = useLanguage();
  if (!me || hasSocialVerified(me)) return null;
  return (
    <Link to="/profile" id="onboarding-social-banner" style={{ textDecoration: 'none', display: 'block' }}>
      <HomeCtaBanner theme="gold" icon={Award} label={t('cta_social')} />
    </Link>
  );
}