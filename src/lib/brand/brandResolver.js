import { base44 } from '@/api/base44Client';
import { JOBA24_BRAND_ID } from '@/lib/jobaBrand';

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

/* ── Brand cache ─────────────────────────────────────────────────────────────
 * Resolving the Brand costs THREE serialised network round-trips
 * (BrandDomain → Brand → BrandConfig), and the app cannot paint until they
 * finish — so on every cold start the visitor waited on the loading screen
 * while they ran. The resolved context is therefore cached per hostname and
 * used to paint immediately, while the network resolution revalidates in the
 * background.
 *
 * Keyed by hostname on purpose: an unknown domain never has an entry, so it
 * still resolves to nothing and can never inherit another host's Brand. The
 * cache is cleared whenever a host stops resolving to a live Brand.
 */
const BRAND_CACHE_KEY = 'joba24_brand_cache';

/** How long a cached Brand may be trusted before a foreground return re-checks. */
export const BRAND_CACHE_MAX_AGE_MS = 5 * 60 * 1000;

function writeBrandCache(host, ctx) {
  try {
    if (!ctx || ctx.state !== BRAND_STATE.RESOLVED) {
      localStorage.removeItem(BRAND_CACHE_KEY);
      return;
    }
    localStorage.setItem(BRAND_CACHE_KEY, JSON.stringify({ host, ctx, at: Date.now() }));
  } catch {
    /* storage unavailable — resolution simply runs on every launch */
  }
}

/** The cached BrandContext for this hostname, or null when there is none. */
export function cachedBrandContext(hostname) {
  try {
    const raw = JSON.parse(localStorage.getItem(BRAND_CACHE_KEY) || 'null');
    const host = normalizeHostname(hostname);
    if (!raw || !host || raw.host !== host) return null;
    if (raw.ctx?.state !== BRAND_STATE.RESOLVED) return null;
    return raw.ctx;
  } catch {
    return null;
  }
}

/** Age of the cached entry in ms — Infinity when there is none. */
export function brandCacheAgeMs(hostname) {
  try {
    const raw = JSON.parse(localStorage.getItem(BRAND_CACHE_KEY) || 'null');
    const host = normalizeHostname(hostname);
    if (!raw || raw.host !== host || typeof raw.at !== 'number') return Infinity;
    return Date.now() - raw.at;
  } catch {
    return Infinity;
  }
}

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
  const rows = await base44.entities.BrandConfig.filter({ brand_id: brandId });
  return rows?.[0] || null;
}

export function configTheme(config) {
  const legacy = {};
  if (config?.primary_color) legacy.primary = config.primary_color;
  if (config?.primary_dark_color) legacy.primary_dark = config.primary_dark_color;
  if (config?.accent_color) legacy.accent = config.accent_color;
  return { ...legacy, ...(config?.theme || {}) };
}

export async function loadInheritedTheme(brand, config) {
  const fallback = brand.is_default ? null : await findDefaultBrand();
  const seen = new Set([brand.id]);
  const chain = [];
  let parentId = config?.inherit_from_brand_id || fallback?.id;
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = await loadConfig(parentId);
    if (!parent) break;
    chain.unshift(configTheme(parent));
    parentId = parent.inherit_from_brand_id || (parentId !== fallback?.id ? fallback?.id : null);
  }
  return Object.assign({}, ...chain);
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
    const active = (domains || []).find((d) => d.status === 'active' && (
      ['joba24.com', 'www.joba24.com', 'joba24.base44.app'].includes(d.hostname) ||
      (d.verification_version === 2 && d.platform_status === 'observed_connected' && d.dns_status === 'verified' && d.verified_at)
    ));
    if (active) {
      matchedDomain = active;
      const brands = await base44.entities.Brand.filter({ id: active.brand_id });
      brand = brands?.[0] || null;
    } else if (domains?.length) {
      // Registered but not active (pending / disabled) — the Brand must not resolve.
      writeBrandCache(host, null);
      return { state: BRAND_STATE.UNKNOWN, hostname: host, brand: null, config: null, matchedDomain: domains[0] };
    }
  }

  // 2. Platform / development / embedded-preview hosts → the platform Brand.
  if (!brand && (isPlatformHost(host) || isEmbeddedPreview())) {
    brand = await findDefaultBrand();
  }

  // 3. Unknown production domain → nothing. Never fall back to Joba24.
  if (!brand) {
    writeBrandCache(host, null);
    return { state: BRAND_STATE.UNKNOWN, hostname: host, brand: null, config: null, matchedDomain };
  }

  if (brand.status === 'suspended' || brand.status === 'archived') {
    writeBrandCache(host, null);
    return { state: BRAND_STATE.UNAVAILABLE, hostname: host, brand, config: null, matchedDomain };
  }

  const config = await loadConfig(brand.id);
  const inheritedTheme = await loadInheritedTheme(brand, config);
  const resolved = { state: BRAND_STATE.RESOLVED, hostname: host, brand, config, inheritedTheme, matchedDomain };
  writeBrandCache(host, resolved);
  return resolved;
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
    /** Brand design tokens. Null when the Brand defines none (platform look). */
    theme: { ...(ctx?.inheritedTheme || {}), ...configTheme(config) },
  };
}

