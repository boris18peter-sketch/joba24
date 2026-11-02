import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, Play, X } from 'lucide-react';
import { EXPLAINER_VIDEO_URL } from '@/lib/explainerVideo';

/**
 * The explainer video, as a compact row inside the published-tasks empty state.
 *
 * Nothing is downloaded with the screen: the card renders as a plain tile, and
 * the preview frame is only attached once the card is actually near the
 * viewport. The video itself mounts when the sheet opens — and it never plays by
 * itself, so opening it is always a deliberate tap.
 */
export default function EmptyStateVideoCard({ title, subtitle }) {
  const [open, setOpen] = useState(false);
  const [near, setNear] = useState(false);
  const cardRef = useRef(null);

  // Lazy: the preview frame is attached when the card approaches the viewport.
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setNear(true); return; }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some(e => e.isIntersecting)) { setNear(true); io.disconnect(); }
      },
      { rootMargin: '180px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        ref={cardRef}
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, width: '100%',
          padding: '10px 12px', borderRadius: 18,
          background: 'var(--surface-2)',
          border: '1px solid var(--border-1)',
          boxShadow: 'var(--shadow-xs)',
          cursor: 'pointer', textAlign: 'right',
          fontFamily: 'inherit',
        }}
      >
        {/* Preview frame — a dark tile with the play mark on top of it */}
        <span style={{
          position: 'relative', width: 62, height: 62, borderRadius: 14,
          overflow: 'hidden', flexShrink: 0, background: '#0b1220',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {near && (
            <video
              src={`${EXPLAINER_VIDEO_URL}#t=0.8`}
              preload="metadata"
              muted
              playsInline
              aria-hidden="true"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
            />
          )}
          <span style={{
            position: 'relative', width: 30, height: 30, borderRadius: '50%',
            background: 'rgba(255,255,255,0.94)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
          }}>
            <Play size={13} color="#0b1220" fill="#0b1220" style={{ marginLeft: 1 }} />
          </span>
        </span>

        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: 'block', fontSize: 14, fontWeight: 800, color: 'var(--text-1)',
            letterSpacing: -0.2, marginBottom: 2,
          }}>
            {title}
          </span>
          <span style={{
            display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', lineHeight: 1.4,
          }}>
            {subtitle}
          </span>
        </span>

        <ChevronLeft size={17} color="var(--text-3)" style={{ flexShrink: 0 }} />
      </button>

      {open && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000000,
            background: 'rgba(5,15,40,0.86)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 'max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom))',
          }}
        >
          <div style={{ width: '100%', maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="סגירה"
                style={{
                  width: 38, height: 38, borderRadius: 12, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={18} color="#fff" />
              </button>
            </div>
            {/* Plays the moment it is opened, exactly like the explainer on the
                publish form — tapping the card IS the play action, so a second
                tap on a play button would be one tap too many. */}
            <video
              src={EXPLAINER_VIDEO_URL}
              controls
              autoPlay
              playsInline
              preload="metadata"
              style={{ display: 'block', width: '100%', maxHeight: '72vh', borderRadius: 16, background: '#000', objectFit: 'contain' }}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}