import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Bulk-update app users from the admin dashboard (approve / revoke access,
// bulk agent assignment, …).
//
// This MUST run server-side with the service role: the built-in User entity
// ignores client-side bulkUpdate — the promise resolves successfully but no
// record is ever written, which is exactly why the dashboard's bulk actions
// appeared to do nothing while the per-user buttons worked.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();
    if (!admin || admin.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { userIds, updates } = await req.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return Response.json({ error: 'userIds is required' }, { status: 400 });
    }
    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return Response.json({ error: 'updates is required' }, { status: 400 });
    }

    // Safety: a bulk action must never grant admin rights or unblock accounts.
    const safeUpdates = { ...updates };
    delete safeUpdates.role;
    delete safeUpdates.is_blocked;

    // Chunked parallel writes — keeps a 500-user "approve all" well inside the
    // function timeout while still firing each record's own side effects.
    const CHUNK = 20;
    let updated = 0;
    for (let i = 0; i < userIds.length; i += CHUNK) {
      const slice = userIds.slice(i, i + CHUNK);
      await Promise.all(
        slice.map((id) => base44.asServiceRole.entities.User.update(id, safeUpdates))
      );
      updated += slice.length;
    }

    return Response.json({ success: true, updated });
  } catch (error) {
    console.error('[adminBulkUpdateUsers] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});