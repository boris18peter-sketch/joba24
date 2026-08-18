import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import VerificationStatusBanner from '@/components/VerificationStatusBanner';
import ProfileCompletionBanner from '@/components/ProfileCompletionBanner';
import SocialConnectBanner from '@/components/SocialConnectBanner';
import { isUserVerified } from '@/lib/utils';

/**
 * HomeBannersCarousel — now a simple stacked list of unified CTA buttons
 * (verification, social, profile completion). No rotation: rotating banners
 * caused overlap with the popups they open. Each CTA stays visible and static;
 * only relevant ones render.
 */
export default function HomeBannersCarousel({ me: meProp }) {
  // Fetch me directly from the query cache so the banners react instantly
  // when profile/verification changes (AuthContext.user may lag behind).
  const { data: meQuery } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me(), staleTime: 0 });
  const me = meQuery || meProp;
  if (!me) return null;

  const showVerify = !isUserVerified(me);
  const showSocial = !showVerify; // social gold CTA only once identity is verified
  const showProfile = !(me.preferred_categories?.length > 0 && me.preferred_cities?.length > 0);

  const items = [];
  if (showVerify) items.push(<VerificationStatusBanner key="verify" me={me} />);
  if (showSocial) items.push(<SocialConnectBanner key="social" me={me} />);
  if (showProfile) items.push(<ProfileCompletionBanner key="profile" me={me} />);

  if (items.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
      {items}
    </div>
  );
}