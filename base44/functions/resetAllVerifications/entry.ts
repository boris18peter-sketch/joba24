import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Fetch all users (paginate up to 500)
    let allUsers = [];
    let skip = 0;
    const limit = 200;
    let hasMore = true;
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.User.list('-created_date', limit, skip);
      allUsers = allUsers.concat(batch);
      hasMore = batch.length === limit;
      skip += limit;
      if (skip > 1000) break; // safety cap
    }

    let resetCount = 0;
    const errors = [];

    for (const u of allUsers) {
      // Only reset if they have some verification state to clear
      if (u.is_verified || u.kyc_status) {
        try {
          await base44.asServiceRole.entities.User.update(u.id, {
            is_verified: false,
            kyc_status: null,
          });
          resetCount++;
        } catch (e) {
          errors.push({ id: u.id, error: e.message });
        }
      }
    }

    return Response.json({
      success: true,
      totalUsers: allUsers.length,
      resetCount,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});