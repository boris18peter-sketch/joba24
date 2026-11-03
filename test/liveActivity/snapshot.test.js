import { describe, it, expect } from 'vitest';
import {
  LIVE_ACTIVITY_CONTRACT_VERSION,
  LIVE_ACTIVITY_PHASES,
  buildTaskActivitySnapshot,
  authorizeActivity,
  pickTrackedTask,
  shouldApplySnapshot,
} from '../../base44/shared/taskActivitySnapshot.ts';
import { resolveStatusFlow } from '@/lib/taskStatusFlow';
import { isEngagement, primaryOccurrence, formatOccurrence, scheduleWindows } from '@/lib/scheduling';
import { t } from './labels.js';
import {
  CATEGORY_ROWS, CLIENT, WORKER, STRANGER, NOW, ALL_STATUSES, TERMINAL_STATUSES,
  WORKER_STATUSES, makeTask, scheduledTask, openTask,
} from './fixtures.js';

const WINDOWS = scheduleWindows({});

function snapshotFor(task, role, userId) {
  const flow = resolveStatusFlow(task.category, CATEGORY_ROWS);
  const engagement = isEngagement(task, NOW, WINDOWS);
  return buildTaskActivitySnapshot({
    task,
    role,
    userId: userId || (role === 'worker' ? WORKER : CLIENT),
    flow,
    schedule: {
      isEngagement: engagement,
      occurrenceLabel: engagement ? formatOccurrence(primaryOccurrence(task, NOW)) : null,
    },
    t,
    categoryLabel: 'תחזוקה',
    now: NOW,
    revision: 7,
  });
}

describe('every existing task state', () => {
  it('OPEN with no applicants → the frozen first scanning line', () => {
    const snap = snapshotFor(openTask(0), 'publisher');
    expect(snap.phase).toBe('open');
    expect(snap.title).toBe('מאותת לעובדים');
    expect(snap.subtitle).toBe('המשימה נחשפת לעובדים באזור');
  });

  it('OPEN with applicants → the real applicant sentence and count', () => {
    const snap = snapshotFor(openTask(3), 'publisher');
    expect(snap.title).toBe('3 מועמדויות · לחץ לצפייה ואישור');
    expect(snap.counters.applicants).toBe(3);
    expect(snap.counters.views).toBe(0);
    expect(snap.counters.clicks).toBe(0);
  });

  for (const workerStatus of WORKER_STATUSES) {
    it(`TAKEN, worker_status=${workerStatus || 'null'} is a valid phase`, () => {
      const snap = snapshotFor(makeTask({ worker_status: workerStatus }), 'worker');
      expect(LIVE_ACTIVITY_PHASES).toContain(snap.phase);
      expect(snap.progress.total).toBe(3);
    });
  }

  it('TAKEN scheduled → scheduled, with the agreed time in the subtitle', () => {
    const snap = snapshotFor(scheduledTask(), 'publisher');
    expect(snap.phase).toBe('scheduled');
    expect(snap.subtitle).toContain('ב-');
  });

  for (const status of ALL_STATUSES) {
    it(`status=${status} is handled`, () => {
      const task = makeTask({ status });
      for (const role of ['worker', 'publisher']) {
        const snap = snapshotFor(task, role, undefined);
        if (TERMINAL_STATUSES.includes(status)) {
          expect(snap).toBeNull();
        } else if (status === 'OPEN') {
          // An OPEN task is only ever the PUBLISHER's to track.
          if (role === 'worker') expect(snap).toBeNull();
          else expect(snap.phase).toBe('open');
        } else {
          expect(snap).not.toBeNull();
          expect(LIVE_ACTIVITY_PHASES).toContain(snap.phase);
        }
      }
    });
  }
});

describe('role authorization', () => {
  it('refuses a worker who is not the assigned worker', () => {
    const task = makeTask({ worker_id: STRANGER });
    expect(snapshotFor(task, 'worker')).toBeNull();
    expect(authorizeActivity(task, 'worker', WORKER).reason).toBe('not_assigned');
  });

  it('refuses a publisher who is not the client', () => {
    expect(snapshotFor(makeTask(), 'publisher', STRANGER)).toBeNull();
    expect(authorizeActivity(makeTask(), 'publisher', STRANGER).reason).toBe('not_owner');
  });

  it('refuses worker tracking of an OPEN task', () => {
    expect(snapshotFor(openTask(0), 'worker', WORKER)).toBeNull();
  });

  it('refuses an unknown role and a missing identity', () => {
    expect(authorizeActivity(makeTask(), 'admin', CLIENT).ok).toBe(false);
    expect(authorizeActivity(makeTask(), 'worker', '').ok).toBe(false);
  });

  it('accepts the assigned worker and the owning client', () => {
    expect(authorizeActivity(makeTask(), 'worker', WORKER).ok).toBe(true);
    expect(authorizeActivity(makeTask(), 'publisher', CLIENT).ok).toBe(true);
  });
});

