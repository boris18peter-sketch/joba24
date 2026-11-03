/**
 * liveActivityContract — the presentation contract, as the CLIENT can use it.
 *
 * ── WHY THIS COPY EXISTS ───────────────────────────────────────────────────
 * The authoritative contract is `base44/shared/taskActivitySnapshot.ts`, which
 * the backend builds every Live Activity snapshot with. A frontend bundle cannot
 * import from `base44/` (server-side code), and the reverse is equally closed, so
 * the local test screen — the only client-side caller — needs the same pure
 * functions under `src/`.
 *
 * This is a faithful port, not a redesign: same phases, same ladder, same
 * authorization, same field order, same frozen result. It adds nothing and
 * invents no wording — every string still comes from the caller's `t`.
 *
 * `test/liveActivity/testScreenParity.test.js` runs BOTH implementations over the
 * full stage × role matrix and fails on any difference, so the two cannot drift
 * silently. If the contract changes, that test names the field that diverged.
 */

export const LIVE_ACTIVITY_CONTRACT_VERSION = 2;

export const LIVE_ACTIVITY_PHASES = [
  'open',
  'scheduled',
  'awaiting_start',
  'on_the_way',
  'arrived',
  'done',
];

const LEGACY_ACTIVE_STATUSES = ['APPROVED_PENDING_DEPARTURE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'];
const ACTIVE_STATUSES = ['TAKEN', ...LEGACY_ACTIVE_STATUSES];
const TRACKABLE_STATUSES = ['OPEN', ...ACTIVE_STATUSES];
const CANONICAL_STEPS = ['on_the_way', 'arrived', 'done'];
const OPEN_DEEP_LINK = 'https://joba24.com/?open_task=';

const clampIndex = (i, len) => Math.min(Math.max(i, 0), Math.max(len - 1, 0));

function flowIndex(flow, workerStatus) {
  const steps = Array.isArray(flow?.steps) ? flow.steps : [];
  return steps.findIndex((s) => s && s.key === workerStatus);
}

function nextCtaKey(flow, workerStatus) {
  const idx = flowIndex(flow, workerStatus);
  return idx < 0 ? CANONICAL_STEPS[0] : (CANONICAL_STEPS[idx + 1] || null);
}

function nextCtaLabel(flow, workerStatus) {
  const nextKey = nextCtaKey(flow, workerStatus);
  if (!nextKey) return null;
  const cta = flow?.cta?.[nextKey];
  const label = typeof cta?.label === 'string' && cta.label.trim() ? cta.label.trim() : null;
  return label;
}

/**
 * The ONE action this role may take right now — same rule as the server's
 * `deriveActivityAction`, so the test screen can never offer a button the
 * backend would refuse.
 */
export function deriveActivityAction(input) {
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

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

/**
 * Build the snapshot for one task and one role.
 * Returns the frozen snapshot, or null when this task must not be tracked.
 */
export function buildTaskActivitySnapshot(input) {
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
  const isEngagement = !!schedule?.isEngagement;
  const occurrenceLabel = isEngagement ? (schedule?.occurrenceLabel || '') : '';
  const nextBtnLabel = isWorker && task.status === 'TAKEN' && !isEngagement
    ? nextCtaLabel(flow, task.worker_status)
    : null;

  let phase;
  let title;
  let subtitle;

  if (isOpen) {
    phase = 'open';
    if (applicants > 0) {
      title = `${applicants} ${t('applications')} · ${t('click_to_view_approve')}`;
      subtitle = categoryLabel || '';
    } else {
      const scanning = t('scanning_texts');
      title = Array.isArray(scanning) ? (scanning[0] || '') : (scanning || '');
      subtitle = t('task_exposed') || '';
    }
  } else if (isEngagement) {
    phase = 'scheduled';
    title = isWorker ? t('atb_planned_worker') : t('atb_planned_owner');
    subtitle = occurrenceLabel
      ? (isWorker
          ? t('atb_planned_worker_sub', { when: occurrenceLabel })
          : t('atb_planned_owner_sub', { when: occurrenceLabel }))
      : '';
  } else if (isWorker) {
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

  const heroIconStep = flow.steps[clampIndex(stepIdx, flow.steps.length)];
  const iconKey = isEngagement
    ? 'calendar'
    : (stepIdx === 2 ? 'check' : (heroIconStep?.icon || 'navigation'));
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