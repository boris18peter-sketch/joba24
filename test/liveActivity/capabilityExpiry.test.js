import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  USER_SCOPE_TTL_SECONDS,
  ACTION_TOKEN_MAX_TTL_SECONDS,
  signUserActionToken,
  verifyActionToken,
} from '../../base44/shared/liveActivityActionToken.ts';

/**
 * A Lock Screen tap can only carry a capability the APP minted, because the app is
 * the only process with a session. This suite pins the two halves of the honest
 * answer to that:
 *
 *  1. the capability's life is NOT quietly widened (it stays short, and a caller
 *     asking for longer is clamped), and
 *  2. when it has expired anyway — the app has not run for a while — the card does
 *     not offer a tap that can only fail: the same button opens the task instead.
 */

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('the install capability is still short-lived', () => {
  it('is twelve hours, and cannot be minted for longer', async () => {
    expect(USER_SCOPE_TTL_SECONDS).toBe(12 * 60 * 60);
    const now = 1_700_000_000_000;
    const signed = await signUserActionToken({
      secret: 'test-secret',
      userId: 'user_1',
      actions: ['worker_step', 'publisher_approve'],
      // A caller may not ask for more than the install default.
      ttlSeconds: 365 * 24 * 60 * 60,
      now,
    });
    expect(signed.ok).toBe(true);
    expect(signed.claims.exp - signed.claims.iat).toBe(USER_SCOPE_TTL_SECONDS);
    // And never longer than any other capability.
    expect(signed.claims.exp - signed.claims.iat).toBeLessThan(ACTION_TOKEN_MAX_TTL_SECONDS);
  });

  it('an expired install capability is refused as "expired", not accepted', async () => {
    const now = 1_700_000_000_000;
    const signed = await signUserActionToken({
      secret: 'test-secret',
      userId: 'user_1',
      actions: ['worker_step'],
      now,
    });
    const fresh = await verifyActionToken({ secret: 'test-secret', token: signed.token, now });
    expect(fresh.ok).toBe(true);

    // 13 hours later: the app has not been opened since.
    const stale = await verifyActionToken({
      secret: 'test-secret',
      token: signed.token,
      now: now + 13 * 60 * 60 * 1000,
    });
    expect(stale.ok).toBe(false);
    expect(stale.reason).toBe('expired');
  });
});

describe('the expiry reaches the Lock Screen so it never offers a dead tap', () => {
  const native = read('src/lib/liveActivityNative.js');

  it('the app sends the expiry with BOTH capabilities', () => {
    expect(native).toContain('function expiryMs(value)');
    // per-card (a running activity) …
    expect(native).toMatch(/setActionAuth\(\{[\s\S]{0,400}expiresAtMs: expiryMs/);
    // … and the install-scoped one.
    expect(native).toMatch(/setUserActionAuth\(\{[\s\S]{0,400}expiresAtMs: expiryMs/);
  });

  it('the plugin stores it, and the store treats "no expiry" as unusable', () => {
    const plugin = read('ios/App/App/LiveActivityPlugin.swift');
    expect(plugin).toContain('expiresAt: Self.expirySeconds(call)');
    expect(plugin).toMatch(/func expirySeconds/);

    const store = read('ios/App/JobaActivityWidget/JobaActivityAuthStore.swift');
    expect(store).toContain('static func isUsable(token: String?, expiresAt: Double?, now: Date = Date())');
    // A token with no recorded expiry must NOT be treated as still valid.
    expect(store).toMatch(/guard let expiresAt = expiresAt, expiresAt > 0 else \{ return false \}/);
    // The card's own capability first, then the install's — the intent's own order.
    expect(store).toContain('static func canAct(taskId: String, role: String, now: Date = Date())');
    expect(store).toMatch(/canAct[\s\S]{0,400}isUsable\(token: userToken\(\)/);
  });

  it('the card draws the same button as a LINK when no capability can act', () => {
    const widget = read('ios/App/JobaActivityWidget/JobaActivityWidgetBundle.swift');
    const gate = widget.indexOf('if JobaActivityAuthStore.canAct(taskId: taskId, role: role)');
    const link = widget.indexOf('Link(destination: url)', gate);
    expect(gate).toBeGreaterThan(-1);
    // The fallback sits in the else branch of the capability check, not beside it.
    expect(link).toBeGreaterThan(gate);
    expect(widget).toMatch(/else if let url = openInAppURL[\s\S]{0,220}Link\(destination: url\)/);
    // Same label: the card changes only where the tap goes.
    expect(widget).toMatch(/Link\(destination: url\) \{\s*label\(for: action\)/);
    // The destination is the task the card is about — the card's own deep link.
    expect(widget).toContain('?open_task=\\(taskId)');
  });

  it('a capability refused mid-flight is named, and is not a retry invitation', () => {
    const intent = read('ios/App/JobaActivityWidget/JobaTaskActionIntent.swift');
    expect(intent).toContain('stage("capability_expired"');
    expect(intent).toMatch(/func isCredentialRefusal/);
    for (const reason of ['expired', 'missing_token', 'bad_signature', 'unsupported_version']) {
      expect(intent).toContain(`"${reason}"`);
    }
    expect(intent).toContain('return status == 401');
  });
});

describe('the fallback is a link, never a wider credential', () => {
  it('no capability is ever put in the activity content or a push payload', () => {
    const start = read('base44/shared/liveActivityPushToStart.ts');
    // The payload guard still refuses anything credential-shaped…
    expect(start).toContain('payloadLeaks');
    expect(start).toMatch(/if \(payloadLeaks\(payload\)\.length\) return null;/);
    // …and the state the card displays carries no token of any kind.
    const snapshot = read('base44/shared/liveActivitySnapshot.ts');
    expect(snapshot).not.toMatch(/\btoken\s*:/i);

    const widget = read('ios/App/JobaActivityWidget/JobaActivityWidgetBundle.swift');
    // The widget reads the capability from the App Group; it never receives one
    // inside the state the server pushes.
    expect(widget).toContain('JobaActivityAuthStore.canAct');
    expect(widget).not.toMatch(/state\.(token|actionToken)/);
  });

  it('the install capability still exists only for allowlisted testers', () => {
    const minter = read('base44/functions/issueLiveActivityActionToken/entry.ts');
    expect(minter).toMatch(/scope === 'user'[\s\S]{0,600}isTestUser\(config, user\.id\)/);
    expect(minter).toContain("return Response.json({ error: 'not_allowlisted' }, { status: 403 })");
  });
});