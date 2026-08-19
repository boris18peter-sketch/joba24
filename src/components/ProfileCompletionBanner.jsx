import { Link } from 'react-router-dom';
import { Gift } from 'lucide-react';
import HomeCtaBanner from '@/components/HomeCtaBanner';
import { useJobaSettings } from '@/hooks/useJobaSettings';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * ProfileCompletionBanner — unified blue CTA with a gift icon.
 * Hidden once the user has both preferred categories and cities.
 */
export default function ProfileCompletionBanner({ me }) {
  const { settings } = useJobaSettings();
  const { t } = useLanguage();
  const profileBonus = settings.profile_completion_bonus ?? 0;
  if (!me) return null;
  const isComplete = me.preferred_categories?.length > 0 && me.preferred_cities?.length > 0;
  if (isComplete) return null;
  const label = profileBonus > 0 ? t('cta_profile_bonus').replace('{n}', profileBonus) : t('cta_profile');
  return (
    <Link to="/worker-profile" id="onboarding-profile-banner" style={{ textDecoration: 'none', display: 'block' }}>
      <HomeCtaBanner theme="blue" icon={Gift} label={label} sublabel={t('cta_profile_sub')} />
    </Link>
  );
}