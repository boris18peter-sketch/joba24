import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { CANONICAL_HOSTS, HOST_RE, normalizeHostname, domainReady, inspectDomain, externalStep } from '../../shared/domainInfrastructure.ts';
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req), user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'forbidden' }, { status: 403 });
    const svc = base44.asServiceRole, body = await req.json();
    const brand = (await svc.entities.Brand.filter({ id: body.brand_id }))?.[0];
    if (!brand) return Response.json({ error: 'brand_not_found' }, { status: 404 });
    const domains = await svc.entities.BrandDomain.filter({ brand_id: brand.id }, 'created_date', 100);
    const action = body.action;
    const result = async extra => Response.json({ success: true, domains: await svc.entities.BrandDomain.filter({ brand_id: brand.id }, 'created_date', 100), ...extra });
    if (action === 'routing') return Response.json({ success: true, routing: domains.map(d => ({ id: d.id, ...externalStep(d.hostname) })) });
    if (action === 'add') {
      const hostname = normalizeHostname(body.hostname);
      if (!HOST_RE.test(hostname) || /\.(local|internal|localhost)$/.test(hostname)) return Response.json({ error: 'hostname_invalid' }, { status: 400 });
      if ((await svc.entities.BrandDomain.filter({ hostname }))?.length) return Response.json({ error: 'domain_taken' }, { status: 409 });
      await svc.entities.BrandDomain.create({ brand_id: brand.id, hostname, status: 'pending', is_primary: !domains.length, platform_status: 'unknown', dns_status: 'unknown' });
      return result({ external_step: externalStep(hostname) });
    }
    const domain = domains.find(d => d.id === body.domain_id);
    if (!domain) return Response.json({ error: 'domain_not_found' }, { status: 404 });
    const protectedHost = CANONICAL_HOSTS.includes(domain.hostname);
    if (action === 'verify' || action === 'activate') {
      const evidence = await inspectDomain(domain.hostname);
      const patch = { verification_version: 2, last_checked_at: evidence.checked_at, verified_at: evidence.serves_app ? evidence.checked_at : null, platform_status: evidence.platform_status, dns_status: evidence.dns_status, check_details: evidence };
      if (action === 'activate' && evidence.serves_app && brand.status === 'active') patch.status = 'active';
      else if (!evidence.serves_app && !protectedHost && domain.status === 'active') patch.status = 'pending';
      await svc.entities.BrandDomain.update(domain.id, patch);
      return result({ evidence, activated: action === 'activate' && evidence.serves_app && brand.status === 'active', message: brand.status !== 'active' ? 'Brand is unavailable; restore the Brand before activating.' : evidence.message });
    }
    if (action === 'set_primary') {
      if (!domainReady(domain) && !protectedHost) return Response.json({ error: 'not_verified' }, { status: 409 });
      await svc.entities.BrandDomain.bulkUpdate(domains.filter(d => d.is_primary || d.id === domain.id).map(d => ({ id: d.id, is_primary: d.id === domain.id })));
      return result({});
    }
    if (action === 'deactivate') {
      if (protectedHost) return Response.json({ error: 'canonical_domain_protected' }, { status: 409 });
      await svc.entities.BrandDomain.update(domain.id, { status: 'disabled' });
      return result({});
    }
    if (action === 'remove') {
      if (protectedHost) return Response.json({ error: 'canonical_domain_protected' }, { status: 409 });
      await svc.entities.BrandDomain.delete(domain.id);
      const remaining = domains.filter(d => d.id !== domain.id);
      if (domain.is_primary && remaining.length) {
        const next = remaining.find(d => d.status === 'active' && domainReady(d)) || remaining[0];
        await svc.entities.BrandDomain.update(next.id, { is_primary: true });
      }
      return result({ removed: domain.hostname, infrastructure_removed: false, external_step: externalStep(domain.hostname).removal });
    }
    return Response.json({ error: 'unknown_action' }, { status: 400 });
  } catch (error) { return Response.json({ error: 'domain_action_failed', message: error.message }, { status: 500 }); }
}