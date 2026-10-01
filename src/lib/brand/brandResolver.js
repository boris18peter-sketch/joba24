import { base44 } from '@/api/base44Client';

/**
 * Brand runtime — the ONE authoritative source of "which Brand is this surface?".
 *
 *   hostname → BrandDomain → Brand → BrandConfig → BrandContext
 *
 * Components never resolve the Brand themselves; they read the context.
 *
 * Rules:
 *  • A hostname that is registered in `BrandDomain` resolves to that Brand.
 *  • A platform/development host (Base44 infrastructure, localhost, the native
 *    WebView origin, or an embedded preview frame) resolves to the platform
 *    Brand (Joba24) — these are not public production surfaces.
 *  • Any OTHER hostname resolves to NOTHING. An unknown production domain must
 *    never silently serve Joba24 data.
 *
 * Resolution is by hostname only. A Brand id is NEVER accepted from a client
 * (ADR-12) — the hostname is resolved to a Brand record here, and the Brand's
 * own `id` is what the rest of the app uses.
 */

export const BRAND_STATE = {
  LOADING: 'loading',
  RESOLVED: 'resolved',
  UNKNOWN: 'unknown',
  UNAVAILABLE: 'unavailable',
};

/** Lowercase host, no protocol / port / trailing dot. */
export function normalizeHostname(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .split('/')[0]
    .split(':')[0]
    .replace(/\.$/, '');
}

/** Base44 infrastructure, local dev and the native WebView — never a public Brand surface. */
export function isPlatformHost(host) {
  if (!host) return true;
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return true;
  if (host.endsWith('.local')) return true;
  if (/^(.*\.)?base44\.(app|com|dev|io|ai)$/.test(host)) return true;
  return false;
}

/** Running inside the builder preview iframe — an embedded surface, not a public domain. */
function isEmbeddedPreview() {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true; // cross-origin access throws → we are framed
  }
}

async function findDefaultBrand() {
  const defaults = await base44.entities.Brand.filter({ is_default: true });
  if (defaults?.[0]) return defaults[0];
  const active = await base44.entities.Brand.filter({ status: 'active' });
  return active?.[0] || null;
}

async function loadConfig(brandId) {
  try {
    const rows = await base44.entities.BrandConfig.filter({ brand_id: brandId });
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

/**
 * Resolve the BrandContext for a hostname.
 * @returns {Promise<{state:string, hostname:string, brand:object|null, config:object|null, matchedDomain:object|null}>}
 */
export async function resolveBrandContext(hostname) {
  const host = normalizeHostname(hostname);

  let brand = null;
  let matchedDomain = null;

  // 1. An explicitly registered domain always wins.
  if (host) {
    const domains = await base44.entities.BrandDomain.filter({ hostname: host });
    const active = (domains || []).find((d) => d.status === 'active');
    if (active) {
      matchedDomain = active;
      const brands = await base44.entities.Brand.filter({ id: active.brand_id });
      brand = brands?.[0] || null;
    } else if (domains?.length) {
      // Registered but not active (pending / disabled) — the Brand must not resolve.
      return { state: BRAND_STATE.UNKNOWN, hostname: host, brand: null, config: null, matchedDomain: domains[0] };
    }
  }

  // 2. Platform / development / embedded-preview hosts → the platform Brand.
  if (!brand && (isPlatformHost(host) || isEmbeddedPreview())) {
    brand = await findDefaultBrand();
  }

  // 3. Unknown production domain → nothing. Never fall back to Joba24.
  if (!brand) {
    return { state: BRAND_STATE.UNKNOWN, hostname: host, brand: null, config: null, matchedDomain };
  }

  if (brand.status === 'suspended' || brand.status === 'archived') {
    return { state: BRAND_STATE.UNAVAILABLE, hostname: host, brand, config: null, matchedDomain };
  }

  const config = await loadConfig(brand.id);
  return { state: BRAND_STATE.RESOLVED, hostname: host, brand, config, matchedDomain };
}

/**
 * Effective Brand configuration: the Brand's own values, with any unset key
 * inherited from its parent Brand (Joba24 by default). A new Brand therefore
 * starts with working defaults and overrides only what it needs.
 */
export function effectiveBrandConfig(ctx) {
  const config = ctx?.config || {};
  const displayName = config.display_name || ctx?.brand?.name || '';
  return {
    displayName,
    logoUrl: config.logo_url || null,
    faviconUrl: config.favicon_url || null,
    primaryColor: config.primary_color || null,
    primaryDarkColor: config.primary_dark_color || null,
    accentColor: config.accent_color || null,
    supportEmail: config.support_email || null,
    supportPhone: config.support_phone || null,
    termsUrl: config.terms_url || null,
    privacyUrl: config.privacy_url || null,
    defaultLocale: config.default_locale || null,
    marketplace: config.marketplace || {},
  };
}