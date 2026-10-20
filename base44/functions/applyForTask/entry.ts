import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { scheduleSignature } from '../../shared/scheduling.ts';
import { getBrandMarketplaceSettings } from '../../shared/brandSettings.ts';
import { getCategoryRow } from '../../shared/globalCategories.ts';
import { resolveFee, computeApplicationFee } from '../../shared/categoryFee.ts';
import { ensureBrandMembership } from '../../shared/brandMembership.ts';
import { JOBA24_BRAND_ID } from '../../shared/jobaBrand.ts';

/**
 * applyForTask — Worker applies for an open task.
 * 1. Validates task is OPEN and no duplicate active application
 * 2. Deducts application credits (configurable % of price, configurable min)
 * 3. Freezes price on task if auto_bump enabled and this is the first applicant
 * 4. Creates the TaskApplication record
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId, message, images } = await req.json();
    if (!taskId) return Response.json({ error: 'taskId required' }, { status: 400 });

    // Fetch task
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = tasks[0];
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
    if (task.status !== 'OPEN') return Response.json({ error: 'Task not open' }, { status: 400 });

    // Prevent worker from applying to their own task
    if (task.client_id === user.id) return Response.json({ error: 'Cannot apply to your own task' }, { status: 403 });

    // Prevent duplicate applications
    const existing = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId, worker_id: user.id });
    const alreadyActive = existing.find(a => a.status === 'pending' || a.status === 'approved');
    if (alreadyActive) return Response.json({ error: 'already_applied' }, { status: 409 });

    // Calculate credits: the fee RESOLVES PER CATEGORY, on top of the Brand's own
    // overrides. The nearest category in the chain that states a rule wins, so a
    // service inherits its root's fee — and a cap on the root stops an expensive
    // job from being charged a proportionally expensive application.
    const settings = await getBrandMarketplaceSettings(base44, task.origin_brand_id);
    const categoryKey = task.category_details?.brand_category_key || task.category || '';
    // ONE row, not the whole catalogue. The fee is a field of this category
    // alone — resolveFee reads nothing else — and this line runs on every single
    // application, including many at once on a task everyone wants.
    const feeRow = await getCategoryRow(base44, categoryKey);
    const creditsRequired = computeApplicationFee(
      task.price,
      resolveFee(categoryKey, feeRow ? { [categoryKey]: feeRow } : {}, settings),
    );

    // Fetch fresh worker data for credits check
    const workerUsers = await base44.asServiceRole.entities.User.filter({ id: user.id });
    const userData = workerUsers[0];

    // Pre-launch gate (server-side enforcement): block unapproved users from
    // applying when the gate is active. The frontend gate (Layout.jsx) can be
    // bypassed via direct API calls or during the approvalStatus loading
    // window — this is the authoritative server-side check.
    if (settings.pre_launch_gate_active !== false && userData?.role !== 'admin') {
      if (!userData?.is_approved) {
        return Response.json({ error: 'not_approved', message: 'המשתמש אינו מאושר עדיין' }, { status: 403 });
      }
    }

    // Verification gate: if task requires verified workers, block unverified users
    if (task.verification_required) {
      if (!userData?.is_verified || userData?.kyc_status !== 'approved') {
        return Response.json({ error: 'verification_required', message: 'המשימה דורשת אימות' }, { status: 403 });
      }
    }

    const currentCredits = userData?.worker_credits ?? 100;

    if (currentCredits < creditsRequired) {
      return Response.json({
        error: 'insufficient_credits',
        credits_required: creditsRequired,
        credits_available: currentCredits,
      }, { status: 403 });
    }

    // NOTE: price is NOT changed here. The auto-bump cron is the single source of
    // truth — it skips tasks that already have active applications (price frozen at
    // whatever it was bumped to). Recalculating the price on apply would discard
    // the increases already earned (bug: price used to drop to a time-based value).

    // Create application FIRST — if this fails, no credits are deducted
    const newApp = await base44.asServiceRole.entities.TaskApplication.create({
      task_id: taskId,
      task_title: task.title,
      worker_id: user.id,
      worker_name: user.full_name,
      // Derived server-side from the persisted Task — never from the client.
      // Makes "task owner" expressible in the entity RLS rule.
      client_id: task.client_id,
      worker_score: userData?.worker_score || 0,
      worker_rating: userData?.rating || 0,
      worker_tasks_count: userData?.score_tasks || 0,
      worker_verified: !!(userData?.is_verified && userData?.id_number),
      message: message || '',
      images: images || [],
      status: 'pending',
      credits_charged: creditsRequired,
      surface_brand_id: JOBA24_BRAND_ID,
      // The schedule the worker saw when applying. If it is unchanged when the
      // publisher picks them, the Schedule Agreement is automatic — no extra
      // confirmation. A later change is what makes a confirmation necessary.
      schedule_snapshot: scheduleSignature(task),
    });

    // ── ONE APPLICATION PER WORKER, EVEN FROM TWO DEVICES AT ONCE ───────────
    // The duplicate check above is a read-then-write, so two submissions landing
    // together (two devices, or a double-tap) both see "no existing application"
    // and both create one. The worker then holds TWO applications on the same
    // task, each carrying a charged fee — and a later decline refunds both,
    // paying out credits that were never taken.
    //
    // The records settle it deterministically instead: the OLDEST active
    // application is the real one. A later arrival cancels itself here, before
    // any credit moves, and the worker gets the same "already applied" answer
    // the check above would have given them.
    const mineAfter = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId, worker_id: user.id });
    const activeMine = mineAfter
      .filter((a) => a.status === 'pending' || a.status === 'approved')
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    if (activeMine.length > 1 && activeMine[0].id !== newApp.id) {
      await base44.asServiceRole.entities.TaskApplication.update(newApp.id, { status: 'cancelled' });
      return Response.json({ error: 'already_applied' }, { status: 409 });
    }

    // Applying on a Brand's task is the moment this worker JOINS that Brand.
    await ensureBrandMembership(base44.asServiceRole, user.id, task.origin_brand_id, 'apply_for_task');

    // Rebuild applicants array from actual TaskApplication records (single source of truth)
    const allAppsAfter = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });
    const activeAppsAfter = allAppsAfter.filter(a => a.status === 'pending' || a.status === 'approved');
    await base44.asServiceRole.entities.Task.update(taskId, {
      applicants: activeAppsAfter.map(a => ({
        worker_id: a.worker_id,
        worker_name: a.worker_name,
        applied_at: a.created_date,
      })),
    });

    // ── THE FEE IS DEDUCTED ATOMICALLY ──────────────────────────────────────
    // This used to write an ABSOLUTE balance (read the balance, subtract, write
    // it back). Two applications landing together — the same worker on two
    // devices, or two different tasks submitted in quick succession — both read
    // the same starting balance and both wrote the same result, so only ONE fee
    // was ever taken while TWO applications were created. $inc makes each
    // application subtract its own fee, so the balance can no longer lose an
    // update and the second application is never free.
    await base44.asServiceRole.entities.User.updateMany(
      { id: user.id },
      { $inc: { worker_credits: -creditsRequired } }
    );

    // Read the balance back rather than assuming it: the ledger entry must carry
    // the balance that actually resulted, because the wallet renders straight
    // from it.
    const afterUser = await base44.asServiceRole.entities.User.filter({ id: user.id });
    const newBalance = afterUser[0]?.worker_credits ?? (currentCredits - creditsRequired);

    await base44.asServiceRole.entities.CreditTransaction.create({
      user_id: user.id,
      amount: -creditsRequired,
      type: 'Application_Fee',
      task_id: taskId,
      task_title: task.title,
      brand_id: task.origin_brand_id || null,
      balance_after: newBalance,
      note: `הגשת בקשה למשימה: ${task.title}`,
    });

    console.log(`✅ Application created: worker ${user.id} → task ${taskId} (${creditsRequired} credits charged)`);
    return Response.json({
      success: true,
      application: newApp,
      credits_charged: creditsRequired,
      credits_remaining: newBalance,
    });

  } catch (error) {
    console.error('❌ applyForTask error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});