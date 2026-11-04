import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  PRESENTATION_VERSION,
  categoryFingerprint,
  categoryContentKey,
  fingerprintCategories,
  detectContentChanges,
  affectedCategoryKeys,
  retryDelayMs,
  isDue,
  nextVersionState,
  MAX_CONTENT_REFRESH_ATTEMPTS,
} from '../../base44/shared/liveActivityContent.ts';
import { buildBackendSnapshot } from '../../base44/shared/liveActivitySnapshot.ts';
import { planLiveActivityDispatch, snapshotContentKey } from '../../base44/shared/liveActivityDispatch.ts';
import { normalizeConfig } from '../../base44/shared/liveActivityConfig.ts';
import { CATEGORY_ROWS, NOW, WORKER, makeTask } from './fixtures.js';

/**
 * Content-driven refresh.
 *
 * Two halves, both worth testing:
 *   1. the FINGERPRINT — does a wording edit get noticed at all, including
 *      through inheritance, and does an irrelevant edit stay quiet?
 *   2. the DISPATCH it causes — a re-worded card must actually be pushed even
 *      though the task (and therefore the revision) never changed, and an
 *      unchanged one must not be.
 */

const here = new URL('.', import.meta.url).pathname;
const read = (rel) => readFileSync(resolve(here, rel), 'utf8');

/** A copy of the catalogue with one category's wording replaced. */
function reword(rows, key, patch) {
  return rows.map((row) => (row.category_key === key ? { ...row, ...patch(row) } : row));
}

const CONFIG = normalizeConfig({ enabled: true, dry_run: true });

describe('a category fingerprint covers exactly what a card can show', () => {
  const base = CATEGORY_ROWS;

  it('is stable for unchanged content', () => {
    expect(categoryFingerprint('dj_service', base)).toBe(categoryFingerprint('dj_service', base));
    expect(categoryFingerprint('dj_service', base)).toMatch(/^[0-9a-f]{8}$/);
  });

  it('changes when a STEP LABEL is renamed on the category itself', () => {
    const edited = reword(base, 'events', (row) => ({
      status_flow: {
        ...row.status_flow,
        steps: row.status_flow.steps.map((s) => (s.key === 'arrived' ? { ...s, label: 'הגעתי לאולם' } : s)),
      },
    }));
    expect(categoryFingerprint('events', edited)).not.toBe(categoryFingerprint('events', base));
  });

  it('changes a CHILD that inherits the renamed wording — with no child edit at all', () => {
    const edited = reword(base, 'events', (row) => ({
      status_flow: {
        ...row.status_flow,
        cta: { ...row.status_flow.cta, on_the_way: { label: 'יוצא לאירוע עכשיו' } },
      },
    }));
    // The service overrides `arrived` and `done` only, so the root's
    // `on_the_way` CTA is what its card shows.
    expect(categoryFingerprint('dj_service', edited)).not.toBe(categoryFingerprint('dj_service', base));
  });

  it('leaves a SIBLING untouched when only one branch is re-worded', () => {
    const edited = reword(base, 'events', () => ({ label: 'אירועים וחלקים' }));
    expect(categoryFingerprint('maintenance', edited)).toBe(categoryFingerprint('maintenance', base));
  });

  it('ignores fields the card never draws', () => {
    const edited = reword(base, 'events', () => ({
      description: 'תיאור חדש לגמרי',
      description_example: 'דוגמה חדשה',
      examples: ['משהו אחר'],
      helper_copy: 'טקסט עזר',
      sort_order: 99,
      fields: [{ key: 'x', label: 'שדה' }],
      fee: { application_fee_percent: 12 },
    }));
    expect(categoryFingerprint('events', edited)).toBe(categoryFingerprint('events', base));
  });

  it('treats a CONTRACT code change as every category changing (versioned reconciliation)', () => {
    expect(categoryContentKey('dj_service', base, 2)).not.toBe(categoryContentKey('dj_service', base, 3));
    expect(PRESENTATION_VERSION).toBeGreaterThan(0);
    const current = fingerprintCategories(base, 2);
    const bumped = fingerprintCategories(base, 3);
    for (const key of Object.keys(current)) expect(bumped[key]).not.toBe(current[key]);
  });
});

