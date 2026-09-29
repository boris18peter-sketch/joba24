import { useLayoutEffect, useRef, useState } from 'react';
import StatusBar from '@/components/storekit/StatusBar';

/**
 * A clean, minimal device shell. The real app UI is laid out at its native
 * logical viewport (canvas.device) and then scaled up to fill the frame — so
 * nothing is ever stretched or pixelated.
 *
 * The frame supports the story; it never dominates it.
 */
export default function DeviceFrame({ canvas, children }) {
  const boxRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const d = canvas.device;
  const ar = d.w / d.h;
  let dw = 0;
  let dh = 0;
  if (box.w > 0 && box.h > 0) {
    dh = box.h;
    dw = dh * ar;
    if (dw > box.w) {
      dw = box.w;
      dh = dw / ar;
    }
  }

  const bezel = dw > 0 ? dw * (d.bezel / d.w) : 0;
  const screenW = dw - bezel * 2;
  const screenH = dh - bezel * 2;
  const k = screenW > 0 ? screenW / d.w : 0;

  return (
    <div
      ref={boxRef}
      style={{ flex: 1, minHeight: 0, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {dw > 0 && (
        <div
          style={{
            width: dw,
            height: dh,
            borderRadius: dw * (d.outerRadius / d.w),
            background: '#0d1e40',
            padding: bezel,
            boxSizing: 'border-box',
            boxShadow: '0 34px 80px rgba(9,22,50,0.30), 0 6px 18px rgba(9,22,50,0.18)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: dw * (d.radius / d.w),
              overflow: 'hidden',
              background: 'var(--surface-1)',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: d.w,
                height: d.h,
                transform: `scale(${k})`,
                transformOrigin: 'top left',
                background: 'var(--surface-1)',
                direction: 'rtl',
                fontFamily: 'var(--font-inter)',
                color: 'var(--text-1)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  paddingTop: canvas.statusH,
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {children}
              </div>
              <StatusBar platform={canvas.platform} height={canvas.statusH} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}