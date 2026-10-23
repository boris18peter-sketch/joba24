import { useEffect, useRef, useState } from 'react';
import { BrandLogo, BrandName } from '@/components/BrandIdentity';
import AppLoading from '@/components/AppLoading';

/**
 * THE OPENING VIDEO.
 *
 * It plays while the app is ALREADY booting behind it — it never adds a wait of
 * its own. The instant the launch is ready the app takes the screen, whatever
 * point the video has reached.
 *
 * Silent and `playsInline` is the only combination mobile browsers will start
 * on their own, without a tap.
 *
 * ── IT CAN NEVER BE A BLACK RECTANGLE ───────────────────────────────────────
 * The brand lockup is the base layer, not a fallback bolted on afterwards. It
 * is what shows until the video's first frame is actually on screen, and what
 * remains if the file is missing, still downloading, or refused by the WebView.
 * The backdrop is the same navy as the native launch screen, so the handoff
 * from the OS splash into this one is seamless.
 */

// Served from /public, so it ships with the app on every platform.
const SPLASH_VIDEO_SRC = '/splash-intro.mp4';

// Matches AppLoading's own threshold: past this the launch is hung, so the
// video hands the screen back and the retry becomes reachable again.
const GIVE_UP_AFTER_MS = 12000;

export default function SplashVideo({ onGiveUp }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  // Held in a ref so a re-render during boot cannot restart the timer — boot
  // re-renders often, and a resetting timer would never fire at all.
  const giveUpRef = useRef(onGiveUp);
  giveUpRef.current = onGiveUp;
  useEffect(() => {
    const t = setTimeout(() => giveUpRef.current?.(), GIVE_UP_AFTER_MS);
    return () => clearTimeout(t);
  }, []);

  // Some WebViews decline autoplay even for a muted, inline video; an explicit
  // play() on mount is the second attempt that gets it moving.
  useEffect(() => {
    const p = videoRef.current?.play();
    if (p?.catch) p.catch(() => {});
  }, []);

  if (failed) return <AppLoading />;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: '#010B25',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {!playing && (
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 14,
          }}
        >
          <BrandLogo size={64} radius={18} />
          <BrandName style={{ fontWeight: 900, fontSize: 18, color: '#ffffff', letterSpacing: -0.5 }} />
        </div>
      )}

      <video
        ref={videoRef}
        src={SPLASH_VIDEO_SRC}
        muted
        autoPlay
        playsInline
        preload="auto"
        disablePictureInPicture
        onPlaying={() => setPlaying(true)}
        onError={() => setFailed(true)}
        style={{
          position: 'relative',
          width: '100%', height: '100%',
          objectFit: 'cover',
          opacity: playing ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      />
    </div>
  );
}