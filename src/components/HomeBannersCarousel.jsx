import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import VerificationStatusBanner from '@/components/VerificationStatusBanner';
import ProfileCompletionBanner from '@/components/ProfileCompletionBanner';
import SocialConnectBanner from '@/components/SocialConnectBanner';
import { isUserVerified, hasSocialVerified } from '@/lib/utils';

const ROTATE_MS = 5000;
const MAX_AUTO_ROTATIONS = 2; // auto-rotate twice, then manual-only (swipe / dots)

/**
 * HomeBannersCarousel — keeps all relevant CTA banners mounted at once (so an
 * open popup like VerifyModal is never unmounted by a rotation), auto-advances
 * twice, then lets the user swipe / tap dots to page manually. Smooth CSS track.
 */
export default function HomeBannersCarousel({ me: meProp }) {
  const { isRTL } = useLanguage();
  // Fetch me directly so the banners react instantly when profile/verification changes.
  const { data: meQuery } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me(), staleTime: 0 });
  const me = meQuery || meProp;

  const [idx, setIdx] = useState(0);
  const [autoRotations, setAutoRotations] = useState(0);
  const touchStartX = useRef(null);

  const showVerify = !!(me && !isUserVerified(me));
  const showSocial = !!(me && isUserVerified(me) && !hasSocialVerified(me));
  const showProfile = !!(me && !(me.preferred_categories?.length > 0 && me.preferred_cities?.length > 0));

  const items = [];
  if (showVerify) items.push({ key: 'verify', node: <VerificationStatusBanner key="verify" me={me} /> });
  if (showSocial) items.push({ key: 'social', node: <SocialConnectBanner key="social" me={me} /> });
  if (showProfile) items.push({ key: 'profile', node: <ProfileCompletionBanner key="profile" me={me} /> });

  const count = items.length;
  const safeIdx = Math.min(idx, Math.max(count - 1, 0));

  // Reset paging when the set of visible banners changes
  useEffect(() => { setIdx(0); setAutoRotations(0); }, [showVerify, showSocial, showProfile]);

  // Auto-rotate up to MAX_AUTO_ROTATIONS times, then stop (manual only)
  useEffect(() => {
    if (count <= 1) return;
    if (autoRotations >= MAX_AUTO_ROTATIONS) return;
    const timer = setInterval(() => {
      setIdx(i => (i + 1) % count);
      setAutoRotations(r => r + 1);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [count, autoRotations]);

  if (count === 0) return null;

  const goNext = () => setIdx(i => (i + 1) % count);
  const goPrev = () => setIdx(i => (i - 1 + count) % count);

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) { isRTL ? (dx > 0 ? goNext() : goPrev()) : (dx > 0 ? goPrev() : goNext()); }
    touchStartX.current = null;
  };

  return (
    <div style={{ marginBottom: 12, position: 'relative' }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          transform: `translateX(${isRTL ? (safeIdx * 100) : -(safeIdx * 100)}%)`,
          transition: 'transform 0.42s cubic-bezier(0.32, 0.72, 0, 1)',
        }}>
          {items.map((it) => (
            <div key={it.key} style={{ minWidth: '100%', boxSizing: 'border-box', padding: '0 1px' }}>
              {it.node}
            </div>
          ))}
        </div>
      </div>

      {count > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 8 }}>
          {items.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} aria-label={`banner ${i + 1}`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <span style={{
                width: i === safeIdx ? 16 : 5,
                height: 5,
                borderRadius: 99,
                background: i === safeIdx ? '#1a6fd4' : 'var(--border-2)',
                transition: 'all 0.28s ease',
                display: 'inline-block',
              }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}