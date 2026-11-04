/**
 * realTaskActivity — the DECISION layer that turns a REAL task into a device
 * Live Activity, for the restricted test rollout.
 *
 * ── WHAT IT DOES NOT DO ────────────────────────────────────────────────────
 * It invents no status, no wording and no action. The snapshot is built by the
 * SAME presentation contract the backend pushes with (`liveActivityContract`),
 * over the SAME category flow `ActiveTaskBanner` renders
 * (`resolveStatusFlow`) and the SAME schedule rules (`isEngagement` /
 * `primaryOccurrence` / `formatOccurrence`). Only two things are new here: which
 * task this device tracks, and whether the screen needs a start, an update or
 * an end.
 *
 * ── WHY THE LOCAL SNAPSHOT MATTERS AT ALL ──────────────────────────────────
 * ActivityKit activities are created by the APP. The server can push an update
 * to one that exists, but it cannot start one, so the phone must (a) start the
 * activity when the task becomes active and (b) still move the card when no
 * APNs push is configured (dry run). Both use this module; neither bypasses the
 * contract.
 */
import { buildTaskActivitySnapshot, pickTrackedTask } from '@/lib/liveActivityContract';
import { resolveStatusFlow } from '@/lib/taskStatusFlow';
import { isEngagement, primaryOccurrence, formatOccurrence, scheduleWindows } from '@/lib/scheduling';

/** The admin demo's literal task id — never treated as a real task. */
export const DEMO_ACTIVITY_TASK_ID = 'joba-local-live-activity-test';

/** Live work. Mirrors ACTIVE_STATUSES in the contract (legacy statuses included). */
export const TRACKABLE_STATUSES = ['TAKEN', 'APPROVED_PENDING_DEPARTURE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'];

/** ActivityKit states in which an activity is still on screen. */
export const RUNNING_ACTIVITY_STATES = ['active', 'stale'];

/** Is this task still live work? */
export function isTrackableTask(task) {
  return Boolean(task && task.id && TRACKABLE_STATUSES.includes(task.status));
}

/**
 * The ONE real task this device shows, and the role it is shown in.
 *
 * `workerTask` / `clientTask` are the app's own active-task caches — the very
 * values ActiveTaskBanner renders — so the Lock Screen and the banner can never
 * disagree about which task is active. The demo task is filtered out so the
 * admin test can never be mistaken for a real one.
 */
export function selectTrackedTask({ workerTask, clientTask, userId } = {}) {
  if (!userId) return null;
  const candidates = [workerTask, clientTask]
    .filter((task) => task && task.id && task.id !== DEMO_ACTIVITY_TASK_ID);
  if (!candidates.length) return null;
  const picked = pickTrackedTask(candidates, userId);
  return picked ? { task: picked.task, role: picked.role } : null;
}

/** The catalogue label of a task's service, exactly as the server passes it. */
export function categoryLabelOf(catRows, categoryKey) {
  const rows = Array.isArray(catRows) ? catRows : [];
  const row = rows.find((r) => r && r.category_key === categoryKey);
  return row?.label || '';
}

/**
 * Build the snapshot for a real task and role.
 * Returns null when the task is not this user's in this role, so a card can
 * never be started for somebody else's task.
 */
export function buildRealSnapshot(input) {
  const {
    task, role, userId, t, catRows, settings, revision = 1, now = Date.now(),
  } = input || {};
  if (!task?.id || !userId || typeof t !== 'function') return null;

  const flow = resolveStatusFlow(task.category, catRows);
  const windows = scheduleWindows(settings || {});
  const engagement = isEngagement(task, now, windows);
  const occurrence = engagement ? primaryOccurrence(task, now) : null;

  return buildTaskActivitySnapshot({
    task,
    role: role === 'worker' ? 'worker' : 'publisher',
    userId,
    flow,
    schedule: {
      isEngagement: engagement,
      occurrenceLabel: occurrence ? formatOccurrence(occurrence) : '',
    },
    t,
    categoryLabel: categoryLabelOf(catRows, task.category),
    now,
    revision,
  });
}

/**
 * A canonical string of everything visible — the mirror of the server's
 * `snapshotContentKey`. Used only to avoid re-pushing an identical picture from
 * the device; the server keeps its own copy for the same purpose.
 */
export function contentKeyOf(snapshot) {
  if (!snapshot) return '';
  return JSON.stringify({
    v: snapshot.contractVersion,
    phase: snapshot.phase,
    title: snapshot.title,
    subtitle: snapshot.subtitle,
    categoryLabel: snapshot.categoryLabel,
    categoryKey: snapshot.categoryKey,
    iconKey: snapshot.iconKey,
    colorKey: snapshot.colorKey,
    endsAt: snapshot.endsAt,
    progress: {
      step: snapshot.progress?.step,
      total: snapshot.progress?.total,
      steps: (snapshot.progress?.steps || []).map((s) => [s.key, s.label, s.icon]),
    },
    counters: snapshot.counters || null,
  });
}

/**
 * What this device must do right now.
 *
 * @returns { action, taskId, role, reason }
 *   action = 'none' | 'start' | 'update' | 'end'
 *
 * Order of precedence, and why:
 *  1. An ORPHAN — any real-task activity on this device that is no longer the
 *     tracked task (the task finished, was deleted, or the user moved on). It is
 *     ended first: one card at a time, and never a card for work that is over.
 *  2. No tracked task → nothing to start.
 *  3. A terminal task that still has a card → end it.
 *  4. No matching activity, or one iOS already ended/dismissed (an app restart
 *     after a reboot) → start.
 *  5. A running activity whose content is unchanged since we applied it →
 *     nothing (this is what stops an event loop from re-updating in a circle).
 *  6. Otherwise → update.
 */
export function planActivityStep(input) {
  const {
    task = null,
    role = null,
    activities = [],
    contentKey = '',
    applied = null,
  } = input || {};

  const running = (activities || []).filter((a) => a && a.taskId && a.taskId !== DEMO_ACTIVITY_TASK_ID);
  const trackable = isTrackableTask(task);

  const orphan = running.find((a) => (
    RUNNING_ACTIVITY_STATES.includes(a.activityState)
    && !(trackable && a.taskId === task.id && a.role === role)
  ));
  if (orphan) {
    return { action: 'end', taskId: orphan.taskId, role: orphan.role, reason: 'not_the_tracked_task' };
  }

  if (!task?.id || !role) return { action: 'none', reason: 'no_tracked_task' };
  if (!trackable) return { action: 'none', reason: 'task_not_active' };

  const match = running.find((a) => a.taskId === task.id && a.role === role);
  if (!match || !RUNNING_ACTIVITY_STATES.includes(match.activityState)) {
    return { action: 'start', taskId: task.id, role, reason: match ? 'activity_not_running' : 'no_activity' };
  }

  const unchanged = applied
    && applied.taskId === task.id
    && applied.role === role
    && applied.contentKey === contentKey;
  if (unchanged) return { action: 'none', taskId: task.id, role, reason: 'unchanged' };

  return { action: 'update', taskId: task.id, role, reason: 'content_changed' };
}