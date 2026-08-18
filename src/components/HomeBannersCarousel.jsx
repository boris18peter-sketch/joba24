import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import VerificationStatusBanner from '@/components/VerificationStatusBanner';
import ProfileCompletionBanner from '@/components/ProfileCompletionBanner';
import { isUserVerified } from '@/lib/utils';

/**
 * HomeBannersCarousel — rotates the home-screen banners (verification +
 * profile completion) side-by-side in a horizontal carousel instead of
 * stacking them vertically. Only banners that are relevant to the user are
 * shown; if just one is relevant it renders statically (no rotation).
 *
 * Auto-advances every ROTATE_MS; pauses while the user touches it.
 */
const ROTATE_MS = 6000;

export default function HomeBannersCarousel({ me: meProp }) {
  const [idx, setIdx] = useState(0);
  // Fetch me directly from the query cache so the banners react instantly
  // when profile/verification changes (AuthContext.user may lag behind).
  const { data: meQuery } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me(), staleTime: 0 });
  const me = meQuery || meProp;

  const showVerify = !!me && !isUserVerified(me);
  const showProfile = !!me && !(me.preferred_categories?.length > 0 && me.preferred_cities?.length > 0);

  const banners = [];
  if (showVerify) banners.push({ key: 'verify', node: <VerificationStatusBanner me={me} /> });
  if (showProfile) banners.push({ key: 'profile', node: <ProfileCompletionBanner me={me} /> });

  const count = banners.length;
  const current = Math.min(idx, Math.max(0, count - 1));

  // Auto-rotate only when there are multiple banners. No pause-on-touch: that
  // handler was fragile (pointerup not firing during scroll) and could freeze
  // the carousel so the second banner never appeared.
  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(t);
  }, [count]);

  // Nothing to show (both verification and profile complete) → render nothing.
  if (count === 0) return null;
  // Single relevant banner → render it statically, no dots, no empty space.
  if (count === 1) return <div style={{ marginBottom: 12 }}>{banners[0].node}</div>;

  return (
    <div style={{ marginBottom: 14 }}>
      {/* All banners are mounted but only the active one is visible.
          This prevents popups (e.g. VerifyModal) from closing when the
          carousel auto-rotates — the banner stays mounted, its modal stays open. */}
      {banners.map((b, i) => (
        <div
          key={b.key}
          style={{
            display: i === current ? 'block' : 'none',
            animation: i === current ? 'fadeIn 0.4s ease-out' : 'none',
          }}
        >
          {b.node}
        </div>
      ))}

      {/* Pagination dots — small, elegant pills. Inline min-height/min-width
          override the global `button { min-height: 44px }` tap-target rule,
          which otherwise inflates these into giant circles. */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
        {banners.map((b, i) => (
          <button
            key={b.key}
            onClick={() => setIdx(i)}
            aria-label={`banner ${i + 1}`}
            className="j-icon-btn"
            style={{
              width: i === current ? 20 : 7,
              height: 7,
              minHeight: 7,
              minWidth: 7,
              borderRadius: 99,
              border: 'none',
              background: i === current ? 'var(--brand-primary)' : '#cbd5e1',
              cursor: 'pointer',
              padding: 0,
              transition: 'width 0.3s, background 0.3s',
            }}
          />
        ))}
      </div>
    </div>
  );
}