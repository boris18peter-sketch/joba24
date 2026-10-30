import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play, X } from 'lucide-react';

/**
 * The publisher's own explainer video, on the publish form.
 *
 * It is deliberately the quietest thing on the screen. Nobody filling the form
 * needs a video; somebody who does not understand the MODEL needs one, once. So
 * it is a small pill in the corner that never moves, never opens by itself,
 * never covers a field and never competes with the publish button — and the
 * video only exists while the sheet is open, so nothing is downloaded or played
 * behind the form.
 */

const VIDEO_URL = 'https://media.base44.com/videos/public/69e6bdb4986a04a256653a23/58a0739c9_joba24-center.mp4';

export default function PublishHelpVideo() {
  const [open, setOpen] = useState(false);

  // Escape closes it, the same as every other sheet in the app.
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
        aria-label="סרטון הסבר למפרסמים"
        style={{
          position: 'fixed',
          left: 14,
          bottom: 'calc(96px + env(safe-area-inset-bottom))',
          zIndex: 9000,
          display: 'flex', alignItems: 'center', gap: 6,
          height: 40, padding: '0 14px 0 10px',
          borderRadius: 99,
          background: 'var(--surface-2)',
          border: '1.5px solid var(--border-1)',
          color: 'var(--text-2)',
          fontSize: 12.5, fontWeight: 800,
          boxShadow: '0 6px 20px rgba(15,40,107,0.16)',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span style={{
          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Play size={11} color="#fff" fill="#fff" />
        </span>
        איך זה עובד?
      </button>

      {open && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            background: 'rgba(5,15,40,0.82)',
            backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div dir="rtl" style={{
            width: '100%', maxWidth: 420,
            background: 'var(--sheet-bg)',
            border: '1px solid var(--border-1)',
            borderRadius: 22,
            padding: 12,
            boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 4px 10px' }}>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 900, color: 'var(--text-1)' }}>
                איך מפרסמים משימה
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="סגירה"
                style={{
                  width: 34, height: 34, borderRadius: 11, flexShrink: 0, cursor: 'pointer',
                  background: 'var(--surface-3)', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={16} color="var(--text-3)" />
              </button>
            </div>

            <video
              src={VIDEO_URL}
              controls
              autoPlay
              playsInline
              preload="metadata"
              style={{
                display: 'block', width: '100%',
                maxHeight: '70vh',
                borderRadius: 14,
                background: '#000',
                objectFit: 'contain',
              }}
            />

            <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, textAlign: 'center', padding: '10px 6px 2px', lineHeight: 1.5 }}>
              הסרטון נפתח רק כשבוחרים לראות אותו, ואפשר לסגור אותו ולהמשיך למלא את הטופס בכל רגע.
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}