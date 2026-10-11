import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { getGlobalCategoryMap } from '../../shared/globalCategories.ts';
import { listAll } from '../../shared/categoryTree.ts';

/**
 * getBrandPanel — the LIST data behind a Brand's own dashboard tabs.
 *
 * Same access rule as getBrandDashboard: a platform admin, or an explicit
 * brand_admin grant. Membership earned by posting or applying is NOT enough.
 *
 * Every row is scoped to the Brand by a record that actually carries its id:
 *   Task.origin_brand_id · BrandMembership.brand_id · SupportMessage.surface_brand_id
 * Reports are scoped through the Brand's own Tasks.
 */

const OPEN_STATUSES = new Set([
  'OPEN', 'TAKEN', 'APPROVED_PENDING_DEPARTURE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS',
]);

const REPORT_REASONS: Record<string, string> = {
  spam: 'ספאם',
  fake: 'מזויף',
  inappropriate: 'תוכן לא הולם',
  scam: 'הונאה',
  other: 'אחר',
};

const ARRIVAL_LABELS: Record<string, string> = {
  create_task: 'פרסמו משימה',
  apply_for_task: 'הגישו בקשה',
  dashboard_grant: 'קיבלו גישה ידנית',
  backfill: 'היסטורי',
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const brandId = String(body?.brand_id || '');
    if (!brandId) return Response.json({ error: 'brand_id_required' }, { status: 400 });

    if (user.role !== 'admin') {
      const mine = await svc.entities.BrandMembership.filter({ brand_id: brandId, user_id: user.id });
      const granted = (mine || []).some(
        (m: any) => m.role === 'brand_admin' && m.status !== 'suspended',
      );
      if (!granted) return Response.json({ error: 'forbidden' }, { status: 403 });
    }

    const [members, tasks, support] = await Promise.all([
      listAll(svc.entities.BrandMembership, { brand_id: brandId }, '-created_date'),
      listAll(svc.entities.Task, { origin_brand_id: brandId }, '-created_date'),
      listAll(svc.entities.SupportMessage, { surface_brand_id: brandId }, '-created_date'),
    ]);

    const M = members || [];
    const T = tasks || [];
    const S = support || [];

    const map = await getGlobalCategoryMap(base44);
    const label = (key: string) =>
      map[key]?.label || String(key || '').replace(/_/g, ' ');

    // ── Tasks ────────────────────────────────────────────────────────────────
    const taskRows = T.slice(0, 100).map((t: any) => ({
      id: t.id,
      title: t.title || '',
      status: t.status || 'OPEN',
      price: t.price || 0,
      category: label(t.category_details?.brand_category_key || t.category || ''),
      category_icon: map[t.category_details?.brand_category_key || t.category]?.icon || '',
      client_name: t.client_name || '',
      worker_name: t.worker_name || '',
      applicants: Array.isArray(t.applicants) ? t.applicants.length : 0,
      created_date: t.created_date,
    }));

    // ── Users — the Brand's members, with the details that matter ─────────────
    const memberIds = [...new Set(M.map((m: any) => m.user_id))].filter(Boolean) as string[];
    const userRows = memberIds.length
      ? await svc.entities.User.filter({ id: { $in: memberIds } })
      : [];
    const userById: Record<string, any> = {};
    for (const u of (userRows || [])) userById[u.id] = u;

    const postedBy: Record<string, number> = {};
    for (const t of T) if (t.client_id) postedBy[t.client_id] = (postedBy[t.client_id] || 0) + 1;

    const memberRows = M.map((m: any) => {
      const u = userById[m.user_id] || {};
      return {
        user_id: m.user_id,
        name: u.full_name || '',
        email: u.email || '',
        phone: u.phone || '',
        role: m.role || 'member',
        status: m.status || 'active',
        first_action: m.first_action || 'other',
        first_action_label: ARRIVAL_LABELS[m.first_action] || 'אחר',
        joined_at: m.joined_at || m.created_date,
        is_approved: !!u.is_approved,
        is_verified: !!(u.is_verified && u.id_number),
        rating: u.rating || 0,
        tasks_completed: u.tasks_completed || 0,
        tasks_posted: postedBy[m.user_id] || 0,
      };
    });

    // ── Reports — only reports filed against THIS Brand's tasks ──────────────
    const taskIds = new Set(T.map((t: any) => t.id));
    let reportRows: any[] = [];
    if (taskIds.size) {
      const all = await listAll(svc.entities.Report, {}, '-created_date');
      reportRows = (all || [])
        .filter((r: any) => taskIds.has(r.task_id))
        .slice(0, 200)
        .map((r: any) => ({
          id: r.id,
          task_id: r.task_id,
          task_title: r.task_title || '',
          reporter_name: r.reporter_name || '',
          reason: r.reason || 'other',
          reason_label: REPORT_REASONS[r.reason] || r.reason || 'אחר',
          description: r.description || '',
          status: r.status || 'pending',
          created_date: r.created_date,
        }));
    }

    // ── Support — the conversations that happened on this Brand's surface ────
    const supportRows = S.slice(0, 150).map((s: any) => ({
      id: s.id,
      user_id: s.user_id,
      user_name: s.user_name || '',
      sender_role: s.sender_role,
      content: s.content || '',
      read: !!s.read,
      created_date: s.created_date,
    }));

    return Response.json({
      success: true,
      tasks: taskRows,
      users: memberRows,
      reports: reportRows,
      support: supportRows,
      counts: {
        tasks_total: T.length,
        tasks_open: T.filter((t: any) => OPEN_STATUSES.has(t.status)).length,
        users_total: memberRows.length,
        reports_pending: reportRows.filter((r) => r.status === 'pending').length,
        support_unread: supportRows.filter((s) => s.sender_role === 'user' && !s.read).length,
      },
    });
  } catch (error: any) {
    console.error('getBrandPanel error:', error?.message);
    return Response.json({ error: 'panel_failed', message: error?.message }, { status: 500 });
  }
}