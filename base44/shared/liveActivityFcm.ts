/**
 * liveActivityFcm — the ANDROID transport for the Live Activity contract.
 *
 * ── ONE CONTRACT, TWO TRANSPORTS ───────────────────────────────────────────
 * The card's content is not re-invented here. `liveActivitySnapshot.ts` builds
 * the very same snapshot object iOS decodes from `aps.content-state`, with the
 * same phases, the same Hebrew strings, the same revision and the same terminal
 * event. This module only carries that object to Android — a data-only FCM
 * message the device renders itself.
 *
 * That is the whole reason the two platforms cannot drift: there is no second
 * state machine, no second copy of the copy, and no separate idea of what
 * "arrived" means. Android receives revision N for (user, task, role) exactly
 * when iOS does, or it receives nothing for that revision.
 *
 * ── DATA-ONLY, ON PURPOSE ──────────────────────────────────────────────────
 * No `notification` block is ever attached. A notification block is drawn by the
 * FCM SDK, which cannot make a notification ongoing, cannot give it progress
 * segments, and cannot promote it to a Live Update. The message therefore goes
 * to the app's own MessagingService, which decides how to draw it — and which
 * can update the SAME notification in place while the app is backgrounded or
 * closed.
 *
 * ── WHAT IT NEVER DOES ─────────────────────────────────────────────────────
 * It never reads or writes a Task, never advances a revision, and never decides
 * a lifecycle transition: it delivers what the shared planner already decided.
 */

import { readFcmCredentials, sendFcmMessage } from './fcmMessaging.ts';

/** The data key the Android app looks for. Mirrors the native constant. */
export const LIVE_UPDATE_KEY = 'joba_live_update';

/** How many device tokens one dispatch may address (mirrors the APNs ceiling). */
export const MAX_FCM_TOKENS = 20;

/**
 * The Android device tokens registered for one user.
 *
 * ── WHY THE USER RECORD, NOT LiveActivityToken ─────────────────────────────
 * `LiveActivityToken` holds ActivityKit tokens: one per CARD, issued by Apple,
 * useless to FCM. Android already registers its push token on the User record
 * (`fcm_tokens`, written by the app's existing push hook), and that is the token
 * FCM can actually address. Android Live Updates therefore reuse the app's
 * existing notification identity rather than introducing a second registry —
 * which is also why a user who already receives normal Joba24 pushes needs to do
 * nothing at all for the card to work.
 */
export async function loadAndroidRecipients(base44: any, userId: string): Promise<any[]> {
  if (!userId) return [];
  const page = await base44.asServiceRole.entities.User
    .filter({ id: userId }, { limit: 1 })
    .catch(() => ({ items: [] }));
  const user = (page?.items || [])[0];
  if (!user || user.is_blocked === true) return [];

  const tokens = Array.isArray(user.fcm_tokens) ? user.fcm_tokens : [];
  type TokenSlot = { token: string };
  const unique: TokenSlot[] = [];
  for (const raw of tokens) {
    const token = typeof raw === 'string' ? raw.trim() : '';
    if (!token) continue;
    if (unique.some((slot) => slot.token === token)) continue;
    unique.push({ token });
    if (unique.length >= MAX_FCM_TOKENS) break;
  }
  return unique;
}

/**
 * Is this token row a real FCM registration rather than a web push subscription?
 *
 * ── WHY THIS CHECK EXISTS ─────────────────────────────────────────────────
 * `fcm_tokens` is shared by the web app and the native apps: a browser that
 * granted notifications stores a Firebase WEB token there, and sending it a
 * data-only Live Update message would reach the service worker, which has no
 * handler for it. FCM registration tokens are long and have no punctuation;
 * web-push registrations are URLs. The distinction is made here rather than in
 * the datastore, because it needs no migration and cannot be stale.
 */
export function looksLikeAndroidToken(token: string): boolean {
  const value = String(token || '');
  if (!value || value.length < 40) return false;
  if (value.includes('://')) return false;
  return !value.includes(' ');
}

/**
 * The exact data map the device will receive. One place, so it can be tested.
 *
 * `actionAuth` is the capability that lets the card's button UPDATE THE STATUS
 * WITHOUT OPENING THE APP.
 *
 * ── WHY IT HAS TO TRAVEL WITH THE REVISION ON ANDROID ──────────────────────
 * On iOS the app is what hands the widget its capability, because a Live Activity
 * is started by the app. Android's card is drawn by this data message, inside a
 * service that runs with no session at all — and the message can arrive while the
 * app is closed, or long before it is next opened. There is simply no later
 * moment at which the app could supply the token, so the card would be
 * informational until the user launched the app: exactly the "the buttons don't
 * do anything" report.
 *
 * The value is the SAME narrow capability the app mints for itself
 * (`signActionToken`): one user, one task, one role, that role's action ids, a
 * hard expiry — and every tap is re-authorized against the stored Task. It is
 * never rendered, never logged, and it is delivered only to the device that was
 * already receiving this card.
 */
