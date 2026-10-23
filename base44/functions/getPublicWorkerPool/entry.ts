import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * The public worker pool.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * The stack of real faces and the live "N professionals are active here" counts
 * are the app's most direct answer to the only question a publisher is really
 * asking — will anyone actually answer this? They therefore have to be there for
 * a VISITOR who is not signed in, which is the moment they matter most: it is a
 * guest deciding whether it is worth posting at all.
 *
 * Those surfaces used to read the User entity straight from the browser. The
 * User entity is not readable by a visitor without an account, so a guest got an
 * empty pool and the faces and the counts simply vanished.
 *
 * ── WHAT IT RETURNS, AND WHAT IT DOES NOT ───────────────────────────────────
 * Only the fields those two surfaces draw: a profile photo, the categories and
 * cities the person offers, and when they were last active. Never a name, an
 * email, a phone number or anything else that is private to the account. This is
 * the same information the marketplace already shows about a professional on
 * their public profile.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    const users = await base44.asServiceRole.entities.User.list('-last_active_at', 500);

    const workers = (users || [])
      .filter((u) => (u.preferred_categories || []).length)
      .map((u) => ({
        id: u.id,
        profile_photo: u.profile_photo || '',
        preferred_categories: u.preferred_categories || [],
        preferred_cities: u.preferred_cities || [],
        city: u.city || '',
        last_active_at: u.last_active_at || null,
      }));

    return Response.json({ workers });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}