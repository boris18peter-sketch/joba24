import { useEffect, useRef, useState } from 'react';
import AppLoading from '@/components/AppLoading';

/**
 * THE OPENING VIDEO.
 *
 * ── IT IS NOT A SECOND SCREEN ───────────────────────────────────────────────
 * There is ONE loading screen in this app — AppLoading — and this component
 * renders it as its base layer. The video plays ON TOP of that screen.
 *
 * It used to be its own navy screen that handed over to AppLoading, which meant
 * two differently-styled screens flashed one after the other on every launch.
 * A video appearing over the loading screen is one screen; a video that
 * replaces it is two.
 *
 * The video is silent and `playsInline` — the only combination mobile browsers
 * will start on their own, without a tap. It plays while the app is already
 * booting behind it, so it never adds a wait of its own: the instant the launch
 * is ready the app takes the screen, whatever point the video has reached.
 */

// Served from /public, so it ships with the app on every platform.
const SPLASH_VIDEO_SRC = '/splash-intro.mp4';

// Matches AppLoading's own threshold. Both timers start at mount, so at 12s the
// video steps aside at exactly the moment AppLoading's "this is taking too
// long" retry appears — the screen is never left without a way out.
const GIVE_UP_AFTER_MS = 12000;

export default function SplashVideo() {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVideoOff(true), GIVE_UP_AFTER_MS);
    return () => clearTimeout(t);
  }, []);

  // Some WebViews decline autoplay even for a muted, inline video; an explicit
  // play() on mount is the second attempt that gets it moving.
  useEffect(() => {
    const p = videoRef.current?.play();
    if (p?.catch) p.catch(() => {});
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <AppLoading />

      {/* A missing, still-downloading or refused video simply never appears —
          the loading screen underneath is already on screen and looks exactly
          the same, so there is nothing to swap and nothing to flash. */}
      {!videoOff && (
        <video
          ref={videoRef}
          src={SPLASH_VIDEO_SRC}
          muted
          autoPlay
          playsInline
          preload="auto"
          disablePictureInPicture
          onPlaying={() => setPlaying(true)}
          onError={() => setVideoOff(true)}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: playing ? 1 : 0,
            transition: 'opacity 0.25s ease',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}