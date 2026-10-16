/**
 * A real Joba24 screen inside the onboarding phone frame.
 *
 * The screenshot is rendered at the phone's FULL WIDTH and at its own natural
 * aspect ratio, so it is never cropped, never stretched and never distorted —
 * a section crop stays a section crop, a full screen stays a full screen.
 * `align` positions it vertically (some captures are full screens, some are
 * short horizontal slices of one form section).
 *
 * `insetSrc` floats a second capture over the lower corner, for the step that
 * shows two parts of the same form.
 */
export default function ScreenshotScreen({ src, insetSrc, align = 'top' }) {
  return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        background: 'var(--surface-2)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
      }}
    >
      <img src={src} alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />

      {insetSrc && (
        <img
          src={insetSrc}
          alt=""
          style={{
            position: 'absolute',
            left: 16,
            bottom: 22,
            width: '80%',
            borderRadius: 14,
            border: '3px solid #ffffff',
            boxShadow: '0 16px 36px rgba(9,22,50,0.36)',
            display: 'block',
          }}
        />
      )}
    </div>
  );
}