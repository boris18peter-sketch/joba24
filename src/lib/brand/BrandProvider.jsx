import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { BRAND_STATE, resolveBrandContext, effectiveBrandConfig } from '@/lib/brand/brandResolver';

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

    resolveBrandContext(hostname)
      .then((resolved) => {
        if (cancelled) return;
        setCtx({
          state: resolved.state,
          hostname: resolved.hostname,
          brand: resolved.brand,
          brandId: resolved.brand?.id || null,
          config: resolved.config,
          isPlatformBrand: resolved.brand?.is_default === true,
        });
      })
      .catch(() => {
        if (cancelled) return;
        // A resolution failure must never silently expose the platform Brand.
        setCtx({ ...INITIAL, state: BRAND_STATE.UNKNOWN, hostname });
      });

    return () => { cancelled = true; };
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