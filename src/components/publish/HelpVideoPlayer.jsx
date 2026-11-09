import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';

/**
 * HelpVideoPlayer — the explainer video with the app's OWN controls.
 *
 * ── WHY THE SYSTEM PLAYER IS GONE ───────────────────────────────────────────
 * The modal used a bare `<video controls>`. In a Capacitor WebView that does not
 * mean "a player": Android hands the element to the platform's media UI, which
 * draws the grey seek bar, the three-dot overflow menu and the fullscreen pill
 * from a DIFFERENT design system, and it replaces any styling the app applies.
 * That is the "unprofessional opener" in the report — the app's sheet with the
 * operating system's player dropped inside it.
 *
 * So the element keeps no native chrome (`controls` off, no picture-in-picture,
 * no download/playback-rate menu) and this component draws the controls in the
 * app's own tokens: brand blue, the app's radii, Hebrew numerals. Nothing about
 * the video itself changed — only who draws it.
 *
 * ── IT IS DELIBERATELY SMALL ────────────────────────────────────────────────
 * Play/pause, a seek bar, the time, a mute toggle and a fullscreen button. No
 * volume slider, no speed menu, no captions button: this is a 54-second
 * explanation of how publishing works, watched once.
 */
export default function HelpVideoPlayer({ src }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  // The element's own events are the truth for time and end-of-playback, so the
  // bar stays correct even if the user seeks with a hardware key or the OS
  // pauses the video when the app goes to the background.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const onTime = () => setTime(video.currentTime || 0);
    const onMeta = () => setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onPause);
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onPause);
    };
  }, []);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const seek = (event) => {
    const video = videoRef.current;
    if (!video) return;
    const next = Number(event.target.value);
    video.currentTime = next;
    setTime(next);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const fullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    // Android/Chrome path first; iOS WebViews only expose the video element's own
    // fullscreen entry point, so it is the fallback rather than an alternative.
    if (video.requestFullscreen) video.requestFullscreen().catch(() => {});
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
  };

  const format = (value) => {
    const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        background: '#0B1424',
        border: '1px solid var(--border-1)',
      }}
    >
      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="metadata"
        disablePictureInPicture
        controlsList="nodownload noplaybackrate noremoteplayback"
        onClick={toggle}
        style={{ display: 'block', width: '100%', maxHeight: '58vh', background: '#0B1424' }}
      />

      {!playing && (
        <button
          type="button"
          onClick={toggle}
          aria-label="הפעלת הסרטון"
          style={{
            position: 'absolute', inset: 0, margin: 'auto',
            width: 64, height: 64, borderRadius: '50%', cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.35)',
            background: 'rgba(13,30,64,0.55)',
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Play size={24} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />
        </button>
      )}

      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px',
          background: 'var(--surface-2)',
          borderTop: '1px solid var(--border-1)',
        }}
      >
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'השהיה' : 'הפעלה'}
          style={{
            width: 32, height: 32, borderRadius: 10, flexShrink: 0, cursor: 'pointer',
            border: 'none', background: 'var(--surface-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {playing
            ? <Pause size={14} color="var(--text-1)" fill="var(--text-1)" />
            : <Play size={14} color="var(--text-1)" fill="var(--text-1)" style={{ marginLeft: 2 }} />}
        </button>

        <span
          style={{
            fontSize: 11.5, fontWeight: 800, color: 'var(--text-2)',
            fontVariantNumeric: 'tabular-nums', flexShrink: 0, direction: 'ltr',
          }}
        >
          {format(time)} / {format(duration)}
        </span>

        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(time, duration || 0)}
          onChange={seek}
          aria-label="מיקום בסרטון"
          style={{
            flex: 1, minWidth: 0, height: 4, cursor: 'pointer',
            accentColor: 'var(--brand-primary)',
          }}
        />

        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? 'ביטול השתקה' : 'השתקה'}
          style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0, cursor: 'pointer',
            border: 'none', background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {muted
            ? <VolumeX size={15} color="var(--text-3)" />
            : <Volume2 size={15} color="var(--text-3)" />}
        </button>

        <button
          type="button"
          onClick={fullscreen}
          aria-label="מסך מלא"
          style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0, cursor: 'pointer',
            border: 'none', background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Maximize2 size={15} color="var(--text-3)" />
        </button>
      </div>
    </div>
  );
}