import DeviceFrame from '@/components/storekit/DeviceFrame';
import BrandLockup from '@/components/storekit/BrandLockup';
import { THEMES } from '@/lib/storekit/specs';

/**
 * One full store screenshot canvas at exact export pixel dimensions.
 *
 * Layout is composed per canvas aspect ratio (never resized from another set):
 *   • headline block — one strong headline + max one supporting sentence
 *   • device frame holding the real app UI
 *   • Joba24 lockup
 *
 * Every word is a real text layer, so Hebrew stays exact, correctly shaped and
 * RTL — nothing is baked into an image.
 */
export default function StoreCanvas({ canvas, screen, children, innerRef }) {
  const theme = THEMES[screen.theme] || THEMES.light;
  const pad = Math.round(canvas.w * 0.075);
  const headlineSize = Math.round(canvas.w * (canvas.platform === 'ios' && canvas.key === 'ipad' ? 0.082 : 0.092));
  const subSize = Math.round(canvas.w * 0.0375);
  const ruleW = Math.round(canvas.w * 0.062);
  const ruleH = Math.max(4, Math.round(canvas.w * 0.0055));
  const brandSize = Math.round(canvas.w * 0.055);

  const hasAccent = screen.accent && screen.headline.includes(screen.accent);
  const parts = hasAccent ? screen.headline.split(screen.accent) : null;

  return (
    <div
      ref={innerRef}
      dir="rtl"
      style={{
        width: canvas.w,
        height: canvas.h,
        background: theme.bg,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        padding: pad,
        paddingTop: Math.round(pad * 0.92),
        paddingBottom: Math.round(pad * 0.66),
        fontFamily: 'var(--font-inter)',
      }}
    >
      {/* Single, restrained brand wash */}
      <div style={{ position: 'absolute', inset: 0, background: theme.glow, pointerEvents: 'none' }} />

      {/* Headline block */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          style={{
            width: ruleW,
            height: ruleH,
            borderRadius: 999,
            background: theme.rule,
            marginBottom: Math.round(canvas.w * 0.030),
          }}
        />
        <h1
          style={{
            margin: 0,
            fontSize: headlineSize,
            fontWeight: 900,
            lineHeight: 1.13,
            letterSpacing: '-0.022em',
            color: theme.headline,
            maxWidth: '96%',
          }}
        >
          {hasAccent ? (
            <>
              {parts[0]}
              <span style={{ color: theme.accent }}>{screen.accent}</span>
              {parts.slice(1).join(screen.accent)}
            </>
          ) : (
            screen.headline
          )}
        </h1>
        {screen.sub && (
          <p
            style={{
              margin: `${Math.round(canvas.w * 0.026)}px 0 0`,
              fontSize: subSize,
              fontWeight: 500,
              lineHeight: 1.5,
              color: theme.sub,
              maxWidth: '86%',
            }}
          >
            {screen.sub}
          </p>
        )}
      </div>

      {/* Device */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          marginTop: Math.round(canvas.w * 0.040),
        }}
      >
        <DeviceFrame canvas={canvas}>{children}</DeviceFrame>
      </div>

      {/* Lockup */}
      <div style={{ position: 'relative', flexShrink: 0, paddingTop: Math.round(canvas.w * 0.032) }}>
        <BrandLockup size={brandSize} nameColor={theme.brandName} subColor={theme.brandSub} />
      </div>
    </div>
  );
}