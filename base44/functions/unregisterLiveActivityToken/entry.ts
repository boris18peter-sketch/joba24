import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * unregisterLiveActivityToken — stop dispatching to this device.
 *
 * Only the caller's own tokens are affected (user-scoped reads and writes, and
 * an explicit `user_id` check on top of RLS). Invalidation is a status change,
 * not a delete, so a mistaken call is diagnosable and a token can never be
 * resurrected by an old row.
 *
 * Like registration, this touches nothing else: no task, no notification, no
 * subscription.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const tokenId = typeof body?.token_id === 'string' ? body.token_id.trim() : '';

    if (!token && !tokenId) return Response.json({ error: 'token_required' }, { status: 400 });

    const query = token ? { token } : { id: tokenId };
    const page = await base44.entities.LiveActivityToken.filter(query, { limit: 10 });
    const rows = (page?.items || []).filter((row) => row && row.user_id === user.id && row.status === 'active');

    const reason = body?.reason === 'token_rotation' ? 'token_rotated' : 'device_unregistered';
    const nowIso = new Date().toISOString();

    await Promise.allSettled(rows.map((row) => base44.entities.LiveActivityToken.update(row.id, {
      status: 'invalid',
      invalidated_at: nowIso,
      invalidated_reason: reason,
    })));

    return Response.json({ ok: true, invalidated: rows.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});