import { useLayoutEffect, useRef, useState } from 'react';

/**
 * A real app screen, magnified to the largest size the preview stage can give
 * it.
 *
 * The screen is laid out at its real logical width and then scaled — never
 * shrunk into a phone bezel — so its cards, prices and buttons end up as large
 * as the stage can afford. Because the illustration is built from the app's own
 * components and design tokens, it follows Light/Dark mode exactly like the
 * live interface does.
 *
 * The stage scrolls only if a screen still cannot fit; that is the fallback,
 * never the default.
 */
export default function UiStage({ children, width = 393, maxScale = 1.6 }) {
  const boxRef = useRef(null);
  const innerRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState(0);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const update = () => setNatural(el.scrollHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const PAD = 14;
  const availW = Math.max(0, box.w - PAD * 2);
  const availH = Math.max(0, box.h - PAD * 2);

  let scale = 1;
  if (availW > 0 && natural > 0) {
    scale = Math.min(availW / width, availH / natural, maxScale);
    scale = Math.max(0.6, scale);
  }
  const scaledH = natural * scale;
  const overflows = scaledH > availH + 1;

  return (
    <div
      ref={boxRef}
      className="j-preview-scroll"
      style={{
        alignItems: overflows ? 'flex-start' : 'center',
        padding: PAD,
        boxSizing: 'border-box',
      }}
    >
      <div
        className="j-preview-screen"
        style={{
          width: width * scale,
          height: scaledH,
          flexShrink: 0,
          position: 'relative',
          opacity: natural > 0 ? 1 : 0,
        }}
      >
        <div
          ref={innerRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            direction: 'rtl',
            fontFamily: 'var(--font-inter)',
            color: 'var(--text-1)',
            pointerEvents: 'none',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}