import { describe, it, expect } from 'vitest';
import { planLiveActivityDispatch } from '../../base44/shared/liveActivityDispatch.ts';
import { buildCompletionRatingCard, buildRatingSnapshot } from '../../base44/shared/liveActivityRating.ts';
import { buildLiveUpdateData } from '../../base44/shared/liveActivityFcm.ts';
import { normalizeConfig } from '../../base44/shared/liveActivityConfig.ts';
import { makeTask, CLIENT, WORKER } from './fixtures.js';
import { t } from './labels.js';

/**
 * ── THE STARS HAVE TO ARRIVE ────────────────────────────────────────────────
 * The widget draws five stars the moment a card carries `rating`, and the planner
 * has always accepted ONE non-ending snapshot for a completed task. What was
 * missing was the snapshot itself on the dispatch path: the completion sent the
 * ordinary flow snapshot, the planner took its terminal branch, and the card was
 * ended — so no phone ever received a star row, on iOS or on Android.
 *
 * These cases pin the chain that fixes it, without a network call:
 *   task completed → the ASK is built → the planner chooses `send`, not `end`
 *                  → the same object travels to Android verbatim.
 */

const ARMED = normalizeConfig({ enabled: true, dry_run: false });
const NOW = Date.parse('2026-11-10T12:00:00Z');

const fakeBase44 = (reviews) => ({
  asServiceRole: {
    entities: {
      Review: { filter: async () => reviews },
    },
  },
});

const completedTask = () => makeTask({
  status: 'COMPLETED',
  completed_at: '2026-11-10T11:00:00Z',
});

describe('a completed task turns the card into the rating ask', () => {
  it('builds the ask for a participant who has not rated', async () => {
    const task = completedTask();
    const card = await buildCompletionRatingCard(fakeBase44([]), {
      task,
      role: 'publisher',
      recipientId: CLIENT,
      revision: 4,
    });

    expect(card).toBeTruthy();
    expect(card.phase).toBe('rate');
    expect(card.rating).toEqual({
      prompt: t('cm_how_was', { name: task.worker_name }),
      value: null,
    });
    // The body tap opens the app on the ask, not on the task screen.
    expect(card.deepLink).toContain('rate=1');
  });

  it('plans it as a SEND — the card is updated, not closed', () => {
    const task = completedTask();
    const snapshot = buildRatingSnapshot({ task, role: 'publisher', revision: 5, ratedStars: null });

    const plan = planLiveActivityDispatch({
      task,
      role: 'publisher',
      userId: CLIENT,
      config: ARMED,
      state: { revision: 4, terminal: false, phase: 'arrived' },
      snapshot,
      now: NOW,
    });

    expect(plan.kind).toBe('send');
    expect(plan.snapshot?.rating).toBeTruthy();
    expect(plan.snapshot?.revision).toBe(5);
  });

  it('ends instead, for a participant who already rated', async () => {
    const task = completedTask();
    const card = await buildCompletionRatingCard(fakeBase44([{ id: 'r1' }]), {
      task,
      role: 'publisher',
      recipientId: CLIENT,
      revision: 6,
    });
    expect(card).toBeNull();

    const plan = planLiveActivityDispatch({
      task,
      role: 'publisher',
      userId: CLIENT,
      config: ARMED,
      state: { revision: 5, terminal: false, phase: 'rate' },
      snapshot: null,
      now: NOW,
    });
    expect(plan.kind).toBe('end');
  });

  it('never asks a stranger, a cancelled job, or the wrong side', async () => {
    expect(await buildCompletionRatingCard(fakeBase44([]), {
      task: completedTask(), role: 'publisher', recipientId: WORKER,
    })).toBeNull();

    expect(await buildCompletionRatingCard(fakeBase44([]), {
      task: makeTask({ status: 'CANCELLED' }), role: 'publisher', recipientId: CLIENT,
    })).toBeNull();
  });

  it('carries the ask to Android in the same object', () => {
    const task = completedTask();
    const snapshot = buildRatingSnapshot({ task, role: 'worker', revision: 7, ratedStars: null });
    const data = buildLiveUpdateData({ snapshot, event: 'update' });

    const decoded = JSON.parse(data.joba_snapshot);
    expect(decoded.phase).toBe('rate');
    expect(decoded.rating.value).toBeNull();
    expect(decoded.rating.prompt.length).toBeGreaterThan(0);
  });

  it('shows the answer once it exists, and stops asking', () => {
    const task = completedTask();
    const answered = buildRatingSnapshot({ task, role: 'publisher', revision: 8, ratedStars: 4 });

    expect(answered.rating.value).toBe(4);
    expect(answered.rating.prompt).toBe('');
    expect(answered.deepLink).not.toContain('rate=1');
  });
});