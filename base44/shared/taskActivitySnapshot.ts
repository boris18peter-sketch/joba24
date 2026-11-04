/**
 * taskActivitySnapshot — the Live Activity PRESENTATION CONTRACT (Stage 0).
 *
 * ── WHAT THIS IS ───────────────────────────────────────────────────────────
 * One pure, versioned description of what a Live Activity would display for one
 * task and one role. It is a VALUE PRODUCER: it reads a Task record and returns
 * a plain JSON object. It writes nothing, sends nothing, registers nothing, and
 * imports nothing — no React, no SDK, no Deno, no network. That is what lets the
 * same module run in a backend function later and in the tests today.
 *
 * ── WHY IT DOES NOT RE-DERIVE STATUS RULES ─────────────────────────────────
 * The category flow is NOT computed here. The caller resolves it with the app's
 * own `resolveStatusFlow()` (src/lib/taskStatusFlow.js) and the schedule state
 * with `isEngagement()` / `primaryOccurrence()` / `formatOccurrence()`
 * (src/lib/scheduling.js), then hands both in. This module only maps
 * (flow, worker_status, role, schedule-state) → the exact title/subtitle the
 * existing UI already shows. There is no second implementation of the
 * lifecycle, and no second copy of any Hebrew string: every label comes from the
 * app's own translator, injected as `t`.
 *
 * `test/liveActivity/parity.test.js` proves that mapping against a transcription
 * of ActiveTaskBanner's own ladder, and against the real dictionaries.
 *
 * ── FIELD SOURCES (exact) ──────────────────────────────────────────────────
 *  id                Task.id
 *  role              caller-declared, then AUTHORIZED against client_id/worker_id
 *  phase             derived here from status + schedule state + flow index
 *  title / subtitle  app `t()` keys, chosen exactly as ActiveTaskBanner /
 *                    ApplicantsGoldButton choose them
 *  categoryLabel     input.categoryLabel — GlobalCategory.label of Task.category
 *  progress.*        flow.steps (role-labelled), stepIndexOf(flow, worker_status)
 *  counters.*        Task.applicants.length, Task.views_count, Task.clicks_count
 *  iconKey/colorKey  flow.steps[i].icon + the same mapping getQuickAction() uses
 *  deepLink          Task.id through the app's existing `?open_task=` handler
 *  revision          caller-owned monotonic integer (Stage 1 persists it)
 *  updatedAt         Task.updated_date
 *
 * CONTRACT_VERSION is bumped whenever a field changes shape or meaning, because
 * a shipped iOS build decodes `content-state` with a fixed Codable.
 */

// v2 added `action` / `actionState` (the interactive Lock Screen action). A v1
// decoder ignores them; a v2 one reads them. Never reused, only bumped.
export const LIVE_ACTIVITY_CONTRACT_VERSION = 2;

/** Every phase a snapshot may carry. Mirrors ActiveTaskBanner's branches. */
export const LIVE_ACTIVITY_PHASES = [
  'open',           // OPEN, publisher: applicant count or the scanning line
  'scheduled',      // TAKEN, inside the visibility window but not startable
  'awaiting_start', // TAKEN, no worker_status yet
  'on_the_way',     // canonical step 0
  'arrived',        // canonical step 1
  'done',           // canonical step 2
];

/**
 * Task statuses that describe live work.
 *
 * `TAKEN` is the only status any function writes — progress lives in
 * `worker_status`. The four legacy values below still exist in the entity enum
 * and are still READ defensively by TaskDetail, the brand dashboards and the
 * simulator, so a historical record carrying one of them describes live work
 * too and must not silently lose its activity. NOTE: ActiveTaskBanner gates its
 * action CTA on `status === 'TAKEN'` alone; this contract reproduces that gate
 * exactly (see nextBtnLabel), so a legacy record matches what the banner would
 * show for the same record.
 */
const LEGACY_ACTIVE_STATUSES = ['APPROVED_PENDING_DEPARTURE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'];
const ACTIVE_STATUSES = ['TAKEN', ...LEGACY_ACTIVE_STATUSES];
const TRACKABLE_STATUSES = ['OPEN', ...ACTIVE_STATUSES];

/** The canonical step order. Identical to CANONICAL_STEPS in taskStatusFlow. */
const CANONICAL_STEPS = ['on_the_way', 'arrived', 'done'];

const OPEN_DEEP_LINK = 'https://joba24.com/?open_task=';

const clampIndex = (i, len) => Math.min(Math.max(i, 0), Math.max(len - 1, 0));

/** Index of the canonical worker_status inside the resolved flow (-1 = none). */
function flowIndex(flow, workerStatus) {
  const steps = Array.isArray(flow?.steps) ? flow.steps : [];
  return steps.findIndex((s) => s && s.key === workerStatus);
}

