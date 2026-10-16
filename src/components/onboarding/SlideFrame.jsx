/**
 * The panel that holds one slide's illustration.
 *
 * Deliberately NOT a phone. A phone shell forces a fixed 393 × 852 canvas, and
 * that is exactly what made a wide form capture render as a thin strip floating
 * in a large empty screen: the picture could only ever be as wide as the phone.
 *
 * On a phone the panel drops its border and background entirely and goes
 * edge-to-edge, so the illustration gets the full width of the device. From
 * 900px up it becomes a card again, framed inside the page.
 *
 * `fill` — stretch to the available height (used when the content scales itself
 * to fit). When false the panel hugs its content instead, so a wide capture
 * never sits inside a tall empty box.
 */
export default function SlideFrame({ children, fill = true, style }) {
  return (
    <div
      className="j-slide-frame"
      style={{
        flex: fill ? '1 1 auto' : '0 1 auto',
        minHeight: 0,
        maxHeight: '100%',
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      <style>{`
        .j-slide-frame {
          border: 1px solid var(--border-1);
          border-radius: 22px;
          background: var(--surface-2);
          box-shadow: 0 20px 50px rgba(9,22,50,0.10), 0 2px 8px rgba(9,22,50,0.05);
        }
        @media (max-width: 899px) {
          .j-slide-frame {
            border: none;
            border-radius: 0;
            background: transparent;
            box-shadow: none;
          }
        }
      `}</style>
      {children}
    </div>
  );
}