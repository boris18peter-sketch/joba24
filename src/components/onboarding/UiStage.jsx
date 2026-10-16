import { useLayoutEffect, useRef, useState } from 'react';
import SlideFrame from '@/components/onboarding/SlideFrame';

/**
 * A magnified, device-less view of a real app screen built from live components.
 *
 * The screen is laid out at its real logical width and then scaled to fill the
 * panel — never shrunk into a phone bezel — so its cards, prices and buttons end
 * up as large as the layout can afford. A screen that still cannot fit scrolls;
 * that is the fallback, not the default.
 */
export default function UiStage({ children, width = 393, maxScale = 1.7 }) {
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

  const PAD = 16;
  const availW = Math.max(0, box.w - PAD * 2);
  const availH = Math.max(0, box.h - PAD * 2);

  let scale = 1;
  if (availW > 0 && natural > 0) {
    scale = Math.min(availW / width, availH / natural);
    scale = Math.max(0.7, Math.min(scale, maxScale));
  }
  const scaledH = natural * scale;
  const overflows = scaledH > availH + 1;

  return (
    <SlideFrame>
      <div
        ref={boxRef}
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: overflows ? 'flex-start' : 'center',
          padding: PAD,
          boxSizing: 'border-box',
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div style={{ width: width * scale, height: scaledH, flexShrink: 0, position: 'relative', opacity: natural > 0 ? 1 : 0 }}>
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
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}