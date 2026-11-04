import { describe, it, expect } from 'vitest';
import {
  buildRealSnapshot,
  contentKeyOf,
  isLiveForRole,
  planActivityStep,
  selectOpenPublisherTask,
  selectTrackedTask,
} from '@/lib/realTaskActivity';
import { actionsForRole, guardPublisherAssign } from '../../base44/shared/liveActivityActionGuard.ts';
import { t } from './labels.js';
import { CATEGORY_ROWS, CLIENT, WORKER, NOW, makeTask, openTask } from './fixtures.js';

/**
 * THE APPLICANT STAGE, END TO END ON THE DEVICE'S OWN CODE.
 *
 * ── WHAT THIS PINS ──────────────────────────────────────────────────────────
 * A publisher's card must exist while the task is still OPEN, count applicants
 * as they arrive, offer the single applicant for approval, hand the SAME card on
 * to TAKEN when the assignment lands, and close only when the work really ends.
 *
 * Every assertion goes through the app's real decision layer
 * (`realTaskActivity`) over the real presentation contract, so a change that
 * brings back "no card until somebody is assigned" fails here rather than in a
 * TestFlight build.
 */

const SETTINGS = {};

/** The snapshot the device would start or update the card with. */
function snap(task, role, revision = 1) {
  return buildRealSnapshot({
    task,
    role,
    userId: role === 'worker' ? WORKER : CLIENT,
    t,
    catRows: CATEGORY_ROWS,
    settings: SETTINGS,
    revision,
    now: NOW,
  });
}

/** A card iOS is showing for one pair. */
function card(taskId, role, activityState = 'active') {
  return { taskId, role, activityState };
}

describe('the applicant stage is a card', () => {
  it('starts a card for a publisher task that is still OPEN', () => {
    const task = openTask(0);
    const tracked = selectTrackedTask({ openTask: task, userId: CLIENT });

    expect(tracked).not.toBeNull();
    expect(tracked.role).toBe('publisher');
    expect(tracked.task.id).toBe(task.id);

    const plan = planActivityStep({ task: tracked.task, role: tracked.role, activities: [] });
    expect(plan.action).toBe('start');
  });

  it('never hands a worker a publisher-only card', () => {
    const task = openTask(0);
    // The worker is not the owner, so the OPEN task is not his to track…
    expect(selectTrackedTask({ openTask: task, userId: WORKER })).toBeNull();
    // …and the role a tracked OPEN task resolves to is always the publisher's.
    expect(selectOpenPublisherTask([task], WORKER)).toBeNull();
    expect(selectOpenPublisherTask([task], CLIENT).id).toBe(task.id);
    // Worker tracking keeps working, and outranks an OPEN task of his own.
    const taken = makeTask({ worker_id: WORKER, client_id: CLIENT, status: 'TAKEN' });
    const picked = selectTrackedTask({ workerTask: taken, openTask: task, userId: WORKER });
    expect(picked.role).toBe('worker');
  });

  it('shows the scanning line while nobody has applied, and no action', () => {
    const task = openTask(0);
    const state = snap(task, 'publisher');

    expect(state.phase).toBe('open');
    expect(state.counters.applicants).toBe(0);
    expect(state.action).toBeNull();
    expect(state.progress.step).toBe(-1);
  });
});

describe('applicants arriving', () => {
  it('updates the SAME card with the new count — a send is planned, not a start', () => {
    const task = openTask(0);
    const before = snap(task, 'publisher');

    const withOne = openTask(1, { id: task.id });
    const after = snap(withOne, 'publisher');

    // The visible picture changed, which is what makes the device (and the
    // server) emit an update instead of suppressing a duplicate.
    expect(contentKeyOf(after)).not.toBe(contentKeyOf(before));
    expect(after.counters.applicants).toBe(1);
    expect(after.title).toContain('1');

    const plan = planActivityStep({
      task: withOne,
      role: 'publisher',
      activities: [card(task.id, 'publisher')],
      contentKey: contentKeyOf(after),
      applied: { taskId: task.id, role: 'publisher', contentKey: contentKeyOf(before) },
    });
    expect(plan.action).toBe('update');
  });

  it('offers the one applicant by name, with a confirmation sentence', () => {
    const task = openTask(1);
    const state = snap(task, 'publisher');

    expect(state.action).not.toBeNull();
    expect(state.action.id).toBe('publisher_assign');
    expect(state.action.label).toContain(task.applicants[0].worker_name);
    expect(state.action.confirm).toBeTruthy();
    // Two taps are decided by the presence of that sentence, not by an id list.
    expect(String(state.action.confirm).length).toBeGreaterThan(0);
  });

  it('offers nothing with two applicants, and the count still updates', () => {
    const one = snap(openTask(1), 'publisher');
    const two = snap(openTask(2), 'publisher');

    expect(two.action).toBeNull();
    expect(two.counters.applicants).toBe(2);
    expect(contentKeyOf(two)).not.toBe(contentKeyOf(one));
    // The card still leads somewhere: its own deep link opens the task, where
    // the applicants are listed.
    expect(two.deepLink).toContain('/?open_task=');
  });
});

