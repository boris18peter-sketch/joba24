import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * adminManageDomain — Brand Manager → Domains. Platform Admin only.
 *
 * TWO SEPARATE THINGS, and the UI must never blur them:
 *
 *  1. ROUTING (this app). A hostname registered in `BrandDomain` with
 *     status 'active' makes the runtime serve THAT Brand on that hostname.
 *     That is all application code can do.
 *
 *  2. CONNECTION (the platform). Making a hostname actually resolve to this app
 *     — adding it in the platform's Domains page and pointing DNS at it — cannot
 *     be performed from application code. `external_step` below is the exact
 *     action a human must take.
 *
 * A domain is therefore only ever shown as connected after a REAL server-side
 * fetch of the hostname confirms it serves this app.
 *
 * Status lifecycle:
 *   pending     → registered, not yet reachable           (Pending setup)
 *   pending     → reachable check failed                  (Pending verification)
 *   pending     → check passed, verified_at set           (Verified, not routing)
 *   active      → routing this Brand on that hostname      (Active)
 *   disabled    → registered but deliberately not routing  (Disabled)
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

/** Is this hostname a subdomain of a domain the platform already owns? */
function hostKind(hostname: string) {
  const parts = hostname.split('.');
  if (parts.length > 2) {
    return {
      kind: 'subdomain',
      apex: parts.slice(1).join('.'),
      needs_wildcard: true,
    };
  }
  return { kind: 'custom', apex: hostname, needs_wildcard: false };
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
    return {
      reachable: false, status: 0, serves_app: false,
      message: e?.name === 'TimeoutError' ? 'timeout' : e?.message,
    };
  }
}

/** The exact action a human must take outside this app for a hostname. */
function externalStep(hostname: string) {
  const { kind, apex, needs_wildcard } = hostKind(hostname);
  const firstLabel = hostname.split('.')[0];
  if (kind === 'subdomain') {
    return {
      kind,
      apex,
      needs_wildcard,
      summary: 'תת-דומיין — נדרשת רשומת DNS לא-קיימת ופתיחת הדומיין בפלטפורמה',
      steps: [
        `ודא ש-${apex} עצמו מחובר לאפליקציה בעמוד Domains בלוח הבקרה.`,
        `הוסף רשומת CNAME עבור ${firstLabel} שמצביעה על ${apex} — או רשומת CNAME/AAAA מתאימה.`,
        'אם הספק תומך ב-wildcard, רשומת CNAME עם הערך * תכסה כל תת-דומיין.',
        'המתן להתפשטות DNS (בדרך כלל דקות עד שעה).',
        'לחץ "אמת דומיין" כאן. רק אימות מוצלח פותח את ההפעלה.',
      ],
    };
  }
  return {
    kind,
    apex,
    needs_wildcard: false,
    summary: 'דומיין מותאם — נדרשת הוספה בלוח הבקרה והפניית DNS',
    steps: [
      'הוסף את הדומיין בעמוד Domains בלוח הבקרה של הפלטפורמה.',
      'צור רשומת ANAME/ALIAS (או A) עבור @ שמצביעה על היעד שהפלטפורמה מציגה.',
      'צור רשומת CNAME עבור www לאותו יעד.',
      'הסר רשומות AAAA ו-CAA שעלולות לחסום את הנפקת האישור.',
      'המתן להתפשטות DNS (עד 48 שעות).',
      'לחץ "אמת דומיין" כאן. רק אימות מוצלח פותח את ההפעלה.',
    ],
  };
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
      return Response.json({ success: true, domain: created, external_step: externalStep(hostname) });
    }

    // ── routing guidance for the whole Brand ─────────────────────────────────
    if (action === 'routing') {
      return Response.json({
        success: true,
        routing: domains.map((d: any) => ({
          id: d.id,
          hostname: d.hostname,
          ...externalStep(d.hostname),
        })),
      });
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
      // The canonical platform Brand's domains are never removable.
      if (brand.is_default) {
        return Response.json({ error: 'cannot_remove_default_domain' }, { status: 400 });
      }

      const remaining = domains.filter((d: any) => d.id !== domain.id);
      if (!remaining.length) {
        return Response.json({
          error: 'last_domain',
          message: 'A Brand must keep at least one domain. Add a replacement first.',
        }, { status: 409 });
      }

      // Removing the primary is allowed as long as a replacement exists — the
      // next domain is promoted automatically so the Brand is never left
      // without a canonical hostname.
      await svc.entities.BrandDomain.delete(domain.id);
      if (domain.is_primary) {
        const next = remaining.find((d: any) => d.status === 'active') || remaining[0];
        await svc.entities.BrandDomain.update(next.id, { is_primary: true });
      }
      return Response.json({ success: true, removed: domain.hostname });
    }

    return Response.json({ error: 'unknown_action' }, { status: 400 });
  } catch (error: any) {
    console.error('adminManageDomain error:', error?.message);
    return Response.json({ error: 'domain_action_failed', message: error?.message }, { status: 500 });
  }
});