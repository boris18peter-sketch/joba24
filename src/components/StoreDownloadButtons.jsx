// Official-style App Store + Google Play download badges.
// Pass dedicated store URLs via props once available; until then they fall back to '#'.
//   <StoreDownloadButtons appStoreUrl="..." playStoreUrl="..." />
export default function StoreDownloadButtons({
  appStoreUrl,
  playStoreUrl,
  size = 'md',
  align = 'center',
  dark = false,
}) {
  const sizes = {
    sm: { height: 44, padX: 12, gap: 8, icon: 20, topText: 7, bigText: 12 },
    md: { height: 52, padX: 15, gap: 10, icon: 24, topText: 8, bigText: 14 },
    lg: { height: 60, padX: 18, gap: 12, icon: 28, topText: 9, bigText: 16 },
  }[size];

  const badgeBase = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: sizes.gap,
    height: sizes.height,
    padding: `0 ${sizes.padX}px`,
    borderRadius: 12,
    background: '#000',
    color: '#fff',
    textDecoration: 'none',
    flex: '1 1 0',
    maxWidth: 180,
    minWidth: 0,
    boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
    border: '1px solid rgba(255,255,255,0.12)',
    transition: 'transform 0.12s ease, opacity 0.12s ease',
    WebkitTapHighlightColor: 'transparent',
  };

  const Apple = (
    <svg width={sizes.icon} height={sizes.icon} viewBox="0 0 24 24" fill="white" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.58 9.05 7.18c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );

  const GooglePlay = (
    <svg width={sizes.icon} height={sizes.icon} viewBox="0 0 512 512" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path fill="#00C8FF" d="M48 32C33.5 32 22 42.3 20.3 55.4l194.5 194.5L325.7 139 71.4 38.7C64.6 34.4 56.3 32 48 32z" />
      <path fill="#00C8FF" d="M20.3 55.4C20.1 56.9 20 58.4 20 60v392c0 1.6.1 3.1.3 4.6l194.5-196.4L20.3 55.4z" />
      <path fill="#00E676" d="M214.8 249.9L20.3 456.6C22 469.7 33.5 480 48 480c8.3 0 16.6-2.4 23.4-6.7L325.7 360.9 214.8 249.9z" />
      <path fill="#FFB300" d="M325.7 139l-110.9 110.9 110.9 111 152.8-85.9c16.2-9.1 16.2-31.9 0-41L325.7 139z" />
      <path fill="#FF3A44" d="M325.7 360.9l152.8 85.9c16.2 9.1 16.2 31.9 0 41L325.7 360.9z" />
      <path fill="#E63900" d="M478.5 446.8c10-5.6 16.5-15.9 16.5-27.8 0-11.9-6.5-22.2-16.5-27.8L325.7 360.9l152.8 85.9z" opacity="0.85" />
    </svg>
  );

  const Text = ({ small, big }) => (
    <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, textAlign: 'right', minWidth: 0 }}>
      <span style={{ fontSize: sizes.topText, opacity: 0.82, fontWeight: 500 }}>{small}</span>
      <span style={{ fontSize: sizes.bigText, fontWeight: 700, letterSpacing: 0.2 }}>{big}</span>
    </span>
  );

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: align === 'center' ? 'center' : 'flex-start', flexWrap: 'nowrap', width: '100%', maxWidth: 380, margin: align === 'center' ? '0 auto' : undefined }}>
      <a
        href={appStoreUrl || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-tap"
        style={badgeBase}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {Apple}
        <Text small="Download on the" big="App Store" />
      </a>
      <a
        href={playStoreUrl || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-tap"
        style={badgeBase}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {GooglePlay}
        <Text small="GET IT ON" big="Google Play" />
      </a>
    </div>
  );
}