import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildProviderToken,
  resetProviderTokenCache,
  apnsHostFor,
  apnsTopicFor,
  buildLiveActivityPush,
  classifyApnsResponse,
  sendLiveActivityPush,
} from '../../base44/shared/liveActivityApns.ts';

/**
 * APNs is mocked at the `fetch` seam. No test here can reach Apple: the module
 * takes its fetch as an argument, and every case below supplies a fake.
 */

const BUNDLE = 'com.example.joba24.app';

/** A real P-256 key, generated for the test only. */
async function makeCredentials() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const der = await crypto.subtle.exportKey('pkcs8', pair.privateKey);
  const bytes = new Uint8Array(der);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin);
  const pem = `-----BEGIN PRIVATE KEY-----\n${b64.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;
  return { keyId: 'ABC1234567', teamId: 'TEAM123456', privateKeyPem: pem };
}

const SNAPSHOT = {
  contractVersion: 1,
  id: 'task_0001',
  role: 'worker',
  phase: 'on_the_way',
  title: 'אתה בדרך למשימה',
  subtitle: 'לחץ/י "הגעתי" כשתגיע',
  revision: 3,
};

function fakeFetch(response) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    if (response instanceof Error) throw response;
    return {
      status: response.status,
      headers: { get: (name) => (name === 'apns-id' ? 'APNS-ID-1' : null) },
      text: async () => response.body || '',
    };
  };
  impl.calls = calls;
  return impl;
}

beforeEach(() => {
  resetProviderTokenCache();
});

describe('provider token (ES256 JWT)', () => {
  it('signs a three-part JWT with the key id and team id', async () => {
    const creds = await makeCredentials();
    const jwt = await buildProviderToken({ ...creds, now: 1700000000000 });
    const [header, claims, signature] = jwt.split('.');

    expect(signature.length).toBeGreaterThan(40);
    expect(JSON.parse(atob(header.replace(/-/g, '+').replace(/_/g, '/')))).toEqual({ alg: 'ES256', kid: creds.keyId });
    expect(JSON.parse(atob(claims.replace(/-/g, '+').replace(/_/g, '/')))).toEqual({
      iss: creds.teamId,
      iat: 1700000000,
    });
  });

  it('reuses the token within Apple’s hour and refreshes it after 50 minutes', async () => {
    const creds = await makeCredentials();
    const first = await buildProviderToken({ ...creds, now: 1700000000000 });
    const reused = await buildProviderToken({ ...creds, now: 1700000000000 + 20 * 60000 });
    const refreshed = await buildProviderToken({ ...creds, now: 1700000000000 + 51 * 60000 });

    expect(reused).toBe(first);
    expect(refreshed).not.toBe(first);
  });

  it('refuses to sign without credentials', async () => {
    await expect(buildProviderToken({ keyId: '', teamId: 'T', privateKeyPem: '' })).rejects.toThrow();
  });
});

describe('hosts, topics and payload', () => {
  it('routes sandbox and production separately', () => {
    expect(apnsHostFor('development')).toBe('https://api.sandbox.push.apple.com');
    expect(apnsHostFor('production')).toBe('https://api.push.apple.com');
    expect(apnsHostFor(undefined)).toBe('https://api.sandbox.push.apple.com');
  });

  it('uses the Live Activity topic suffix', () => {
    expect(apnsTopicFor(BUNDLE)).toBe(`${BUNDLE}.push-type.liveactivity`);
    expect(apnsTopicFor(`${BUNDLE}.push-type.liveactivity`)).toBe(`${BUNDLE}.push-type.liveactivity`);
  });

  it('sends an update with a stale date and the contract state untouched', () => {
    const payload = buildLiveActivityPush({ snapshot: SNAPSHOT, event: 'update', now: 1700000000000 });
    expect(payload.aps.event).toBe('update');
    expect(payload.aps.timestamp).toBe(1700000000);
    expect(payload.aps['stale-date']).toBe(1700000000 + 30 * 60);
    expect(payload.aps['content-state']).toEqual(SNAPSHOT);
    expect(payload.aps['dismissal-date']).toBeUndefined();
    expect(payload.joba).toEqual({ taskId: 'task_0001', role: 'worker', revision: 3, contractVersion: 1 });
  });

  it('sends an end that dismisses the card immediately', () => {
    const payload = buildLiveActivityPush({ snapshot: SNAPSHOT, event: 'end', now: 1700000000000 });
    expect(payload.aps.event).toBe('end');
    // 0 = dismiss now. This used to be `now + 240 minutes`, which kept a
    // COMPLETED task's card on the Lock Screen for four hours even though APNs
    // accepted every end push with 200 — the ending was delivered, the dismissal
    // was simply scheduled hours into the future.
    expect(payload.aps['dismissal-date']).toBe(0);
    expect(payload.aps['stale-date']).toBeUndefined();
  });
});

describe('APNs responses are classified', () => {
  const cases = [
    [200, '', { ok: true, category: 'ok', invalidateToken: false, retryable: false }],
    [400, '{"reason":"BadDeviceToken"}', { ok: false, category: 'invalid_token', invalidateToken: true, retryable: false }],
    [400, '{"reason":"DeviceTokenNotForTopic"}', { ok: false, category: 'invalid_token', invalidateToken: true }],
    [410, '{"reason":"Unregistered"}', { ok: false, category: 'invalid_token', invalidateToken: true }],
    [403, '{"reason":"ExpiredProviderToken"}', { ok: false, category: 'expired_provider_token', retryable: true }],
    [403, '{"reason":"InvalidProviderToken"}', { ok: false, category: 'auth_error', retryable: false }],
    [429, '{"reason":"TooManyRequests"}', { ok: false, category: 'rate_limited', retryable: true }],
    [500, '{"reason":"InternalServerError"}', { ok: false, category: 'server_error', retryable: true }],
    [503, '', { ok: false, category: 'server_error', retryable: true }],
    [404, '{"reason":"BadPath"}', { ok: false, category: 'bad_payload', retryable: false }],
  ];

  for (const [status, body, expected] of cases) {
    it(`${status} ${body || '(empty)'}`, () => {
      expect(classifyApnsResponse(status, body)).toMatchObject(expected);
    });
  }

  it('survives a body that is not JSON', () => {
    expect(classifyApnsResponse(400, 'garbage').category).toBe('bad_payload');
  });
});

describe('sending one push', () => {
  it('posts to the right host with the Live Activity headers', async () => {
    const credentials = await makeCredentials();
    const fetchImpl = fakeFetch({ status: 200, body: '' });
    const payload = buildLiveActivityPush({ snapshot: SNAPSHOT, now: 1700000000000 });

    const result = await sendLiveActivityPush({
      token: 'a'.repeat(64), environment: 'production', bundleId: BUNDLE, credentials, payload, fetchImpl,
    });

    expect(result).toMatchObject({ ok: true, status: 200, apnsId: 'APNS-ID-1' });
    expect(fetchImpl.calls).toHaveLength(1);
    const { url, init } = fetchImpl.calls[0];
    expect(url).toBe(`https://api.push.apple.com/3/device/${'a'.repeat(64)}`);
    expect(init.method).toBe('POST');
    expect(init.headers['apns-topic']).toBe(`${BUNDLE}.push-type.liveactivity`);
    expect(init.headers['apns-push-type']).toBe('liveactivity');
    expect(init.headers.authorization.startsWith('bearer ')).toBe(true);
    expect(JSON.parse(init.body).aps.event).toBe('update');
  });

  it('never calls the network in a dry run', async () => {
    const credentials = { ...(await makeCredentials()), dryRun: true };
    const fetchImpl = fakeFetch({ status: 200 });
    const result = await sendLiveActivityPush({
      token: 'a'.repeat(64), environment: 'development', bundleId: BUNDLE, credentials, payload: {}, fetchImpl,
    });
    expect(result).toMatchObject({ ok: true, dryRun: true, category: 'dry_run' });
    expect(fetchImpl.calls).toHaveLength(0);
  });

  it('reports missing credentials without calling the network', async () => {
    const fetchImpl = fakeFetch({ status: 200 });
    const result = await sendLiveActivityPush({
      token: 'a'.repeat(64), environment: 'development', bundleId: BUNDLE, credentials: {}, payload: {}, fetchImpl,
    });
    expect(result).toMatchObject({ ok: false, category: 'missing_credentials' });
    expect(fetchImpl.calls).toHaveLength(0);
  });

  it('retires a token APNs says is gone', async () => {
    const credentials = await makeCredentials();
    const fetchImpl = fakeFetch({ status: 410, body: '{"reason":"Unregistered"}' });
    const result = await sendLiveActivityPush({
      token: 'b'.repeat(64), environment: 'development', bundleId: BUNDLE, credentials, payload: {}, fetchImpl,
    });
    expect(result).toMatchObject({ ok: false, category: 'invalid_token', invalidateToken: true });
  });

  it('marks a rate limit as retryable and a bad token as not', async () => {
    const credentials = await makeCredentials();
    const limited = await sendLiveActivityPush({
      token: 'c'.repeat(64), environment: 'development', bundleId: BUNDLE, credentials,
      payload: {}, fetchImpl: fakeFetch({ status: 429, body: '{}' }),
    });
    expect(limited.retryable).toBe(true);

    const badToken = await sendLiveActivityPush({
      token: 'd'.repeat(64), environment: 'development', bundleId: BUNDLE, credentials,
      payload: {}, fetchImpl: fakeFetch({ status: 400, body: '{"reason":"BadDeviceToken"}' }),
    });
    expect(badToken.retryable).toBe(false);
    expect(badToken.invalidateToken).toBe(true);
  });

  it('turns a timeout into a described result, not an exception', async () => {
    const credentials = await makeCredentials();
    const timeoutError = new Error('timed out');
    timeoutError.name = 'TimeoutError';
    const result = await sendLiveActivityPush({
      token: 'e'.repeat(64), environment: 'development', bundleId: BUNDLE, credentials,
      payload: {}, fetchImpl: fakeFetch(timeoutError),
    });
    expect(result).toMatchObject({ ok: false, category: 'timeout', retryable: true, invalidateToken: false });
  });

  it('turns a network failure into a described result', async () => {
    const credentials = await makeCredentials();
    const result = await sendLiveActivityPush({
      token: 'f'.repeat(64), environment: 'development', bundleId: BUNDLE, credentials,
      payload: {}, fetchImpl: fakeFetch(new Error('ECONNRESET')),
    });
    expect(result).toMatchObject({ ok: false, category: 'network_error', retryable: true });
  });
});