import { useBrand } from '@/lib/brand/BrandProvider';

/**
 * ONE authoritative runtime Brand identity source.
 *
 *   Brand + BrandConfig + BrandContext  →  useBrandIdentity()
 *
 * Every Brand-facing surface (header, menu, loading, onboarding, login, support,
 * popups, empty states) reads its name and logo from here. Nothing hardcodes
 * "Joba24" or a Joba24 logo — the platform Brand simply resolves to its own
 * configured values, so a renamed Brand propagates everywhere automatically.
 */

/** The platform Brand's own mark — the value used when a Brand defines none. */
export const PLATFORM_LOGO = 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg';

export function useBrandIdentity() {
  const { effective, isPlatformBrand, isLoading } = useBrand();
  const name = effective?.displayName || 'Joba24';
  return {
    isLoading,
    isPlatformBrand,
    name,
    logoUrl: effective?.logoUrl || (isPlatformBrand ? PLATFORM_LOGO : null),
    faviconUrl: effective?.faviconUrl || null,
    supportEmail: effective?.supportEmail || null,
    supportPhone: effective?.supportPhone || null,
  };
}

/**
 * Brand-attributed copy. A surface that shows the platform name in its own
 * words renders it through this, so renaming the Brand updates it everywhere.
 * The platform Brand's text is returned untouched.
 */
export function useBrandText() {
  const { name, isPlatformBrand } = useBrandIdentity();
  return (str) => {
    if (!str || isPlatformBrand || !name || name === 'Joba24') return str;
    return String(str).replace(/Joba24/g, name);
  };
}

/** The Brand's logo, from the single central source. */
export function BrandLogo({ size = 34, radius = 'var(--r-sm)', style, alt }) {
  const { logoUrl, name } = useBrandIdentity();
  if (!logoUrl) {
    return (
      <div style={{
        width: size, height: size, borderRadius: radius, flexShrink: 0,
        background: 'linear-gradient(135deg, var(--brand-primary, #1a6fd4), var(--brand-primary-dark, #0a52b0))',
        ...style,
      }} />
    );
  }
  return (
    <img
      src={logoUrl}
      alt={alt || name}
      style={{ width: size, height: size, borderRadius: radius, objectFit: 'contain', flexShrink: 0, ...style }}
    />
  );
}

/**
 * The Brand's name, from the single central source.
 * The platform Brand keeps its two-tone wordmark; every other Brand renders its
 * own display name as plain text.
 */
export function BrandName({ style, accentStyle }) {
  const { name, isPlatformBrand } = useBrandIdentity();
  const isWordmark = isPlatformBrand && /^joba\s*24$/i.test(name.replace(/\s/g, ''));
  if (!isWordmark) return <span style={style}>{name}</span>;
  return (
    <span style={style}>
      Joba<span style={{ color: 'var(--brand-accent)', ...accentStyle }}>24</span>
    </span>
  );
}