import { describe, it, expect } from 'vitest';
import {
  planTokenRegistration,
  resolveRecipient,
  validateEnvironment,
  eligibleTokens,
  authorizeDispatch,
} from '../../base44/shared/liveActivityAuth.ts';
import { CLIENT, WORKER, STRANGER, makeTask, openTask } from './fixtures.js';

/**
 * Token registration is the trust boundary: whoever gets a token registered
 * receives pushes. These tests pin the refusals, not the happy path only.
 */
const TOKEN_A = 'a'.repeat(64);
const TOKEN_B = 'b'.repeat(64);

const publisher = { id: CLIENT, role: 'user' };
const worker = { id: WORKER, role: 'user' };
const admin = { id: 'user_admin_1', role: 'admin' };

const baseBody = { token: TOKEN_A, environment: 'development' };

describe('recipient identity comes from the session, never from the body', () => {
  it('refuses an unauthenticated call', () => {
    const plan = planTokenRegistration({ user: null, body: baseBody });
    expect(plan).toMatchObject({ ok: false, status: 401, reason: 'unauthenticated' });
  });

  it('refuses a body that claims another user', () => {
    const plan = planTokenRegistration({ user: publisher, body: { ...baseBody, user_id: STRANGER } });
    expect(plan).toMatchObject({ ok: false, status: 403, reason: 'foreign_identity' });
  });

  it('accepts a body that echoes the caller’s own id', () => {
    const plan = planTokenRegistration({ user: publisher, body: { ...baseBody, user_id: CLIENT } });
    expect(plan.ok).toBe(true);
    expect(plan.record.user_id).toBe(CLIENT);
  });

  it('resolves the authenticated identity and never an admin role as a recipient', () => {
    expect(resolveRecipient(publisher)).toEqual({ userId: CLIENT, role: 'user' });
    expect(resolveRecipient(admin)).toEqual({ userId: 'user_admin_1', role: 'admin' });
    expect(resolveRecipient(null)).toBeNull();
  });
});

describe('token and environment validation', () => {
  it('rejects a malformed token', () => {
    for (const token of ['', '   ', 'not-a-token', 'abc', 'z'.repeat(64), 'a'.repeat(8)]) {
      const plan = planTokenRegistration({ user: publisher, body: { token, environment: 'development' } });
      expect(plan, token).toMatchObject({ ok: false, status: 400, reason: 'invalid_token' });
    }
  });

  it('rejects an unknown environment', () => {
    const plan = planTokenRegistration({ user: publisher, body: { ...baseBody, environment: 'staging' } });
    expect(plan).toMatchObject({ ok: false, status: 400, reason: 'invalid_environment' });
  });

  it('normalizes the environment case', () => {
    expect(validateEnvironment('PRODUCTION')).toBe('production');
    expect(validateEnvironment('Development')).toBe('development');
    expect(validateEnvironment('sandbox')).toBeNull();
  });

  it('rejects a timezone that is not a real zone', () => {
    const plan = planTokenRegistration({ user: publisher, body: { ...baseBody, timezone: 'Mars/Olympus' } });
    expect(plan).toMatchObject({ ok: false, status: 400, reason: 'invalid_timezone' });
  });

  it('defaults the timezone when the client sends none', () => {
    const plan = planTokenRegistration({ user: publisher, body: baseBody });
    expect(plan.ok).toBe(true);
    expect(plan.record.timezone).toBe('Asia/Jerusalem');
  });
});

describe('task binding is authorized against the stored task', () => {
  it('lets the publisher bind their own OPEN task', () => {
    const task = openTask(1);
    const plan = planTokenRegistration({
      user: publisher,
      body: { ...baseBody, task_id: task.id, role: 'publisher' },
      task,
    });
    expect(plan.ok).toBe(true);
    expect(plan.taskRole).toBe('publisher');
  });

  it('lets the assigned worker bind a TAKEN task', () => {
    const task = makeTask({ status: 'TAKEN', worker_status: 'on_the_way' });
    const plan = planTokenRegistration({
      user: worker,
      body: { ...baseBody, task_id: task.id, role: 'worker' },
      task,
    });
    expect(plan.ok).toBe(true);
    expect(plan.taskRole).toBe('worker');
  });

  it('refuses a role the task does not support for this user', () => {
    const task = makeTask({ status: 'TAKEN' });
    const plan = planTokenRegistration({
      user: publisher,
      body: { ...baseBody, task_id: task.id, role: 'worker' },
      task,
    });
    expect(plan).toMatchObject({ ok: false, status: 403, reason: 'unauthorized_task' });
  });

  it('refuses a stranger’s task (never visible to the caller)', () => {
    const task = makeTask({ status: 'TAKEN' });
    const plan = planTokenRegistration({
      user: { id: STRANGER, role: 'user' },
      body: { ...baseBody, task_id: task.id, role: 'worker' },
      task: null,
    });
    expect(plan).toMatchObject({ ok: false, status: 404, reason: 'task_not_found' });
  });

  it('refuses an unknown role', () => {
    const task = makeTask();
    const plan = planTokenRegistration({
      user: publisher,
      body: { ...baseBody, task_id: task.id, role: 'admin' },
      task,
    });
    expect(plan).toMatchObject({ ok: false, status: 400, reason: 'invalid_role' });
  });

  it('registers without a task binding (device-only)', () => {
    const plan = planTokenRegistration({ user: publisher, body: baseBody });
    expect(plan.ok).toBe(true);
    expect(plan.taskRole).toBeNull();
    expect(plan.action).toBe('create');
  });
});

