import { describe, it, expect } from 'vitest';
import { eligibleTokens, planTokenRegistration } from '../../base44/shared/liveActivityAuth.ts';

/**
 * A card is (task, role).
 *
 * An ActivityKit token is issued per CARD, and one phone can show the publisher's
 * card and the worker's card at the same time — including for two different
 * tasks. Before this, the server could only address "some active token of this
 * user", so task A's snapshot was delivered to task B's card, and rotating a
 * card's token retired the other card's token on the same install.
 */
const USER = 'user_1';
const OTHER = 'user_2';
const TASK_A = 'task_a';
const TASK_B = 'task_b';

const row = (over = {}) => ({
  id: `t_${Math.random().toString(36).slice(2, 7)}`,
  user_id: USER,
  token: 'a'.repeat(64),
  kind: 'activity',
  environment: 'production',
  status: 'active',
  ...over,
});

const ids = (rows) => rows.map((r) => r.id);

describe('token binding — a card is (task, role)', () => {
  it('stores the binding it authorized', () => {
    const plan = planTokenRegistration({
      user: { id: USER, role: 'user' },
      body: { token: 'b'.repeat(64), environment: 'production', task_id: TASK_A, role: 'publisher' },
      existingTokens: [],
      task: { id: TASK_A, status: 'OPEN', client_id: USER, worker_id: '' },
      now: Date.parse('2026-11-04T10:00:00Z'),
    });

    expect(plan.ok).toBe(true);
    expect(plan.record.task_id).toBe(TASK_A);
    expect(plan.record.role).toBe('publisher');
  });

  it('leaves an unbound registration unbound', () => {
    const plan = planTokenRegistration({
      user: { id: USER, role: 'user' },
      body: { token: 'c'.repeat(64), environment: 'production' },
      existingTokens: [],
    });

    expect(plan.ok).toBe(true);
    // Omitted rather than written empty: the field is an enum.
    expect(plan.record.task_id).toBeUndefined();
    expect(plan.record.role).toBeUndefined();
  });

  it('rotating one card never retires another card of the same install', () => {
    const workerCard = row({ id: 'worker_card', device_id: 'dev_1', task_id: TASK_B, role: 'worker' });

    const plan = planTokenRegistration({
      user: { id: USER, role: 'user' },
      body: {
        token: 'd'.repeat(64), environment: 'production',
        device_id: 'dev_1', task_id: TASK_A, role: 'publisher',
      },
      existingTokens: [workerCard],
      task: { id: TASK_A, status: 'OPEN', client_id: USER, worker_id: '' },
    });

    expect(plan.ok).toBe(true);
    expect(plan.retireTokenIds).toEqual([]);
  });

  it('rotating a card retires the previous token of THAT card', () => {
    const previous = row({ id: 'previous_card_token', device_id: 'dev_1', task_id: TASK_A, role: 'publisher' });
    const otherCard = row({ id: 'other_card_token', device_id: 'dev_1', task_id: TASK_B, role: 'worker' });

    const plan = planTokenRegistration({
      user: { id: USER, role: 'user' },
      body: {
        token: 'e'.repeat(64), environment: 'production',
        device_id: 'dev_1', task_id: TASK_A, role: 'publisher',
      },
      existingTokens: [previous, otherCard],
      task: { id: TASK_A, status: 'OPEN', client_id: USER, worker_id: '' },
    });

    expect(plan.retireTokenIds).toEqual(['previous_card_token']);
  });

  it('dispatch addresses only the tokens bound to this card', () => {
    const tokens = [
      row({ id: 'card_a_publisher', task_id: TASK_A, role: 'publisher' }),
      row({ id: 'card_b_worker', task_id: TASK_B, role: 'worker' }),
      row({ id: 'card_a_worker', task_id: TASK_A, role: 'worker' }),
    ];

    expect(ids(eligibleTokens(tokens, { userId: USER, taskId: TASK_A, role: 'publisher' })))
      .toEqual(['card_a_publisher']);
    expect(ids(eligibleTokens(tokens, { userId: USER, taskId: TASK_B, role: 'worker' })))
      .toEqual(['card_b_worker']);
  });

  it('a bound card is never shadowed by a legacy unbound row', () => {
    const tokens = [
      row({ id: 'legacy_unbound', task_id: '', role: '' }),
      row({ id: 'card_a', task_id: TASK_A, role: 'publisher' }),
    ];

    expect(ids(eligibleTokens(tokens, { userId: USER, taskId: TASK_A, role: 'publisher' })))
      .toEqual(['card_a']);
  });

  it('an install that has not re-registered keeps working through its unbound row', () => {
    const tokens = [
      row({ id: 'legacy_unbound', task_id: '', role: '' }),
      row({ id: 'someone_elses_card', task_id: TASK_B, role: 'worker' }),
    ];

    expect(ids(eligibleTokens(tokens, { userId: USER, taskId: TASK_A, role: 'publisher' })))
      .toEqual(['legacy_unbound']);
  });

  it('never selects another user’s token, bound or not', () => {
    const tokens = [
      row({ id: 'mine', task_id: TASK_A, role: 'publisher' }),
      row({ id: 'theirs', user_id: OTHER, task_id: TASK_A, role: 'publisher' }),
    ];

    expect(ids(eligibleTokens(tokens, { userId: USER, taskId: TASK_A, role: 'publisher' })))
      .toEqual(['mine']);
  });

  it('a start token is not scoped to a card', () => {
    const tokens = [
      row({ id: 'install_start', kind: 'start', task_id: '', role: '' }),
      row({ id: 'card_a', task_id: TASK_A, role: 'publisher' }),
    ];

    expect(ids(eligibleTokens(tokens, { userId: USER, kind: 'start' }))).toEqual(['install_start']);
  });

  it('keeps the unscoped behaviour when no card is given', () => {
    const tokens = [
      row({ id: 'one', task_id: TASK_A, role: 'publisher' }),
      row({ id: 'two', task_id: TASK_B, role: 'worker' }),
    ];

    expect(ids(eligibleTokens(tokens, { userId: USER }))).toEqual(['one', 'two']);
  });
});