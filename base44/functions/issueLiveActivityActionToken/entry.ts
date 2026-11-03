import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { authorizeActivity } from '../../shared/taskActivitySnapshot.ts';
import { actionsForRole } from '../../shared/liveActivityActionGuard.ts';
import { signActionToken } from '../../shared/liveActivityActionToken.ts';

/**
 * issueLiveActivityActionToken — mint the NARROW capability a Lock Screen button
 * carries.
 *
 * ── WHAT IT GRANTS, AND WHAT IT DOES NOT ───────────────────────────────────
 * The token is bound to the signed-in user, ONE task and ONE role, lists only
 * the action ids that role may ever perform, and expires in 24 hours. It is not
 * a session: it reads nothing, acts on nothing else, and every submission is
 * re-authorized against the database by `liveActivityAction`.
 *
 * ── WHY THE APP ASKS FOR IT ────────────────────────────────────────────────
 * The App Intent runs in the widget extension, where no user session exists. The
 * only moment a session DOES exist is when the app starts or refreshes the
 * activity — so that is when the capability is minted, and the native bridge
 * stores it in the App Group, where the widget can read it and nothing else can.
 *
 * The token is never returned in a push payload and never placed in the Live
 * Activity content-state.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const taskId = typeof body?.task_id === 'string' ? body.task_id.trim() : '';
    const role = body?.role === 'worker' ? 'worker' : 'publisher';
    if (!taskId) return Response.json({ error: 'missing_task_id' }, { status: 400 });

    // The secret is server-only. Without it nothing can be signed, so the feature
    // reports itself unavailable instead of falling back to something weaker.
    const secret = Deno.env.get('LIVE_ACTIVITY_ACTION_SECRET');
    if (!secret) return Response.json({ error: 'action_auth_unavailable' }, { status: 503 });

    // Read AS THE CALLER: RLS decides what they may see, so a task that is not
    // theirs simply does not come back.
    const task = await base44.entities.Task.get(taskId)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!task) return Response.json({ error: 'task_not_found' }, { status: 404 });

    const auth = authorizeActivity(task, role, user.id);
    if (!auth.ok) return Response.json({ error: auth.reason }, { status: 403 });

    const actions = actionsForRole(role);
    const signed = await signActionToken({
      secret,
      userId: user.id,
      taskId: task.id,
      role,
      actions,
    });
    if (!signed.ok) return Response.json({ error: signed.reason }, { status: 500 });

    return Response.json({
      ok: true,
      token: signed.token,
      actions,
      role,
      task_id: task.id,
      expires_at: new Date(signed.claims.exp * 1000).toISOString(),
      contract_version: 2,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});