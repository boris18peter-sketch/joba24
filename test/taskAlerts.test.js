import { describe, it, expect } from 'vitest';
import { alertTaskId, isAlertResolved, ACTION_ALERT_KINDS } from '../src/lib/taskAlertValidity.js';
import { reconcileActiveTask } from '../src/lib/activeTaskCache.js';

/**
 * Convergence, at the two places that decide what the user sees:
 *
 *  • an alert that is still on screen after the record moved on (the publisher
 *    approved on the Lock Screen while the app had no socket);
 *  • the derived "active task" cache that feeds the banner and the card bridge.
 */
const ME = 'me';

describe('alert validity — an alert that outlived its reason', () => {
  it('finds the task id in both alert shapes', () => {
    expect(alertTaskId({ kind: 'completion_ready', task: { id: 't1' } })).toBe('t1');
    expect(alertTaskId({ kind: 'new_applicant', task: { task: { id: 't2' }, application: {} } })).toBe('t2');
    expect(alertTaskId(null)).toBe('');
  });

  it('treats historical alerts as news that must always be shown', () => {
    for (const kind of ['cancelled', 'revoked', 'cancel_success']) {
      expect(isAlertResolved(kind, { id: 't', status: 'CANCELLED' }, ME)).toBe(false);
    }
    expect(ACTION_ALERT_KINDS).not.toContain('cancelled');
  });

  it('closes the completion confirmation once the job is terminal anywhere', () => {
    const awaiting = { id: 't', client_id: ME, status: 'TAKEN', worker_status: 'done' };
    expect(isAlertResolved('completion_ready', awaiting, ME)).toBe(false);
    // Approved on the Lock Screen.
    expect(isAlertResolved('completion_ready', { ...awaiting, status: 'COMPLETED' }, ME)).toBe(true);
    expect(isAlertResolved('completion_ready', { ...awaiting, status: 'CANCELLED' }, ME)).toBe(true);
  });

  it('keeps the completion confirmation while the record still asks for it', () => {
    expect(isAlertResolved('completion_ready', { client_id: ME, status: 'TAKEN', worker_status: 'done' }, ME))
      .toBe(false);
  });

  it('closes the applicant prompt once the task is no longer open', () => {
    expect(isAlertResolved('new_applicant', { client_id: ME, status: 'OPEN' }, ME)).toBe(false);
    expect(isAlertResolved('new_applicant', { client_id: ME, status: 'TAKEN' }, ME)).toBe(true);
  });

  it('closes the departure sheet once the worker has set off', () => {
    const approved = { worker_id: ME, status: 'TAKEN' };
    expect(isAlertResolved('approved', approved, ME)).toBe(false);
    expect(isAlertResolved('approved', { ...approved, worker_status: 'on_the_way' }, ME)).toBe(true);
    expect(isAlertResolved('approved', { ...approved, on_the_way_at: '2026-11-04T10:00:00Z' }, ME)).toBe(true);
  });
});

describe('active task cache — derived from the server, not seeded once', () => {
  const task = (over = {}) => ({
    id: 't1', status: 'TAKEN', updated_date: '2026-11-04T10:00:00.000Z', ...over,
  });

  it('removes the banner when the server has no TAKEN task any more', () => {
    expect(reconcileActiveTask(task(), null)).toBe(null);
  });

  it('takes a different active task', () => {
    const next = task({ id: 't2' });
    expect(reconcileActiveTask(task(), next)).toBe(next);
  });

  it('never lets an older list read beat a newer patch', () => {
    const cached = task({ updated_date: '2026-11-04T10:00:05.000Z', worker_status: 'arrived' });
    const older = task({ updated_date: '2026-11-04T10:00:00.000Z', worker_status: 'on_the_way' });
    expect(reconcileActiveTask(cached, older)).toBe(cached);
  });

  it('accepts the list when it is newer or equal', () => {
    const cached = task({ updated_date: '2026-11-04T10:00:00.000Z' });
    const newer = task({ updated_date: '2026-11-04T10:00:09.000Z', worker_status: 'arrived' });
    expect(reconcileActiveTask(cached, newer)).toBe(newer);
  });

  it('fills an empty cache from the list', () => {
    const next = task();
    expect(reconcileActiveTask(undefined, next)).toBe(next);
  });
});