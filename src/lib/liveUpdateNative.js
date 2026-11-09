/**
 * liveUpdateNative — ONE surface for "the card on this phone", on either platform.
 *
 * ── WHY THIS MODULE EXISTS ─────────────────────────────────────────────────
 * `RealTaskActivityBridge` is the single place where a real Task becomes a card.
 * It decides WHEN (a new revision, a different task, an action's reply) and the
 * server decides WHAT (the revision, through `liveActivityRealTask`). Neither of
 * those is platform-specific, so the bridge must not be either: duplicating it
 * for Android would have created a second copy of the lifecycle logic — exactly
 * the drift this codebase has spent effort removing.
 *
 * So the bridge calls THIS module, and this module forwards to whichever native
 * surface exists:
 *
 *   iOS      → JobaActivity (ActivityKit), via liveActivityNative.js
 *   Android  → JobaLiveUpdate (ongoing notification / Android 16 Live Update),
 *              via androidLiveUpdate.js
 *
 * The iOS calls are untouched: every function below delegates to the existing
 * module with the same arguments it always received, so the shipped Live
 * Activity behaves exactly as before. Off both platforms every call is a no-op
 * with a reason, which is what a browser build already expected.
 */
import * as ios from '@/lib/liveActivityNative';
import * as android from '@/lib/androidLiveUpdate';

/** True inside either native app — iOS or Android. */
export function isLiveUpdateNative() {
  return ios.isLiveActivityNative() || android.isAndroidLiveUpdateNative();
}

export function liveUpdatePlatform() {
  if (ios.isLiveActivityNative()) return 'ios';
  if (android.isAndroidLiveUpdateNative()) return 'android';
  return 'web';
}

/** Whether this device can show a card at all, and why not. */
export async function liveUpdateAvailability() {
  if (ios.isLiveActivityNative()) return ios.liveActivityAvailability();
  if (android.isAndroidLiveUpdateNative()) return android.liveUpdateAvailability();
  return { available: false, reason: 'not_native' };
}

/** Cards currently showing on this device, as [{ taskId, role, activityState }]. */
export async function activeTaskActivities() {
  if (ios.isLiveActivityNative()) return ios.activeTaskActivities();
  return android.activeTaskActivities();
}

export async function startTaskActivity({ taskId, role, state } = {}) {
  if (ios.isLiveActivityNative()) return ios.startTaskActivity({ taskId, role, state });
  return android.startTaskActivity({ taskId, role, state });
}

export async function updateTaskActivity({ taskId, role, state } = {}) {
  if (ios.isLiveActivityNative()) return ios.updateTaskActivity({ taskId, role, state });
  return android.updateTaskActivity({ taskId, role, state });
}

export async function endTaskActivity({ taskId, role, state = null, dismissAfter = 0, all = false } = {}) {
  if (ios.isLiveActivityNative()) return ios.endTaskActivity({ taskId, role, state, dismissAfter, all });
  return android.endTaskActivity({ taskId, role, all });
}

/** Close every card on this device (the test screen's deliberate cleanup). */
export function endAllActivities() {
  return endTaskActivity({ all: true, dismissAfter: 0 });
}

/**
 * What the card's button did, forwarded to the server as evidence.
 *
 * iOS records those stages in the App Group because its App Intent runs without
 * a session. Android performs the same request from a broadcast receiver, and the
 * server's own dispatch is what reports the outcome, so there is nothing to drain
 * — the empty list keeps the bridge's single code path honest.
 */
export async function drainActivityActionStages() {
  if (ios.isLiveActivityNative()) return ios.drainActivityActionStages();
  return [];
}

/** A tap on the card that has to survive (or resume into) the app. */
export function attachOpenTaskListener(onTask) {
  return android.attachOpenTaskListener(onTask);
}

/**
 * The install-scoped capability a card needs when it was drawn while the app was
 * closed. iOS mints its own in `liveActivityNative` (a Push-to-Start card); on
 * Android EVERY pushed card can arrive with no app running, so the same
 * capability is minted on the next launch. Off Android this is a no-op.
 */
export function ensureInstallActionCapability(options = {}) {
  return android.ensureInstallActionCapability(options);
}