/** The canonical key of the worker's next action, as nextCta() derives it. */
function nextCtaKey(flow, workerStatus) {
  const idx = flowIndex(flow, workerStatus);
  return idx < 0 ? CANONICAL_STEPS[0] : (CANONICAL_STEPS[idx + 1] || null);
}

/** The next CTA label a worker would see, exactly as nextCta() derives it. */
function nextCtaLabel(flow, workerStatus) {
  const nextKey = nextCtaKey(flow, workerStatus);
  if (!nextKey) return null;
  const cta = flow?.cta?.[nextKey];
  const label = typeof cta?.label === 'string' && cta.label.trim() ? cta.label.trim() : null;
  return label;
}

/**
 * The ONE action a Live Activity may offer this role, right now.
 *
 * ── ONE RULE, THREE CONSUMERS ──────────────────────────────────────────────
 * The snapshot (for display), the token minter (which capability to grant) and
 * the action endpoint (whether a submitted tap is legal) all ask THIS function.
 * A button can therefore never appear on the Lock Screen that the backend would
 * refuse, and an action can never be accepted that the banner would not offer.
 *
 * `id` is stable and machine-readable; `label` is display-only. Re-wording a
 * button changes the string and nothing else — the id still means the same
 * operation and carries the same authorization.
 *
 * Worker: exactly the banner's gate — TAKEN, not an upcoming engagement, and a
 * next CTA exists (so the last step offers no button, only the waiting text).
 * Publisher: exactly the banner's gate — `worker_status === 'done'`.
 */
export function deriveActivityAction(input: any) {
  const { task, role, flow, isEngagement, t } = input || {};
  if (!task || !flow || typeof t !== 'function') return null;

  if (role === 'worker') {
    if (task.status !== 'TAKEN' || isEngagement) return null;
    const nextKey = nextCtaKey(flow, task.worker_status);
    const label = nextCtaLabel(flow, task.worker_status);
    if (!nextKey || !label) return null;
    return {
      id: 'worker_step',
      step: nextKey,
      label,
      style: nextKey === 'on_the_way' ? 'brand' : 'success',
      confirm: null,
    };
  }

  if (role === 'publisher') {
    // ── ASSIGNING THE ONE APPLICANT, FROM THE LOCK SCREEN ──────────────────
    // Offered ONLY while the task is still open and exactly ONE worker has
    // applied. With two or more there is no unambiguous choice and a card cannot
    // show a list — so no action is offered at all and the card's own tap opens
    // the task, where the applicants are. The server re-checks the count before
    // approving (guardPublisherAssign), so a second applicant arriving while the
    // card is on screen turns the tap into a refusal, never a guess.
    if (task.status === 'OPEN') {
      const applicants = Array.isArray(task.applicants) ? task.applicants : [];
      if (applicants.length !== 1) return null;
      const name = String(applicants[0]?.worker_name || '').trim();
      if (!name) return null;
      return {
        id: 'publisher_assign',
        step: 'assign',
        label: `${t('la_assign_worker')} ${name}`,
        style: 'brand',
        confirm: t('la_assign_sub'),
      };
    }
    if (!ACTIVE_STATUSES.includes(task.status)) return null;
    if (task.worker_status !== 'done') return null;
    return {
      id: 'publisher_approve',
      step: 'approve',
      label: t('confirm_done_work'),
      style: 'success',
      confirm: t('atb_sub_tap_approve'),
    };
  }

  return null;
}

/**
 * Is this task this user's to track, in this role?
 *
 * Identity is compared against the record — never against a client-supplied
 * claim alone. A role that does not match the task is refused, not repaired.
 */
export function authorizeActivity(task, role, userId) {
  if (!task || typeof task.id !== 'string' || !task.id) return { ok: false, reason: 'no_task' };
  if (!userId) return { ok: false, reason: 'no_identity' };
  if (!TRACKABLE_STATUSES.includes(task.status)) return { ok: false, reason: 'terminal_status' };

  if (task.status === 'OPEN') {
    if (role !== 'publisher') return { ok: false, reason: 'role_not_publisher' };
    if (task.client_id !== userId) return { ok: false, reason: 'not_owner' };
    return { ok: true };
  }

  if (role === 'worker') {
    if (task.worker_id !== userId) return { ok: false, reason: 'not_assigned' };
    return { ok: true };
  }
  if (role === 'publisher') {
    if (task.client_id !== userId) return { ok: false, reason: 'not_owner' };
    return { ok: true };
  }
  return { ok: false, reason: 'unknown_role' };
}

/** Deep freeze, so a consumer can never mutate a snapshot it was handed. */
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