describe('assignment from the Lock Screen is authorized against the record', () => {
  it('accepts exactly one pending application', () => {
    const task = openTask(1);
    const app = { id: 'app_1', worker_id: 'worker_0', status: 'pending' };
    const guard = guardPublisherAssign({ task, userId: CLIENT, applications: [app] });

    expect(guard.ok).toBe(true);
    expect(guard.applicationId).toBe('app_1');
    expect(guard.workerId).toBe('worker_0');
  });

  it('refuses a second applicant, a non-owner and a task that is no longer open', () => {
    const task = openTask(2);
    const two = [
      { id: 'a1', worker_id: 'w1', status: 'pending' },
      { id: 'a2', worker_id: 'w2', status: 'pending' },
    ];
    expect(guardPublisherAssign({ task, userId: CLIENT, applications: two }).reason)
      .toBe('selection_ambiguous');
    expect(guardPublisherAssign({ task, userId: WORKER, applications: two.slice(0, 1) }).reason)
      .toBe('not_owner');
    expect(guardPublisherAssign({
      task: openTask(1, { status: 'TAKEN', worker_id: WORKER }),
      userId: CLIENT,
      applications: two.slice(0, 1),
    }).reason).toBe('already_assigned');
  });

  it('never lets a worker capability carry the publisher action', () => {
    expect(actionsForRole('worker')).not.toContain('publisher_assign');
    expect(actionsForRole('publisher')).toContain('publisher_assign');
  });
});

describe('OPEN → TAKEN keeps ONE card', () => {
  it('updates the same activity instead of ending and recreating it', () => {
    const open = openTask(1);
    const assigned = makeTask({
      id: open.id,
      status: 'TAKEN',
      client_id: CLIENT,
      worker_id: WORKER,
      worker_name: open.applicants[0].worker_name,
      worker_status: null,
    });

    // The tracking identity — task id AND role — is unchanged across the switch,
    // which is the whole reason the card can move instead of being replaced.
    const before = selectTrackedTask({ openTask: open, userId: CLIENT });
    const after = selectTrackedTask({
      clientTask: assigned,
      userId: CLIENT,
    });
    expect(before.task.id).toBe(after.task.id);
    expect(before.role).toBe(after.role);

    const plan = planActivityStep({
      task: assigned,
      role: 'publisher',
      activities: [card(open.id, 'publisher')],
      contentKey: contentKeyOf(snap(assigned, 'publisher')),
      applied: { taskId: open.id, role: 'publisher', contentKey: contentKeyOf(snap(open, 'publisher')) },
    });
    expect(plan.action).toBe('update');
    expect(snap(assigned, 'publisher').phase).toBe('awaiting_start');
  });

  it('does not close the card while the caches are momentarily empty', () => {
    const assigned = makeTask({ id: 'task_gap', status: 'TAKEN', client_id: CLIENT, worker_id: WORKER });
    // No tracked task at all — the state right after a realtime event refills them.
    const gap = planActivityStep({
      task: null,
      role: null,
      activities: [card('task_gap', 'publisher')],
    });
    expect(gap.action).toBe('end');

    // …but with the card's own task re-read and still live, it is left alone.
    const verified = planActivityStep({
      task: null,
      role: null,
      activities: [card('task_gap', 'publisher')],
      verifiedLive: [{ taskId: 'task_gap', role: 'publisher' }],
    });
    expect(verified.action).toBe('none');
    expect(isLiveForRole(assigned, 'publisher', CLIENT)).toBe(true);
  });
});

describe('worker progress and the end of the job', () => {
  it('walks the worker flow, then closes the publisher card', () => {
    const task = makeTask({ status: 'TAKEN', client_id: CLIENT, worker_id: WORKER });

    const setOut = snap({ ...task, worker_status: null }, 'worker');
    expect(setOut.action.id).toBe('worker_step');
    const onTheWay = snap({ ...task, worker_status: 'on_the_way' }, 'worker');
    expect(onTheWay.phase).toBe('on_the_way');
    const done = snap({ ...task, worker_status: 'done' }, 'worker');
    expect(done.phase).toBe('done');

    // The publisher's side of the same job: no action until the worker is done.
    expect(snap({ ...task, worker_status: 'arrived' }, 'publisher').action).toBeNull();
    const readyToApprove = snap({ ...task, worker_status: 'done' }, 'publisher');
    expect(readyToApprove.action.id).toBe('publisher_approve');

    // COMPLETED is not live work: the card is closed, by both roles.
    const finished = makeTask({
      id: task.id,
      status: 'COMPLETED',
      client_id: CLIENT,
      worker_id: WORKER,
      worker_status: 'done',
    });
    expect(isLiveForRole(finished, 'publisher', CLIENT)).toBe(false);
    expect(planActivityStep({
      task: finished,
      role: 'publisher',
      activities: [card(task.id, 'publisher')],
    }).action).toBe('end');
  });

  it('closes the card of an OPEN task that was cancelled', () => {
    const cancelled = openTask(2, { status: 'CANCELLED', worker_id: null });
    expect(isLiveForRole(cancelled, 'publisher', CLIENT)).toBe(false);

    const plan = planActivityStep({
      task: null,
      role: null,
      activities: [card(cancelled.id, 'publisher')],
    });
    expect(plan.action).toBe('end');
    expect(plan.reason).toBe('not_the_tracked_task');
  });
});