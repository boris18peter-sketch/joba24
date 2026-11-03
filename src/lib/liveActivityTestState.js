/**
 * liveActivityTestState — the fixture the LOCAL Live Activity test renders.
 *
 * ── WHY IT IS BUILT BY THE CONTRACT, NOT HAND-WRITTEN ───────────────────────
 * This used to be a hand-written object with its own invented Hebrew
 * ("העובד בדרך אליך", "העבודה הסתיימה", "בדיקה מקומית"). It proved the bridge
 * worked and proved nothing about what a real task shows, because the words did
 * not come from the app at all.
 *
 * Every snapshot here is now produced by the app's presentation contract over a
 * REAL GlobalCategory flow and the app's own translator — exactly as
 * ActiveTaskBanner and the dispatch layer resolve them. The stage list is the
 * canonical lifecycle (OPEN → TAKEN → on_the_way → arrived → done), not a new
 * one.
 *
 * ── IT CANNOT TOUCH A REAL TASK ────────────────────────────────────────────
 * The task is an in-memory object with a literal id. It is never created, read
 * or written on the server; the activity it drives is created by the device.
 */
import { buildTaskActivitySnapshot } from '@/lib/liveActivityContract';
import { resolveStatusFlow } from '@/lib/taskStatusFlow';
import { isEngagement, primaryOccurrence, formatOccurrence, scheduleWindows } from '@/lib/scheduling';

/** A literal id, never an existing task's. */
export const TEST_TASK_ID = 'joba-local-live-activity-test';
const TEST_CLIENT_ID = 'local-test-publisher';
const TEST_WORKER_ID = 'local-test-worker';

/**
 * The real lifecycle, in the order a worker walks it. `roles` mirrors
 * `authorizeActivity`: an OPEN task only ever belongs to its publisher.
 * The labels are this admin screen's own navigation tags — the status text the
 * user sees always comes from the snapshot, never from here.
 */
export const TEST_STAGES = [
  { key: 'open', label: 'OPEN', status: 'OPEN', workerStatus: null, roles: ['publisher'], scheduled: false },
  { key: 'scheduled', label: 'מתוכנן', status: 'TAKEN', workerStatus: null, roles: ['publisher', 'worker'], scheduled: true },
  { key: 'awaiting_start', label: 'טרם התחיל', status: 'TAKEN', workerStatus: null, roles: ['publisher', 'worker'], scheduled: false },
  { key: 'on_the_way', label: 'בדרך', status: 'TAKEN', workerStatus: 'on_the_way', roles: ['publisher', 'worker'], scheduled: false },
  { key: 'arrived', label: 'בעבודה', status: 'TAKEN', workerStatus: 'arrived', roles: ['publisher', 'worker'], scheduled: false },
  { key: 'done', label: 'סיום', status: 'TAKEN', workerStatus: 'done', roles: ['publisher', 'worker'], scheduled: false },
];

/** The stages a given role can actually be authorized for, in lifecycle order. */
export function stagesForRole(role) {
  const wanted = role === 'worker' ? 'worker' : 'publisher';
  return TEST_STAGES.filter((stage) => stage.roles.includes(wanted));
}

/** The reset point after an end: the first stage that is not publisher-only. */
export function firstAssignedStage(role) {
  const stages = stagesForRole(role);
  return (stages.find((s) => s.key === 'awaiting_start') || stages[0]).key;
}

/** The first real service category the catalogue offers — for real flow wording. */
export function pickTestCategory(catRows) {
  const rows = Array.isArray(catRows) ? catRows : [];
  return rows.find((row) => row && row.node_type === 'service' && row.active !== false)
    || rows.find((row) => row && row.category_key)
    || null;
}

/**
 * The in-memory task a stage describes. Identity fields are swapped so the
 * viewer is authorized as themselves: the publisher owns `client_id`, the worker
 * owns `worker_id` — the same rule the server enforces.
 */
export function buildTestTask({ stage, role, userId, categoryKey, now = Date.now() }) {
  const meta = TEST_STAGES.find((s) => s.key === stage) || TEST_STAGES[2];
  const isPublisher = role !== 'worker';

  const task = {
    id: TEST_TASK_ID,
    title: 'משימת בדיקה מקומית',
    category: categoryKey || '',
    status: meta.status,
    worker_status: meta.workerStatus,
    price: 250,
    client_id: isPublisher ? userId : TEST_CLIENT_ID,
    client_name: 'מפרסם לדוגמה',
    worker_id: isPublisher ? TEST_WORKER_ID : userId,
    worker_name: 'עובד לדוגמה',
    applicants: [],
    updated_date: new Date(now).toISOString(),
  };

  if (meta.status === 'OPEN') {
    task.expires_at = new Date(now + 24 * 3600 * 1000).toISOString();
    task.views_count = 18;
    task.clicks_count = 4;
    task.applicants = [
      { worker_id: 'local-applicant-1', worker_name: 'מועמד לדוגמה', applied_at: task.updated_date },
      { worker_id: 'local-applicant-2', worker_name: 'מועמדת לדוגמה', applied_at: task.updated_date },
    ];
  }

  if (meta.scheduled) {
    // Two days out: the real `isEngagement()` classifies it exactly as it
    // classifies an agreed future booking.
    task.scheduled_time = new Date(now + 48 * 3600 * 1000).toISOString();
    task.schedule_agreed_at = new Date(now - 3600 * 1000).toISOString();
  }

  return task;
}

/**
 * Build the snapshot for one stage, role and revision.
 *
 * Returns null when the stage does not apply to that role (an OPEN task for a
 * worker) or when the catalogue is not loaded yet — the panel then shows nothing
 * rather than inventing a state.
 */
export function buildTestSnapshot({
  stage,
  role,
  revision = 1,
  userId,
  t,
  catRows,
  settings,
  now = Date.now(),
}) {
  if (!userId || typeof t !== 'function') return null;
  const category = pickTestCategory(catRows);
  if (!category) return null;

  const task = buildTestTask({ stage, role, userId, categoryKey: category.category_key, now });
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
    categoryLabel: category.label || '',
    now,
    revision,
  });
}