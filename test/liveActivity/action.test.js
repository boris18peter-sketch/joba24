import { describe, it, expect } from 'vitest';
import {
  signActionToken,
  verifyActionToken,
  ttlForTask,
  ACTION_TOKEN_VERSION,
  ACTION_TOKEN_MAX_TTL_SECONDS,
  ACTION_TOKEN_DEFAULT_TTL_SECONDS,
} from '../../base44/shared/liveActivityActionToken.ts';
import {
  ACTION_IDS,
  actionsForRole,
  guardWorkerStep,
  guardPublisherApproval,
  workerStepPatch,
} from '../../base44/shared/liveActivityActionGuard.ts';
import { deriveActivityAction as serverAction } from '../../base44/shared/taskActivitySnapshot.ts';
import { deriveActivityAction as clientAction } from '@/lib/liveActivityContract';
import { t } from './labels.js';

/**
 * The interactive Lock Screen action.
 *
 * These tests treat the capability token, the transition guard and the action
 * derivation as the security surface they are: a Lock Screen button acts on real
 * money and real work, so "it looked like it worked" is not good enough. Each
 * refusal is asserted by name, so a future change cannot quietly turn a rejected
 * tap into a write.
 */

const SECRET = 'test-secret-do-not-use-in-production';
const TASK = 'task_abc';

const CLAIMS = { userId: 'user_worker', taskId: TASK, role: 'worker', actions: ['worker_step'] };

function task(overrides = {}) {
  return {
    id: TASK,
    status: 'TAKEN',
    worker_id: 'user_worker',
    client_id: 'user_publisher',
    worker_status: null,
    ...overrides,
  };
}

/** A category flow shaped exactly like the resolved one, for the action tests. */
const FLOW = {
  steps: [
    { key: 'on_the_way', label: 'יצאתי לדרך', owner_label: 'בדרך' },
    { key: 'arrived', label: 'הגעתי', owner_label: 'הגיע' },
    { key: 'done', label: 'סיימתי', owner_label: 'סיים' },
  ],
  cta: {
    on_the_way: { label: 'אני בדרך' },
    arrived: { label: 'הגעתי' },
    done: { label: 'סיימתי' },
  },
};