/**
 * Build the snapshot for one task and one role.
 *
 * @returns the frozen snapshot, or `null` when this task must not be tracked
 *          (terminal status, or a role that does not own it).
 */
export function buildTaskActivitySnapshot(input: any) {
  const {
    task,
    role,
    userId,
    flow,
    schedule,
    t,
    categoryLabel = '',
    now = Date.now(),
    revision = 1,
  } = input || {};

  if (typeof t !== 'function') throw new Error('buildTaskActivitySnapshot: `t` is required');
  if (!flow || !Array.isArray(flow.steps) || !flow.cta) {
    throw new Error('buildTaskActivitySnapshot: `flow` must be resolved by resolveStatusFlow()');
  }

  const auth = authorizeActivity(task, role, userId);
  if (!auth.ok) return null;

  const isWorker = role === 'worker';
  const isOpen = task.status === 'OPEN';
  const applicants = Array.isArray(task.applicants) ? task.applicants.length : 0;

  const stepIdx = flowIndex(flow, task.worker_status);
  const step = stepIdx >= 0 ? flow.steps[stepIdx] : null;
  const stepLabel = step ? (isWorker ? step.label : step.owner_label) : null;
  // Upcoming/Calendar is an ENGAGEMENT: the banner shows the agreed time and
  // offers no step CTA, so there is no next-action label to quote either.
  const isEngagement = !!schedule?.isEngagement;
  const occurrenceLabel = isEngagement ? (schedule?.occurrenceLabel || '') : '';
  // The banner offers a step CTA only while the task is exactly TAKEN
  // (ActiveTaskBanner: `isTaskActive = task.status === 'TAKEN'`). Reproduced
  // verbatim, so a legacy status shows the flow's own words and no button quote.
  const nextBtnLabel = isWorker && task.status === 'TAKEN' && !isEngagement
    ? nextCtaLabel(flow, task.worker_status)
    : null;

  let phase;
  let title;
  let subtitle;

  if (isOpen) {
    // ── OPEN, publisher ────────────────────────────────────────────────────
    // The reference is the real task card: ApplicantsGoldButton's own sentence
    // once anyone has applied, and TaskCard's scanning line while nobody has.
    phase = 'open';
    if (applicants > 0) {
      title = `${applicants} ${t('applications')} · ${t('click_to_view_approve')}`;
      subtitle = categoryLabel || '';
    } else {
      // FROZEN BY DESIGN: the card rotates six scanning lines every 25s. A Live
      // Activity cannot mirror a timer without a push every 25s, so the FIRST
      // existing line is used verbatim. No new wording was written for this.
      const scanning = t('scanning_texts');
      title = Array.isArray(scanning) ? (scanning[0] || '') : (scanning || '');
      subtitle = t('task_exposed') || '';
    }
  } else if (isEngagement) {
    // ── TAKEN, scheduled: say WHEN, never what to do ───────────────────────
    phase = 'scheduled';
    title = isWorker ? t('atb_planned_worker') : t('atb_planned_owner');
    subtitle = occurrenceLabel
      ? (isWorker
          ? t('atb_planned_worker_sub', { when: occurrenceLabel })
          : t('atb_planned_owner_sub', { when: occurrenceLabel }))
      : '';
  } else if (isWorker) {
    // ── TAKEN, worker ──────────────────────────────────────────────────────
    if (stepIdx < 0) {
      phase = 'awaiting_start';
      title = t('atb_set_out');
      subtitle = nextBtnLabel ? t('atb_sub_btn_start', { btn: nextBtnLabel }) : t('atb_sub_update_status');
    } else if (stepIdx === 0) {
      phase = 'on_the_way';
      title = t('atb_on_way');
      subtitle = nextBtnLabel ? t('atb_sub_btn_arrive', { btn: nextBtnLabel }) : t('atb_sub_keep_going');
    } else if (stepIdx === 1) {
      phase = 'arrived';
      title = stepLabel || t('atb_working');
      subtitle = nextBtnLabel ? t('atb_sub_btn_finish', { btn: nextBtnLabel }) : t('atb_sub_work_in_progress');
    } else {
      phase = 'done';
      title = stepLabel || t('atb_done_wait');
      subtitle = t('atb_sub_publisher_approves');
    }
  } else {
    // ── TAKEN, publisher ───────────────────────────────────────────────────
    if (stepIdx < 0) {
      phase = 'awaiting_start';
      title = t('atb_await_worker');
      subtitle = t('atb_sub_worker_updates');
    } else if (stepIdx === 0) {
      phase = 'on_the_way';
      title = stepLabel || t('atb_worker_coming');
      subtitle = t('atb_sub_youll_know');
    } else if (stepIdx === 1) {
      phase = 'arrived';
      title = stepLabel || t('atb_worker_here');
      subtitle = t('atb_sub_work_in_progress');
    } else {
      phase = 'done';
      title = stepLabel || t('atb_worker_done');
      subtitle = t('atb_sub_tap_approve');
    }
  }

  // ── Icon + colour: the same mapping getQuickAction() uses ────────────────
  const heroIconStep = flow.steps[clampIndex(stepIdx, flow.steps.length)];
  const iconKey = isEngagement
    ? 'calendar'
    : (stepIdx === 2 ? 'check' : (heroIconStep?.icon || 'navigation'));
  // The colour of the worker's next ACTION, exactly as getQuickAction() picks it:
  // setting out is the brand blue, arrival and completion are the success green.
  // Null when there is no action to offer (publisher, or an engagement).
  const quickKey = nextBtnLabel ? nextCtaKey(flow, task.worker_status) : null;
  const colorKey = quickKey === 'on_the_way' ? 'brand' : (quickKey ? 'success' : null);

  const snapshot = {
    contractVersion: LIVE_ACTIVITY_CONTRACT_VERSION,
    id: task.id,
    role,
    phase,
    title,
    subtitle,
    categoryLabel: categoryLabel || '',
    categoryKey: task.category || '',
    progress: {
      step: stepIdx,
      total: flow.steps.length,
      steps: flow.steps.map((s) => ({
        key: s.key,
        label: isWorker ? s.label : s.owner_label,
        icon: s.icon,
      })),
    },
    counters: {
      applicants,
      views: isOpen ? (Number(task.views_count) || 0) : null,
      clicks: isOpen ? (Number(task.clicks_count) || 0) : null,
    },
    iconKey,
    colorKey,
    // The interactive action (or null). `actionState` is 'idle' from the server:
    // only the App Intent moves it to pending / failed on the device.
    action: deriveActivityAction({ task, role, flow, isEngagement, t }),
    actionState: 'idle',
    deepLink: `${OPEN_DEEP_LINK}${task.id}`,
    endsAt: isOpen ? (task.expires_at || null) : null,
    revision: Math.max(1, Math.floor(Number(revision) || 1)),
    updatedAt: task.updated_date || null,
    generatedAt: new Date(now).toISOString(),
  };

  return deepFreeze(snapshot);
}

