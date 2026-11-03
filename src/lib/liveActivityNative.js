/**
 * liveActivityNative — the ONLY place the web layer talks to ActivityKit.
 *
 * ── STATUS: BUILT, NOT WIRED ────────────────────────────────────────────────
 * Production delivery is still disabled (`enabled=false`, `dry_run=true`), so no
 * screen imports this module yet: nothing starts an activity on any device. The
 * bridge, the widget extension and the pipeline are complete and verifiable;
 * activation is one deliberate call site added after approval, not a rewrite.
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
export const LIVE_ACTIVITY_METHODS = ['isAvailable', 'start', 'update', 'end', 'activeActivities', 'setActionAuth'];

const JobaActivity = registerPlugin('JobaActivity');

let tokenListenerAttached = false;

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
      syncActivityAction({ taskId, role }).catch(() => {});
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
    const stored = await JobaActivity.setActionAuth({
      taskId,
      role,
      endpoint: `${window.location.origin}/functions/liveActivityAction`,
      token,
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

/** Push a newer snapshot into the running activity. */
export async function updateTaskActivity({ taskId, role, state } = {}) {
  if (!isLiveActivityNative()) return { updated: false, reason: 'not_native' };
  if (!taskId || !state) return { updated: false, reason: 'missing_input' };
  try {
    const result = await JobaActivity.update({ taskId, role: role || 'publisher', state });
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

/**
 * Start listening for token issue/rotation.
 *
 * Attached at most once per app run. `onToken` receives the raw payload so a
 * caller outside this module can log it if needed; the registration itself goes
 * through `registerActivityToken` above.
 */
export function attachActivityTokenListener(onToken) {
  if (!isLiveActivityNative() || tokenListenerAttached) return () => {};
  tokenListenerAttached = true;
  const handle = JobaActivity.addListener('activityToken', (event) => {
    const payload = event || {};
    if (typeof onToken === 'function') onToken(payload);
    registerActivityToken({
      token: payload.token,
      taskId: payload.taskId,
      role: payload.role,
      environment: payload.environment,
      bundleId: payload.bundleId,
    });
  });
  return () => {
    tokenListenerAttached = false;
    if (handle && typeof handle.remove === 'function') handle.remove();
  };
}