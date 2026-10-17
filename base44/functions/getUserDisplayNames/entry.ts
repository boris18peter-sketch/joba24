import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * getUserDisplayNames — the ONE place that answers "what is this person called
 * right now?" for a set of user ids.
 *
 * A user's chosen name lives in the custom `display_name` field (the built-in
 * `full_name` cannot be written by the app). That name is the single source of
 * truth, so any screen that shows someone else's name must read it LIVE by their
 * stable id — never from a copy stored on another record (a task's `worker_name`,
 * an application's `worker_name`, a message's `sender_name`). Those copies are
 * frozen at write time and keep showing the old name after a rename.
 *
 * Returns ONLY a name per id — nothing else about the user is exposed. Reading
 * another user's record is not permitted for a normal user, so this runs with
 * the service role; that is why it is a function and not a direct client read.
 *
 * Body:  { user_ids: string[] }   (max 100 per call)
 * Reply: { names: { [userId]: string } }
 */
const MAX_IDS = 100;

/**
 * A real Base44 record id. Simulator/demo ids (`demo_1791285783985_…`) are not,
 * and the API rejects an ENTIRE $in query that contains one — so a single demo
 * id in the batch would silently drop every live name. They are filtered out
 * before the lookup instead.
 */
const RECORD_ID = /^[0-9a-f]{24}$/i;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const ids = [...new Set(
      (Array.isArray(body?.user_ids) ? body.user_ids : [])
        .filter((id: unknown) => typeof id === 'string' && RECORD_ID.test(id))
    )].slice(0, MAX_IDS) as string[];

    const names: Record<string, string> = {};
    if (ids.length) {
      const rows = await base44.asServiceRole.entities.User.filter(
        { id: { $in: ids } },
        '-created_date',
        MAX_IDS
      );
      for (const u of rows || []) {
        const name = (u.display_name || '').trim() || u.full_name || '';
        if (name) names[u.id] = name;
      }
    }

    return Response.json({ names });
  } catch (error) {
    console.error('getUserDisplayNames error:', error?.message);
    // An empty map is a safe answer: every caller falls back to the name it
    // already holds rather than showing a blank.
    return Response.json({ error: error.message, names: {} }, { status: 500 });
  }
});