describe('action capability token', () => {
  it('round-trips, carrying only the binding it was minted for', async () => {
    const signed = await signActionToken({ secret: SECRET, ...CLAIMS });
    expect(signed.ok).toBe(true);
    expect(signed.token.startsWith(`v${ACTION_TOKEN_VERSION}.`)).toBe(true);

    const verified = await verifyActionToken({ secret: SECRET, token: signed.token });
    expect(verified.ok).toBe(true);
    expect(verified.claims.sub).toBe(CLAIMS.userId);
    expect(verified.claims.tid).toBe(TASK);
    expect(verified.claims.role).toBe('worker');
    expect(verified.claims.actions).toEqual(['worker_step']);
  });

  it('refuses a payload that was edited after signing', async () => {
    const signed = await signActionToken({ secret: SECRET, ...CLAIMS });
    const [prefix, , signature] = signed.token.split('.');
    const forged = Buffer.from(JSON.stringify({
      v: ACTION_TOKEN_VERSION,
      sub: CLAIMS.userId,
      tid: 'someone_elses_task',
      role: 'publisher',
      actions: ['publisher_approve'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    })).toString('base64url');

    const verified = await verifyActionToken({ secret: SECRET, token: `${prefix}.${forged}.${signature}` });
    expect(verified).toMatchObject({ ok: false, reason: 'bad_signature' });
  });

  it('refuses a token signed with another secret', async () => {
    const signed = await signActionToken({ secret: 'a-different-secret', ...CLAIMS });
    const verified = await verifyActionToken({ secret: SECRET, token: signed.token });
    expect(verified).toMatchObject({ ok: false, reason: 'bad_signature' });
  });

  it('expires on its own, and can never be extended from the device', async () => {
    const now = Date.parse('2026-11-03T12:00:00.000Z');
    // Asking for a year is capped at the weekly ceiling.
    const signed = await signActionToken({ secret: SECRET, ...CLAIMS, ttlSeconds: 365 * 24 * 3600, now });
    expect(signed.claims.exp - signed.claims.iat).toBe(ACTION_TOKEN_MAX_TTL_SECONDS);

    const later = now + (ACTION_TOKEN_MAX_TTL_SECONDS + 60) * 1000;
    const verified = await verifyActionToken({ secret: SECRET, token: signed.token, now: later });
    expect(verified).toMatchObject({ ok: false, reason: 'expired' });
  });

  it('gives a plain request one day, not the ceiling', async () => {
    const signed = await signActionToken({ secret: SECRET, ...CLAIMS });
    expect(signed.claims.exp - signed.claims.iat).toBe(ACTION_TOKEN_DEFAULT_TTL_SECONDS);
  });

  it('sizes a capability to the task, so a long task keeps its buttons', () => {
    const now = Date.parse('2026-11-03T12:00:00.000Z');
    const at = (hours) => new Date(now + hours * 3600 * 1000).toISOString();

    // No horizon at all: the plain day.
    expect(ttlForTask({}, now)).toBe(ACTION_TOKEN_DEFAULT_TTL_SECONDS);
    expect(ttlForTask(null, now)).toBe(ACTION_TOKEN_DEFAULT_TTL_SECONDS);
    // A task that ends sooner than a day still gets the full day (the floor).
    expect(ttlForTask({ expires_at: at(3) }, now)).toBe(ACTION_TOKEN_DEFAULT_TTL_SECONDS);
    // A task running for three days is covered, plus the margin.
    expect(ttlForTask({ expires_at: at(72) }, now)).toBe(72 * 3600 + 12 * 3600);
    // Whatever the horizon, the weekly ceiling holds.
    expect(ttlForTask({ scheduled_time: at(24 * 30) }, now)).toBe(ACTION_TOKEN_MAX_TTL_SECONDS);
    // A horizon already in the past is not a horizon.
    expect(ttlForTask({ expires_at: at(-5) }, now)).toBe(ACTION_TOKEN_DEFAULT_TTL_SECONDS);
  });

  it('reports a missing secret instead of failing open', async () => {
    const signed = await signActionToken({ secret: SECRET, ...CLAIMS });
    expect(await signActionToken({ secret: '', ...CLAIMS })).toMatchObject({ ok: false, reason: 'no_secret' });
    expect(await verifyActionToken({ secret: '', token: signed.token })).toMatchObject({ ok: false, reason: 'no_secret' });
  });

  it('rejects malformed input without throwing', async () => {
    for (const token of ['', 'nonsense', 'v1.only-two-parts', 'v9.a.b']) {
      const result = await verifyActionToken({ secret: SECRET, token });
      expect(result.ok).toBe(false);
    }
  });
});

describe('what a role may ever do', () => {
  it('gives each role exactly one capability', () => {
    expect(actionsForRole('worker')).toEqual(['worker_step']);
    expect(actionsForRole('publisher')).toEqual(['publisher_approve']);
    expect(actionsForRole('admin')).toEqual([]);
  });

  it('keeps the action ids stable', () => {
    expect(ACTION_IDS).toEqual(['worker_step', 'publisher_approve']);
  });
});

describe('worker progress guard', () => {
  it('allows the forward step the card offers', () => {
    expect(guardWorkerStep({ task: task(), userId: 'user_worker', step: 'on_the_way' })).toEqual({ ok: true });
    expect(guardWorkerStep({ task: task({ worker_status: 'on_the_way' }), userId: 'user_worker', step: 'arrived' }))
      .toEqual({ ok: true });
    expect(guardWorkerStep({ task: task({ worker_status: 'arrived' }), userId: 'user_worker', step: 'done' }))
      .toEqual({ ok: true });
  });

  it('treats a repeated tap as a duplicate, never a second write', () => {
    const result = guardWorkerStep({ task: task({ worker_status: 'arrived' }), userId: 'user_worker', step: 'arrived' });
    expect(result).toMatchObject({ ok: false, reason: 'duplicate', status: 200 });
  });

  it('refuses backwards and skipping transitions', () => {
    expect(guardWorkerStep({ task: task({ worker_status: 'arrived' }), userId: 'user_worker', step: 'on_the_way' }))
      .toMatchObject({ ok: false, reason: 'stale_step' });
    expect(guardWorkerStep({ task: task(), userId: 'user_worker', step: 'done' }))
      .toMatchObject({ ok: false, reason: 'step_out_of_order' });
  });

  it('refuses a tap queued behind a state change', () => {
    const result = guardWorkerStep({
      task: task({ worker_status: 'arrived' }),
      userId: 'user_worker',
      step: 'done',
      expectedStep: 'arrived',
    });
    expect(result).toMatchObject({ ok: false, reason: 'stale_step' });
  });

  it('refuses anyone else, and any task that is no longer live', () => {
    expect(guardWorkerStep({ task: task(), userId: 'user_stranger', step: 'on_the_way' }))
      .toMatchObject({ ok: false, reason: 'not_assigned' });
    for (const status of ['COMPLETED', 'CANCELLED', 'EXPIRED']) {
      expect(guardWorkerStep({ task: task({ status }), userId: 'user_worker', step: 'on_the_way' }))
        .toMatchObject({ ok: false, reason: 'task_not_active' });
    }
  });

  it('writes exactly the fields the in-app banner writes', () => {
    const at = new Date('2026-11-03T12:00:00.000Z');
    expect(workerStepPatch({}, 'on_the_way', at)).toEqual({ worker_status: 'on_the_way', on_the_way_at: at.toISOString() });
    // A timestamp already recorded is never overwritten.
    expect(workerStepPatch({ on_the_way_at: 'earlier' }, 'on_the_way', at)).toEqual({ worker_status: 'on_the_way' });
    expect(workerStepPatch({}, 'done', at)).toEqual({ worker_status: 'done', completed_at: at.toISOString() });
  });
});

describe('publisher approval guard', () => {
  it('allows the owner once the worker reported the work finished', () => {
    expect(guardPublisherApproval({ task: task({ worker_status: 'done' }), userId: 'user_publisher' }))
      .toEqual({ ok: true });
  });

  it('refuses a task nobody has finished, and anyone who is not the owner', () => {
    expect(guardPublisherApproval({ task: task({ worker_status: 'arrived' }), userId: 'user_publisher' }))
      .toMatchObject({ ok: false, reason: 'worker_not_done' });
    expect(guardPublisherApproval({ task: task({ worker_status: 'done' }), userId: 'user_worker' }))
      .toMatchObject({ ok: false, reason: 'not_owner' });
  });

  it('reports an already-completed task as a duplicate, not an error', () => {
    expect(guardPublisherApproval({ task: task({ status: 'COMPLETED', worker_status: 'done' }), userId: 'user_publisher' }))
      .toMatchObject({ ok: false, reason: 'already_completed', status: 200 });
  });
});

describe('the action the contract offers', () => {
  const cases = [
    { label: 'worker, not started', task: task(), role: 'worker' },
    { label: 'worker, on the way', task: task({ worker_status: 'on_the_way' }), role: 'worker' },
    { label: 'worker, arrived', task: task({ worker_status: 'arrived' }), role: 'worker' },
    { label: 'worker, finished', task: task({ worker_status: 'done' }), role: 'worker' },
    { label: 'worker, not active', task: task({ status: 'COMPLETED' }), role: 'worker' },
    { label: 'worker, upcoming engagement', task: task(), role: 'worker', isEngagement: true },
    { label: 'publisher, worker finished', task: task({ worker_status: 'done' }), role: 'publisher' },
    { label: 'publisher, worker on the way', task: task({ worker_status: 'on_the_way' }), role: 'publisher' },
  ];

  it('is identical on the server and in the app', () => {
    for (const { label, task: record, role, isEngagement = false } of cases) {
      const input = { task: record, role, flow: FLOW, isEngagement, t };
      expect(clientAction(input), label).toEqual(serverAction(input));
    }
  });

  it('offers the worker only a forward step they can still take', () => {
    expect(serverAction({ task: task(), role: 'worker', flow: FLOW, isEngagement: false, t }))
      .toMatchObject({ id: 'worker_step', step: 'on_the_way' });
    expect(serverAction({ task: task({ worker_status: 'arrived' }), role: 'worker', flow: FLOW, isEngagement: false, t }))
      .toMatchObject({ id: 'worker_step', step: 'done' });
  });

  it('offers nothing at all once the worker has finished, or on an engagement', () => {
    expect(serverAction({ task: task({ worker_status: 'done' }), role: 'worker', flow: FLOW, isEngagement: false, t })).toBeNull();
    expect(serverAction({ task: task(), role: 'worker', flow: FLOW, isEngagement: true, t })).toBeNull();
    expect(serverAction({ task: task({ status: 'COMPLETED' }), role: 'worker', flow: FLOW, isEngagement: false, t })).toBeNull();
  });

  it('offers the publisher approval only after the worker reported done', () => {
    const approval = serverAction({ task: task({ worker_status: 'done' }), role: 'publisher', flow: FLOW, isEngagement: false, t });
    expect(approval).toMatchObject({ id: 'publisher_approve', step: 'approve' });
    expect(typeof approval.label).toBe('string');
    expect(approval.label.length).toBeGreaterThan(0);
    expect(serverAction({ task: task({ worker_status: 'arrived' }), role: 'publisher', flow: FLOW, isEngagement: false, t })).toBeNull();
  });

  it('keeps every label the server sends, and invents none in Swift', () => {
    // The button's words come from the contract; the native layer only renders
    // `action.label`. This asserts the label is really carried, not re-derived.
    const worker = serverAction({ task: task(), role: 'worker', flow: FLOW, isEngagement: false, t });
    expect(worker.label).toBe(FLOW.cta.on_the_way.label);
  });
});