describe('token ownership, rotation and invalidation', () => {
  it('never steals a token registered to another account', () => {
    const plan = planTokenRegistration({
      user: publisher,
      body: baseBody,
      existingTokens: [{ id: 'tok_1', user_id: STRANGER, token: TOKEN_A, environment: 'development', status: 'active' }],
    });
    expect(plan).toMatchObject({ ok: false, status: 409, reason: 'token_owned_by_other_user' });
  });

  it('refreshes an existing token for the same user and environment', () => {
    const plan = planTokenRegistration({
      user: publisher,
      body: baseBody,
      existingTokens: [{ id: 'tok_1', user_id: CLIENT, token: TOKEN_A, environment: 'development', status: 'active' }],
    });
    expect(plan.ok).toBe(true);
    expect(plan.action).toBe('refresh');
    expect(plan.existingId).toBe('tok_1');
  });

  it('rotates when the same token appears under a different environment', () => {
    const plan = planTokenRegistration({
      user: publisher,
      body: { token: TOKEN_A, environment: 'production' },
      existingTokens: [{ id: 'tok_1', user_id: CLIENT, token: TOKEN_A, environment: 'development', status: 'active' }],
    });
    expect(plan.ok).toBe(true);
    expect(plan.action).toBe('rotate');
    expect(plan.record.environment).toBe('production');
  });

  it('retires the device’s previous tokens when a new one replaces them', () => {
    const plan = planTokenRegistration({
      user: publisher,
      body: { ...baseBody, token: TOKEN_B, device_id: 'device_1' },
      existingTokens: [
        { id: 'tok_old', user_id: CLIENT, token: TOKEN_A, device_id: 'device_1', environment: 'development', status: 'active' },
        { id: 'tok_other_device', user_id: CLIENT, token: 'c'.repeat(64), device_id: 'device_2', environment: 'development', status: 'active' },
        { id: 'tok_someone_else', user_id: STRANGER, token: 'd'.repeat(64), device_id: 'device_1', environment: 'development', status: 'active' },
      ],
    });
    expect(plan.ok).toBe(true);
    expect(plan.retireTokenIds).toEqual(['tok_old']);
  });

  it('reactivates a previously invalidated token when the device re-registers', () => {
    const plan = planTokenRegistration({
      user: publisher,
      body: baseBody,
      existingTokens: [{ id: 'tok_1', user_id: CLIENT, token: TOKEN_A, environment: 'development', status: 'invalid' }],
    });
    expect(plan.ok).toBe(true);
    expect(plan.record.status).toBe('active');
    expect(plan.record.failure_count).toBe(0);
  });
});

describe('dispatch-side authorization and eligibility', () => {
  const tokens = [
    { id: 't1', user_id: CLIENT, environment: 'development', status: 'active' },
    { id: 't2', user_id: CLIENT, environment: 'production', status: 'active' },
    { id: 't3', user_id: CLIENT, environment: 'development', status: 'invalid' },
    { id: 't4', user_id: STRANGER, environment: 'development', status: 'active' },
  ];

  it('only ever returns the recipient’s own, active, correctly-targeted tokens', () => {
    const picked = eligibleTokens(tokens, { userId: CLIENT, environment: 'development', limit: 10 });
    expect(picked.map((t) => t.id)).toEqual(['t1']);
  });

  it('honours the per-dispatch bound', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      id: `x${i}`, user_id: CLIENT, environment: 'development', status: 'active',
    }));
    expect(eligibleTokens(many, { userId: CLIENT, environment: 'development', limit: 5 })).toHaveLength(5);
  });

  it('still picks a matching-environment token first when one exists', () => {
    const tokens = [
      { id: 'sandbox', user_id: CLIENT, environment: 'development', status: 'active' },
      { id: 'testflight', user_id: CLIENT, environment: 'production', status: 'active' },
    ];
    const picked = eligibleTokens(tokens, { userId: CLIENT, environment: 'production', limit: 10 });
    expect(picked.map((t) => t.id)).toEqual(['testflight']);
  });

  it('falls back to the recipient\'s own tokens when the configured environment matches none', () => {
    // THE "publisher\'s card never moves" REGRESSION. A config left on
    // `development` while the tester runs a TestFlight build (production
    // tokens) matched nothing, so every dispatch decided
    // `no_active_tokens` — silence, not an error. The push host is chosen per
    // token when it is actually sent, so using the row\'s own environment here
    // can never deliver to the wrong APNs host.
    const tokens = [
      { id: 'mine', user_id: CLIENT, environment: 'production', status: 'active' },
      { id: 'theirs', user_id: WORKER, environment: 'production', status: 'active' },
      { id: 'dead', user_id: CLIENT, environment: 'production', status: 'invalid' },
    ];
    const picked = eligibleTokens(tokens, { userId: CLIENT, environment: 'development', limit: 10 });
    // Only this recipient\'s own ACTIVE token — never another user\'s, never an invalid one.
    expect(picked.map((t) => t.id)).toEqual(['mine']);
  });

  it('re-checks the task ownership before dispatch', () => {
    const task = makeTask({ status: 'TAKEN' });
    expect(authorizeDispatch({ task, role: 'worker', userId: WORKER }).ok).toBe(true);
    expect(authorizeDispatch({ task, role: 'worker', userId: STRANGER }).ok).toBe(false);
    expect(authorizeDispatch({ task, role: 'publisher', userId: CLIENT }).ok).toBe(true);
    expect(authorizeDispatch({ task, role: 'publisher', userId: WORKER }).ok).toBe(false);
  });
});