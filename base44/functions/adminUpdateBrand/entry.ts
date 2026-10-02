import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { mergeTheme } from '../../shared/brandTheme.ts';

/**
 * adminUpdateBrand — Brand Manager.
 *
 * The ONLY trusted way to edit a Brand and its BrandConfig. Platform Admin only.
 *
 * Protections:
 *  • The canonical Joba24 Brand (is_default) can never be suspended/archived and
 *    its slug can never change.
 *  • A slug change must be explicitly confirmed (`confirm_slug_change: true`)
 *    because the slug is a permanent platform identifier and may appear in URLs.
 *  • Colours must be valid hex; asset URLs must be http(s) — an invalid value is
 *    REJECTED rather than silently stored.
 *  • `marketplace` is MERGED, so a partial save never wipes existing overrides.
 *    Only the explicitly overridable pricing keys are accepted.
 */

const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/;
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const LOCALES = ['he', 'en', 'ar', 'es', 'fr', 'ru', 'zh', 'hi', 'fil'];
const OVERRIDABLE = [
  'application_fee_percent', 'application_fee_min', 'story_cost',
  'boost_cost', 'loyalty_reward_percent', 'loyalty_reward_min',
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'forbidden', message: 'Platform admin only' }, { status: 403 });
    }
    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    const brandId = String(body?.brand_id || '');
    if (!brandId) return Response.json({ error: 'brand_id_required' }, { status: 400 });

    const found = await svc.entities.Brand.filter({ id: brandId });
    const brand = found?.[0];
    if (!brand) return Response.json({ error: 'brand_not_found' }, { status: 404 });

    // A provided-but-invalid value is REJECTED, never silently dropped: an admin
    // must not believe a colour or URL was saved when it was not.
    const invalid: string[] = [];

    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : undefined);
    const url = (v: unknown) => {
      const s = str(v);
      if (s === undefined) return undefined;
      if (!s) return '';
      if (!/^https?:\/\//i.test(s)) { invalid.push('url'); return undefined; }
      return s;
    };
    const color = (v: unknown) => {
      const s = str(v);
      if (s === undefined) return undefined;
      if (!s) return '';
      if (!HEX_RE.test(s)) { invalid.push('color'); return undefined; }
      return s;
    };

    // ── Brand record ─────────────────────────────────────────────────────────
    const brandPatch: Record<string, unknown> = {};

    if (typeof body?.name === 'string') {
      const name = body.name.trim();
      if (!name) return Response.json({ error: 'name_required' }, { status: 400 });
      brandPatch.name = name;
    }

    if (typeof body?.status === 'string' && ['active', 'suspended', 'archived'].includes(body.status)) {
      if (brand.is_default && body.status !== 'active') {
        return Response.json({ error: 'cannot_change_default_status' }, { status: 400 });
      }
      brandPatch.status = body.status;
    }

    if (typeof body?.slug === 'string') {
      const slug = body.slug.trim().toLowerCase();
      if (slug !== brand.slug) {
        if (brand.is_default) return Response.json({ error: 'slug_locked_default' }, { status: 400 });
        if (!SLUG_RE.test(slug)) return Response.json({ error: 'slug_invalid' }, { status: 400 });
        if (body?.confirm_slug_change !== true) {
          return Response.json({ error: 'slug_change_not_confirmed' }, { status: 400 });
        }
        const taken = await svc.entities.Brand.filter({ slug });
        if ((taken || []).some((b: any) => b.id !== brandId)) {
          return Response.json({ error: 'slug_taken' }, { status: 409 });
        }
        brandPatch.slug = slug;
      }
    }

    // ── BrandConfig ──────────────────────────────────────────────────────────
    const configs = await svc.entities.BrandConfig.filter({ brand_id: brandId });
    const existing = configs?.[0] || null;

    const cfgPatch: Record<string, unknown> = {};
    const assign = (key: string, value: unknown) => { if (value !== undefined) cfgPatch[key] = value; };

    assign('display_name', str(body?.display_name));
    assign('logo_url', url(body?.logo_url));
    assign('favicon_url', url(body?.favicon_url));
    assign('primary_color', color(body?.primary_color));
    assign('primary_dark_color', color(body?.primary_dark_color));
    assign('accent_color', color(body?.accent_color));
    assign('support_email', str(body?.support_email));
    assign('support_phone', str(body?.support_phone));
    assign('terms_url', url(body?.terms_url));
    assign('privacy_url', url(body?.privacy_url));

    // ── Design tokens (BrandConfig.theme) ────────────────────────────────────
    // Merged, never replaced: saving one token never wipes the rest.
    if (body?.theme && typeof body.theme === 'object') {
      const { theme, invalid: badTokens } = mergeTheme(existing?.theme, body.theme);
      if (badTokens.length) {
        return Response.json({
          error: 'theme_value_invalid',
          fields: badTokens,
          message: 'A colour must be a valid CSS colour, a radius 0-60, and a shadow a preset or a valid shadow value.',
        }, { status: 400 });
      }
      cfgPatch.theme = theme;
      // Once managed in Design System, legacy palette fields cannot resurrect a reset.
      for (const [token, legacy] of Object.entries({ primary:'primary_color', primary_dark:'primary_dark_color', accent:'accent_color' })) {
        if (Object.hasOwn(body.theme, token)) cfgPatch[legacy] = '';
      }
    }

    if (invalid.length) {
      return Response.json({
        error: 'invalid_value',
        fields: [...new Set(invalid)],
        message: 'A colour must be HEX (#rrggbb) and a URL must start with http(s)://',
      }, { status: 400 });
    }

    if (typeof body?.default_locale === 'string') {
      if (!LOCALES.includes(body.default_locale)) {
        return Response.json({ error: 'locale_invalid' }, { status: 400 });
      }
      cfgPatch.default_locale = body.default_locale;
    }

    if (body?.marketplace && typeof body.marketplace === 'object') {
      const merged: Record<string, unknown> = { ...(existing?.marketplace || {}) };
      for (const key of OVERRIDABLE) {
        if (!(key in body.marketplace)) continue;
        const raw = body.marketplace[key];
        if (raw === null || raw === '') { delete merged[key]; continue; }
        const value = Number(raw);
        if (!Number.isFinite(value) || value < 0) {
          return Response.json({ error: 'marketplace_value_invalid', key }, { status: 400 });
        }
        merged[key] = value;
      }
      cfgPatch.marketplace = merged;
    }

    // ── Apply ────────────────────────────────────────────────────────────────
    let updatedBrand = brand;
    if (Object.keys(brandPatch).length) {
      updatedBrand = await svc.entities.Brand.update(brandId, brandPatch);
    }

    let updatedConfig = existing;
    if (Object.keys(cfgPatch).length) {
      updatedConfig = existing
        ? await svc.entities.BrandConfig.update(existing.id, cfgPatch)
        : await svc.entities.BrandConfig.create({
            brand_id: brandId,
            inherit_from_brand_id: brand.is_default ? null : undefined,
            ...cfgPatch,
          });
    }

    // Return the authoritative persisted row, not the submitted map or defaults.
    if (updatedConfig) {
      updatedConfig = await svc.entities.BrandConfig.get(updatedConfig.id);
      if (cfgPatch.theme && (Object.keys(updatedConfig?.theme || {}).length !== Object.keys(cfgPatch.theme).length || Object.entries(cfgPatch.theme).some(([key, value]) => updatedConfig?.theme?.[key] !== value))) {
        return Response.json({ error: 'theme_persistence_failed' }, { status: 500 });
      }
    }
    return Response.json({ success: true, brand: updatedBrand, config: updatedConfig });
  } catch (error: any) {
    console.error('adminUpdateBrand error:', error?.message);
    return Response.json({ error: 'update_failed', message: error?.message }, { status: 500 });
  }
}