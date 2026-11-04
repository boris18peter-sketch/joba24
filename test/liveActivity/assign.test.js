import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { guardPublisherAssign, ACTION_IDS, actionsForRole } from '../../base44/shared/liveActivityActionGuard.ts';
import { deriveActivityAction as serverAction } from '../../base44/shared/taskActivitySnapshot.ts';
import { deriveActivityAction as clientAction } from '@/lib/liveActivityContract';

/**
 * Assigning an applicant from the Lock Screen.
 *
 * The card cannot show a list, so the rule this file pins is the honest one:
 * offer the action ONLY when exactly one applicant exists, and refuse at the
 * server the moment that stops being true. Nothing is ever guessed.
 */

const t = (key) => key;
const FLOW = { steps: [], cta: {} };

function task(overrides = {}) {
  return {
    id: 'task_1',
    status: 'OPEN',
    client_id: 'user_publisher',
    applicants: [],
    ...overrides,
  };
}

describe('the action the contract offers a publisher on an open task', () => {
  it('offers the assignment when exactly one worker applied, naming them', () => {
    const action = serverAction({
      task: task({ applicants: [{ worker_id: 'w1', worker_name: 'דני' }] }),
      role: 'publisher',
      flow: FLOW,
      isEngagement: false,
      t,
    });
    expect(action).toMatchObject({ id: 'publisher_assign', step: 'assign' });
    expect(action.label).toContain('דני');
    // It is a confirmation action: the contract says so, which is what makes the
    // intent ask twice without ever naming an action id.
    expect(action.confirm).toBeTruthy();
  });

  it('offers nothing when nobody applied, or when the choice is not unambiguous', () => {
    expect(serverAction({ task: task(), role: 'publisher', flow: FLOW, isEngagement: false, t })).toBeNull();
    expect(serverAction({
      task: task({ applicants: [{ worker_id: 'w1', worker_name: 'דני' }, { worker_id: 'w2', worker_name: 'רות' }] }),
      role: 'publisher', flow: FLOW, isEngagement: false, t,
    })).toBeNull();
  });

  it('never offers it to the worker', () => {
    expect(serverAction({
      task: task({ applicants: [{ worker_id: 'w1', worker_name: 'דני' }] }),
      role: 'worker', flow: FLOW, isEngagement: false, t,
    })).toBeNull();
  });

  it('says exactly the same thing in the app', () => {
    for (const applicants of [[], [{ worker_id: 'w1', worker_name: 'דני' }], [{ worker_id: 'w1', worker_name: 'דני' }, { worker_id: 'w2', worker_name: 'רות' }]]) {
      const input = { task: task({ applicants }), role: 'publisher', flow: FLOW, isEngagement: false, t };
      expect(clientAction(input)).toEqual(serverAction(input));
    }
  });
});

describe('the assignment guard', () => {
  const apps = (...rows) => rows;

  it('approves the single pending applicant', () => {
    expect(guardPublisherAssign({
      task: task(),
      userId: 'user_publisher',
      applications: apps({ id: 'app_1', worker_id: 'w1', status: 'pending' }),
    })).toEqual({ ok: true, applicationId: 'app_1', workerId: 'w1' });
  });

  it('refuses the moment a second applicant exists', () => {
    expect(guardPublisherAssign({
      task: task(),
      userId: 'user_publisher',
      applications: apps(
        { id: 'app_1', worker_id: 'w1', status: 'pending' },
        { id: 'app_2', worker_id: 'w2', status: 'pending' },
      ),
    })).toMatchObject({ ok: false, reason: 'selection_ambiguous', status: 409 });
  });

  it('ignores applications that are no longer pending', () => {
    expect(guardPublisherAssign({
      task: task(),
      userId: 'user_publisher',
      applications: apps(
        { id: 'app_1', worker_id: 'w1', status: 'pending' },
        { id: 'app_2', worker_id: 'w2', status: 'rejected' },
      ),
    })).toMatchObject({ ok: true, workerId: 'w1' });
  });

  it('refuses when nobody is pending, and when the task is no longer open', () => {
    expect(guardPublisherAssign({ task: task(), userId: 'user_publisher', applications: [] }))
      .toMatchObject({ ok: false, reason: 'no_applicants' });
    expect(guardPublisherAssign({
      task: task({ status: 'TAKEN', worker_id: 'w1' }),
      userId: 'user_publisher',
      applications: apps({ id: 'app_1', worker_id: 'w1', status: 'pending' }),
    })).toMatchObject({ ok: false, reason: 'already_assigned' });
  });

  it('refuses anyone who is not the task owner', () => {
    expect(guardPublisherAssign({
      task: task(),
      userId: 'user_worker',
      applications: apps({ id: 'app_1', worker_id: 'w1', status: 'pending' }),
    })).toMatchObject({ ok: false, reason: 'not_owner', status: 403 });
  });

  it('is a capability the publisher holds and the worker never does', () => {
    expect(ACTION_IDS).toContain('publisher_assign');
    expect(actionsForRole('publisher')).toContain('publisher_assign');
    expect(actionsForRole('worker')).not.toContain('publisher_assign');
  });
});

describe('the intent confirms by the contract, not by an action id', () => {
  const intent = readFileSync('ios/App/JobaActivityWidget/JobaTaskActionIntent.swift', 'utf8');

  it('gates on the server-sent confirmation sentence', () => {
    expect(intent).toContain('let requiresConfirm = !(action.confirm ?? "").isEmpty');
    expect(intent).not.toContain('let isApproval = action.id == "publisher_approve"');
  });

  it('records a failed capability separately from a failed action', () => {
    expect(intent).toContain('capability_expired');
  });
});