/* ── Bounded resolution ──────────────────────────────────────────────────────
 * The WHOLE app waits behind this resolution (BrandGate), so an unbounded chain
 * is an unbounded loading screen. A rejection was always handled; a request that
 * simply never SETTLES was not — and on a cold first launch, with nothing warm
 * (no HTTP cache, no connection warm-up, no cached Brand), that is exactly what
 * a stalled request does. The app then sat on the loading screen until the
 * visitor left the app and came back, which fired visibilitychange and re-ran
 * the resolution on a now-warm network.
 *
 * Every launch AFTER the first reads the cached Brand and paints immediately,
 * so the first launch was the only one still exposed to the unbounded chain —
 * which is why this reads as the old startup problem, moved to the one place
 * the cache cannot cover.
 *
 * The bound below makes termination a property of the code rather than of the
 * network: two bounded attempts, then a fallback that ALWAYS settles.
 */
export const BRAND_ATTEMPT_TIMEOUT_MS = 5000;
const BRAND_MAX_ATTEMPTS = 2;

/** The platform's own hostnames — surfaces the platform can trust as its own. */
const PLATFORM_OWN_HOSTS = ['joba24.com', 'www.joba24.com', 'joba24.base44.app'];

/** A host the platform may serve its own Brand on even when the database is unreachable. */
export function isPlatformOwnHost(hostname) {
  const host = normalizeHostname(hostname);
  return isPlatformHost(host) || PLATFORM_OWN_HOSTS.includes(host);
}

/** The platform Brand as a local value — no network. Used only as a bounded fallback. */
export function platformBrandStub() {
  return {
    id: JOBA24_BRAND_ID, slug: 'joba24', name: 'Joba24',
    is_default: true, status: 'active', origin: 'platform',
  };
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('brand-resolution-timeout')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

/**
 * Resolve the BrandContext with a guaranteed terminal outcome.
 *
 * Never rejects and never hangs: two bounded attempts, then a fallback. The
 * fallback serves the platform Brand ONLY on a host the platform owns — an
 * unverified domain still resolves to UNKNOWN and never inherits Joba24.
 *
 * A fallback result is marked `degraded` and is deliberately NOT written to the
 * cache: it is an unblocking answer, not a verified one, and the caller retries
 * it so the real configuration still arrives.
 */
export async function resolveBrandContextSafe(hostname) {
  const host = normalizeHostname(hostname);

  for (let attempt = 0; attempt < BRAND_MAX_ATTEMPTS; attempt++) {
    try {
      return await withTimeout(resolveBrandContext(host), BRAND_ATTEMPT_TIMEOUT_MS);
    } catch (err) {
      // A STALL falls straight through to the fallback. Making the visitor wait
      // a second full timeout on a request that has already proven unresponsive
      // is worse than opening the app now and letting the caller's background
      // retry restore the real Brand a moment later. A rejection, by contrast,
      // costs nothing to retry.
      if (err?.message === 'brand-resolution-timeout') break;
    }
  }

  if (isPlatformOwnHost(host)) {
    return {
      state: BRAND_STATE.RESOLVED, hostname: host, brand: platformBrandStub(),
      config: null, inheritedTheme: {}, matchedDomain: null, degraded: true,
    };
  }
  return {
    state: BRAND_STATE.UNKNOWN, hostname: host, brand: null,
    config: null, matchedDomain: null, degraded: true,
  };
}