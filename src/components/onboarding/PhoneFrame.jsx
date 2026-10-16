import { useLayoutEffect, useRef, useState } from 'react';
import StatusBar from '@/components/storekit/StatusBar';

/**
 * The phone shell used by the onboarding illustrations.
 *
 * Its content is laid out at the iPhone's real logical viewport (393 × 852 CSS
 * px) and then scaled to fill the frame, so a real app component — or a real
 * screenshot of one — is never stretched or pixelated at any frame size.
 *
 * `statusBar` draws the iOS status bar for screens built from live components.
 * Screens that ARE a device screenshot already carry their own status bar, so
 * they pass `statusBar={false}` and the image runs edge to edge.
 */
const VIEWPORT = { w: 393, h: 852, radius: 54, bezel: 13, outerRadius: 78 };

export default function PhoneFrame({ statusBar = false, children }) {
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

  const { w, h } = VIEWPORT;
  const ar = w / h;
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

  const unit = dw > 0 ? dw / w : 0;
  const bezel = unit * VIEWPORT.bezel;
  const screenW = dw - bezel * 2;
  const scale = screenW > 0 ? screenW / w : 0;

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
            borderRadius: unit * VIEWPORT.outerRadius,
            background: '#0d1e40',
            padding: bezel,
            boxSizing: 'border-box',
            boxShadow: '0 30px 70px rgba(9,22,50,0.30), 0 6px 16px rgba(9,22,50,0.16)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: unit * VIEWPORT.radius,
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
                width: w,
                height: h,
                transform: `scale(${scale})`,
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
                  paddingTop: statusBar ? 54 : 0,
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {children}
              </div>
              {statusBar && <StatusBar platform="ios" height={54} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}