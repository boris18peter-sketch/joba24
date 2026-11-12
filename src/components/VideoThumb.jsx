import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';

/**
 * VideoThumb — a video shown as its FIRST FRAME, not as a black square.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * A `<video>` element with no `poster` paints nothing until it is played, so
 * every video in the app — the one just attached to the publish form and the one
 * on a task card in the feed — appeared as a grey/black box with a play icon in
 * it. The picture the publisher had just recorded was invisible until somebody
 * pressed it, which read as a failed upload.
 *
 * So the frame is taken from the file itself:
 *
 *   1. the video is mounted muted with metadata only (no full download);
 *   2. as soon as metadata arrives it is seeked a fraction of a second in (0.1s
 *      rather than 0 — the very first frame is often a dark fade-in);
 *   3. once the seek completes the frame is drawn to a canvas and kept as the
 *      thumbnail image.
 *
 * If the canvas cannot export the frame — the media host answers without CORS
 * headers, which taints the canvas — the `<video>` element itself stays visible:
 * it has already been seeked, so every engine that renders a paused frame paints
 * the same picture. Either way the visitor sees the video, never a placeholder.
 */
export default function VideoThumb({
  src,
  radius,
  style,
  objectFit = 'cover',
  showPlay = true,
  playSize = 18,
}) {
  const videoRef = useRef(null);
  const [poster, setPoster] = useState('');
  const capturedRef = useRef(false);

  useEffect(() => {
    setPoster('');
    capturedRef.current = false;
  }, [src]);

  const capture = () => {
    if (capturedRef.current) return;
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    capturedRef.current = true;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      canvas.getContext('2d').drawImage(v, 0, 0, canvas.width, canvas.height);
      setPoster(canvas.toDataURL('image/jpeg', 0.82));
    } catch {
      // Tainted canvas (no CORS on the media host) — the seeked <video> stays
      // on screen and shows the very same frame.
    }
  };

  const seekToFirstFrame = () => {
    const v = videoRef.current;
    if (!v) return;
    // A fraction in, so a fade-in from black does not become the thumbnail.
    const target = Number.isFinite(v.duration) ? Math.min(0.1, v.duration / 2) : 0.1;
    try {
      v.currentTime = target;
    } catch {
      capture();
    }
  };

  const frame = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit,
    display: 'block',
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: radius,
        // The design's own surface behind the element — never pure black.
        background: 'var(--surface-3)',
        ...style,
      }}
    >
      {!poster && (
        <video
          ref={videoRef}
          // The media fragment asks the engine to show the frame at 0.1s; the
          // seek below is what guarantees it where the fragment is ignored.
          src={`${src}#t=0.1`}
          preload="metadata"
          muted
          playsInline
          onLoadedMetadata={seekToFirstFrame}
          onSeeked={capture}
          style={frame}
        />
      )}
      {poster && <img src={poster} alt="" style={frame} />}

      {showPlay && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.28)',
          }}
        >
          <Play size={playSize} color="white" fill="white" />
        </div>
      )}
    </div>
  );
}