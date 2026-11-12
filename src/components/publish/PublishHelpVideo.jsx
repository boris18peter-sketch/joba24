import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play, X } from 'lucide-react';
import { EXPLAINER_VIDEO_URL } from '@/lib/explainerVideo';
import HelpVideoPlayer from '@/components/publish/HelpVideoPlayer';

/**
 * The publisher's own explainer video, on the publish form.
 *
 * It is deliberately the quietest thing on the screen. Nobody filling the form
 * needs a video; somebody who does not understand the MODEL needs one, once. So
 * it never opens by itself, the video only exists while the sheet is open, and
 * nothing is downloaded or played behind the form.
 *
 * ── WHY IT IS A STRIP AND NOT A FLOATING PILL ANY MORE ──────────────────────
 * It used to be a pill fixed to the bottom-left corner, floating OVER the form.
 * On a phone that put it on top of whatever field happened to be there: it moved
 * with nothing, sat above the content the publisher was reading, and looked like
 * an accident. It is now a slim strip that belongs to the form's own header —
 * full width, pinned directly under the blue header, with a hairline beneath it —
 * so it is tidy, it never covers a field, and it scrolls with nothing because it
 * is part of the chrome. The × retires it for good on this device.
 */
const VIDEO_URL = EXPLAINER_VIDEO_URL;

const HIDDEN_KEY = 'joba24_publish_help_video_hidden';

export default function PublishHelpVideo() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(HIDDEN_KEY) === '1'; } catch { return false; }
  });

  // Escape closes it, the same as every other sheet in the app.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const dismiss = (e) => {
    e.stopPropagation();
    setOpen(false);
    setHidden(true);
    try { localStorage.setItem(HIDDEN_KEY, '1'); } catch { /* private mode: hidden for this visit */ }
  };

  return (
    <>
      {!hidden && (
        <div
          dir="rtl"
          style={{
            flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 12px 7px',
            background: 'var(--surface-2)',
            borderBottom: '1px solid var(--border-1)',
          }}
        >
          {/* The whole middle is the button — one tap target, no dead text. */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="סרטון הסבר למפרסמים"
            style={{
              flex: 1, minWidth: 0,
              display: 'flex', alignItems: 'center', gap: 9,
              background: 'none', border: 'none', padding: '4px 0',
              cursor: 'pointer', textAlign: 'start',
              minHeight: 'unset', minWidth: 'unset',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 3px 10px rgba(26,111,212,0.24)',
            }}>
              <Play size={11} color="#fff" fill="#fff" />
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.3 }}>
                איך זה עובד?
              </span>
              <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', lineHeight: 1.3 }}>
                סרטון קצר על פרסום משימה
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={dismiss}
            aria-label="הסתר את הסרטון"
            title="הסתר"
            style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: 'var(--surface-3)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 'unset', minWidth: 'unset',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <X size={14} color="var(--text-3)" />
          </button>
        </div>
      )}

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

            {/* ── THE APP'S OWN PLAYER, NOT THE SYSTEM'S ────────────────────────
                A bare `<video controls>` inside the Android WebView hands the
                element to the platform media UI — its seek bar, its three-dot
                overflow menu, its fullscreen pill — which is why the modal read
                as a stock system player dropped into a designed sheet. The
                controls are ours now. */}
            <HelpVideoPlayer src={VIDEO_URL} />

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