export function buildLiveUpdateData(input: any): any {
  const { snapshot, event, actionAuth } = input || {};
  const body = snapshot || {};
  const revision = Math.max(1, Math.floor(Number(body.revision) || 1));
  const data: Record<string, string> = {
    [LIVE_UPDATE_KEY]: '1',
    joba_event: event === 'end' ? 'end' : 'update',
    joba_revision: String(revision),
    joba_task_id: String(body.id || ''),
    joba_role: body.role === 'worker' ? 'worker' : 'publisher',
    // The contract snapshot, verbatim. The device decodes it with the same
    // tolerant field-by-field reader the iOS widget uses: a field it does not
    // know is ignored, a missing one falls back to empty — a shape change on the
    // server can never cost the user their update.
    joba_snapshot: JSON.stringify(body),
  };

  const token = typeof actionAuth?.token === 'string' ? actionAuth.token : '';
  const endpoint = typeof actionAuth?.endpoint === 'string' ? actionAuth.endpoint : '';
  if (token && endpoint && event !== 'end') {
    data.joba_action_token = token;
    data.joba_action_endpoint = endpoint;
    data.joba_action_exp = String(Math.floor(Number(actionAuth?.expiresAtMs) || 0));
  }

  return data;
}

/**
 * Deliver one revision to every Android token this user has.
 *
 * `dryRun` is the default outcome whenever the caller is not allowed to make a
 * real request, so a plan can be inspected without a single packet leaving.
 */
export async function sendLiveUpdateToAndroid(input: any): Promise<any[]> {
  const {
    base44,
    tokens = [],
    snapshot,
    event = 'update',
    maySend = false,
    credentials = null,
    actionAuth = null,
  } = input || {};

  // Built once, with the card's capability already inside it: every token below
  // therefore receives a card whose button can act, not just one that was drawn
  // while the app happened to be open.
  const data = buildLiveUpdateData({ snapshot, event, actionAuth });
  const resolved = credentials || readFcmCredentials();
  const results: any[] = [];

  for (const row of tokens) {
    const token = typeof row === 'string' ? row : row?.token;

    if (!looksLikeAndroidToken(token)) {
      results.push({ tokenRow: row, result: { ok: true, dryRun: true, category: 'not_a_device_token', status: null, invalidateToken: false } });
      continue;
    }

    if (!maySend) {
      results.push({
        tokenRow: row,
        result: {
          ok: true,
          dryRun: true,
          category: resolved.missing?.length ? 'missing_credentials' : 'dry_run',
          status: null,
          invalidateToken: false,
        },
      });
      continue;
    }

    const result = await sendFcmMessage({
      token,
      credentials: resolved,
      data,
      priority: 'high',
      // A task's card is one notification: a late message for an older revision
      // is useless the moment a newer one exists, so FCM may replace it in the
      // delivery queue instead of delivering both.
      collapseKey: `joba-live-${String(snapshot?.id || '')}-${String(snapshot?.role || '')}`,
    });
    results.push({ tokenRow: row, result });

    if (result.invalidateToken && base44) {
      await dropFcmToken(base44, String(snapshot?.user_id || ''), token).catch(() => null);
    }
  }

  return results;
}

/**
 * Retire a token FCM no longer recognises.
 *
 * Only ever called for `invalid_token` (UNREGISTERED / 404). The removal is done
 * with a filtered update on the user's own array, so two devices cannot overwrite
 * each other's registrations with a stale copy.
 */
export async function dropFcmToken(base44: any, userId: string, token: string): Promise<boolean> {
  if (!userId || !token) return false;
  const page = await base44.asServiceRole.entities.User
    .filter({ id: userId }, { limit: 1 })
    .catch(() => ({ items: [] }));
  const user = (page?.items || [])[0];
  const tokens = Array.isArray(user?.fcm_tokens) ? user.fcm_tokens : [];
  if (!tokens.includes(token)) return false;
  await base44.asServiceRole.entities.User
    .update(userId, { fcm_tokens: tokens.filter((t: string) => t !== token) })
    .catch(() => null);
  return true;
}