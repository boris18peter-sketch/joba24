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
 * it is a small pill in the corner that never moves, never opens by itself,
 * never covers a field and never competes with the publish button — and the
 * video only exists while the sheet is open, so nothing is downloaded or played
 * behind the form.
 */

const VIDEO_URL = EXPLAINER_VIDEO_URL;

/**
 * The pill can be put away for good.
 *
 * It floats over the form, so a publisher who already knows how the app works
 * had no way to get it off the screen — and on a phone it sat right on top of
 * whatever field happened to be there. One press on the small × retires it, and
 * the choice is remembered on this device so it never comes back to someone who
 * has already said he does not want it. (Clearing the site's data brings it
 * back, which is the correct way to undo it.)
 */
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

  // The pill is a ROW of two controls, never one control inside another: a press
  // on the × must retire the pill, and it must not also open the video.
  return (
    <>
      {!hidden && (
        <div
          dir="rtl"
          style={{
            position: 'fixed',
            left: 14,
            bottom: 'calc(96px + env(safe-area-inset-bottom))',
            zIndex: 9000,
            display: 'flex', alignItems: 'center', gap: 2,
            height: 40, paddingInlineStart: 4, paddingInlineEnd: 5,
            borderRadius: 99,
            background: 'var(--surface-2)',
            border: '1.5px solid var(--border-1)',
            boxShadow: '0 6px 20px rgba(15,40,107,0.16)',
            animation: 'cardFadeIn 0.24s ease both',
          }}
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="סרטון הסבר למפרסמים"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              height: '100%', paddingInlineStart: 8, paddingInlineEnd: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-2)', fontSize: 12.5, fontWeight: 800,
              borderRadius: 99, minHeight: 'unset', minWidth: 'unset',
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

          <span style={{ width: 1, height: 18, background: 'var(--border-1)', flexShrink: 0 }} />

          <button
            type="button"
            onClick={dismiss}
            aria-label="הסתר את הסרטון"
            title="הסתר"
            style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: 'var(--surface-3)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 'unset', minWidth: 'unset',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <X size={13} color="var(--text-3)" />
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