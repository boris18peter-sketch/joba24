import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * runQAChecks — Automated QA scanner for Joba24.
 * Runs data integrity checks across all entities and returns a structured report.
 *
 * Checks performed:
 *   1. Tasks with invalid status transitions or missing required fields
 *   2. Orphaned TaskApplications (task_id points to non-existent or deleted task)
 *   3. Completed tasks missing worker_id or client_id
 *   4. Taken tasks with no worker_id
 *   5. Credit transactions with negative balance_after
 *   6. Reviews referencing non-existent tasks or users
 *   7. Tasks stuck in intermediate states (TAKEN but not progressing) for >48h
 *   8. Duplicate applications (same worker applied twice to same task)
 *   9. Tasks with expiry passed but not marked EXPIRED
 *  10. Users with is_approved but no preferred_categories
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const sr = base44.asServiceRole;
    const issues = [];
    const stats = {};
    const passed = [];

    // ── Fetch data ──────────────────────────────────────────────────────────
    const tasks = await sr.entities.Task.list('-created_date', 500);
    const applications = await sr.entities.TaskApplication.list('-created_date', 500);
    const reviews = await sr.entities.Review.list('-created_date', 500);
    const creditTxns = await sr.entities.CreditTransaction.list('-created_date', 500);
    const users = await sr.entities.User.list('-created_date', 500);

    stats.tasks = tasks.length;
    stats.applications = applications.length;
    stats.reviews = reviews.length;
    stats.credit_transactions = creditTxns.length;
    stats.users = users.length;

    const taskIds = new Set(tasks.map(t => t.id));
    const userIds = new Set(users.map(u => u.id));

    // ── 1. Tasks with missing required fields ──────────────────────────────
    let taskFieldIssues = 0;
    for (const t of tasks) {
      if (!t.title || t.price === undefined || t.price === null) {
        issues.push({ check: 'task_required_fields', entity: 'Task', id: t.id, severity: 'high', detail: `Task missing title or price: "${t.title || 'NO TITLE'}"` });
        taskFieldIssues++;
      }
    }
    if (taskFieldIssues === 0) passed.push('All tasks have required fields (title, price)');

    // ── 2. Orphaned TaskApplications ───────────────────────────────────────
    let orphanedApps = 0;
    for (const app of applications) {
      if (!taskIds.has(app.task_id)) {
        issues.push({ check: 'orphaned_application', entity: 'TaskApplication', id: app.id, severity: 'high', detail: `Application references non-existent task ${app.task_id}` });
        orphanedApps++;
      }
    }
    if (orphanedApps === 0) passed.push('No orphaned TaskApplications');

    // ── 3. Completed tasks missing worker or client ───────────────────────
    let completedIssues = 0;
    for (const t of tasks.filter(t => t.status === 'COMPLETED')) {
      if (!t.worker_id) {
        issues.push({ check: 'completed_no_worker', entity: 'Task', id: t.id, severity: 'high', detail: `Completed task "${t.title}" has no worker_id` });
        completedIssues++;
      }
      if (!t.client_id) {
        issues.push({ check: 'completed_no_client', entity: 'Task', id: t.id, severity: 'medium', detail: `Completed task "${t.title}" has no client_id` });
        completedIssues++;
      }
    }
    if (completedIssues === 0) passed.push('All completed tasks have worker_id and client_id');

    // ── 4. Taken tasks with no worker ─────────────────────────────────────
    let takenIssues = 0;
    for (const t of tasks.filter(t => t.status === 'TAKEN')) {
      if (!t.worker_id) {
        issues.push({ check: 'taken_no_worker', entity: 'Task', id: t.id, severity: 'high', detail: `TAKEN task "${t.title}" has no worker_id` });
        takenIssues++;
      }
    }
    if (takenIssues === 0) passed.push('All TAKEN tasks have worker_id');

    // ── 5. Credit transactions with negative balance ──────────────────────
    let negBalance = 0;
    for (const tx of creditTxns) {
      if (tx.balance_after !== undefined && tx.balance_after !== null && tx.balance_after < 0) {
        issues.push({ check: 'negative_credit_balance', entity: 'CreditTransaction', id: tx.id, severity: 'medium', detail: `User ${tx.user_id} has negative balance_after: ${tx.balance_after}` });
        negBalance++;
      }
    }
    if (negBalance === 0) passed.push('No credit transactions with negative balance');

    // ── 6. Reviews referencing non-existent tasks/users ────────────────────
    let reviewIssues = 0;
    for (const r of reviews) {
      if (!taskIds.has(r.task_id)) {
        issues.push({ check: 'review_orphaned_task', entity: 'Review', id: r.id, severity: 'medium', detail: `Review references non-existent task ${r.task_id}` });
        reviewIssues++;
      }
      if (!userIds.has(r.reviewer_id) || !userIds.has(r.reviewee_id)) {
        issues.push({ check: 'review_orphaned_user', entity: 'Review', id: r.id, severity: 'medium', detail: `Review references non-existent user (reviewer=${r.reviewer_id}, reviewee=${r.reviewee_id})` });
        reviewIssues++;
      }
    }
    if (reviewIssues === 0) passed.push('All reviews reference valid tasks and users');

    // ── 7. Tasks stuck in TAKEN for >48h without progress ──────────────────
    let stuckTasks = 0;
    const now = Date.now();
    const HOURS_48 = 48 * 60 * 60 * 1000;
    for (const t of tasks.filter(t => t.status === 'TAKEN')) {
      const refDate = new Date(t.updated_date || t.created_date);
      if (now - refDate.getTime() > HOURS_48 && !t.worker_status) {
        issues.push({ check: 'stuck_taken_task', entity: 'Task', id: t.id, severity: 'low', detail: `Task "${t.title}" stuck in TAKEN for >48h with no worker_status` });
        stuckTasks++;
      }
    }
    if (stuckTasks === 0) passed.push('No tasks stuck in TAKEN for >48h');

    // ── 8. Duplicate applications ──────────────────────────────────────────
    const appMap = {};
    for (const app of applications) {
      const key = `${app.task_id}_${app.worker_id}`;
      if (!appMap[key]) appMap[key] = [];
      appMap[key].push(app);
    }
    let dupApps = 0;
    for (const [key, apps] of Object.entries(appMap)) {
      const active = apps.filter(a => a.status === 'pending' || a.status === 'approved');
      if (active.length > 1) {
        issues.push({ check: 'duplicate_application', entity: 'TaskApplication', id: active[0].id, severity: 'medium', detail: `Worker ${active[0].worker_id} has ${active.length} active applications for task ${active[0].task_id}` });
        dupApps++;
      }
    }
    if (dupApps === 0) passed.push('No duplicate active applications');

    // ── 9. Expired tasks not marked EXPIRED ───────────────────────────────
    let expiredIssues = 0;
    for (const t of tasks.filter(t => t.status === 'OPEN' && t.expires_at)) {
      if (new Date(t.expires_at).getTime() < now) {
        issues.push({ check: 'expired_not_marked', entity: 'Task', id: t.id, severity: 'low', detail: `Task "${t.title}" expired ${t.expires_at} but still OPEN` });
        expiredIssues++;
      }
    }
    if (expiredIssues === 0) passed.push('All expired tasks are properly marked');

    // ── 10. Approved users with no categories ──────────────────────────────
    let approvedNoCats = 0;
    for (const u of users.filter(u => u.is_approved)) {
      if (!u.preferred_categories || u.preferred_categories.length === 0) {
        issues.push({ check: 'approved_no_categories', entity: 'User', id: u.id, severity: 'low', detail: `Approved user ${u.full_name || u.email} has no preferred_categories` });
        approvedNoCats++;
      }
    }
    if (approvedNoCats === 0) passed.push('All approved users have preferred categories');

    // ── Summary ────────────────────────────────────────────────────────────
    const highSeverity = issues.filter(i => i.severity === 'high').length;
    const mediumSeverity = issues.filter(i => i.severity === 'medium').length;
    const lowSeverity = issues.filter(i => i.severity === 'low').length;

    return Response.json({
      status: issues.length === 0 ? 'healthy' : 'issues_found',
      summary: {
        total_issues: issues.length,
        high: highSeverity,
        medium: mediumSeverity,
        low: lowSeverity,
        checks_passed: passed.length,
        checks_total: 10,
      },
      stats,
      passed,
      issues,
      scanned_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ runQAChecks error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});