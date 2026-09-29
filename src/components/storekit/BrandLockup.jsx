import { APP_ICON } from '@/lib/storekit/specs';

/**
 * The real Joba24 lockup — same icon asset and same wordmark treatment the app
 * header uses (icon + "Joba" + "24" in the brand accent).
 */
export default function BrandLockup({ size = 44, nameColor, subColor, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: size * 0.28, direction: 'rtl' }}>
      <img
        src={APP_ICON}
        alt="Joba24"
        crossOrigin="anonymous"
        style={{ width: size, height: size, objectFit: 'cover', borderRadius: size * 0.26, flexShrink: 0 }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: size * 0.06 }}>
        <span
          style={{
            fontWeight: 900,
            fontSize: size * 0.62,
            letterSpacing: -0.8,
            lineHeight: 1,
            color: nameColor,
          }}
        >
          Joba<span style={{ color: '#fbbf24' }}>24</span>
        </span>
        {sub && (
          <span style={{ fontSize: size * 0.27, fontWeight: 600, color: subColor, letterSpacing: 0.2 }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}