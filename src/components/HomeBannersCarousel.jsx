import { useState, useEffect } from 'react';
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

export default function HomeBannersCarousel({ me }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const showVerify = !!me && !isUserVerified(me);
  const showProfile = !!me && !(me.preferred_categories?.length > 0 && me.preferred_cities?.length > 0);

  const banners = [];
  if (showVerify) banners.push({ key: 'verify', node: <VerificationStatusBanner me={me} /> });
  if (showProfile) banners.push({ key: 'profile', node: <ProfileCompletionBanner me={me} /> });

  const count = banners.length;
  const current = Math.min(idx, Math.max(0, count - 1));

  useEffect(() => {
    if (count <= 1 || paused) return;
    const t = setInterval(() => setIdx(i => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(t);
  }, [count, paused]);

  if (count === 0) return null;
  if (count === 1) return <div style={{ marginBottom: 12 }}>{banners[0].node}</div>;

  return (
    <div
      style={{ position: 'relative', marginBottom: 14 }}
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerLeave={() => setPaused(false)}
    >
      <div style={{ overflow: 'hidden' }}>
        <div style={{
          display: 'flex',
          transform: `translateX(${-current * 100}%)`,
          transition: 'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1)',
        }}>
          {banners.map(b => (
            <div key={b.key} style={{ flex: '0 0 100%', minWidth: 0, padding: 2, boxSizing: 'border-box' }}>
              {b.node}
            </div>
          ))}
        </div>
      </div>

      {/* Pagination dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 6 }}>
        {banners.map((b, i) => (
          <button
            key={b.key}
            onClick={() => setIdx(i)}
            aria-label={`banner ${i + 1}`}
            style={{
              width: i === current ? 18 : 6,
              height: 6,
              borderRadius: 99,
              border: 'none',
              background: i === current ? '#1a6fd4' : '#cbd5e1',
              cursor: 'pointer',
              padding: 0,
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>
    </div>
  );
}