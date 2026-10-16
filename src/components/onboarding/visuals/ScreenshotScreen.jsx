/**
 * A real Joba24 screen inside the onboarding phone frame.
 *
 * The screenshot fills the frame top-aligned, exactly as the app renders it on a
 * device. An optional second shot floats over the lower corner — used where one
 * step shows two parts of the same form (price and location).
 */
export default function ScreenshotScreen({ src, insetSrc }) {
  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, background: 'var(--surface-2)' }}>
      <img
        src={src}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }}
      />

      {insetSrc && (
        <img
          src={insetSrc}
          alt=""
          style={{
            position: 'absolute',
            left: 14,
            bottom: 20,
            width: '56%',
            borderRadius: 14,
            border: '3px solid #ffffff',
            boxShadow: '0 14px 32px rgba(9,22,50,0.34)',
            display: 'block',
          }}
        />
      )}
    </div>
  );
}