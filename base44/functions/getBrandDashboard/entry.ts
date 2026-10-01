import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { getGlobalCategoryMap } from '../../shared/globalCategories.ts';

/**
 * getBrandDashboard — Brand-attributed operational statistics. Platform Admin only.
 *
 * EVERY number here comes from a record that actually carries this Brand's id:
 *   Task.origin_brand_id · TaskApplication.surface_brand_id · Review.surface_brand_id
 *   CreditTransaction.brand_id · BrandMembership.brand_id
 *
 * Nothing is inferred or invented. A metric that cannot be derived from trusted
 * attribution is returned in `unavailable` with the reason, and the UI shows it
 * as unavailable rather than as a zero that looks like real data.
 */

const DAY = 86400000;
const OPEN_STATUSES = new Set([
  'OPEN', 'TAKEN', 'APPROVED_PENDING_DEPARTURE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS',
]);

const dayKey = (d: any) => String(d || '').slice(0, 10);
const inRange = (d: any, start: number, end: number) => {
  const t = new Date(d || 0).getTime();
  return Number.isFinite(t) && t >= start && t <= end;
};

Deno.serve(async (req) => {
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

    const brands = await svc.entities.Brand.filter({ id: brandId });
    if (!brands?.[0]) return Response.json({ error: 'brand_not_found' }, { status: 404 });

    const now = Date.now();
    const range = String(body?.range || '30d');
    let start = now - 30 * DAY;
    if (range === 'today') start = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
    else if (range === '7d') start = now - 7 * DAY;
    else if (range === '30d') start = now - 30 * DAY;
    else if (range === 'custom' && body?.from) start = new Date(body.from).getTime();
    const end = range === 'custom' && body?.to ? new Date(body.to).getTime() : now;

    const [tasks, apps, reviews, credits, members] = await Promise.all([
      svc.entities.Task.filter({ origin_brand_id: brandId }, '-created_date', 5000),
      svc.entities.TaskApplication.filter({ surface_brand_id: brandId }, '-created_date', 5000),
      svc.entities.Review.filter({ surface_brand_id: brandId }, '-created_date', 5000),
      svc.entities.CreditTransaction.filter({ brand_id: brandId }, '-created_date', 5000),
      svc.entities.BrandMembership.filter({ brand_id: brandId }, '-created_date', 5000),
    ]);

    const T = tasks || [];
    const A = apps || [];
    const R = reviews || [];
    const C = credits || [];
    const M = members || [];

    // ── Members ──────────────────────────────────────────────────────────────
    const newMembers = M.filter((m: any) => inRange(m.joined_at || m.created_date, start, end));

    // ── Tasks (attributed by origin_brand_id) ────────────────────────────────
    const tasksIn = T.filter((t: any) => inRange(t.created_date, start, end));
    const tasksOpen = T.filter((t: any) => OPEN_STATUSES.has(t.status));
    const completedIn = T.filter((t: any) =>
      t.status === 'COMPLETED' && inRange(t.completed_at || t.created_date, start, end));
    const cancelledIn = tasksIn.filter((t: any) => t.status === 'CANCELLED');

    // ── Applications (attributed by surface_brand_id) ────────────────────────
    const appsIn = A.filter((a: any) => inRange(a.created_date, start, end));
    const approvedIn = appsIn.filter((a: any) => a.status === 'approved');

    // ── Credits (attributed by brand_id) ─────────────────────────────────────
    const creditsIn = C.filter((c: any) => inRange(c.created_date, start, end));
    const consumed = creditsIn
      .filter((c: any) => Number(c.amount) < 0)
      .reduce((s: number, c: any) => s + Math.abs(Number(c.amount) || 0), 0);
    const purchased = creditsIn
      .filter((c: any) => Number(c.amount) > 0 && c.type === 'Purchase')
      .reduce((s: number, c: any) => s + (Number(c.amount) || 0), 0);

    // ── Reviews (attributed by surface_brand_id) ─────────────────────────────
    const reviewsIn = R.filter((r: any) => inRange(r.created_date, start, end));
    const ratings = reviewsIn.map((r: any) => Number(r.rating)).filter((n: number) => Number.isFinite(n) && n > 0);
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

    // ── Active users: members with real activity in the range ────────────────
    const memberIds = new Set(M.map((m: any) => m.user_id));
    const activeIds = new Set<string>();
    for (const t of tasksIn) if (memberIds.has(t.client_id)) activeIds.add(t.client_id);
    for (const a of appsIn) if (memberIds.has(a.worker_id)) activeIds.add(a.worker_id);

    // ── Activity over time ───────────────────────────────────────────────────
    const buckets: Record<string, any> = {};
    const touch = (d: any) => {
      const k = dayKey(d);
      if (!k) return null;
      if (!buckets[k]) buckets[k] = { date: k, tasks: 0, applications: 0, members: 0 };
      return buckets[k];
    };
    for (const t of tasksIn) { const b = touch(t.created_date); if (b) b.tasks++; }
    for (const a of appsIn) { const b = touch(a.created_date); if (b) b.applications++; }
    for (const m of newMembers) { const b = touch(m.joined_at || m.created_date); if (b) b.members++; }
    const daily = Object.values(buckets).sort((a: any, b: any) => a.date.localeCompare(b.date)).slice(-90);

    // ── Categories ───────────────────────────────────────────────────────────
    const globalMap = await getGlobalCategoryMap(base44);
    const catCounts: Record<string, number> = {};
    for (const t of tasksIn) {
      const key = t.category || 'other';
      catCounts[key] = (catCounts[key] || 0) + 1;
    }
    const byCategory = Object.entries(catCounts)
      .map(([key, count]) => ({
        key,
        count,
        label: globalMap[key]?.label || key,
        icon: globalMap[key]?.icon || '',
      }))
      .sort((a, b) => b.count - a.count);

    // ── Honest availability ──────────────────────────────────────────────────
    const unavailable: { metric: string; reason: string }[] = [];
    const unattributedCredits = C.filter((c: any) => !c.brand_id).length;
    if (purchased === 0) {
      unavailable.push({
        metric: 'credit_purchases',
        reason: 'No credit purchase attributed to this Brand in the range.',
      });
    }
    if (T.length === 0) {
      unavailable.push({ metric: 'marketplace', reason: 'No Task carries this Brand yet.' });
    }

    return Response.json({
      success: true,
      range: { from: new Date(start).toISOString(), to: new Date(end).toISOString(), key: range },
      members: {
        total: M.length,
        new_in_range: newMembers.length,
        active_in_range: activeIds.size,
      },
      tasks: {
        total: T.length,
        created_in_range: tasksIn.length,
        open: tasksOpen.length,
        completed_in_range: completedIn.length,
        cancelled_in_range: cancelledIn.length,
      },
      applications: {
        total: A.length,
        in_range: appsIn.length,
        approved_in_range: approvedIn.length,
        conversion_rate: appsIn.length ? approvedIn.length / appsIn.length : null,
      },
      completion_rate: tasksIn.length ? completedIn.length / tasksIn.length : null,
      credits: {
        consumed_in_range: consumed,
        purchased_in_range: purchased,
        attributed_transactions_in_range: creditsIn.length,
      },
      reviews: {
        total: R.length,
        in_range: reviewsIn.length,
        avg_rating: avgRating,
      },
      daily,
      by_category: byCategory,
      unavailable,
      unattributed_credit_transactions: unattributedCredits,
    });
  } catch (error: any) {
    console.error('getBrandDashboard error:', error?.message);
    return Response.json({ error: 'dashboard_failed', message: error?.message }, { status: 500 });
  }
});