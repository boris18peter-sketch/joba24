import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * Publisher funnel capture.
 *
 * ONE row per publishing attempt, advanced monotonically as the visitor moves
 * through the form. The caller reports the step it has REACHED, not the step it
 * left, so a dropped request can never make the funnel look like it advanced
 * less than it did.
 *
 * The step order lives HERE and nowhere else: the client sends a name, this
 * function decides what it is worth. An unknown name is refused rather than
 * stored, so a typo in a component cannot invent a step and skew the counts.
 *
 * Works for signed-out visitors — that is the whole point, since the campaign
 * sends people to /welcome before they have an account. The row is keyed by an
 * anonymous session id and is linked to the account the moment one appears.
 */
const STEPS = ['opened', 'category', 'details', 'location', 'pricing', 'contact', 'ready', 'published'];

// The session id the browser generates: 'pf_' + a base36 stamp + 20 random
// chars. Validated rather than trusted, so a caller cannot address another
// visitor's row by guessing something short.
const SESSION_RE = /^pf_[a-z0-9]{6,20}_[a-z0-9]{8,24}$/;

const trim = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try {
      body = await req.json();
    } catch (_) {
      return Response.json({ error: 'invalid body' }, { status: 400 });
    }

    const sessionId = typeof body.session_id === 'string' ? body.session_id : '';
    if (!SESSION_RE.test(sessionId)) {
      return Response.json({ error: 'invalid session' }, { status: 400 });
    }

    const index = STEPS.indexOf(body.step);
    if (index < 0) {
      return Response.json({ error: 'invalid step' }, { status: 400 });
    }

    // Signed-out visitors are expected here — me() throws for them rather than
    // returning null, so a failed lookup is a normal path, not an error.
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (_) {
      user = null;
    }

    const now = new Date().toISOString();
    const existing = await base44.asServiceRole.entities.PublishFunnelEvent.filter({ session_id: sessionId });
    const record = existing[0];

    if (!record) {
      const created = await base44.asServiceRole.entities.PublishFunnelEvent.create({
        session_id: sessionId,
        user_id: user?.id,
        furthest_step: STEPS[index],
        furthest_step_index: index,
        steps_reached: [STEPS[index]],
        source_track: trim(body.source_track, 40),
        category: trim(body.category, 80),
        city: trim(body.city, 80),
        has_account: body.has_account === true,
        published_task_id: trim(body.published_task_id, 64),
        first_seen_at: now,
        last_seen_at: now,
      });
      return Response.json({ ok: true, created: true, furthest_step: created.furthest_step });
    }

    // ── ADVANCE ONLY ─────────────────────────────────────────────────────────
    // A visitor who clears a field and re-fills it reports a lower step again;
    // the stored furthest step must not follow them back. `steps_reached` still
    // records what was seen, so nothing observed is lost.
    const patch: Record<string, unknown> = {
      last_seen_at: now,
      steps_reached: Array.from(new Set([...(record.steps_reached || []), STEPS[index]])),
    };

    if (index > (typeof record.furthest_step_index === 'number' ? record.furthest_step_index : -1)) {
      patch.furthest_step = STEPS[index];
      patch.furthest_step_index = index;
    }

    // The account is attached the first time one exists. This is the join that
    // makes a campaign visit traceable end to end: anonymous row at 'opened',
    // same row owned by a user by the time it reaches 'published'.
    if (!record.user_id && user?.id) patch.user_id = user.id;
    if (body.has_account === true) patch.has_account = true;

    const category = trim(body.category, 80);
    const city = trim(body.city, 80);
    const track = trim(body.source_track, 40);
    const taskId = trim(body.published_task_id, 64);
    if (category) patch.category = category;
    if (city) patch.city = city;
    if (track) patch.source_track = track;
    if (taskId) patch.published_task_id = taskId;

    await base44.asServiceRole.entities.PublishFunnelEvent.update(record.id, patch);

    return Response.json({
      ok: true,
      created: false,
      furthest_step: patch.furthest_step || record.furthest_step,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}