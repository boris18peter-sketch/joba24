import { useRef } from 'react';
import { Download, Loader2 } from 'lucide-react';
import StoreCanvas from '@/components/storekit/StoreCanvas';
import { THEMES } from '@/lib/storekit/specs';

/**
 * One frame in the contact sheet: the full-size canvas scaled down for preview.
 * While that frame is exporting, the same node is lifted off-screen at real
 * size so the capture is pixel-exact.
 */
export default function StorePreviewCard({ spec, screen, children, previewW, exporting, onExport, nodeRef }) {
  const innerRef = useRef(null);
  const theme = THEMES[screen.theme] || THEMES.light;
  const previewH = Math.round(previewW * (spec.h / spec.w));
  const isExporting = exporting === screen.id;

  const setRef = (el) => {
    innerRef.current = el;
    if (nodeRef) nodeRef.current = el;
  };

  return (
    <div style={{ width: previewW }}>
      <div
        style={{
          width: previewW,
          height: previewH,
          borderRadius: 14,
          overflow: 'hidden',
          border: '1px solid rgba(15,40,107,0.12)',
          boxShadow: '0 8px 26px rgba(15,40,107,0.12)',
          position: 'relative',
          background: theme.bg,
        }}
      >
        {isExporting ? (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: -20000,
              width: spec.w,
              height: spec.h,
              zIndex: -1,
              pointerEvents: 'none',
            }}
          >
            <StoreCanvas canvas={spec} screen={screen} innerRef={setRef}>
              {children}
            </StoreCanvas>
          </div>
        ) : (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: spec.w,
              height: spec.h,
              transform: `scale(${previewW / spec.w})`,
              transformOrigin: 'top left',
            }}
          >
            <StoreCanvas canvas={spec} screen={screen} innerRef={setRef}>
              {children}
            </StoreCanvas>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0d1e40', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {screen.file}
          </div>
          <div style={{ fontSize: 10.5, color: '#7b8cab', fontWeight: 600 }}>
            {spec.w}×{spec.h} px
          </div>
        </div>
        <button
          onClick={() => onExport(screen)}
          disabled={exporting !== null}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            height: 32,
            padding: '0 11px',
            borderRadius: 9,
            border: '1px solid #bfdbfe',
            background: '#eff6ff',
            color: '#1a6fd4',
            fontSize: 11.5,
            fontWeight: 800,
            cursor: exporting !== null ? 'not-allowed' : 'pointer',
            opacity: exporting !== null && !isExporting ? 0.5 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          PNG
        </button>
      </div>
    </div>
  );
}