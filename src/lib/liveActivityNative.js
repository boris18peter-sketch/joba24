/**
 * liveActivityNative — the ONLY place the web layer talks to ActivityKit.
 *
 * ── STATUS: WIRED FOR AN ALLOWLISTED TEST ONLY ──────────────────────────────
 * There are exactly TWO importers and that list is closed:
 *   • LiveActivityTestPanel — the admin demo, unchanged, with a fixture task;
 *   • RealTaskActivityBridge — the REAL task, mounted once in App.jsx.
 * The bridge does nothing at all unless the server says the signed-in user is on
 * `LiveActivityConfig.test_user_ids` (`action: 'access'`). Global delivery stays
 * disabled (`enabled=false`, `dry_run=true`), so a user outside the allowlist
 * can neither start an activity nor receive a push.
 *
 * ── WHAT IT GUARANTEES ──────────────────────────────────────────────────────
 *  • Nothing here throws. A Lock Screen extra must never be able to break a task
 *    action, a checkout or a chat — every call resolves to a described result.
 *  • Off iOS, or on iOS older than 16.2, every call is a no-op with a reason.
 *  • The activity's CONTENT is never invented here. `state` is the same contract
 *    object the in-app banner renders, so the two can only ever agree.
 *  • The push token is registered through the existing backend function, which
 *    authorizes the recipient against the stored task; this module only forwards
 *    what iOS issued for this device.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { base44 } from '@/api/base44Client';

/** Must match `jsName` in ios/App/App/LiveActivityPlugin.swift. */
export const LIVE_ACTIVITY_PLUGIN = 'JobaActivity';

/** Must match the plugin's `pluginMethods`. Asserted by the Stage 3 test. */
export const LIVE_ACTIVITY_METHODS = [
  'isAvailable', 'start', 'update', 'end', 'activeActivities', 'setActionAuth',
  // Reads back what the App Intent recorded on the Lock Screen. The intent runs
  // without a session, so it can only log into the App Group; the app forwards
  // those stages to the server with its own authorized call.
  'actionStages',
  // The install's Push-to-Start token (iOS 17.2+) and the wider capability a
  // remotely started card's button needs. Both send nothing themselves.
  'pushToStartToken', 'setUserActionAuth',
];

const JobaActivity = registerPlugin('JobaActivity');

/**
 * The public origin the Lock Screen action posts to.
 *
 * `window.location.origin` is NOT usable here. Inside the native app the page is
 * served from `capacitor://localhost`, so the endpoint stored for the App Intent
 * was `capacitor://localhost/functions/liveActivityAction` — a scheme URL that
 * URLSession refuses outright. Every tap therefore failed as `network_error`
 * without a single packet leaving the phone: the button was dead in the only
 * build that matters, and nothing in the diagnostics said why.
 *
 * A browser build keeps posting to the origin it is served from (so previews
 * work); the native shell, which has no https origin at all, posts to the public
 * app domain.
 */
const PUBLIC_APP_ORIGIN = 'https://joba24.com';

