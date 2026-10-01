import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * adminManageDomain — Brand Manager → Domains. Platform Admin only.
 *
 * IMPORTANT — what this function can and cannot do.
 *
 * Registering a hostname in `BrandDomain` only tells the APP RUNTIME which Brand
 * a hostname belongs to. It does NOT connect the domain at the platform/network
 * level. The platform step (Dashboard → Domains: add the domain, add the DNS
 * records, Verify) is the part that makes the hostname actually serve this app,
 * and it CANNOT be performed from application code.
 *
 * Therefore:
 *  • `add`     creates the row as `pending`. It is never shown as connected.
 *  • `verify`  performs a REAL server-side check that the hostname serves this
 *              app. Only a successful check records `verified_at`.
 *  • `activate` REFUSES unless `verified_at` is set — a hostname typed into a
 *              database field can never be marked live.
 *
 * Actions: add | verify | set_primary | activate | deactivate | remove
 */

const HOST_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

function normalizeHost(raw: unknown): string {
  return String(raw || '')
    .trim().toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .split('/')[0].split(':')[0].replace(/\.$/, '');
}

/** Server-side reachability check: does this hostname actually serve the app? */
async function checkHost(hostname: string) {
  try {
    const res = await fetch(`https://${hostname}/`, {
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
      headers: { 'user-agent': 'Joba24-DomainVerifier/1.0' },
    });
    const body = await res.text();
    // The app's index.html mounts React into <div id="root">. A 200 alone can be
    // a parking page, so the marker matters.
    const servesApp = res.status === 200 && /id=["']root["']/.test(body);
    return { reachable: true, status: res.status, serves_app: servesApp };
  } catch (e: any) {
    return { reachable: false, status: 0, serves_app: false, message: e?.name === 'TimeoutError' ? 'timeout' : e?.message };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'forbidden', message: 'Platform admin only' }, { status: 403 });
    }
    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    const action = String(body?.action || '');
    const brandId = String(body?.brand_id || '');
    if (!brandId) return Response.json({ error: 'brand_id_required' }, { status: 400 });

    const brands = await svc.entities.Brand.filter({ id: brandId });
    const brand = brands?.[0];
    if (!brand) return Response.json({ error: 'brand_not_found' }, { status: 404 });

    const rows = await svc.entities.BrandDomain.filter({ brand_id: brandId }, 'created_date', 100);
    const domains = rows || [];
    const now = new Date().toISOString();

    // ── add ──────────────────────────────────────────────────────────────────
    if (action === 'add') {
      const hostname = normalizeHost(body?.hostname);
      if (!hostname) return Response.json({ error: 'hostname_required' }, { status: 400 });
      if (!HOST_RE.test(hostname)) return Response.json({ error: 'hostname_invalid' }, { status: 400 });

      const taken = await svc.entities.BrandDomain.filter({ hostname });
      if (taken?.length) {
        return Response.json({
          error: 'domain_taken',
          hostname,
          owner_brand_id: taken[0].brand_id,
        }, { status: 409 });
      }

      const created = await svc.entities.BrandDomain.create({
        brand_id: brandId,
        hostname,
        is_primary: domains.length === 0,
        status: 'pending',
      });
      return Response.json({ success: true, domain: created });
    }

    // Every other action targets an existing domain row.
    const domainId = String(body?.domain_id || '');
    const domain = domains.find((d: any) => d.id === domainId);
    if (!domain) return Response.json({ error: 'domain_not_found' }, { status: 404 });

    // ── verify (real reachability check, then persist the outcome) ───────────
    if (action === 'verify') {
      const result = await checkHost(domain.hostname);
      const patch: Record<string, unknown> = { last_checked_at: now };
      if (result.serves_app) patch.verified_at = now;
      await svc.entities.BrandDomain.update(domain.id, patch);
      return Response.json({ success: true, ...result, hostname: domain.hostname });
    }

    // ── set_primary ──────────────────────────────────────────────────────────
    if (action === 'set_primary') {
      for (const d of domains) {
        if (d.is_primary && d.id !== domain.id) {
          await svc.entities.BrandDomain.update(d.id, { is_primary: false });
        }
      }
      const updated = await svc.entities.BrandDomain.update(domain.id, { is_primary: true });
      return Response.json({ success: true, domain: updated });
    }

    // ── activate (requires a real verified check) ────────────────────────────
    if (action === 'activate') {
      if (!domain.verified_at) {
        return Response.json({
          error: 'not_verified',
          message: 'Run Verify and get a successful result before activating.',
        }, { status: 409 });
      }
      const updated = await svc.entities.BrandDomain.update(domain.id, { status: 'active' });
      return Response.json({ success: true, domain: updated });
    }

    // ── deactivate ───────────────────────────────────────────────────────────
    if (action === 'deactivate') {
      if (brand.is_default && domain.is_primary) {
        return Response.json({ error: 'cannot_disable_primary_default' }, { status: 400 });
      }
      const updated = await svc.entities.BrandDomain.update(domain.id, { status: 'disabled' });
      return Response.json({ success: true, domain: updated });
    }

    // ── remove ───────────────────────────────────────────────────────────────
    if (action === 'remove') {
      if (brand.is_default) {
        return Response.json({ error: 'cannot_remove_default_domain' }, { status: 400 });
      }
      if (domains.length <= 1) {
        return Response.json({ error: 'last_domain' }, { status: 409 });
      }
      if (domain.is_primary && domains.length > 1) {
        return Response.json({ error: 'reassign_primary_first' }, { status: 409 });
      }
      await svc.entities.BrandDomain.delete(domain.id);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'unknown_action' }, { status: 400 });
  } catch (error: any) {
    console.error('adminManageDomain error:', error?.message);
    return Response.json({ error: 'domain_action_failed', message: error?.message }, { status: 500 });
  }
});