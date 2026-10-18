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
    // ── Where the banner goes, and why it matters ────────────────────────────
    // /join is the profile-completion flow: the stepper that actually collects
    // categories and cities and grants the completion bonus on its last step.
    // /worker-profile is the profile VIEW page — it collects nothing and grants
    // nothing, so sending the banner there meant the tap appeared to do nothing
    // and the bonus was never reached.
    <Link to="/join" id="onboarding-profile-banner" style={{ textDecoration: 'none', display: 'block' }}>
      <HomeCtaBanner theme="blue" icon={Gift} label={label} sublabel={t('cta_profile_sub')} />
    </Link>
  );
}