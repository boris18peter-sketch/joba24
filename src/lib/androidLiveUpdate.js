/**
 * androidLiveUpdate — the ONLY place the web layer talks to the Android card.
 *
 * ── THE ANDROID COUNTERPART OF THE iOS NATIVE MODULE ────────────────────────
 * Same contract, same call shapes, same "never throws" rule: every call resolves
 * to a described result, and off Android every call is a no-op with a reason. The
 * two modules are kept deliberately parallel so one bridge can drive either
 * platform (see liveUpdateNative.js) — the task lifecycle is identical, only the
 * surface that draws it differs.
 *
 * ── WHAT IS DIFFERENT, AND WHY ──────────────────────────────────────────────
 *  • There is no per-card push token. Android addresses the INSTALL through the
 *    FCM token the app already registers on the user record, so nothing here
 *    registers a token and no Push-to-Start equivalent is needed: a data message
 *    can create the notification while the app is closed.
 *  • The card's action capability is still minted by the server for THIS task and
 *    role (`issueLiveActivityActionToken`) and handed to the native side, exactly
 *    as on iOS — the tap then needs no session.
 *  • "Activities" are the cards this device is still showing, read from the
 *    native store, so a notification that outlived the process is still known.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { base44 } from '@/api/base44Client';
import { actionEndpoint } from '@/lib/activityActionEndpoint';

/** Must match `@CapacitorPlugin(name = ...)` in JobaLiveUpdatePlugin.java. */
export const LIVE_UPDATE_PLUGIN = 'JobaLiveUpdate';

/** Must match the plugin's `@PluginMethod` list. Asserted by the Android test. */
export const LIVE_UPDATE_METHODS = [
  'isSupported', 'update', 'end', 'activeUpdates', 'setActionAuth', 'setInstallAuth',
  'consumePendingOpenTask',
];

const JobaLiveUpdate = registerPlugin('JobaLiveUpdate');

/** True only inside the native Android app — never in a browser or on iOS. */
export function isAndroidLiveUpdateNative() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

function deviceId() {
  try {
    return localStorage.getItem('joba24_device_id') || '';
  } catch {
    return '';
  }
}

/** Can this device show the card at all, and can it be promoted to a Live Update? */
export async function liveUpdateAvailability() {
  if (!isAndroidLiveUpdateNative()) return { available: false, reason: 'not_native' };
  try {
    const result = await JobaLiveUpdate.isSupported();
    return {
      available: result?.supported === true,
      promoted: result?.promoted === true,
      reason: '',
      platform: 'android',
    };
  } catch {
    return { available: false, reason: 'plugin_unavailable', platform: 'android' };
  }
}

/**
 * Give this card's button its capability.
 *
 * The server mints it for one (user, task, role) and the tap re-checks the task
 * before doing anything, so a stale card can only ever be refused. Best effort:
 * a failure leaves the card purely informational (its button opens the app).
 */
const capabilityCache = new Map();

export async function syncActionAuth({ taskId, role = 'publisher' } = {}) {
  if (!taskId) return { ok: false, reason: 'missing_task' };
  try {
    const response = await base44.functions.invoke('issueLiveActivityActionToken', {
      task_id: taskId,
      role,
      // The Android app identifies its install the same way the iOS one does.
      device_id: deviceId(),
    });
    const token = response?.data?.token;
    if (!token) return { ok: false, reason: response?.data?.error || 'no_token' };
    const expiresAtMs = Date.parse(String(response?.data?.expires_at || '')) || 0;
    const stored = await JobaLiveUpdate.setActionAuth({
      taskId,
      role,
      endpoint: actionEndpoint(),
      token,
      expiresAtMs,
    });
    return { ok: stored?.stored === true, expiresAt: response?.data?.expires_at || null };
  } catch {
    return { ok: false, reason: 'mint_failed' };
  }
}

export async function ensureActionCapability({ taskId, role = 'publisher' } = {}) {
  if (!taskId) return { ok: false, reason: 'missing_task' };
  const key = `${taskId}|${role}`;
  const known = capabilityCache.get(key);
  if (known?.ok) return known;
  const result = await syncActionAuth({ taskId, role });
  if (result?.ok) capabilityCache.set(key, result);
  return result;
}

/**
 * The install-scoped capability, for a card that was drawn while the app was
 * closed.
 *
 * ── WHY IT IS NEEDED ON ANDROID TOO ────────────────────────────────────────
 * Android has no Push-to-Start gate: ANY dispatch can create the card, including
 * one that lands while the app is not running. That card was drawn by the
 * messaging service, so no session existed to mint the per-card capability its
 * button needs — and without one the button could only open the app.
 *
 * This mints the same narrow, task-less capability iOS uses for a
 * Push-to-Start card (`scope: 'user'`): it names no task, carries only the two
 * action ids a card can offer, and every tap is re-authorized against the record
 * by `liveActivityAction`. It is refreshed well inside its 12-hour life.
 */