describe('change detection', () => {
  const current = fingerprintCategories(CATEGORY_ROWS);

  it('baselines a category it has never seen instead of refreshing it', () => {
    const { baseline, changed } = detectContentChanges({ previous: [], current });
    expect(baseline.sort()).toEqual(Object.keys(current).sort());
    expect(changed).toEqual([]);
  });

  it('reports only the categories whose wording actually moved', () => {
    // Everything stored as it is now, except one category whose stored
    // fingerprint is the pre-edit one.
    const previous = Object.entries(current)
      .map(([category_key, fingerprint]) => ({ category_key, fingerprint: category_key === 'events' ? 'deadbeef' : fingerprint }));
    const { changed, baseline } = detectContentChanges({ previous, current });
    expect(changed).toEqual(['events']);
    expect(baseline).toEqual([]);
  });

  it('reports nothing when the stored fingerprints already match', () => {
    const previous = Object.entries(current).map(([category_key, fingerprint]) => ({ category_key, fingerprint }));
    const { changed, unchanged } = detectContentChanges({ previous, current });
    expect(changed).toEqual([]);
    expect(unchanged.sort()).toEqual(Object.keys(current).sort());
  });

  it('notices a category removed from the catalogue', () => {
    const previous = [
      ...Object.entries(current).map(([category_key, fingerprint]) => ({ category_key, fingerprint })),
      { category_key: 'retired_service', fingerprint: 'deadbeef' },
    ];
    const { removed } = detectContentChanges({ previous, current });
    expect(removed).toEqual(['retired_service']);
  });
});

describe('which cards a change can reach', () => {
  it('includes descendants at any depth and nothing unrelated', () => {
    const rows = [
      ...CATEGORY_ROWS,
      { category_key: 'dj_big', label: 'די.ג׳י גדול', node_type: 'service', parent_key: 'dj_service' },
      { category_key: 'plumbing', label: 'אינסטלציה', node_type: 'root', parent_key: '' },
    ];
    const affected = affectedCategoryKeys(['events'], rows);
    expect(affected).toContain('events');
    expect(affected).toContain('dj_service');
    expect(affected).toContain('dj_big');
    expect(affected).not.toContain('plumbing');
  });

  it('survives a malformed parent cycle without looping', () => {
    const rows = [
      { category_key: 'a', parent_key: 'b' },
      { category_key: 'b', parent_key: 'a' },
    ];
    expect(affectedCategoryKeys(['a'], rows).length).toBeLessThanOrEqual(3);
  });

  it('returns nothing when nothing changed', () => {
    expect(affectedCategoryKeys([], CATEGORY_ROWS)).toEqual([]);
  });
});

describe('retry policy is bounded', () => {
  it('backs off and then gives up', () => {
    let attempts = 0;
    const results = [];
    for (let i = 0; i < MAX_CONTENT_REFRESH_ATTEMPTS + 2; i += 1) {
      const next = nextVersionState({ attempts, failures: 1, now: NOW });
      results.push(next);
      attempts = next.attempts;
    }
    expect(results[0].pending).toBe(true);
    expect(results[0].next_attempt_at).toBeTruthy();
    expect(results[results.length - 1].pending).toBe(false);
    expect(results[results.length - 1].last_result).toBe('gave_up');
  });

  it('closes a change that produced no failure', () => {
    expect(nextVersionState({ attempts: 2, failures: 0, result: 'refreshed' }))
      .toMatchObject({ pending: false, attempts: 0, last_error: '' });
  });

  it('skips a row that is not due yet, and one at the attempt ceiling', () => {
    const now = Date.parse('2026-11-03T12:00:00.000Z');
    expect(isDue({ pending: true, attempts: 1, next_attempt_at: new Date(now + retryDelayMs(1)).toISOString() }, now)).toBe(false);
    expect(isDue({ pending: true, attempts: 1, next_attempt_at: new Date(now - 1000).toISOString() }, now)).toBe(true);
    expect(isDue({ pending: true, attempts: MAX_CONTENT_REFRESH_ATTEMPTS, next_attempt_at: null }, now)).toBe(false);
    expect(isDue({ pending: false, attempts: 0 }, now)).toBe(false);
  });
});