describe('contract shape', () => {
  it('is versioned and deterministic', () => {
    const task = makeTask({ worker_status: 'arrived' });
    const a = snapshotFor(task, 'worker');
    const b = snapshotFor(task, 'worker');
    expect(a.contractVersion).toBe(LIVE_ACTIVITY_CONTRACT_VERSION);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.revision).toBe(7);
    expect(a.deepLink).toBe(`https://joba24.com/?open_task=${task.id}`);
  });

  it('carries stable identification and ordering metadata', () => {
    const task = makeTask();
    const snap = snapshotFor(task, 'worker');
    expect(snap.id).toBe(task.id);
    expect(snap.role).toBe('worker');
    expect(snap.updatedAt).toBe(task.updated_date);
    expect(snap.generatedAt).toBe(new Date(NOW).toISOString());
  });

  it('never mutates the task it reads, and returns an immutable snapshot', () => {
    const task = makeTask({ worker_status: 'on_the_way' });
    const before = JSON.parse(JSON.stringify(task));
    const snap = snapshotFor(task, 'worker');

    expect(task).toEqual(before);
    expect(Object.isFrozen(snap)).toBe(true);
    expect(Object.isFrozen(snap.progress)).toBe(true);
    expect(Object.isFrozen(snap.progress.steps[0])).toBe(true);
  });
});

describe('selection policy (future native layer only)', () => {
  it('prefers my execution, then my TAKEN task, then my OPEN task', () => {
    const myExecution = makeTask({ status: 'TAKEN', worker_id: WORKER, client_id: CLIENT });
    const myTaken = makeTask({ status: 'TAKEN', worker_id: STRANGER, client_id: CLIENT });
    const myOpen = openTask(0);

    const pool = [myOpen, myTaken, myExecution];
    const picked = pickTrackedTask(pool, WORKER);
    expect(picked.task.id).toBe(myExecution.id);
    expect(picked.role).toBe('worker');

    const asClient = pickTrackedTask(pool, CLIENT);
    expect(asClient.task.id).toBe(myExecution.id);
    expect(asClient.tier).toBe(1);
  });

  it('is stable when two candidates carry the same timestamp', () => {
    const stamp = new Date(NOW).toISOString();
    const a = makeTask({ status: 'OPEN', client_id: CLIENT, created_date: stamp, updated_date: stamp });
    const b = makeTask({ status: 'OPEN', client_id: CLIENT, created_date: stamp, updated_date: stamp });

    const first = pickTrackedTask([a, b], CLIENT);
    const reversed = pickTrackedTask([b, a], CLIENT);
    expect(first.task.id).toBe(reversed.task.id);
  });

  it('returns nothing when the user owns no trackable task', () => {
    expect(pickTrackedTask([makeTask({ client_id: STRANGER, worker_id: STRANGER })], CLIENT)).toBeNull();
  });
});

describe('stale update protection', () => {
  const base = { revision: 5, updatedAt: '2026-11-03T12:00:00.000Z' };

  it('accepts a newer revision and rejects an older one', () => {
    expect(shouldApplySnapshot(base, { revision: 6, updatedAt: base.updatedAt })).toBe(true);
    expect(shouldApplySnapshot(base, { revision: 4, updatedAt: base.updatedAt })).toBe(false);
  });

  it('uses updatedAt as the tie-break and ignores exact duplicates', () => {
    expect(shouldApplySnapshot(base, { revision: 5, updatedAt: '2026-11-03T12:00:01.000Z' })).toBe(true);
    expect(shouldApplySnapshot(base, { ...base })).toBe(false);
  });

  it('accepts the first snapshot and never applies a missing one', () => {
    expect(shouldApplySnapshot(null, base)).toBe(true);
    expect(shouldApplySnapshot(base, null)).toBe(false);
  });
});