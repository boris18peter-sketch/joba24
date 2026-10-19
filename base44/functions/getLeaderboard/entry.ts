import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// ── getLeaderboard ─────────────────────────────────────────────────────────
// The public ranking board.
//
// WHY THIS EXISTS: the User entity is guarded by the platform's built-in rule
// that only admins may list other users. The Leaderboard page read the User
// entity directly, so every non-admin — which is every regular visitor — was
// handed only their own record and the board looked empty. It was never a
// filter on "has completed a task"; the query already asked for everyone. The
// read itself was simply not permitted.
//
// The board is a public ranking, so it is served from here with the service
// role, returning ONLY the fields the board draws. Email, phone, ID data, KYC,
// balance and every other private field on a user record never leave the
// server — this endpoint is not a way to enumerate users, it is a way to show
// a ladder.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    // The built-in User entity takes the positional form only — (query, sort,
    // limit) — and returns a plain array. Most completed tasks first.
    const users = await base44.asServiceRole.entities.User.filter({}, '-tasks_completed', 100);

    const items = (Array.isArray(users) ? users : users?.items || []).map((u) => ({
      id: u.id,
      full_name: u.full_name || '',
      profile_photo: u.profile_photo || null,
      tasks_completed: u.tasks_completed || 0,
      is_verified: u.is_verified || false,
      instagram_verified: !!u.instagram_verified,
      facebook_verified: !!u.facebook_verified,
      tiktok_verified: !!u.tiktok_verified,
    }));

    return Response.json({ items });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}