describe('a re-worded card is pushed although the task never changed', () => {
  const task = makeTask({ status: 'TAKEN', category: 'dj_service', worker_status: 'on_the_way' });
  const revision = 7;

  const build = (categories) => buildBackendSnapshot({
    task, role: 'worker', userId: WORKER, categories, settings: {}, revision, now: NOW,
  });

  const before = build(CATEGORY_ROWS);
  const reworded = reword(CATEGORY_ROWS, 'events', (row) => ({
    status_flow: {
      ...row.status_flow,
      steps: row.status_flow.steps.map((s) => (s.key === 'on_the_way' ? { ...s, label: 'בדרך לאירוע שלך' } : s)),
    },
  }));
  const after = build(reworded);

  const state = (snapshot) => ({
    revision,
    phase: snapshot.phase,
    content_key: snapshotContentKey(snapshot),
    terminal: false,
  });

  it('carries the new wording into the snapshot', () => {
    expect(snapshotContentKey(after)).not.toBe(snapshotContentKey(before));
  });

  it('is refused as duplicate before the edit and dispatched after it — same revision', () => {
    const duplicate = planLiveActivityDispatch({
      task, role: 'worker', userId: WORKER, config: CONFIG, state: state(before), snapshot: before, eventRevision: revision,
    });
    expect(duplicate.decision).toBe('duplicate');

    const refresh = planLiveActivityDispatch({
      task, role: 'worker', userId: WORKER, config: CONFIG, state: state(before), snapshot: after, eventRevision: revision,
    });
    expect(refresh.decision).toBe('send');
    expect(refresh.revision).toBe(revision + 1);
    expect(refresh.kind).toBe('send');
  });

  it('still refuses a genuinely older revision', () => {
    const stale = planLiveActivityDispatch({
      task, role: 'worker', userId: WORKER, config: CONFIG, state: state(before), snapshot: after, eventRevision: revision - 1,
    });
    expect(stale.decision).toBe('stale_revision');
  });

  it('stays inert while the feature is disabled', () => {
    const off = planLiveActivityDispatch({
      task, role: 'worker', userId: WORKER, config: normalizeConfig({ enabled: false }), state: state(before), snapshot: after,
    });
    expect(off.decision).toBe('disabled');
  });
});

describe('the refresh pass observes the pipeline rules', () => {
  const source = read('../../base44/functions/liveActivityContentRefresh/entry.ts');
  const sender = read('../../base44/shared/liveActivitySend.ts');
  const dispatchEntry = read('../../base44/functions/liveActivityDispatch/entry.ts');
  const versionEntity = read('../../base44/entities/LiveActivityContentVersion.jsonc');

  it('never writes to a Task', () => {
    const writes = /entities\.Task\.(update|updateMany|bulkUpdate|create|bulkCreate|delete|deleteMany)/;
    expect(writes.test(source)).toBe(false);
    expect(writes.test(sender)).toBe(false);
    expect(source).toContain('entities.Task');
    expect(source).toMatch(/\.filter\(/);
  });

  it('touches no payment, credit, auth or FCM surface', () => {
    for (const forbidden of ['CreditTransaction', 'TranzilaPayment', 'IosPurchase', 'fcm', 'firebase', 'SendPushNotification']) {
      expect(source.includes(forbidden)).toBe(false);
    }
  });

  it('checks the flag before it scans anything', () => {
    const flag = source.indexOf('if (!config.enabled)');
    const scan = source.indexOf('fingerprintCategories(');
    expect(flag).toBeGreaterThan(-1);
    expect(scan).toBeGreaterThan(flag);
  });

  it('sends through the shared sender, never its own APNs call', () => {
    expect(source).toContain("from '../../shared/liveActivitySend.ts'");
    expect(source).toContain('dispatchRecipient');
    expect(source.includes('sendLiveActivityPush')).toBe(false);
    expect(dispatchEntry).toContain('dispatchRecipient');
    expect(dispatchEntry.includes('sendLiveActivityPush')).toBe(false);
  });

  it('is limited: one dispatch per recipient, a capped recipient count, bounded passes', () => {
    expect(source).toContain('MAX_CATEGORIES_PER_PASS');
    expect(source).toContain('MAX_RECIPIENTS');
    expect(source).toContain('Math.min(Math.max(Math.floor(requested), 1), MAX_RECIPIENTS)');
    expect(source).toContain('slice(0, MAX_CATEGORIES_PER_PASS)');
    expect(source).toContain('isDue(');
    expect(source).toContain('nextVersionState(');
  });

  it('is admin- or service-callable only', () => {
    expect(source).toContain('requireInternalOperator');
  });

  it('is dispatched through the dry-run pipeline, not around it', () => {
    expect(source).toContain("mode: 'dispatch'");
    expect(source).not.toContain('willContactApns');
    // The APNs decision stays inside the one shared sender. It is now made PER
    // RECIPIENT (`mayContactApnsFor`), which is the same global rule for every
    // ordinary user and the allowlist rule for a real-task test user — so the
    // caller still has no say, and no second place can arm a push.
    expect(sender).toContain('mayContactApnsFor(config, recipientId)');
    expect(sender).toContain('isTrackedRecipient(config, recipientId)');
  });

  it('keeps its bookkeeping table admin-only', () => {
    expect(versionEntity).toContain('"name": "LiveActivityContentVersion"');
    expect((versionEntity.match(/"role": "admin"/g) || []).length).toBe(4);
  });
});