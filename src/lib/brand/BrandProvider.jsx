import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { BRAND_STATE, resolveBrandContext, effectiveBrandConfig } from '@/lib/brand/brandResolver';
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
  const [ctx, setCtx] = useState(INITIAL);

  useEffect(() => {
    let cancelled = false;
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

    let revision = 0;
    const refresh = () => {
      const request = ++revision;
      return resolveBrandContext(hostname).then(resolved => {
        if (cancelled || request !== revision) return;
        setCurrentBrandId(resolved.brand?.id || null);
        setCtx({ ...resolved, brandId: resolved.brand?.id || null, isPlatformBrand: resolved.brand?.is_default === true });
      });
    };
    refresh().catch(() => { if (!cancelled) setCtx({ ...INITIAL, state: BRAND_STATE.UNKNOWN, hostname }); });
    const onSaved = () => { refresh(); };
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    const unsubscribe = base44.entities.BrandConfig.subscribe(onSaved);
    window.addEventListener('brand-config-saved', onSaved);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true; unsubscribe();
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