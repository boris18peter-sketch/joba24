/**
 * Brand context for backend functions (Packages 4.1.2–4.4).
 *
 * The SERVER resolves the Brand from the request host — never from a client
 * supplied brand_id. This is the trusted counterpart of the frontend
 * `src/lib/brand/brandResolver.js`, and the ONLY place a backend function may
 * decide which Brand a public request belongs to.
 *
 *   hostname → BrandDomain → Brand → brand_id
 *
 * Rules (identical to the frontend resolver, ADR-12):
 *  • A registered, active BrandDomain wins.
 *  • A registered but inactive domain (pending / disabled) resolves to NOTHING.
 *  • A platform / development host resolves to the platform Brand (Joba24).
 *  • Any other hostname resolves to NOTHING — an unknown production domain must
 *    never receive marketplace data.
 */

export function normalizeHost(raw: string | null | undefined): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .split('/')[0]
    .split(':')[0]
    .replace(/\.$/, '');
}

export function isPlatformHost(host: string): boolean {
  if (!host) return true;
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return true;
  if (host.endsWith('.local')) return true;
  if (/^(.*\.)?base44\.(app|com|dev|io|ai)$/.test(host)) return true;
  return false;
}

/** The host the caller actually reached, preferring the proxy header. */
export function requestHost(req: Request): string {
  const h = req.headers;
  return normalizeHost(
    h.get('x-forwarded-host') || h.get('x-original-host') || h.get('host') || ''
  );
}

export interface ResolvedBrand {
  resolved: boolean;
  brandId: string | null;
  hostname: string;
  reason: string;
}

/**
 * Resolve the Brand for a request. Service role is used because public/guest
 * requests have no authenticated user, and BrandDomain is public-read.
 */
export async function resolveBrandFromRequest(base44: any, req: Request): Promise<ResolvedBrand> {
  const hostname = requestHost(req);
  const svc = base44.asServiceRole;

  if (hostname) {
    const domains = await svc.entities.BrandDomain.filter({ hostname });
    const active = (domains || []).find((d: any) => d.status === 'active');
    if (active) {
      const brands = await svc.entities.Brand.filter({ id: active.brand_id });
      const brand = (brands || [])[0];
      if (!brand) return { resolved: false, brandId: null, hostname, reason: 'brand_missing' };
      if (brand.status === 'suspended' || brand.status === 'archived') {
        return { resolved: false, brandId: null, hostname, reason: 'brand_unavailable' };
      }
      return { resolved: true, brandId: brand.id, hostname, reason: 'domain' };
    }
    if ((domains || []).length) {
      return { resolved: false, brandId: null, hostname, reason: 'domain_inactive' };
    }
  }

  if (isPlatformHost(hostname)) {
    const defaults = await svc.entities.Brand.filter({ is_default: true });
    let brand = (defaults || [])[0];
    if (!brand) {
      const active = await svc.entities.Brand.filter({ status: 'active' });
      brand = (active || [])[0];
    }
    if (brand) return { resolved: true, brandId: brand.id, hostname, reason: 'platform' };
  }

  return { resolved: false, brandId: null, hostname, reason: 'unknown_host' };
}