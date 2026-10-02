import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { listAll, rootKey } from '../../shared/categoryTree.ts';

/**
 * adminCreateBrand — Package 4.5.
 *
 * The ONLY trusted way to create a Brand. Platform Admin only.
 *
 * The frontend may never assemble a Brand across several entities: that would
 * allow a half-created, usable Brand to exist. This function creates the whole
 * set atomically in effect — Brand → BrandConfig → BrandDomain → BrandCategory —
 * and if ANY step fails it removes everything it created, so a partial Brand is
 * never left behind.
 *
 * The Brand and its domains are created INACTIVE and are only made live as the
 * final step. Until then nothing resolves to the new Brand.
 */

const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/;
const CATEGORY_KEYS = [
  'plumbing', 'electricity', 'handyman', 'cleaning', 'moving', 'heavy_lifting',
  'painting', 'carpentry', 'ac', 'locksmith', 'gardening', 'home_maintenance',
  'car', 'transportation', 'delivery', 'shopping', 'pets', 'babysitting',
  'elderly_care', 'tutoring', 'fitness', 'photography', 'events',
  'personal_help', 'it_support', 'other',
];

function normalizeHost(raw: string): string {
  return String(raw || '')
    .trim().toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .split('/')[0].split(':')[0].replace(/\.$/, '');
}

export default async function(req) {
  const svc = createClientFromRequest(req).asServiceRole;
  const created: { entity: string; id: string }[] = [];

  const rollback = async () => {
    // Best-effort, reverse order. Nothing is left usable either way, because the
    // Brand and its domains are still inactive at every point this can run.
    for (const rec of [...created].reverse()) {
      try { await svc.entities[rec.entity].delete(rec.id); } catch (e) {
        console.error(`rollback failed for ${rec.entity}/${rec.id}:`, e?.message);
      }
    }
  };

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'forbidden', message: 'Platform admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    // ── Validate ────────────────────────────────────────────────────────────
    const slug = String(body?.slug || '').trim().toLowerCase();
    const name = String(body?.name || '').trim();
    const hostname = normalizeHost(body?.hostname);
    const customDomain = normalizeHost(body?.custom_domain);

    const errors: string[] = [];
    if (!name) errors.push('name_required');
    if (!slug) errors.push('slug_required');
    else if (!SLUG_RE.test(slug)) errors.push('slug_invalid');
    if (!hostname) errors.push('hostname_required');
    if (errors.length) return Response.json({ error: 'validation_failed', errors }, { status: 400 });

    const requestedStatus = body?.status === 'suspended' ? 'suspended' : 'active';

    // ── Uniqueness ──────────────────────────────────────────────────────────
    const slugTaken = await svc.entities.Brand.filter({ slug });
    if (slugTaken?.length) return Response.json({ error: 'slug_taken' }, { status: 409 });

    const hostsToRegister = [...new Set([hostname, customDomain].filter(Boolean))];
    for (const h of hostsToRegister) {
      const taken = await svc.entities.BrandDomain.filter({ hostname: h });
      if (taken?.length) return Response.json({ error: 'domain_taken', hostname: h }, { status: 409 });
    }

    // ── Parent (platform) Brand — config inheritance + category defaults ────
    const defaults = await svc.entities.Brand.filter({ is_default: true });
    const parent = (defaults || [])[0];
    if (!parent) return Response.json({ error: 'platform_brand_missing' }, { status: 500 });

    const globalCategories = await listAll(svc.entities.GlobalCategory);
    const categoryMap = Object.fromEntries(globalCategories.map(g => [g.category_key,g]));
    const assignedParents = [...new Set(Array.isArray(body.parent_category_keys) ? body.parent_category_keys : parent.assigned_parent_keys || [])];
    if (assignedParents.some(key => categoryMap[key]?.node_type !== 'parent')) return Response.json({ error: 'parent_invalid' }, { status: 400 });

    // ── Create (inactive until the final step) ──────────────────────────────
    const brand = await svc.entities.Brand.create({
      slug,
      name,
      status: 'suspended',
      origin: 'partner',
      is_default: false,
      category_model_version: 2,
      assigned_parent_keys: assignedParents,
      excluded_child_keys: [],
    });
    created.push({ entity: 'Brand', id: brand.id });

    const config = await svc.entities.BrandConfig.create({
      brand_id: brand.id,
      display_name: name,
      logo_url: body?.logo_url || '',
      favicon_url: body?.favicon_url || '',
      primary_color: body?.primary_color || '',
      primary_dark_color: body?.primary_dark_color || '',
      accent_color: body?.accent_color || '',
      support_email: body?.support_email || '',
      support_phone: body?.support_phone || '',
      default_locale: body?.default_locale || 'he',
      inherit_from_brand_id: parent.id,
      marketplace: body?.marketplace && typeof body.marketplace === 'object' ? body.marketplace : {},
      is_public: true,
    });
    created.push({ entity: 'BrandConfig', id: config.id });

    const domains = [];
    for (let i = 0; i < hostsToRegister.length; i++) {
      const d = await svc.entities.BrandDomain.create({
        brand_id: brand.id,
        hostname: hostsToRegister[i],
        is_primary: i === 0,
        status: 'pending',
      });
      created.push({ entity: 'BrandDomain', id: d.id });
      domains.push(d);
    }

    // Derive services from parent assignments; never copy child definitions or forms.
    const services = globalCategories.filter(g => g.node_type !== 'parent' && g.active !== false && assignedParents.includes(rootKey(g.category_key,categoryMap)));

    // ── Go live (final step) ────────────────────────────────────────────────
    // Domains deliberately stay 'pending' here. A hostname may only be
    // ACTIVATED once a server-side reachability check has confirmed it actually
    // serves this app (adminManageDomain → verify → activate). Activating it at
    // creation would bypass that gate for a hostname nobody has checked yet.
    const live = await svc.entities.Brand.update(brand.id, { status: requestedStatus });

    const primary = hostsToRegister[0];
    return Response.json({
      success: true,
      brand: live,
      config,
      domains: domains.map((d) => ({ hostname: d.hostname, status: 'pending', is_primary: d.is_primary, verified: false })),
      category_count: services.length,
      url: `https://${primary}`,
      next_step: 'verify_domain',
    });
  } catch (error) {
    console.error('adminCreateBrand error:', error?.message, JSON.stringify(error?.data || {}));
    await rollback();
    return Response.json({ error: 'creation_failed', message: error?.message, rolled_back: true }, { status: 500 });
  }
}