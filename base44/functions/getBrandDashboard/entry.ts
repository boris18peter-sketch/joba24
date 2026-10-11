import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { getGlobalCategoryMap } from '../../shared/globalCategories.ts';
import { rootKey, listAll } from '../../shared/categoryTree.ts';

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

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    const brandId = String(body?.brand_id || '');
    if (!brandId) return Response.json({ error: 'brand_id_required' }, { status: 400 });

    // Platform admins see every Brand. Everyone else needs an EXPLICIT grant:
    // membership earned by posting or applying is NOT enough to see a Brand's
    // numbers, which is why the check reads the role, not the row.
    if (user.role !== 'admin') {
      const mine = await svc.entities.BrandMembership.filter({ brand_id: brandId, user_id: user.id });
      const granted = (mine || []).some(
        (m: any) => m.role === 'brand_admin' && m.status !== 'suspended',
      );
      if (!granted) {
        return Response.json({ error: 'forbidden', message: 'No access to this Brand' }, { status: 403 });
      }
    }

    const brands = await svc.entities.Brand.filter({ id: brandId });
    if (!brands?.[0]) return Response.json({ error: 'brand_not_found' }, { status: 404 });

    const now = Date.now();
    const range = String(body?.range || '30d');
    let start = range === 'all' ? 0 : now - 30 * DAY;
    if (range === 'today') start = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
    else if (range === '7d') start = now - 7 * DAY;
    else if (range === '30d') start = now - 30 * DAY;
    else if (range === 'custom' && body?.from) start = new Date(body.from).getTime();
    const end = range === 'custom' && body?.to ? new Date(body.to).getTime() : now;

    const [tasks, apps, reviews, credits, members] = await Promise.all([
      listAll(svc.entities.Task, { origin_brand_id: brandId }, '-created_date'),
      listAll(svc.entities.TaskApplication, { surface_brand_id: brandId }, '-created_date'),
      listAll(svc.entities.Review, { surface_brand_id: brandId }, '-created_date'),
      listAll(svc.entities.CreditTransaction, { brand_id: brandId }, '-created_date'),
      listAll(svc.entities.BrandMembership, { brand_id: brandId }, '-created_date'),
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
    const catCounts = {}, parentCounts = {};
    for (const t of tasksIn) {
      const key = t.category_details?.brand_category_key || t.category || 'other';
      catCounts[key] = (catCounts[key] || 0) + 1;
      const parent = rootKey(key, globalMap) || 'unmapped';
      parentCounts[parent] = (parentCounts[parent] || 0) + 1;
    }
    // A raw category_key must never reach the UI. Resolve the global label, and
    // when a key has no GlobalCategory row fall back to a readable form of the
    // key ("heavy_lifting" → "Heavy Lifting") rather than the key itself.
    const displayLabel = (key: string) => {
      if (key === 'unmapped') return 'לא משויך לאב';
      const label = globalMap[key]?.label;
      if (label) return label;
      return String(key || '').replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
    };
    const shape = counts => Object.entries(counts).map(([key,count]) => ({ key, count, percentage: tasksIn.length ? Math.round(Number(count) / tasksIn.length * 1000) / 10 : 0, label: displayLabel(key), icon: globalMap[key]?.icon || '' })).sort((a,b) => Number(b.count) - Number(a.count));
    const byCategory = shape(catCounts), byParent = shape(parentCounts);

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

    // ── Arrivals — WHO came to this Brand, and through what ──────────────────
    // A BrandMembership row only exists after a MEANINGFUL action, so this is a
    // real first-touch record, not traffic: the person is here because they
    // posted a task or applied for one on this Brand.
    const ARRIVAL_LABELS: Record<string, string> = {
      create_task: 'פרסמו משימה',
      apply_for_task: 'הגישו בקשה',
      dashboard_grant: 'קיבלו גישה ידנית',
      backfill: 'היסטורי',
    };

    const recentMembers = [...newMembers]
      .sort((a: any, b: any) =>
        new Date(b.joined_at || b.created_date || 0).getTime() -
        new Date(a.joined_at || a.created_date || 0).getTime())
      .slice(0, 25);

    const arrivalIds = [...new Set(recentMembers.map((m: any) => m.user_id))].filter(Boolean) as string[];
    const arrivalUsers: Record<string, any> = {};
    if (arrivalIds.length) {
      try {
        const found = await svc.entities.User.filter({ id: { $in: arrivalIds } });
        for (const u of (found || [])) arrivalUsers[u.id] = u;
      } catch {
        // Names are a nicety — never fail the whole dashboard over them.
      }
    }

    const actionCounts: Record<string, number> = {};
    for (const m of newMembers) {
      const k = m.first_action || 'other';
      actionCounts[k] = (actionCounts[k] || 0) + 1;
    }

    const arrivals = {
      in_range: newMembers.length,
      total: M.length,
      by_first_action: Object.entries(actionCounts)
        .map(([action, count]) => ({ action, count, label: ARRIVAL_LABELS[action] || action }))
        .sort((a: any, b: any) => Number(b.count) - Number(a.count)),
      recent: recentMembers.map((m: any) => ({
        user_id: m.user_id,
        name: arrivalUsers[m.user_id]?.full_name || '',
        first_action: m.first_action || 'other',
        first_action_label: ARRIVAL_LABELS[m.first_action] || m.first_action || 'אחר',
        joined_at: m.joined_at || m.created_date,
      })),
    };

    return Response.json({
      success: true,
      range: { from: new Date(start).toISOString(), to: new Date(end).toISOString(), key: range },
      arrivals,
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
      by_parent: byParent,
      unavailable,
      unattributed_credit_transactions: unattributedCredits,
    });
  } catch (error: any) {
    console.error('getBrandDashboard error:', error?.message);
    return Response.json({ error: 'dashboard_failed', message: error?.message }, { status: 500 });
  }
}