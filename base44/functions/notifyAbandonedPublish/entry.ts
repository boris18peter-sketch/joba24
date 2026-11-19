import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * notifyAbandonedPublish — the reminder for a publishing attempt that stopped.
 *
 * Runs on a schedule. It reads the funnel the publish form already records
 * (PublishFunnelEvent — one row per attempt, carrying the furthest step that was
 * reached), and for anyone who got part way and then left it alone for a couple
 * of hours, sends one nudge back to the form.
 *
 * Why it reads the funnel instead of tracking something new: the form already
 * writes a row per attempt with the user, the furthest step and the last time it
 * was touched. A second tracker would be a second truth that could disagree.
 *
 * Who is skipped:
 *  · anyone who published a task since that attempt (they were not stuck);
 *  · anonymous attempts (no user_id) — there is nobody to notify;
 *  · attempts younger than 2 hours (they may simply still be working);
 *  · attempts older than 7 days (stale; the task would be different by now).
 *
 * Repeat sends are prevented by the event's own cooldown (7 days per user) inside
 * notificationManager, so the hourly schedule cannot nag the same person.
 */

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const SEND_CHUNK = 50;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Called by the scheduled workflow, which runs as an app admin, and by
    // nobody else — the function's URL is public.
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (caller.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const now = Date.now();
    const since = new Date(now - SEVEN_DAYS_MS).toISOString();
    const cutoff = new Date(now - TWO_HOURS_MS).toISOString();

    // Attempts that stopped before publishing and have been sitting untouched.
    const attempts = await base44.asServiceRole.entities.PublishFunnelEvent.filter({
      furthest_step: { $ne: 'published' },
      last_seen_at: { $gte: since, $lte: cutoff },
    }, '-last_seen_at', 500);

    // One reminder per person: keep only their most recent abandoned attempt.
    const latestByUser = new Map();
    for (const attempt of attempts || []) {
      if (!attempt.user_id || !attempt.last_seen_at) continue;
      const prev = latestByUser.get(attempt.user_id);
      if (!prev || attempt.last_seen_at > prev.last_seen_at) latestByUser.set(attempt.user_id, attempt);
    }

    const userIds = [...latestByUser.keys()];
    if (!userIds.length) return Response.json({ sent: 0, checked: 0 });

    // Anyone who DID publish a task in the same window is not stuck, and must
    // not be told they did not finish.
    const published = await base44.asServiceRole.entities.Task.filter({
      client_id: { $in: userIds },
      created_date: { $gte: since },
    }, '-created_date', 500);
    const publishedIds = new Set((published || []).map((t: any) => t.client_id));

    const targets = userIds.filter((id) => !publishedIds.has(id));
    if (!targets.length) {
      return Response.json({ sent: 0, checked: userIds.length, published: publishedIds.size });
    }

    // notificationManager applies the segment, the cooldown and the delivery,
    // and takes the whole recipient list in one call.
    let sent = 0;
    const chunkCount = Math.ceil(targets.length / SEND_CHUNK);
    for (const [i] of Array.from({ length: chunkCount }).entries()) {
      const chunk = targets.slice(i * SEND_CHUNK, i * SEND_CHUNK + SEND_CHUNK);
      try {
        await base44.asServiceRole.functions.invoke('notificationManager', {
          event_key: 'publish_abandoned',
          user_ids: chunk,
          variables: {},
        });
        sent += chunk.length;
      } catch (err: any) {
        console.log('[AbandonedPublish] batch failed:', err.message);
      }
    }

    return Response.json({
      sent,
      checked: userIds.length,
      published: publishedIds.size,
    });
  } catch (error: any) {
    console.error('[AbandonedPublish] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});