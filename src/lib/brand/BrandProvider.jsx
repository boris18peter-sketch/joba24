import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  BRAND_STATE, resolveBrandContextSafe, effectiveBrandConfig,
  cachedBrandContext, brandCacheAgeMs, BRAND_CACHE_MAX_AGE_MS,
} from '@/lib/brand/brandResolver';
import { setCurrentBrandId } from '@/lib/brand/currentBrand';
import { base44 } from '@/api/base44Client';

/**
 * BrandProvider — resolves the current Brand ONCE and shares it with the whole
 * app. Nothing else may determine the Brand independently.
 *
 * It sits ABOVE AuthProvider on purpose: brand context is resolved before
 * authentication (ADR-11 / Invariant 3), so guests are scoped too, and no Joba24
 * data is fetched on a domain that does not resolve to Joba24.
 */

const BrandContext = createContext(null);

const INITIAL = {
  state: BRAND_STATE.LOADING,
  hostname: '',
  brand: null,
  brandId: null,
  config: null,
  isPlatformBrand: false,
};

export function BrandProvider({ children }) {
  // ── Paint from the cached Brand on the very first frame ─────────────────
  // Resolution costs three serialised round-trips and the whole app waits on
  // it, so a cold start used to sit on the loading screen for seconds. With a
  // cached entry the Brand is known immediately and the network check runs in
  // the background; with no cache (a first-ever visit, or an unknown domain)
  // behaviour is exactly as before.
  const [ctx, setCtx] = useState(() => {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const cached = cachedBrandContext(hostname);
    if (!cached) return INITIAL;
    return {
      ...cached,
      brandId: cached.brand?.id || null,
      isPlatformBrand: cached.brand?.is_default === true,
    };
  });

  // The Brand a new record belongs to follows whatever context is current —
  // including the cached one painted on the very first frame.
  useEffect(() => {
    if (ctx.brandId) setCurrentBrandId(ctx.brandId);
  }, [ctx.brandId]);

  useEffect(() => {
    let cancelled = false;
    let retryTimer = null;
    let degradedAttempts = 0;
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

    let revision = 0;
    const refresh = () => {
      const request = ++revision;
      return resolveBrandContextSafe(hostname).then(resolved => {
        if (cancelled || request !== revision) return;
        setCtx({ ...resolved, brandId: resolved.brand?.id || null, isPlatformBrand: resolved.brand?.is_default === true });

        // ── A degraded result is a fallback, not an answer ──────────────────
        // It exists so the app can never sit on the loading screen, and it is
        // deliberately not cached. The real configuration has therefore not
        // been read yet, so retry in the background — bounded — instead of
        // leaving the Brand unconfigured until the visitor relaunches.
        if (!resolved.degraded) { degradedAttempts = 0; return; }
        if (degradedAttempts >= 3) return;
        degradedAttempts += 1;
        clearTimeout(retryTimer);
        retryTimer = setTimeout(() => { if (!cancelled) refresh(); }, 3000 * degradedAttempts);
      });
    };
    refresh().catch(() => { if (!cancelled) setCtx({ ...INITIAL, state: BRAND_STATE.UNKNOWN, hostname }); });
    const onSaved = () => { refresh(); };
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      // Re-resolving is three round-trips, so returning to the app no longer
      // pays for it on every foreground. A real configuration change still
      // arrives instantly through the BrandConfig subscription and the
      // brand-config-saved event above; this is only a slow safety net.
      if (brandCacheAgeMs(hostname) < BRAND_CACHE_MAX_AGE_MS) return;
      degradedAttempts = 0;
      refresh();
    };
    const unsubscribe = base44.entities.BrandConfig.subscribe(onSaved);
    window.addEventListener('brand-config-saved', onSaved);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true; clearTimeout(retryTimer); unsubscribe();
      window.removeEventListener('brand-config-saved', onSaved);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const value = useMemo(() => {
    const brandId = ctx.brandId;
    return {
      ...ctx,
      isLoading: ctx.state === BRAND_STATE.LOADING,
      isResolved: ctx.state === BRAND_STATE.RESOLVED,
      isUnknown: ctx.state === BRAND_STATE.UNKNOWN,
      isUnavailable: ctx.state === BRAND_STATE.UNAVAILABLE,
      effective: effectiveBrandConfig(ctx),
      /**
       * The Brand a NEW record written on this surface belongs to.
       * Server-side writers must use the backend constant instead — this is for
       * client-created records only, and is never an authorization input.
       */
      currentBrandId: brandId,
    };
  }, [ctx]);

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  const ctx = useContext(BrandContext);
  if (!ctx) {
    throw new Error('useBrand must be used inside <BrandProvider>');
  }
  return ctx;
}

export default BrandProvider;