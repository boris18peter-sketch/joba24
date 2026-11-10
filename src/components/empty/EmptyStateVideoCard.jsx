import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, X } from 'lucide-react';
import { EXPLAINER_VIDEO_URL } from '@/lib/explainerVideo';
import HelpVideoPlayer from '@/components/publish/HelpVideoPlayer';

/**
 * The explainer video, as a compact row inside the published-tasks empty state.
 *
 * ── NO VIDEO THUMBNAIL ─────────────────────────────────────────────────────
 * The row used to carry a 52px dark tile with a still frame of the video in it,
 * then a bare play mark; both read as a second, half-drawn player sitting inside
 * the card. It is now the two lines of copy and a chevron — the title and
 * subtitle already say there is a short video — and nothing is downloaded until
 * the row is actually tapped.
 *
 * The video itself mounts when the sheet opens — and it never plays by itself,
 * so opening it is always a deliberate tap.
 */
export default function EmptyStateVideoCard({ title, subtitle }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '8px 10px', borderRadius: 16,
          background: 'var(--surface-2)',
          border: '1px solid var(--border-1)',
          boxShadow: 'var(--shadow-xs)',
          cursor: 'pointer', textAlign: 'right',
          fontFamily: 'inherit',
        }}
      >
        {/* No mark, no frame, no still: the words say what this row is, and the
            chevron says it opens something. A play icon beside them made the row
            read as a second, half-drawn player. */}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: 'block', fontSize: 13.5, fontWeight: 800, color: 'var(--text-1)',
            letterSpacing: -0.2, marginBottom: 2,
          }}>
            {title}
          </span>
          <span style={{
            display: 'block', fontSize: 11.5, fontWeight: 500, color: 'var(--text-2)', lineHeight: 1.4,
          }}>
            {subtitle}
          </span>
        </span>

        <ChevronLeft size={16} color="var(--text-3)" style={{ flexShrink: 0 }} />
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
            {/* The SAME player the publish form uses — one surface, one set of
                controls, and no black rectangle with the system's seek bar and
                overflow menu dropped inside the app. It plays as soon as it is
                opened, so there is no empty preview to look at. */}
            <HelpVideoPlayer src={EXPLAINER_VIDEO_URL} />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}