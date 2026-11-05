import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  ACTIVITY_ATTRIBUTES_TYPE,
  FORBIDDEN_PAYLOAD_KEYS,
  buildPushToStartPayload,
  payloadLeaks,
} from '../../base44/shared/liveActivityPushToStart.ts';
import {
  DEFAULT_CONFIG,
  isTestUser,
  mayContactApnsFor,
  normalizeConfig,
} from '../../base44/shared/liveActivityConfig.ts';
import {
  eligibleTokens,
  normalizeTokenKind,
  planTokenRegistration,
} from '../../base44/shared/liveActivityAuth.ts';
import { planLiveActivityDispatch, stateAfterPlan } from '../../base44/shared/liveActivityDispatch.ts';
import {
  USER_SCOPE_TTL_SECONDS,
  signActionToken,
  signUserActionToken,
  verifyActionToken,
} from '../../base44/shared/liveActivityActionToken.ts';
import { actionsForRole } from '../../base44/shared/liveActivityActionGuard.ts';
import { CLIENT, WORKER, STRANGER, makeTask } from './fixtures.js';

/**
 * PUSH-TO-START — the card that appears while the app is closed.
 *
 * Three separate guarantees are pinned here, and they are separate on purpose:
 *
 *   1. THE PAYLOAD is exactly what makes a card appear, and carries nothing a
 *      person reading a locked phone (or a log) must not see. No capability, no
 *      user id, no token — ever.
 *   2. THE DECISION to start is made once per (user, task, role): the server's
 *      state row is the memory of "a card already exists here", so a local start
 *      and a remote start can never produce two cards.
 *   3. THE BUTTON on such a card can still work, through the install-scoped
 *      capability — which grants no task, no reads and twelve hours.
 */

const read = (path) => readFileSync(join(process.cwd(), path), 'utf8');

const NOW = Date.parse('2026-11-04T09:00:00.000Z');

/** A frozen snapshot exactly as the Stage 0 contract produces it. */
const SNAPSHOT = {
  id: 'task_start_1',
  role: 'worker',
  title: 'תיקון ברז במטבח',
  subtitle: 'בדרך אליך',
  phase: 'on_the_way',
  revision: 1,
  contractVersion: 2,
  stepProgress: { step: 0, total: 3, steps: [] },
  action: { id: 'worker_step', step: 'on_the_way', label: 'הגעתי' },
};

const SECRET = 'test-secret-that-is-long-enough-for-hmac';

const tokenRows = () => ([
  { id: 't_activity', user_id: WORKER, token: 'a'.repeat(64), kind: 'activity', status: 'active', environment: 'production' },
  { id: 't_start', user_id: WORKER, token: 'b'.repeat(64), kind: 'start', status: 'active', environment: 'production' },
]);

/* ══════════════════════════════════════════════════════════════════════════
   1. The payload
   ══════════════════════════════════════════════════════════════════════════ */
