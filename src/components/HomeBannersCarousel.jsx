import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import VerificationStatusBanner from '@/components/VerificationStatusBanner';
import ProfileCompletionBanner from '@/components/ProfileCompletionBanner';
import SocialConnectBanner from '@/components/SocialConnectBanner';
import { isUserVerified, hasSocialVerified } from '@/lib/utils';

const ROTATE_MS = 5500;

/**
 * HomeBannersCarousel — rotating single-banner carousel.
 * Shows one CTA at a time and rotates through the relevant ones
 * (verify / social / profile completion) every few seconds.
 */
export default function HomeBannersCarousel({ me: meProp }) {
  // Fetch me directly from the query cache so the banners react instantly
  // when profile/verification changes (AuthContext.user may lag behind).
  const { data: meQuery } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me(), staleTime: 0 });
  const me = meQuery || meProp;
  const [idx, setIdx] = useState(0);

  const showVerify = !!(me && !isUserVerified(me));
  const showSocial = !!(me && isUserVerified(me) && !hasSocialVerified(me));
  const showProfile = !!(me && !(me.preferred_categories?.length > 0 && me.preferred_cities?.length > 0));

  const items = [];
  if (showVerify) items.push(<VerificationStatusBanner key="verify" me={me} />);
  if (showSocial) items.push(<SocialConnectBanner key="social" me={me} />);
  if (showProfile) items.push(<ProfileCompletionBanner key="profile" me={me} />);

  const count = items.length;
  const safeIdx = Math.min(idx, Math.max(count - 1, 0));

  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(() => setIdx(i => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(timer);
  }, [count]);

  if (count === 0) return null;

  return (
    <div style={{ marginBottom: 12 }}>
      <div key={safeIdx} style={{ animation: 'cardFadeIn 0.4s ease-out' }}>
        {items[safeIdx]}
      </div>
      {count > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 8 }}>
          {items.map((_, i) => (
            <span key={i} style={{
              width: i === safeIdx ? 16 : 5,
              height: 5, borderRadius: 99,
              background: i === safeIdx ? '#1a6fd4' : 'var(--border-2)',
              transition: 'all 0.25s ease',
              display: 'inline-block',
            }} />
          ))}
        </div>
      )}
    </div>
  );
}