function actionEndpoint() {
  try {
    const origin = window.location?.origin || '';
    if (/^https:\/\//.test(origin)) return `${origin}/functions/liveActivityAction`;
  } catch {
    // No window, or a container that exposes no origin — use the public domain.
  }
  return `${PUBLIC_APP_ORIGIN}/functions/liveActivityAction`;
}

// ── ONE native listener, MANY subscribers ───────────────────────────────────
// This used to be a boolean guard that let exactly one caller listen: the second
// caller got a no-op detach and its callback never ran. With the real-task
// bridge and the admin demo both listening, that would have silently killed the
// demo's token readout. The native listener is now attached once and fanned out
// to every subscriber, and it is removed when the last one leaves.
const tokenSubscribers = new Set();
let tokenListenerHandle = null;

/** True only inside the native iOS app — never in a browser or on Android. */
export function isLiveActivityNative() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

function deviceId() {
  try {
    return localStorage.getItem('joba24_device_id') || '';
  } catch {
    return '';
  }
}

function timeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

/**
 * An ISO expiry as epoch milliseconds, or undefined.
 *
 * The native side stores it beside the capability so the Lock Screen can answer
 * "can this tap work?" without a round trip. An unparseable value is passed as
 * undefined rather than 0: the store then records no expiry, which it treats as
 * unusable — the safe direction, because the card falls back to opening the app.
 */
function expiryMs(value) {
  const ms = Date.parse(String(value || ''));
  return Number.isFinite(ms) ? ms : undefined;
}

/** Whether this device can show a Live Activity at all, and why not. */
export async function liveActivityAvailability() {
  if (!isLiveActivityNative()) return { available: false, reason: 'not_native' };
  try {
    const result = await JobaActivity.isAvailable();
    return { available: result?.available === true, reason: result?.reason || '', platform: 'ios' };
  } catch {
    return { available: false, reason: 'plugin_unavailable' };
  }
}

/** Start (or replace) the activity for one task and one role. */
export async function startTaskActivity({ taskId, role, state } = {}) {
  if (!isLiveActivityNative()) return { started: false, reason: 'not_native' };
  if (!taskId || !state) return { started: false, reason: 'missing_input' };
  try {
    const result = await JobaActivity.start({ taskId, role: role || 'publisher', state });
    // The Lock Screen button needs a capability before it can do anything, and a
    // session exists only here. Best effort: a failure leaves the card purely
    // informational, it never blocks the activity from starting.
    if (result?.started === true) {
      ensureActionCapability({ taskId, role }).catch(() => {});
    }
    return { started: result?.started === true, activityId: result?.activityId || null, reason: result?.reason || '' };
  } catch {
    return { started: false, reason: 'plugin_error' };
  }
}

/**
 * Give this activity's Lock Screen button its capability.
 *
 * ── WHY A TOKEN AT ALL ──────────────────────────────────────────────────────
 * The App Intent runs in the widget extension, where no session exists. Rather
 * than put a session in a widget, the app asks the server for a capability that
 * is bound to this user, this task and this role, and permits only that role's
 * actions. Its life follows the task itself (its horizon plus a margin, at least
 * a day, never more than a week), so a long job keeps its Lock Screen buttons.
 * The server still re-checks the task on every tap.
 *
 * It is handed straight to the native side, which stores it in the App Group. It
 * is never put in the activity content (that is displayed on the Lock Screen), in
 * a push payload, or in a URL.
 */
export async function syncActivityAction({ taskId, role = 'publisher' } = {}) {
  if (!isLiveActivityNative()) return { ok: false, reason: 'not_native' };
  if (!taskId) return { ok: false, reason: 'missing_task' };
  try {
    const response = await base44.functions.invoke('issueLiveActivityActionToken', {
      task_id: taskId,
      role,
    });
    const token = response?.data?.token;
    if (!token) return { ok: false, reason: response?.data?.error || 'no_token' };
    // ── THE ENDPOINT MUST BE A REAL https URL ──────────────────────────────
    // This used to be built from `window.location.origin`, which inside the
    // native app is `capacitor://localhost`. The App Intent then handed that to
    // URLSession, which cannot request a scheme URL at all: every Lock Screen
    // tap failed as `network_error` without a packet ever leaving the phone, so
    // the button was dead in the one build that matters. `getPublicBaseUrl()`
    // resolves the published https origin (and the current origin in a preview),
    // so the intent calls the same host the web app does.
    const stored = await JobaActivity.setActionAuth({
      taskId,
      role,
      endpoint: actionEndpoint(),
      token,
      // The expiry, so the Lock Screen can tell BEFORE a tap whether this card can
      // still act. Without it the card would offer a button whose only possible
      // outcome is "failed" — see the store's `canAct`.
      expiresAtMs: expiryMs(response?.data?.expires_at),
    });
    return { ok: stored?.stored === true, expiresAt: response?.data?.expires_at || null };
  } catch {
    return { ok: false, reason: 'mint_failed' };
  }
}

/** Drop a capability (the activity ended): a cleared token can never be reused. */
export async function clearActivityAction({ taskId, role = 'publisher' } = {}) {
  if (!isLiveActivityNative() || !taskId) return { ok: false };
  try {
    await JobaActivity.setActionAuth({ taskId, role, token: '' });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/**
 * Make sure this card's Lock Screen button HAS a capability, minting one only
 * when it does not.
 *
 * ── WHY THIS IS NOT JUST "MINT ON START" ────────────────────────────────────
 * A capability was only ever minted at START, which left three holes that all
 * end in the same dead button:
 *   • the app was relaunched while a card was already running (the bridge only
 *     ever updates it, so nothing re-minted after a reinstall or a cleared
 *     container);
 *   • the mint failed the first time (offline, a cold backend) and nothing ever
 *     tried again;
 *   • the card was started by a build from before the capability existed.
 * Asking again on each successful content pass closes all three, and costs one
 * call per task for the life of the session because a success is remembered.
 */
const capabilityCache = new Map();

export async function ensureActionCapability({ taskId, role = 'publisher' } = {}) {
  if (!taskId) return { ok: false, reason: 'missing_task' };
  const key = `${taskId}|${role}`;
  const known = capabilityCache.get(key);
  if (known?.ok) return known;
  const result = await syncActivityAction({ taskId, role });
  // A FAILURE is not remembered as success: the next pass tries again, which is
  // what makes a transient mint failure self-heal.
  if (result?.ok) capabilityCache.set(key, result);
  return result;
}

/** Push a newer snapshot into the running activity. */
export async function updateTaskActivity({ taskId, role, state } = {}) {
  if (!isLiveActivityNative()) return { updated: false, reason: 'not_native' };
  if (!taskId || !state) return { updated: false, reason: 'missing_input' };
  try {
    const result = await JobaActivity.update({ taskId, role: role || 'publisher', state });
    if (result?.updated === true) {
      // The button on an already-running card must be able to act even if the
      // capability was never obtained when it started.
      ensureActionCapability({ taskId, role: role || 'publisher' }).catch(() => {});
    }
    return {
      updated: result?.updated === true,
      count: Number(result?.count) || 0,
      skipped: Number(result?.skipped) || 0,
      reason: result?.reason || '',
    };
  } catch {
    return { updated: false, reason: 'plugin_error' };
  }
}

/**
 * Close the activity.
 *
 * `dismissAfter` is how long the Lock Screen card may linger AFTER it ends:
 * 0 (the default) dismisses it immediately. `all: true` closes every activity on
 * this device — the deliberate cleanup for a leftover from an older test run,
 * never something a task action does implicitly.
 *
 * `state` is optional; when given it becomes the farewell the card shows while
 * it is still visible.
 */
export async function endTaskActivity({ taskId, role, state = null, dismissAfter = 0, all = false } = {}) {
  if (!isLiveActivityNative()) return { ended: false, reason: 'not_native' };
  if (!all && !taskId) return { ended: false, reason: 'missing_input' };
  try {
    const result = await JobaActivity.end({
      taskId,
      role: role || 'publisher',
      state,
      dismissAfter: Math.max(0, Number(dismissAfter) || 0),
      all,
    });
    // The capability cannot outlive the card: forget it so a future activity for
    // this pair mints a fresh one instead of trusting a stale memory.
    if (result?.ended === true) {
      capabilityCache.delete(`${taskId}|${role || 'publisher'}`);
    }
    return {
      ended: result?.ended === true,
      count: Number(result?.count) || 0,
      activityIds: Array.isArray(result?.activityIds) ? result.activityIds : [],
      dismissAfter: Number(result?.dismissAfter) || 0,
      remaining: Number(result?.remaining) || 0,
      reason: result?.reason || '',
    };
  } catch {
    return { ended: false, reason: 'plugin_error' };
  }
}

/** Close every activity on this device (used only by the local test screen). */
export function endAllActivities() {
  return endTaskActivity({ all: true, dismissAfter: 0 });
}

/** Every activity currently showing on this device. */
export async function activeTaskActivities() {
  if (!isLiveActivityNative()) return { activities: [] };
  try {
    const result = await JobaActivity.activeActivities();
    return { activities: Array.isArray(result?.activities) ? result.activities : [] };
  } catch {
    return { activities: [] };
  }
}

/**
 * Take the stages the Lock Screen action recorded since the last read.
 *
 * The App Intent runs without a session, so it can only write to the App Group;
 * this is how that evidence reaches the app, which forwards it to the server
 * with an authorized call. Draining means one entry is forwarded exactly once.
 * An entry holds a stage name and a short code — never a token or a body.
 */
export async function drainActivityActionStages() {
  if (!isLiveActivityNative()) return [];
  try {
    const result = await JobaActivity.actionStages();
    return Array.isArray(result?.stages) ? result.stages : [];
  } catch {
    return [];
  }
}

/**
 * Forward one ActivityKit push token to the server.
 *
 * The function re-reads the task as the signed-in user and authorizes the role
 * against the record, so a token can never be attached to somebody else's task.
 * The task binding is optional: an activity whose task has since changed simply
 * registers the device without a binding.
 */
export async function registerActivityToken({ token, taskId, role, environment, bundleId } = {}) {
  if (!token) return { ok: false, reason: 'missing_token' };
  try {
    const response = await base44.functions.invoke('registerLiveActivityToken', {
      token,
      task_id: taskId || undefined,
      role: taskId ? (role || 'publisher') : undefined,
      environment: environment === 'production' ? 'production' : 'development',
      bundle_id: bundleId || '',
      device_id: deviceId(),
      timezone: timeZone(),
    });
    return { ok: true, action: response?.data?.action || 'unknown' };
  } catch {
    return { ok: false, reason: 'register_failed' };
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   PUSH-TO-START — a card that appears while the app is closed
   ══════════════════════════════════════════════════════════════════════════
   iOS 17.2 gives every INSTALL one token that can make a Live Activity appear.
   It is a different value from the per-activity token used to update one, so it
   is registered with `kind: 'start'` and stored apart on the server.

   All of it is best effort and never throws. On iOS 16.x `supported` is false, no
   token is registered, and the app starts cards itself exactly as before — which
   is the fallback, not a second code path.
*/

/** The install's Push-to-Start token, or the reason there isn't one. */
export async function pushToStartToken() {
  if (!isLiveActivityNative()) return { supported: false, token: '', reason: 'not_native' };
  try {
    const result = await JobaActivity.pushToStartToken();
    return {
      supported: result?.supported === true,
      token: typeof result?.token === 'string' ? result.token : '',
      reason: result?.reason || '',
      environment: result?.environment === 'production' ? 'production' : 'development',
      bundleId: result?.bundleId || '',
    };
  } catch {
    return { supported: false, token: '', reason: 'plugin_unavailable' };
  }
}

/** Register (or refresh) the install's start token. */
export async function registerPushToStartToken({ token, environment, bundleId } = {}) {
  if (!token) return { ok: false, reason: 'missing_token' };
  try {
    const response = await base44.functions.invoke('registerLiveActivityToken', {
      token,
      kind: 'start',
      environment: environment === 'production' ? 'production' : 'development',
      bundle_id: bundleId || '',
      device_id: deviceId(),
      timezone: timeZone(),
    });
    return { ok: true, action: response?.data?.action || 'unknown' };
  } catch {
    return { ok: false, reason: 'register_failed' };
  }
}

/**
 * Read the current token and register it, in one step.
 *
 * Run on every launch: a token Apple issued while the app was closed has to
 * reach the server without waiting for a rotation event.
 */
export async function syncPushToStartToken() {
  const current = await pushToStartToken();
  if (!current.supported || !current.token) return { ...current, registered: false };
  const result = await registerPushToStartToken(current);
  return { ...current, registered: result.ok === true };
}

const startTokenSubscribers = new Set();
let startTokenHandle = null;

/** Listen for the start token being issued or ROTATED (attached once, fanned out). */
export function attachPushToStartTokenListener(onToken) {
  if (!isLiveActivityNative()) return () => {};
  if (typeof onToken === 'function') startTokenSubscribers.add(onToken);

  if (!startTokenHandle) {
    startTokenHandle = JobaActivity.addListener('pushToStartToken', (event) => {
      const payload = event || {};
      for (const fn of Array.from(startTokenSubscribers)) {
        try { fn(payload); } catch { /* a listener must never break the bridge */ }
      }
      registerPushToStartToken(payload);
    });
  }

  return () => {
    if (typeof onToken === 'function') startTokenSubscribers.delete(onToken);
    if (startTokenSubscribers.size === 0 && startTokenHandle) {
      if (typeof startTokenHandle.remove === 'function') startTokenHandle.remove();
      startTokenHandle = null;
    }
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   THE INSTALL-SCOPED ACTION CAPABILITY
   ══════════════════════════════════════════════════════════════════════════
   A card that appeared by push was created while the app was closed, so no
   session existed to mint the per-card capability its button needs. This is the
   narrow answer: one capability per install, naming NO task, carrying only the
   two action ids a card can offer, living twelve hours and refreshed whenever the
   app runs. Every tap still travels with the card's own task and role, and the
   server re-derives ownership from the record before doing anything — so this is
   permission to ASK as one user, not a key to a task. It never appears in a push
   payload; only in the app's own App Group.
*/
export async function syncUserActionCapability() {
  if (!isLiveActivityNative()) return { ok: false, reason: 'not_native' };
  try {
    const response = await base44.functions.invoke('issueLiveActivityActionToken', { scope: 'user' });
    const token = response?.data?.token;
    if (!token) return { ok: false, reason: response?.data?.error || 'no_token' };
    const stored = await JobaActivity.setUserActionAuth({
      endpoint: actionEndpoint(),
      token,
      // Same reason as the per-card capability: the card must be able to tell
      // whether this install's capability is still alive before it offers a tap.
      expiresAtMs: expiryMs(response?.data?.expires_at),
    });
    return { ok: stored?.stored === true, at: Date.now(), expiresAt: response?.data?.expires_at || null };
  } catch {
    return { ok: false, reason: 'mint_failed' };
  }
}

/** Refreshed at most every six hours; a failure is never remembered as success. */
const USER_CAPABILITY_REFRESH_MS = 6 * 60 * 60 * 1000;
let userCapability = null;

export async function ensureUserActionCapability({ force = false } = {}) {
  if (!isLiveActivityNative()) return { ok: false, reason: 'not_native' };
  const stillFresh = userCapability?.ok === true
    && !force
    && Date.now() - Number(userCapability.at || 0) < USER_CAPABILITY_REFRESH_MS;
  if (stillFresh) return userCapability;
  const result = await syncUserActionCapability();
  if (result.ok) userCapability = result;
  return result;
}

/**
 * Start listening for token issue/rotation.
 *
 * Attached at most once per app run. `onToken` receives the raw payload so a
 * caller outside this module can log it if needed; the registration itself goes
 * through `registerActivityToken` above.
 */
export function attachActivityTokenListener(onToken) {
  if (!isLiveActivityNative()) return () => {};
  if (typeof onToken === 'function') tokenSubscribers.add(onToken);

  if (!tokenListenerHandle) {
    tokenListenerHandle = JobaActivity.addListener('activityToken', (event) => {
      const payload = event || {};
      for (const fn of Array.from(tokenSubscribers)) {
        try { fn(payload); } catch { /* a listener must never break the bridge */ }
      }
      registerActivityToken({
        token: payload.token,
        taskId: payload.taskId,
        role: payload.role,
        environment: payload.environment,
        bundleId: payload.bundleId,
      });
    });
  }

  return () => {
    if (typeof onToken === 'function') tokenSubscribers.delete(onToken);
    if (tokenSubscribers.size === 0 && tokenListenerHandle) {
      if (typeof tokenListenerHandle.remove === 'function') tokenListenerHandle.remove();
      tokenListenerHandle = null;
    }
  };
}