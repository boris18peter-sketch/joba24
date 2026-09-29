import { useRef, useState } from 'react';
import { Download, Loader2, LayoutGrid, Rows3 } from 'lucide-react';
import StorePreviewCard from '@/components/storekit/StorePreviewCard';
import NeedHelpScreen from '@/components/storekit/screens/NeedHelpScreen';
import FindTasksScreen from '@/components/storekit/screens/FindTasksScreen';
import NearbyScreen from '@/components/storekit/screens/NearbyScreen';
import PostTaskScreen from '@/components/storekit/screens/PostTaskScreen';
import ChooseHelperScreen from '@/components/storekit/screens/ChooseHelperScreen';
import ChatScreen from '@/components/storekit/screens/ChatScreen';
import TrustScreen from '@/components/storekit/screens/TrustScreen';
import EverythingScreen from '@/components/storekit/screens/EverythingScreen';
import { CANVASES, CANVAS_ORDER, SCREENS } from '@/lib/storekit/specs';
import { captureCanvas, downloadCanvas, nextFrame } from '@/lib/storekit/capture';

const SCREEN_COMPONENTS = {
  need_help: NeedHelpScreen,
  find_tasks: FindTasksScreen,
  nearby: NearbyScreen,
  post_task: PostTaskScreen,
  choose_helper: ChooseHelperScreen,
  chat: ChatScreen,
  trust: TrustScreen,
  everything: EverythingScreen,
};

const PREVIEW_W = { iphone: 250, android: 250, ipad: 320 };

export default function StoreKitStudio() {
  const [canvasKey, setCanvasKey] = useState('iphone');
  const [exporting, setExporting] = useState(null);
  const [view, setView] = useState('grid');
  const nodeRefs = useRef({});

  const spec = CANVASES[canvasKey];

  const exportScreen = async (screen) => {
    setExporting(screen.id);
    await nextFrame();
    try {
      const node = nodeRefs.current[screen.id];
      const rendered = await captureCanvas(node, spec, screen.theme);
      downloadCanvas(rendered, screen.file);
    } finally {
      setExporting(null);
    }
  };

  const exportAll = async () => {
    for (const screen of SCREENS) {
      // Sequential — one canvas at a time keeps memory flat and the files ordered.
      // eslint-disable-next-line no-await-in-loop
      await exportScreen(screen);
    }
  };

  return (
    <div dir="rtl" style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: '#f4f7fc', fontFamily: 'var(--font-inter)' }}>
      {/* Toolbar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid #e4eaf5',
          padding: '12px 16px',
        }}
      >
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#0d1e40', letterSpacing: -0.3 }}>
              Joba24 — ערכת נכסים לחנויות
            </div>
            <div style={{ fontSize: 11.5, color: '#7b8cab', fontWeight: 600, marginTop: 2 }}>
              {SCREENS.length} מסכים · {spec.folder} · {spec.w}×{spec.h}px
            </div>
          </div>

          <div style={{ display: 'flex', gap: 4, background: '#eef3fc', padding: 4, borderRadius: 11 }}>
            {CANVAS_ORDER.map(key => (
              <button
                key={key}
                onClick={() => setCanvasKey(key)}
                style={{
                  height: 32,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 800,
                  background: canvasKey === key ? '#ffffff' : 'transparent',
                  color: canvasKey === key ? '#1a6fd4' : '#4b6083',
                  boxShadow: canvasKey === key ? '0 1px 4px rgba(15,40,107,0.12)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {CANVASES[key].label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 4, background: '#eef3fc', padding: 4, borderRadius: 11 }}>
            {[
              { k: 'grid', icon: <LayoutGrid size={15} />, label: 'מגע' },
              { k: 'list', icon: <Rows3 size={15} />, label: 'רשימה' },
            ].map(o => (
              <button
                key={o.k}
                onClick={() => setView(o.k)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  height: 32,
                  padding: '0 11px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 800,
                  background: view === o.k ? '#ffffff' : 'transparent',
                  color: view === o.k ? '#1a6fd4' : '#4b6083',
                }}
              >
                {o.icon} {o.label}
              </button>
            ))}
          </div>

          <button
            onClick={exportAll}
            disabled={exporting !== null}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              height: 40,
              padding: '0 16px',
              borderRadius: 11,
              border: 'none',
              background: exporting !== null ? '#c9d6e8' : 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 800,
              cursor: exporting !== null ? 'not-allowed' : 'pointer',
              boxShadow: exporting !== null ? 'none' : '0 4px 14px rgba(26,111,212,0.3)',
              whiteSpace: 'nowrap',
            }}
          >
            {exporting !== null ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            ייצוא כל הסט
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: 16 }}>
        {/* Copy + sequence table — approve the story here before exporting */}
        <div style={{ background: '#ffffff', border: '1px solid #e4eaf5', borderRadius: 16, overflow: 'hidden', marginBottom: 18 }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #eef3fc', fontSize: 12.5, fontWeight: 900, color: '#0d1e40' }}>
            רצף וקופי
          </div>
          {SCREENS.map((s, i) => (
            <div
              key={s.id}
              style={{
                display: 'flex',
                gap: 10,
                padding: '10px 14px',
                borderBottom: i < SCREENS.length - 1 ? '1px solid #f2f5fb' : 'none',
                alignItems: 'flex-start',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 900, color: '#1a6fd4', width: 20, flexShrink: 0, paddingTop: 2 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0d1e40' }}>{s.headline}</div>
                <div style={{ fontSize: 11.5, color: '#4b6083', fontWeight: 500, marginTop: 2 }}>{s.sub}</div>
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#7b8cab', flexShrink: 0, paddingTop: 2 }}>
                {s.file}
              </span>
            </div>
          ))}
        </div>

        {/* Contact sheet */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: view === 'grid' ? 18 : 26,
            justifyContent: view === 'grid' ? 'flex-start' : 'center',
          }}
        >
          {SCREENS.map(screen => {
            const ScreenBody = SCREEN_COMPONENTS[screen.id];
            return (
              <StorePreviewCard
                key={`${canvasKey}-${screen.id}`}
                spec={spec}
                screen={screen}
                previewW={PREVIEW_W[canvasKey]}
                exporting={exporting}
                onExport={exportScreen}
                nodeRef={{
                  get current() { return nodeRefs.current[screen.id]; },
                  set current(el) { nodeRefs.current[screen.id] = el; },
                }}
              >
                <ScreenBody />
              </StorePreviewCard>
            );
          })}
        </div>

        <div style={{ marginTop: 20, fontSize: 11.5, color: '#7b8cab', fontWeight: 600, lineHeight: 1.7 }}>
          כל הטקסט הוא שכבת טקסט אמיתית (עברית מדויקת, RTL) — לא טקסט שרוף בתמונה.
          הקובץ נשמר בשם ובמידות המדויקות של הסט שנבחר.
        </div>
      </div>
    </div>
  );
}