const INSTALL_CAPABILITY_REFRESH_MS = 6 * 60 * 60 * 1000;
let installCapability = null;

export async function ensureInstallActionCapability({ force = false } = {}) {
  if (!isAndroidLiveUpdateNative()) return { ok: false, reason: 'not_native' };
  const stillFresh = installCapability?.ok === true
    && !force
    && Date.now() - Number(installCapability.at || 0) < INSTALL_CAPABILITY_REFRESH_MS;
  if (stillFresh) return installCapability;

  try {
    const response = await base44.functions.invoke('issueLiveActivityActionToken', { scope: 'user' });
    const token = response?.data?.token;
    if (!token) return { ok: false, reason: response?.data?.error || 'no_token' };
    const expiresAtMs = Date.parse(String(response?.data?.expires_at || '')) || 0;
    const stored = await JobaLiveUpdate.setInstallAuth({
      endpoint: actionEndpoint(),
      token,
      expiresAtMs,
    });
    const result = { ok: stored?.stored === true, at: Date.now(), expiresAtMs };
    if (result.ok) installCapability = result;
    return result;
  } catch {
    return { ok: false, reason: 'mint_failed' };
  }
}

/** Create or update the card for one task and role. */
export async function startTaskActivity({ taskId, role, state } = {}) {
  if (!isAndroidLiveUpdateNative()) return { started: false, reason: 'not_native' };
  if (!taskId || !state) return { started: false, reason: 'missing_input' };
  return updateTaskActivity({ taskId, role, state });
}

export async function updateTaskActivity({ taskId, role, state } = {}) {
  if (!isAndroidLiveUpdateNative()) return { updated: false, reason: 'not_native' };
  if (!taskId || !state) return { updated: false, reason: 'missing_input' };
  try {
    const result = await JobaLiveUpdate.update({ taskId, role: role || 'publisher', state });
    if (result?.updated === true) {
      // A running card's button must be able to act even if the capability was
      // never obtained when it first appeared.
      ensureActionCapability({ taskId, role: role || 'publisher' }).catch(() => {});
    }
    return {
      updated: result?.updated === true,
      ended: result?.ended === true,
      count: Number(result?.count) || 0,
      reason: result?.reason || '',
    };
  } catch {
    return { updated: false, reason: 'plugin_error' };
  }
}

/**
 * Close the card.
 *
 * `all: true` closes every card this device shows — the same deliberate cleanup
 * the iOS test screen uses, and never something a task action does implicitly.
 */
export async function endTaskActivity({ taskId, role = 'publisher', all = false } = {}) {
  if (!isAndroidLiveUpdateNative()) return { ended: false, reason: 'not_native' };
  try {
    if (all) {
      const { activities } = await activeTaskActivities();
      let count = 0;
      for (const activity of activities) {
        const result = await JobaLiveUpdate.end({ taskId: activity.taskId, role: activity.role });
        if (result?.ended) count += 1;
      }
      return { ended: true, count, reason: 'dismissed_all' };
    }
    if (!taskId) return { ended: false, reason: 'missing_input' };
    const result = await JobaLiveUpdate.end({ taskId, role });
    if (result?.ended === true) capabilityCache.delete(`${taskId}|${role || 'publisher'}`);
    return {
      ended: result?.ended === true,
      count: Number(result?.count) || 0,
      reason: result?.reason || '',
    };
  } catch {
    return { ended: false, reason: 'plugin_error' };
  }
}

/** Every card this device is still showing. */
export async function activeTaskActivities() {
  if (!isAndroidLiveUpdateNative()) return { activities: [] };
  try {
    const result = await JobaLiveUpdate.activeUpdates();
    const activities = Array.isArray(result?.activities) ? result.activities : [];
    return { activities };
  } catch {
    return { activities: [] };
  }
}

/**
 * A tap on the card.
 *
 * Two arrivals, one callback: the id stored before a cold start
 * (`consumePendingOpenTask`, read once on mount) and a tap that resumes an app
 * that is already running (`openTask`, announced by the plugin). The native side
 * clears the value as it is read, so a task is never opened twice.
 */
export async function attachOpenTaskListener(onTask) {
  if (!isAndroidLiveUpdateNative() || typeof onTask !== 'function') return () => {};
  let handle = null;
  try {
    const pending = await JobaLiveUpdate.consumePendingOpenTask();
    if (pending?.taskId) onTask(pending.taskId);
    handle = await JobaLiveUpdate.addListener('openTask', (event) => {
      if (event?.taskId) onTask(event.taskId);
    });
  } catch {
    // A card must never be able to break the app.
  }
  return () => {
    try { handle?.remove?.(); } catch { /* already gone */ }
  };
}