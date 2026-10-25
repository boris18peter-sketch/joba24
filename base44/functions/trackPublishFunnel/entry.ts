import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * Publisher funnel capture.
 *
 * ONE row per publishing attempt, advanced monotonically as the visitor moves
 * through the form. The caller reports every step that is TRUE, not only the
 * furthest one — the server keeps the highest and records all of them, so a step
 * that was skipped in time (an address confirmed before the description was
 * written) can never make the funnel look like it advanced less than it did.
 *
 * The step order lives HERE and nowhere else: the client sends a name, this
 * function decides what it is worth. An unknown name is refused rather than
 * stored, so a typo in a component cannot invent a step and skew the counts.
 *
 * Works for signed-out visitors — that is the whole point, since the campaign
 * sends people to /welcome before they have an account. The row is keyed by an
 * anonymous session id and is linked to the account the moment one appears.
 *
 * ── WHY THE CAMPAIGN FIELDS ARE STORED HERE ─────────────────────────────────
 * The funnel's job is not only "where did they stop" but "which ad paid for
 * them". The landing URL, the UTMs and the ad click ids are captured once at
 * application boot (src/lib/analytics/campaign.js) because the app's own
 * redirect to /welcome strips the query string before the form ever mounts.
 */
const STEPS = ['opened', 'category', 'details', 'location', 'pricing', 'contact', 'ready', 'published'];

// The version this function writes. A row without it predates the corrected
// tracking, which is what lets the dashboard tell "no activity" apart from
// "tracking was broken when this ran".
const TRACKING_VERSION = 2;

// The session id the browser generates: 'pf_' + a base36 stamp + 20 random
// chars. Validated rather than trusted, so a caller cannot address another
// visitor's row by guessing something short.
const SESSION_RE = /^pf_[a-z0-9]{6,20}_[a-z0-9]{8,24}$/;

const trim = (v: unknown, max: number) =>
  (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);

// Campaign values are opaque strings from a URL. They are stored as-is (they
// are the identifiers the ad platform reports against) but bounded, so a crafted
// link cannot write an unbounded value.
const CAMPAIGN_FIELDS: Array<[string, number]> = [
  ['landing_url', 500],
  ['referrer', 500],
  ['device', 20],
  ['utm_source', 200],
  ['utm_medium', 200],
  ['utm_campaign', 200],
  ['utm_content', 200],
  ['utm_term', 200],
  ['gclid', 200],
  ['fbclid', 200],
];

function campaignPatch(body: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  for (const [key, max] of CAMPAIGN_FIELDS) {
    const value = trim(body[key], max);
    if (value) patch[key] = value;
  }
  // Only ever mobile / desktop — anything else is dropped rather than stored.
  if (patch.device !== 'mobile' && patch.device !== 'desktop') delete patch.device;
  return patch;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch (_) {
      return Response.json({ error: 'invalid body' }, { status: 400 });
    }

    const sessionId = typeof body.session_id === 'string' ? body.session_id : '';
    if (!SESSION_RE.test(sessionId)) {
      return Response.json({ error: 'invalid session' }, { status: 400 });
    }

    const index = STEPS.indexOf(body.step as string);
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
        user_name: trim(user?.full_name, 120),
        user_email: trim(user?.email, 160),
        furthest_step: STEPS[index],
        furthest_step_index: index,
        steps_reached: [STEPS[index]],
        source_track: trim(body.source_track, 40),
        category: trim(body.category, 80),
        city: trim(body.city, 80),
        has_account: body.has_account === true,
        published_task_id: trim(body.published_task_id, 64),
        tracking_version: TRACKING_VERSION,
        ...campaignPatch(body),
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
      tracking_version: TRACKING_VERSION,
    };

    if (index > (typeof record.furthest_step_index === 'number' ? record.furthest_step_index : -1)) {
      patch.furthest_step = STEPS[index];
      patch.furthest_step_index = index;
    }

    // The account is attached the first time one exists. This is the join that
    // makes a campaign visit traceable end to end: anonymous row at 'opened',
    // same row owned by a user by the time it reaches 'published'. The NAME
    // travels with it, so the dashboard shows a person and not an id.
    if (!record.user_id && user?.id) {
      patch.user_id = user.id;
      patch.user_name = trim(user.full_name, 120);
      patch.user_email = trim(user.email, 160);
    }
    if (body.has_account === true) patch.has_account = true;

    const category = trim(body.category, 80);
    const city = trim(body.city, 80);
    const track = trim(body.source_track, 40);
    const taskId = trim(body.published_task_id, 64);
    if (category) patch.category = category;
    if (city) patch.city = city;
    if (track) patch.source_track = track;
    if (taskId) patch.published_task_id = taskId;

    // Campaign fields only fill a gap — a later request that carries none must
    // not blank the attribution the first request already established.
    for (const [key, value] of Object.entries(campaignPatch(body))) {
      if (!record[key]) patch[key] = value;
    }

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