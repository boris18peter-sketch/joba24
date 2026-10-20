import { useState } from 'react';
import { ImageOff } from 'lucide-react';

/**
 * TaskImage — every task photo in the app, with a clean loading and failure state.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * Task thumbnails were plain `<img>` tags inside a box whose background was
 * hard-coded BLACK. Until the file arrived — and permanently, if it never did —
 * the visitor saw a black square where their photo should be. That is the black
 * rectangle that appeared in the feed, and it was not a slow image at all: it
 * was the placeholder.
 *
 * This component replaces that with the app's own surface colour, so the wait
 * shows a quiet shimmer in the design's palette, and a file that fails shows a
 * neutral "no photo" mark rather than a hole.
 *
 * ── THE FOUR STATES ─────────────────────────────────────────────────────────
 *   loading → a soft shimmer in the design tokens (never black, never blank)
 *   ready   → the photo, faded in over the shimmer so nothing flashes
 *   error   → a muted icon on the same surface colour
 *   no src  → the same as error, immediately
 *
 * ── LAYOUT STABILITY ────────────────────────────────────────────────────────
 * The wrapper fills its parent and the photo fills the wrapper, so the box is
 * exactly the size it was given at every moment of the load. Nothing reflows and
 * nothing jumps when the file lands — the parent decides the geometry once.
 *
 * ── PRIORITY ────────────────────────────────────────────────────────────────
 * `priority` is for a photo that is on screen right now (the first card's
 * thumbnail, the top of the detail gallery): it is fetched eagerly and hints high
 * priority. Everything else stays `lazy`, so a long feed still downloads only
 * the images the visitor can actually see.
 *
 * Nothing here is preloaded in bulk: an off-screen photo is still only requested
 * when the browser decides it is close to the viewport.
 */
export default function TaskImage({
  src,
  alt = '',
  priority = false,
  objectFit = 'cover',
  radius,
  style,
}) {
  const [state, setState] = useState(src ? 'loading' : 'error');

  const shell = {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: radius,
    // The design's own inset surface — this is what replaces the black square.
    background: 'var(--surface-3)',
    ...style,
  };

  if (state === 'error') {
    return (
      <div style={shell} aria-label={alt || undefined}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ImageOff size={18} color="var(--text-3)" strokeWidth={1.6} />
        </div>
      </div>
    );
  }

  return (
    <div style={shell}>
      {state === 'loading' && <div className="j-img-skeleton" aria-hidden="true" />}
      <img
        src={src}
        alt={alt}
        draggable={false}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchpriority={priority ? 'high' : 'auto'}
        onLoad={() => setState('ready')}
        onError={() => setState('error')}
        style={{
          width: '100%',
          height: '100%',
          objectFit,
          display: 'block',
          opacity: state === 'ready' ? 1 : 0,
          transition: 'opacity 0.22s ease',
        }}
      />
    </div>
  );
}