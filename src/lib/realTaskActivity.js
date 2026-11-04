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

/**
 * Live work — and a publisher's OPEN task.
 *
 * ── WHY OPEN IS TRACKABLE ─────────────────────────────────────────────────
 * The applicant stage is part of the job, not a prelude to it: the publisher
 * needs to see applicants arrive and, when there is exactly one, approve them
 * without opening the app. Leaving OPEN out of this list made the device refuse
 * to start a card for it (`task_not_active`), so the only card a publisher ever
 * got began after somebody was already assigned — which is why the applicant
 * count and the approve button had never been seen on a Lock Screen.
 *
 * It is also what keeps such a card from being closed by a cache gap: an OPEN
 * task is still live work for its publisher.
 */
export const TRACKABLE_STATUSES = ['OPEN', 'TAKEN', 'APPROVED_PENDING_DEPARTURE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'];

/** ActivityKit states in which an activity is still on screen. */
export const RUNNING_ACTIVITY_STATES = ['active', 'stale'];

/** Is this task still live work? */
export function isTrackableTask(task) {
  return Boolean(task && task.id && TRACKABLE_STATUSES.includes(task.status));
}

/**
 * Is this task still live work FOR THIS USER IN THIS ROLE?
 *
 * ── WHY THIS EXISTS SEPARATELY FROM THE CACHES ─────────────────────────────
 * A card may only be closed when the WORK is over. The active-task caches are
 * not evidence of that: the app rebuilds them after every realtime task event,
 * so during a status update they are momentarily empty while the job is still
 * running perfectly well. Reading that gap as "the task is gone" is what closed
 * the Lock Screen card on every single update.
 *
 * The card's own task is therefore re-read and asked directly. `task` is that
 * fresh record; null means it could not be read at all — deleted, or no longer
 * this user's — which IS evidence to close.
 */
export function isLiveForRole(task, role, userId) {
  if (!userId || !isTrackableTask(task)) return false;
  return role === 'worker' ? task.worker_id === userId : task.client_id === userId;
}

/**
 * The ONE real task this device shows, and the role it is shown in.
 *
 * `workerTask` / `clientTask` are the app's own active-task caches — the very
 * values ActiveTaskBanner renders — so the Lock Screen and the banner can never
 * disagree about which task is active. The demo task is filtered out so the
 * admin test can never be mistaken for a real one.
 */
export function selectTrackedTask({ workerTask, clientTask, openTask, userId } = {}) {
  if (!userId) return null;
  // `openTask` is the publisher's OWN open task. `pickTrackedTask` already
  // ranks the three tiers (worker TAKEN > publisher TAKEN > publisher OPEN), so
  // handing it all three is enough: an assignment moving the task from the open
  // list to the TAKEN cache changes the CONTENT of one card, never its identity —
  // same task id, same role, so the device updates it in place instead of
  // ending one card and starting another.
  const candidates = [workerTask, clientTask, openTask]
    .filter((task) => task && task.id && task.id !== DEMO_ACTIVITY_TASK_ID);
  if (!candidates.length) return null;
  const picked = pickTrackedTask(candidates, userId);
  return picked ? { task: picked.task, role: picked.role } : null;
}

/**
 * The publisher's most recent OPEN task — the one the Lock Screen shows while
 * applicants are arriving.
 *
 * Only tasks this user published, only while still OPEN. A worker's task is
 * never OPEN (a worker exists only after assignment), so this can never hand a
 * worker a publisher-only card.
 */
export function selectOpenPublisherTask(tasks, userId) {
  if (!userId || !Array.isArray(tasks)) return null;
  const open = tasks.filter((task) => (
    task && task.id && task.id !== DEMO_ACTIVITY_TASK_ID
    && task.status === 'OPEN'
    && task.client_id === userId
  ));
  if (!open.length) return null;
  // Newest first, then ascending id — the same deterministic tie-break the
  // contract's own selector uses, so two devices agree on which task is shown.
  return [...open].sort((a, b) => {
    const at = Date.parse(a.created_date || a.updated_date || 0) || 0;
    const bt = Date.parse(b.created_date || b.updated_date || 0) || 0;
    if (at !== bt) return bt - at;
    return String(a.id) < String(b.id) ? -1 : 1;
  })[0];
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
 *
 * ── `verifiedLive` — THE GUARD AGAINST CLOSING A CARD ON A CACHE GAP ────────
 * Rule 1 is only as good as the claim "that card is no longer the tracked
 * task". When `task` is null BECAUSE THE CACHE HAS NOT CAUGHT UP yet, that
 * claim is false, and acting on it tears down a card for work that is still
 * running — which is what happened on every status update. A caller that has
 * re-read a card's own task and found it still live for this user and role
 * passes it here, and it is then not treated as an orphan.
 */
export function planActivityStep(input) {
  const {
    task = null,
    role = null,
    activities = [],
    contentKey = '',
    applied = null,
    verifiedLive = [],
  } = input || {};

  const running = (activities || []).filter((a) => a && a.taskId && a.taskId !== DEMO_ACTIVITY_TASK_ID);
  const trackable = isTrackableTask(task);

  const orphan = running.find((a) => (
    RUNNING_ACTIVITY_STATES.includes(a.activityState)
    && !(trackable && a.taskId === task.id && a.role === role)
    && !verifiedLive.some((live) => live && live.taskId === a.taskId && live.role === a.role)
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