import { X } from 'lucide-react';

/**
 * PopupClose — the ONE close button of every popup and viewer in the app.
 *
 * It exists because the same button was hand-written in each popup, and the
 * copies drifted: some sat flush against the sheet's corner, some were pushed
 * to the top of the SCREEN because their surface was not positioned, and the
 * global 44px minimum tap target silently stretched all of them out of shape —
 * a 34px square was rendered 44px tall, so the X never looked centred in its
 * own frame.
 *
 * Placement is absolute, so the caller's surface MUST be `position: 'relative'`
 * (or otherwise positioned). That is the whole contract: the X belongs INSIDE
 * the popup it closes, never floating over the dimmed background.
 *
 * tone:
 *   'surface' — inside a light sheet (app surface tokens)
 *   'overlay' — floating on a dark media viewer / lightbox
 */
export default function PopupClose({ onClick, tone = 'surface', label = 'סגור', size = 36, top = 14 }) {
  const overlay = tone === 'overlay';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        position: 'absolute',
        top,
        left: 14,
        zIndex: 10,
        width: size,
        height: size,
        // The global 44px minimum applies to every button; on an icon square it
        // only distorts the frame, so it is released here and the shape held.
        minWidth: 'unset',
        minHeight: 'unset',
        borderRadius: 12,
        background: overlay ? 'rgba(15,23,42,0.6)' : 'var(--surface-3)',
        border: overlay ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border-1)',
        color: overlay ? '#ffffff' : 'var(--text-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        backdropFilter: overlay ? 'blur(8px)' : undefined,
        WebkitBackdropFilter: overlay ? 'blur(8px)' : undefined,
        boxShadow: overlay ? '0 2px 10px rgba(0,0,0,0.35)' : 'var(--shadow-xs)',
        padding: 0,
      }}
    >
      <X size={Math.round(size * 0.5)} strokeWidth={2.5} />
    </button>
  );
}