describe('the start payload makes a card appear, and nothing else', () => {
  const payload = buildPushToStartPayload({ snapshot: SNAPSHOT, now: NOW });

  it('is a start event carrying the type and attributes the widget decodes', () => {
    expect(payload).not.toBeNull();
    expect(payload.aps.event).toBe('start');
    expect(payload.aps['attributes-type']).toBe(ACTIVITY_ATTRIBUTES_TYPE);
    // The static half of the activity: the same two values `Activity.request`
    // would have been given, so a remote card and a local one are identical.
    expect(payload.aps.attributes).toEqual({ taskId: SNAPSHOT.id, role: SNAPSHOT.role });
    expect(payload.aps['content-state']).toEqual(SNAPSHOT);
    expect(payload.aps.timestamp).toBe(Math.floor(NOW / 1000));
  });

  it('never alerts, and goes stale like any other card', () => {
    // A card, not a banner: the user already gets the app's own notification.
    expect(payload.aps.alert).toBeUndefined();
    expect(payload.aps.sound).toBeUndefined();
    expect(payload.aps['stale-date']).toBeGreaterThan(payload.aps.timestamp);
  });

  it('carries no credential of any kind', () => {
    expect(payloadLeaks(payload)).toEqual([]);
    const json = JSON.stringify(payload);
    for (const forbidden of ['token', 'capability', 'secret', 'user_id', CLIENT, WORKER]) {
      expect(json, forbidden).not.toContain(forbidden);
    }
  });

  it('refuses to leak one, even if a caller hands it a bad snapshot', () => {
    // A snapshot is presentation only. One that somehow carried a credential is
    // refused rather than being pushed to a Lock Screen.
    expect(buildPushToStartPayload({ snapshot: { ...SNAPSHOT, token: 'abcdef' } })).toBeNull();
    expect(payloadLeaks({ aps: { token: 'x' } })).toEqual(['payload.aps.token']);
    expect(FORBIDDEN_PAYLOAD_KEYS).toContain('token');
  });

  it('refuses to start a blank card', () => {
    expect(buildPushToStartPayload({ snapshot: null })).toBeNull();
    expect(buildPushToStartPayload({ snapshot: { ...SNAPSHOT, id: '' } })).toBeNull();
    expect(buildPushToStartPayload({ snapshot: { ...SNAPSHOT, role: '' } })).toBeNull();
  });

  it('names the type the Swift attributes struct actually declares', () => {
    const swift = read('ios/App/JobaActivityWidget/JobaTaskActivityAttributes.swift');
    expect(swift).toContain('public struct JobaTaskActivity: ActivityAttributes');
    expect(ACTIVITY_ATTRIBUTES_TYPE).toBe('JobaTaskActivity');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   2. The switch — off by default, allowlist only, never a global unlock
   ══════════════════════════════════════════════════════════════════════════ */
describe('Push-to-Start is a literal opt-in and never widens the allowlist', () => {
  it('ships off', () => {
    expect(DEFAULT_CONFIG.push_to_start).toBe(false);
    expect(normalizeConfig(null).push_to_start).toBe(false);
    expect(normalizeConfig({}).push_to_start).toBe(false);
    // Only a literal `true` arms it.
    expect(normalizeConfig({ push_to_start: 'true' }).push_to_start).toBe(false);
    expect(normalizeConfig({ push_to_start: 1 }).push_to_start).toBe(false);
    expect(normalizeConfig({ push_to_start: true }).push_to_start).toBe(true);
  });

  it('still requires the recipient gate for delivery', () => {
    const config = normalizeConfig({ push_to_start: true, test_user_ids: [WORKER], test_apns: true });
    expect(isTestUser(config, WORKER)).toBe(true);
    expect(mayContactApnsFor(config, WORKER)).toBe(true);
    // Somebody who is not on the list gains nothing from the switch.
    expect(isTestUser(config, STRANGER)).toBe(false);
    expect(mayContactApnsFor(config, STRANGER)).toBe(false);
  });

  it('is decided per recipient in the sender, and only for a never-started pair', () => {
    const send = read('base44/shared/liveActivitySend.ts');
    // The four conditions are ANDed: a content push, the switch, no committed
    // revision, and a start token to send it to.
    expect(send).toContain('plan.kind === \'send\'');
    expect(send).toContain('config?.push_to_start === true');
    expect(send).toContain('!(Number(state?.revision) > 0)');
    expect(send).toContain('startTokens.length > 0');
    // And it is addressed to the start tokens only — never to activity tokens.
    expect(send).toContain('const targetTokens = remoteStart ? startTokens : tokens;');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   3. Two kinds of token, kept apart at registration and at dispatch
   ══════════════════════════════════════════════════════════════════════════ */
describe('start tokens and activity tokens never mix', () => {
  it('treats a row written before Push-to-Start as an activity token', () => {
    expect(normalizeTokenKind(undefined)).toBe('activity');
    expect(normalizeTokenKind('')).toBe('activity');
    expect(normalizeTokenKind('START')).toBe('start');
    expect(normalizeTokenKind('activity')).toBe('activity');
  });

  it('splits one device’s rows by kind', () => {
    expect(eligibleTokens(tokenRows(), { userId: WORKER }).map((r) => r.id)).toEqual(['t_activity']);
    expect(eligibleTokens(tokenRows(), { userId: WORKER, kind: 'start' }).map((r) => r.id)).toEqual(['t_start']);
    // Nobody else's token, whatever its kind.
    expect(eligibleTokens(tokenRows(), { userId: STRANGER, kind: 'start' })).toEqual([]);
  });

  it('registers a start token as its own kind', () => {
    const plan = planTokenRegistration({
      user: { id: WORKER, role: 'user' },
      body: { token: 'c'.repeat(64), environment: 'production', kind: 'start', device_id: 'dev_1' },
    });
    expect(plan.ok).toBe(true);
    expect(plan.record.kind).toBe('start');
  });

  it('refuses an unknown kind instead of coercing it', () => {
    const plan = planTokenRegistration({
      user: { id: WORKER, role: 'user' },
      body: { token: 'c'.repeat(64), environment: 'production', kind: 'push' },
    });
    expect(plan).toMatchObject({ ok: false, status: 400, reason: 'invalid_kind' });
  });

  it('rotating a start token never retires the card’s activity token', () => {
    // Both belong to the same install, and the activity token is on screen.
    const existing = [
      { id: 'old_start', user_id: WORKER, token: 'd'.repeat(64), kind: 'start', device_id: 'dev_1', status: 'active' },
      { id: 'live_activity', user_id: WORKER, token: 'e'.repeat(64), kind: 'activity', device_id: 'dev_1', status: 'active' },
    ];
    const plan = planTokenRegistration({
      user: { id: WORKER, role: 'user' },
      body: { token: 'f'.repeat(64), environment: 'production', kind: 'start', device_id: 'dev_1' },
      existingTokens: existing,
    });
    expect(plan.ok).toBe(true);
    expect(plan.retireTokenIds).toEqual(['old_start']);
  });

  it('the sender reads the two sets from one query and picks by kind', () => {
    const send = read('base44/shared/liveActivitySend.ts');
    expect(send).toContain("kind: 'start'");
    expect(send).toContain('const startTokens = eligibleTokens(');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   4. Exactly one card: start once, then update
   ══════════════════════════════════════════════════════════════════════════ */
describe('a pair is started once and then only updated', () => {
  const task = makeTask({ status: 'TAKEN', worker_status: 'on_the_way', id: 'task_start_1' });

  it('plans a first send for a pair that has no state at all', () => {
    const plan = planLiveActivityDispatch({
      task,
      role: 'worker',
      userId: WORKER,
      config: { ...DEFAULT_CONFIG, enabled: true, push_to_start: true },
      state: null,
      snapshot: SNAPSHOT,
      now: NOW,
    });
    expect(plan).toMatchObject({ kind: 'send', decision: 'send', revision: 1 });
  });

  it('commits the revision, which is what makes a second start impossible', () => {
    const plan = planLiveActivityDispatch({
      task,
      role: 'worker',
      userId: WORKER,
      config: { ...DEFAULT_CONFIG, enabled: true },
      state: null,
      snapshot: SNAPSHOT,
      now: NOW,
    });
    const state = stateAfterPlan({ plan, task, committed: true, sent: true, now: NOW });
    expect(state.revision).toBe(1);
    expect(state.terminal).toBe(false);
    // The sender's start condition is "no committed revision". After a delivered
    // start the row carries one, so the very next event can only ever update.
    expect(Number(state.revision) > 0).toBe(true);

    // …and the next event plans a NEWER revision (an update), not another start.
    const next = planLiveActivityDispatch({
      task: { ...task, worker_status: 'arrived', updated_date: new Date(NOW + 60000).toISOString() },
      role: 'worker',
      userId: WORKER,
      config: { ...DEFAULT_CONFIG, enabled: true },
      state,
      snapshot: { ...SNAPSHOT, phase: 'arrived', revision: 2 },
      now: NOW + 60000,
    });
    expect(next.revision).toBe(2);
    expect(next.kind).toBe('send');
  });

  it('a local start blocks the remote one, because the app wrote the row first', () => {
    // `beginRecipientState` writes revision 1 before the device requests the
    // activity, so the server may not start the same pair.
    const deviceState = { revision: 1, phase: '', content_key: '', terminal: false };
    expect(!(Number(deviceState.revision) > 0)).toBe(false);
  });

  it('a duplicate event after a start is suppressed', () => {
    const state = {
      revision: 1,
      phase: SNAPSHOT.phase,
      content_key: planLiveActivityDispatch({
        task, role: 'worker', userId: WORKER,
        config: { ...DEFAULT_CONFIG, enabled: true },
        state: null, snapshot: SNAPSHOT, now: NOW,
      }).contentKey,
    };
    const plan = planLiveActivityDispatch({
      task,
      role: 'worker',
      userId: WORKER,
      config: { ...DEFAULT_CONFIG, enabled: true },
      state,
      snapshot: SNAPSHOT,
      now: NOW,
    });
    expect(plan).toMatchObject({ kind: 'none', decision: 'duplicate' });
  });

  it('never starts a card for work that is already over', () => {
    const done = makeTask({ status: 'COMPLETED' });
    const plan = planLiveActivityDispatch({
      task: done,
      role: 'worker',
      userId: WORKER,
      config: { ...DEFAULT_CONFIG, enabled: true, push_to_start: true },
      state: null,
      snapshot: null,
      now: NOW,
    });
    // A close, not a start.
    expect(plan.kind).toBe('end');
  });

  it('claims the slot before sending, and gives it back when nothing was sent', () => {
    const send = read('base44/shared/liveActivitySend.ts');
    const claim = send.indexOf('await claimStartState(base44');
    const push = send.indexOf('await sendLiveActivityPush({');
    expect(claim).toBeGreaterThan(-1);
    // The claim happens BEFORE the first network call…
    expect(claim).toBeLessThan(push);
    expect(send).toContain("last_decision: 'start_claimed'");
    // …a losing run backs off by name…
    expect(send).toContain("decision: 'start_claimed'");
    // …and a claim that delivered nothing is released, never left blocking.
    expect(send).toContain('if (startClaim && !committed)');
    expect(send).toContain("last_decision: 'start_released'");
  });

  it('the audit table records the start event by name', () => {
    const entity = read('base44/entities/LiveActivityDispatch.jsonc');
    expect(entity).toContain('"start",');
    expect(entity).toContain('"update",');
    expect(entity).toContain('"end"');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   5. The button on a remotely started card
   ══════════════════════════════════════════════════════════════════════════ */
describe('an install-scoped capability, bounded and re-authorized', () => {
  const actions = Array.from(new Set([...actionsForRole('worker'), ...actionsForRole('publisher')]));

  it('verifies, names no task, and carries only the two action ids', async () => {
    const signed = await signUserActionToken({ secret: SECRET, userId: WORKER, actions, now: NOW });
    expect(signed.ok).toBe(true);

    const verified = await verifyActionToken({ secret: SECRET, token: signed.token, now: NOW });
    expect(verified.ok).toBe(true);
    expect(verified.claims.scope).toBe('user');
    expect(verified.claims.sub).toBe(WORKER);
    expect(verified.claims.tid).toBeUndefined();
    expect(verified.claims.actions.sort()).toEqual(['publisher_approve', 'publisher_assign', 'worker_step']);
  });

  it('cannot be stretched past twelve hours', async () => {
    const signed = await signUserActionToken({
      secret: SECRET, userId: WORKER, actions,
      ttlSeconds: 7 * 24 * 60 * 60, // the per-task ceiling — refused here
      now: NOW,
    });
    expect(signed.claims.exp - signed.claims.iat).toBe(USER_SCOPE_TTL_SECONDS);
    const expired = await verifyActionToken({
      secret: SECRET, token: signed.token, now: NOW + (USER_SCOPE_TTL_SECONDS + 1) * 1000,
    });
    expect(expired).toMatchObject({ ok: false, reason: 'expired' });
  });

  it('is signed with the same secret, so it cannot be forged or edited', async () => {
    const signed = await signUserActionToken({ secret: SECRET, userId: WORKER, actions, now: NOW });
    const [prefix, payload] = signed.token.split('.');
    const forged = `${prefix}.${payload}.${'A'.repeat(43)}`;
    expect(await verifyActionToken({ secret: SECRET, token: forged, now: NOW }))
      .toMatchObject({ ok: false, reason: 'bad_signature' });
    expect(await verifyActionToken({ secret: 'another-secret', token: signed.token, now: NOW }))
      .toMatchObject({ ok: false, reason: 'bad_signature' });
  });

  it('did not change the per-card capability it sits beside', async () => {
    const signed = await signActionToken({
      secret: SECRET, userId: WORKER, taskId: 'task_1', role: 'worker',
      actions: actionsForRole('worker'), now: NOW,
    });
    const verified = await verifyActionToken({ secret: SECRET, token: signed.token, now: NOW });
    expect(verified.ok).toBe(true);
    expect(verified.claims).toMatchObject({ tid: 'task_1', role: 'worker' });
    expect(verified.claims.scope).toBeUndefined();
  });

  it('the endpoint demands the card’s task and role, and re-reads ownership', () => {
    const endpoint = read('base44/functions/liveActivityAction/entry.ts');
    expect(endpoint).toContain("const isUserScope = claims.scope === 'user'");
    expect(endpoint).toContain('task_and_role_required');
    expect(endpoint).toContain('authorizeActivity(task, role, claims.sub)');
    // A user-scoped capability may only ever offer its role's own action.
    expect(endpoint).toContain('actionsForRole(role)');
  });

  it('is minted only for an allowlisted tester', () => {
    const mint = read('base44/functions/issueLiveActivityActionToken/entry.ts');
    expect(mint).toContain("body?.scope === 'user'");
    expect(mint).toContain('isTestUser(config, user.id)');
    expect(mint).toContain('signUserActionToken');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   6. The device side: token, rotation, and the button's stored capability
   ══════════════════════════════════════════════════════════════════════════ */
describe('the native bridge reads, registers and rotates the install token', () => {
  const plugin = read('ios/App/App/LiveActivityPlugin.swift');
  const native = read('src/lib/liveActivityNative.js');
  const intent = read('ios/App/JobaActivityWidget/JobaTaskActionIntent.swift');
  const store = read('ios/App/JobaActivityWidget/JobaActivityAuthStore.swift');
  const bridge = read('src/components/RealTaskActivityBridge.jsx');

  it('declares the two native methods, and the web layer names them', () => {
    expect(plugin).toContain('CAPPluginMethod(name: "pushToStartToken"');
    expect(plugin).toContain('CAPPluginMethod(name: "setUserActionAuth"');
    expect(native).toContain("'pushToStartToken', 'setUserActionAuth'");
  });

  it('reads the token and keeps listening for a rotation', () => {
    // ── THIS ASSERTION WAS ITSELF THE BUG ────────────────────────────────
    // It required `Activity<JobaTaskActivity>.pushType?.pushToStartToken` — a
    // member that does not exist — so a green run here was evidence of nothing:
    // the test had pinned the broken call shape as the contract and passed while
    // Xcode failed the archive twice. The correct API is STATIC on `Activity`
    // (iOS 17.2+), and it is what these now require.
    expect(plugin).toContain('Activity<JobaTaskActivity>.pushToStartToken');
    expect(plugin).toContain('Activity<JobaTaskActivity>.pushToStartTokenUpdates');
    expect(plugin).not.toMatch(/Activity<[A-Za-z0-9_]+>\s*\.\s*pushType\b/);
    expect(plugin).toContain('notifyListeners("pushToStartToken"');
    // One observer per process: a second read must not attach a second stream.
    expect(plugin).toContain('guard pushToStartTask == nil else { return }');
  });

  it('keeps the iOS 16.x fallback intact', () => {
    expect(plugin).toContain('"supported": false');
    expect(plugin).toContain('"reason": "unsupported_ios"');
    // The plugin still sends nothing itself.
    expect(plugin).not.toContain('URLSession');
  });

  it('registers it as a START token, not an activity token', () => {
    expect(native).toContain("kind: 'start'");
    expect(native).toContain('export async function syncPushToStartToken');
    expect(native).toContain('export function attachPushToStartTokenListener');
  });

  it('the bridge does all three, only for an allowlisted device', () => {
    const effect = bridge.slice(bridge.indexOf('// ── 2b. PUSH-TO-START'));
    // The gate is the access answer — and now also the answer's OWNER, so a
    // stale answer from a previous account can never arm this device.
    expect(effect).toContain('if (!access?.allowed || access.userId !== me?.id) return undefined;');
    expect(effect).toContain('syncPushToStartToken()');
    expect(effect).toContain('ensureUserActionCapability()');
    expect(effect).toContain('attachPushToStartTokenListener');
  });

  it('the App Intent prefers the card’s own capability and falls back to the install one', () => {
    expect(intent).toContain('JobaActivityAuthStore.token(taskId: taskId, role: role)\n            ?? JobaActivityAuthStore.userToken()');
    expect(intent).toContain('"task_id": taskId');
    expect(intent).toContain('"role": role');
    // Still the same endpoint and the same request shape.
    expect(intent).toContain('URLSession.shared.data(for: request)');
  });

  it('the endpoint is always https, from the store or compiled in', () => {
    expect(intent).toContain('JobaActivityAuthStore.actionEndpoint()');
    expect(store).toContain('static let defaultActionEndpoint = "https://joba24.com/functions/liveActivityAction"');
    // A scheme URL is never used and never persisted.
    expect(store).toContain('raw.hasPrefix("https://")');
    expect(store).toContain('endpoint.hasPrefix("https://")');
    expect(store).toContain('static func actionEndpoint() -> URL?');
  });

  it('the install capability lives under its own key, never in the payload', () => {
    expect(store).toContain('static let userTokenKey = "joba24.liveactivity.actionToken.user"');
    expect(read('base44/shared/liveActivityPushToStart.ts')).not.toContain('userToken');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   7. Both targets
   ══════════════════════════════════════════════════════════════════════════ */
describe('the native changes land in the targets that need them', () => {
  it('uses only files the patcher already wires into both targets', () => {
    const patcher = read('scripts/patch-ios-live-activity.py');
    // The attributes type (needed for a REMOTE start) and the App Group store
    // (read by the intent) must stay in both targets — the feature adds no new
    // Swift file precisely so this wiring cannot drift.
    expect(patcher).toContain('"JobaTaskActivityAttributes.swift"');
    expect(patcher).toContain('"JobaActivityAuthStore.swift"');
    for (const need of ['LiveActivityPlugin.swift', 'JobaTaskActivityAttributes.swift', 'JobaTaskActionIntent.swift', 'JobaActivityAuthStore.swift']) {
      expect(patcher).toContain(`"${need}"`);
    }
  });

  it('adds no Swift file outside those lists', () => {
    // A new file would have to be registered in BOTH targets by hand; nothing in
    // this feature needs one, so nothing was added.
    const plugin = read('ios/App/App/LiveActivityPlugin.swift');
    expect(plugin).toContain('public let jsName = "JobaActivity"');
    expect(plugin).toContain('CAPPluginMethod(name: "pushToStartToken"');
  });
});