import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The web → ActivityKit bridge, exercised as the app uses it.
 *
 * Start / Update / End are the three calls whose answer the UI trusts, so what
 * matters here is that the bridge reports what iOS actually said: a no-op must
 * never look like a success, and a native failure must never throw into the app.
 * The Swift side cannot be compiled in this environment, so this is the closest
 * regression guard around the contract those three methods return.
 */

const plugin = {
  isAvailable: vi.fn(),
  start: vi.fn(),
  update: vi.fn(),
  end: vi.fn(),
  activeActivities: vi.fn(),
  setActionAuth: vi.fn(),
  addListener: vi.fn(() => ({ remove: vi.fn() })),
};

const env = { native: true, platform: 'ios' };

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => env.native,
    getPlatform: () => env.platform,
  },
  registerPlugin: () => plugin,
}));

vi.mock('@/api/base44Client', () => ({
  base44: { functions: { invoke: vi.fn().mockResolvedValue({ data: {} }) } },
}));

const bridge = await import('@/lib/liveActivityNative');

const STATE = { title: 'בדיקה', phase: 'on_the_way', revision: 3 };

beforeEach(() => {
  env.native = true;
  env.platform = 'ios';
  for (const fn of Object.values(plugin)) {
    if (typeof fn?.mockClear === 'function') fn.mockClear();
  }
  plugin.addListener.mockReturnValue({ remove: vi.fn() });
});

describe('outside the native iOS app nothing is attempted', () => {
  it('reports not_native for start, update and end, and never calls the plugin', async () => {
    env.native = false;
    expect(await bridge.startTaskActivity({ taskId: 't1', state: STATE })).toMatchObject({ started: false, reason: 'not_native' });
    expect(await bridge.updateTaskActivity({ taskId: 't1', state: STATE })).toMatchObject({ updated: false, reason: 'not_native' });
    expect(await bridge.endTaskActivity({ taskId: 't1' })).toMatchObject({ ended: false, reason: 'not_native' });
    expect(plugin.start).not.toHaveBeenCalled();
    expect(plugin.update).not.toHaveBeenCalled();
    expect(plugin.end).not.toHaveBeenCalled();
  });

  it('treats Android as not native for Live Activities', async () => {
    env.platform = 'android';
    expect(await bridge.startTaskActivity({ taskId: 't1', state: STATE })).toMatchObject({ reason: 'not_native' });
  });
});

describe('start', () => {
  it('passes the contract state straight through and reports the activity', async () => {
    plugin.start.mockResolvedValue({ started: true, activityId: 'act_1' });
    const result = await bridge.startTaskActivity({ taskId: 't1', role: 'worker', state: STATE });
    expect(plugin.start).toHaveBeenCalledWith({ taskId: 't1', role: 'worker', state: STATE });
    expect(result).toEqual({ started: true, activityId: 'act_1', reason: '' });
  });

  it('defaults the role to publisher and refuses a half-built call', async () => {
    plugin.start.mockResolvedValue({ started: true, activityId: 'act_2' });
    await bridge.startTaskActivity({ taskId: 't1', state: STATE });
    expect(plugin.start.mock.calls[0][0].role).toBe('publisher');
    expect(await bridge.startTaskActivity({ taskId: 't1' })).toMatchObject({ started: false, reason: 'missing_input' });
  });

  it('turns a native rejection into a described result instead of throwing', async () => {
    plugin.start.mockRejectedValue(new Error('ActivityKit refused'));
    await expect(bridge.startTaskActivity({ taskId: 't1', state: STATE })).resolves.toMatchObject({ started: false, reason: 'plugin_error' });
  });
});

describe('update', () => {
  it('reports an applied update with its counts', async () => {
    plugin.update.mockResolvedValue({ updated: true, count: 1, skipped: 0 });
    expect(await bridge.updateTaskActivity({ taskId: 't1', role: 'worker', state: STATE }))
      .toEqual({ updated: true, count: 1, skipped: 0, reason: '' });
  });

  it('does not dress up a refused revision as success', async () => {
    plugin.update.mockResolvedValue({ updated: false, count: 0, skipped: 1, reason: 'stale_revision' });
    expect(await bridge.updateTaskActivity({ taskId: 't1', state: STATE })).toMatchObject({ updated: false, skipped: 1, reason: 'stale_revision' });
  });

  it('reports the honest no-activity case', async () => {
    plugin.update.mockResolvedValue({ updated: false, count: 0, reason: 'no_activity' });
    expect(await bridge.updateTaskActivity({ taskId: 't1', state: STATE })).toMatchObject({ updated: false, reason: 'no_activity' });
  });
});

describe('end', () => {
  it('dismisses immediately by default and passes the role through', async () => {
    plugin.end.mockResolvedValue({ ended: true, count: 1, activityIds: ['act_1'], dismissAfter: 0, remaining: 0 });
    const result = await bridge.endTaskActivity({ taskId: 't1', role: 'worker' });
    expect(plugin.end).toHaveBeenCalledWith({ taskId: 't1', role: 'worker', state: null, dismissAfter: 0, all: false });
    expect(result).toMatchObject({ ended: true, count: 1, activityIds: ['act_1'], remaining: 0 });
  });

  it('reports a no-op as a no-op', async () => {
    plugin.end.mockResolvedValue({ ended: false, count: 0, remaining: 0, reason: 'no_activity' });
    expect(await bridge.endTaskActivity({ taskId: 't1' })).toMatchObject({ ended: false, count: 0, reason: 'no_activity' });
  });

  it('works without a task when it is closing everything on the device', async () => {
    plugin.end.mockResolvedValue({ ended: true, count: 2, remaining: 0 });
    expect(await bridge.endAllActivities()).toMatchObject({ ended: true, count: 2 });
    expect(plugin.end).toHaveBeenCalledWith({ taskId: undefined, role: 'publisher', state: null, dismissAfter: 0, all: true });
  });

  it('refuses an end with neither a task nor all=true', async () => {
    expect(await bridge.endTaskActivity({})).toMatchObject({ ended: false, reason: 'missing_input' });
    expect(plugin.end).not.toHaveBeenCalled();
  });
});

describe('availability', () => {
  it('passes the device answer through, including its reason', async () => {
    plugin.isAvailable.mockResolvedValue({ available: false, reason: 'activities_disabled' });
    expect(await bridge.liveActivityAvailability()).toMatchObject({ available: false, reason: 'activities_disabled' });
  });

  it('treats a missing plugin as unavailable rather than an error', async () => {
    plugin.isAvailable.mockRejectedValue(new Error('not implemented'));
    expect(await bridge.liveActivityAvailability()).toMatchObject({ available: false, reason: 'plugin_unavailable' });
  });
});