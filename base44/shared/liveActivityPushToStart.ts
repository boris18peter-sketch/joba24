/**
 * liveActivityPushToStart — the remote START payload, and the one rule about it.
 *
 * ── WHAT MAKES A CARD APPEAR WITHOUT THE APP ───────────────────────────────
 * ActivityKit can only be handed a new activity by the DEVICE (`Activity.request`)
 * — except from iOS 17.2, where a push with `event: "start"` plus the attributes
 * makes the system create one. That push goes to the **Push-to-Start token**, a
 * token of the INSTALL rather than of a card, which is why it is stored as its own
 * kind in LiveActivityToken and never mixed with an activity token.
 *
 * ── THE PAYLOAD CARRIES NO CREDENTIAL ─────────────────────────────────────
 * It carries exactly what the Lock Screen is allowed to DISPLAY: the frozen
 * presentation snapshot, the two static attributes, and ordering metadata. No
 * capability, no session, no user id, no token, no endpoint — everything a
 * person can read on a locked phone must be safe for any passer-by to read.
 * The interactive button authenticates itself separately, through the App Group
 * store the app writes (see liveActivityActionToken.ts), which is why nothing
 * here needs to be secret.
 *
 * ── WHY EVERY FIELD IS OPTIONAL-SAFE ──────────────────────────────────────
 * `content-state` is decoded by the widget's tolerant decoder, so a missing
 * subtitle can never cost the user their card. A payload WITHOUT a snapshot is
 * different: it would start a blank card, so the builder refuses and returns
 * null instead.
 */

/** Must match the widget's ActivityAttributes type (`JobaTaskActivity`). */
export const ACTIVITY_ATTRIBUTES_TYPE = 'JobaTaskActivity';

/**
 * The live-activity topic suffix. Apple requires it for every Live Activity push,
 * start included — the same topic an update uses.
 */
export { apnsTopicFor } from './liveActivityApns.ts';

/**
 * `attributes-type` names the ActivityAttributes type the app registers.
 *
 * Apple documents the plain type name. Some projects need the module-qualified
 * form instead, so it can be overridden with a NON-SECRET environment value
 * (`JobaActivityWidget.JobaTaskActivity`) without a code change — the value is
 * public by nature and appears in every start payload anyway.
 */
export function attributesType() {
  try {
    const raw = (Deno.env.get('APNS_ACTIVITY_ATTRIBUTES_TYPE') || '').trim();
    return raw || ACTIVITY_ATTRIBUTES_TYPE;
  } catch {
    return ACTIVITY_ATTRIBUTES_TYPE;
  }
}

/** Keys that must NEVER appear anywhere in a Live Activity payload. */
export const FORBIDDEN_PAYLOAD_KEYS = [
  'token', 'capability', 'secret', 'authorization', 'session', 'jwt',
  'user_id', 'userId', 'email', 'phone', 'endpoint',
];

/**
 * Does this payload contain anything that is a credential rather than a caption?
 * Used by the builder (defensively) and pinned by the tests.
 */
export function payloadLeaks(payload) {
  const found = [];
  const walk = (value, path) => {
    if (Array.isArray(value)) {
      value.forEach((entry, i) => walk(entry, `${path}[${i}]`));
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (FORBIDDEN_PAYLOAD_KEYS.includes(key)) found.push(`${path}.${key}`);
      walk(child, `${path}.${key}`);
    }
  };
  walk(payload, 'payload');
  return found;
}

/**
 * The `start` push.
 *
 * `attributes` is the static half of the activity — the same two values the app
 * passes to `Activity.request`, so a card started remotely and one started
 * locally are indistinguishable to the widget.
 */
export function buildPushToStartPayload(input) {
  const {
    snapshot,
    now = Date.now(),
    staleAfterMinutes = 30,
    relevanceScore = 100,
    type = attributesType(),
  } = input || {};

  if (!snapshot?.id || !snapshot?.role) return null;

  const aps = {
    timestamp: Math.floor(now / 1000),
    event: 'start',
    'content-state': snapshot,
    'attributes-type': type,
    attributes: { taskId: snapshot.id, role: snapshot.role },
    // ── `alert` IS NOT DECORATION: WITHOUT IT iOS THROWS THE START AWAY ─────
    // A start push was accepted by APNs (HTTP 200) and no card appeared, because
    // `liveactivitiesd` refuses a start payload that carries no alert — it logs
    // "Incoming message does not contain usable attributes / could not be parsed"
    // and drops it silently, so the only visible symptom is a card that never
    // shows. Apple's own start payload includes `alert`, and APNs answering 200
    // says nothing about whether the device could read the message.
    //
    // Its text is the snapshot's own two lines — the same words the card shows —
    // and `sound` is deliberately omitted, so the card arrives quietly.
    alert: {
      title: String(snapshot.title || 'Joba24'),
      body: String(snapshot.subtitle || snapshot.title || ''),
    },
    // A live card goes stale the same way a pushed update does, so a card left on
    // the Lock Screen after the work moved on cannot read as current.
    'stale-date': Math.floor((now + staleAfterMinutes * 60000) / 1000),
    // Higher than an ordinary notification: this is the thing the user is in the
    // middle of, and it is what the Lock Screen should show first.
    'relevance-score': relevanceScore,
  };
  const payload = {
    aps,
    joba: {
      taskId: snapshot.id,
      role: snapshot.role,
      revision: snapshot.revision || 0,
      contractVersion: snapshot.contractVersion || 0,
    },
  };

  if (payloadLeaks(payload).length) return null;
  return payload;
}