/**
 * Which ONE task a device tracks this session.
 *
 * Deliberately NOT used by the app: the existing selectors keep working exactly
 * as they do. This is the future native layer's policy, and it is deterministic
 * so two devices (or a rebuild) can never disagree:
 *
 *   1. TAKEN where I am the worker   (live execution beats everything)
 *   2. TAKEN where I am the client
 *   3. OPEN  where I am the client
 *
 * Inside a tier: newest first by created_date, then ascending id as the
 * tie-break, so equal timestamps still resolve to one stable winner.
 */
export function pickTrackedTask(tasks, userId, now = Date.now()) {
  if (!Array.isArray(tasks) || !userId) return null;
  const tiers = [
    { role: 'worker', match: (task) => ACTIVE_STATUSES.includes(task.status) && task.worker_id === userId },
    { role: 'publisher', match: (task) => ACTIVE_STATUSES.includes(task.status) && task.client_id === userId },
    { role: 'publisher', match: (task) => task.status === 'OPEN' && task.client_id === userId },
  ];

  for (let tier = 0; tier < tiers.length; tier += 1) {
    const { role, match } = tiers[tier];
    const candidates = tasks.filter((task) => task && match(task));
    if (!candidates.length) continue;
    const sorted = [...candidates].sort((a, b) => {
      const at = Date.parse(a.created_date || a.updated_date || 0) || 0;
      const bt = Date.parse(b.created_date || b.updated_date || 0) || 0;
      if (at !== bt) return bt - at;
      return String(a.id) < String(b.id) ? -1 : 1;
    });
    return { task: sorted[0], role, tier };
  }
  return null;
}

/**
 * Should `next` replace the activity currently showing `prev`?
 *
 * Ordering is by revision, never by arrival time: a push that arrives late but
 * carries an older revision must not overwrite a newer state. `updatedAt` is the
 * tie-break for the same revision, and an equal pair is a no-op, which is what
 * makes a duplicate delivery harmless.
 */
export function shouldApplySnapshot(prev, next) {
  if (!next) return false;
  if (!prev) return true;
  const pr = Number(prev.revision) || 0;
  const nr = Number(next.revision) || 0;
  if (nr !== pr) return nr > pr;
  const pu = Date.parse(prev.updatedAt || 0) || 0;
  const nu = Date.parse(next.updatedAt || 0) || 0;
  return nu > pu;
}