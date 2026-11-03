import { describe, it, expect } from 'vitest';
import { buildTaskActivitySnapshot } from '../../base44/shared/taskActivitySnapshot.ts';
import { resolveStatusFlow } from '@/lib/taskStatusFlow';
import { isEngagement, primaryOccurrence, formatOccurrence, scheduleWindows } from '@/lib/scheduling';
import { t, REQUIRED_KEYS } from './labels.js';
import { bannerPresentation, openCardPresentation } from './bannerOracle.js';
import {
  CATEGORY_ROWS, CLIENT, WORKER, NOW, WORKER_STATUSES,
  makeTask, scheduledTask, openTask,
} from './fixtures.js';

const WINDOWS = scheduleWindows({});
const labelOf = (key) => (CATEGORY_ROWS.find((c) => c.category_key === key) || {}).label || '';

/**
 * Everything the builder needs is computed by the APP's own code — the flow by
 * resolveStatusFlow, the schedule state by isEngagement/primaryOccurrence/
 * formatOccurrence. The builder is handed the result and may not re-derive it.
 */
function snapshotFor(task, role) {
  const flow = resolveStatusFlow(task.category, CATEGORY_ROWS);
  const engagement = isEngagement(task, NOW, WINDOWS);
  return buildTaskActivitySnapshot({
    task,
    role,
    userId: role === 'worker' ? WORKER : CLIENT,
    flow,
    schedule: {
      isEngagement: engagement,
      occurrenceLabel: engagement ? formatOccurrence(primaryOccurrence(task, NOW)) : null,
    },
    t,
    categoryLabel: labelOf(task.category),
    now: NOW,
    revision: 1,
  });
}

describe('translation surface', () => {
  it('resolves every key the contract reads from the shipped dictionary', () => {
    for (const key of REQUIRED_KEYS) {
      const value = t(key);
      expect(value, `missing translation: ${key}`).not.toBe(key);
      expect(value, `empty translation: ${key}`).toBeTruthy();
    }
  });
});

describe('parity — TAKEN task, both roles, every worker_status', () => {
  for (const workerStatus of WORKER_STATUSES) {
    for (const role of ['worker', 'publisher']) {
      it(`${role} / ${workerStatus || 'not started'} (generic flow)`, () => {
        const task = makeTask({ worker_status: workerStatus });
        const oracle = bannerPresentation(task, { role, catRows: CATEGORY_ROWS, now: NOW, t });
        const snap = snapshotFor(task, role);

        expect(snap).not.toBeNull();
        expect(snap.title).toBe(oracle.title);
        expect(snap.subtitle).toBe(oracle.subtitle);
        expect(snap.phase).toBe(oracle.phase);
        expect(snap.iconKey).toBe(oracle.iconKey);
        expect(snap.colorKey).toBe(oracle.colorKey);
        expect(snap.progress.step).toBe(oracle.stepIdx);
        expect(snap.progress.steps).toEqual(oracle.progressSteps);
      });
    }
  }
});

describe('parity — legacy live statuses (never written, still read by the app)', () => {
  for (const status of ['APPROVED_PENDING_DEPARTURE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS']) {
    it(`${status} / worker quotes no button, exactly like the banner`, () => {
      const task = makeTask({ status, worker_status: 'on_the_way' });
      const oracle = bannerPresentation(task, { role: 'worker', catRows: CATEGORY_ROWS, now: NOW, t });
      const snap = snapshotFor(task, 'worker');

      expect(oracle.nextBtnLabel ?? null).toBeNull();
      expect(snap).not.toBeNull();
      expect(snap.title).toBe(oracle.title);
      expect(snap.subtitle).toBe(oracle.subtitle);
      expect(snap.colorKey).toBeNull();
    });
  }
});

describe('parity — TAKEN engagement (scheduled ahead), both roles', () => {
  for (const workerStatus of [null, 'on_the_way']) {
    for (const role of ['worker', 'publisher']) {
      it(`${role} / ${workerStatus || 'not started'} scheduled`, () => {
        const task = scheduledTask({ worker_status: workerStatus });
        const oracle = bannerPresentation(task, { role, catRows: CATEGORY_ROWS, now: NOW, t });
        const snap = snapshotFor(task, role);

        expect(oracle.isUpcoming).toBe(true);
        expect(snap.phase).toBe('scheduled');
        expect(snap.title).toBe(oracle.title);
        expect(snap.subtitle).toBe(oracle.subtitle);
        expect(snap.subtitle).not.toContain('{when}');
        expect(snap.subtitle).not.toBe('');
        expect(snap.iconKey).toBe('calendar');
        expect(snap.colorKey).toBeNull();
      });
    }
  }
});

describe('parity — category-specific status flows', () => {
  for (const category of ['events', 'dj_service']) {
    for (const workerStatus of WORKER_STATUSES) {
      for (const role of ['worker', 'publisher']) {
        it(`${category} / ${role} / ${workerStatus || 'not started'}`, () => {
          const task = makeTask({ category, worker_status: workerStatus });
          const oracle = bannerPresentation(task, { role, catRows: CATEGORY_ROWS, now: NOW, t });
          const snap = snapshotFor(task, role);

          expect(snap).not.toBeNull();
          expect(snap.title).toBe(oracle.title);
          expect(snap.subtitle).toBe(oracle.subtitle);
          expect(snap.phase).toBe(oracle.phase);
          expect(snap.iconKey).toBe(oracle.iconKey);
          expect(snap.progress.steps).toEqual(oracle.progressSteps);
        });
      }
    }
  }

  it('uses the inherited service wording, not the generic fallback', () => {
    const task = makeTask({ category: 'dj_service', worker_status: 'arrived' });
    const snap = snapshotFor(task, 'worker');

    // Arrival is overridden on the service, on_the_way is inherited from its root.
    expect(snap.title).toBe('הציוד מורכב');
    expect(snap.progress.steps.map((s) => s.label))
      .toEqual(['בדרך לאירוע', 'הציוד מורכב', 'סיימתי את העבודה']);
  });
});

describe('parity — OPEN task, publisher', () => {
  for (const count of [0, 1, 5]) {
    it(`${count} applicants`, () => {
      const task = openTask(count);
      const oracle = openCardPresentation(task, { t, categoryLabel: labelOf(task.category) });
      const snap = snapshotFor(task, 'publisher');

      expect(snap.phase).toBe('open');
      expect(snap.title).toBe(oracle.title);
      expect(snap.subtitle).toBe(oracle.subtitle);
      expect(snap.counters.applicants).toBe(count);
    });
  }
});