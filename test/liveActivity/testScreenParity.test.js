import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildTaskActivitySnapshot as serverContract } from '../../base44/shared/taskActivitySnapshot.ts';
import { buildTaskActivitySnapshot as clientContract } from '@/lib/liveActivityContract';
import {
  buildTestSnapshot,
  buildTestTask,
  pickTestCategory,
  firstAssignedStage,
  stagesForRole,
  TEST_STAGES,
  TEST_TASK_ID,
} from '@/lib/liveActivityTestState';
import { resolveStatusFlow } from '@/lib/taskStatusFlow';
import { isEngagement, primaryOccurrence, formatOccurrence, scheduleWindows } from '@/lib/scheduling';
import { t } from './labels.js';
import { CATEGORY_ROWS, NOW } from './fixtures.js';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '../..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

const VIEWER = 'local-test-viewer';
const CATEGORY = pickTestCategory(CATEGORY_ROWS);
const WINDOWS = scheduleWindows({});
const plain = (value) => JSON.parse(JSON.stringify(value));

/**
 * The snapshot the SERVER contract would produce for the very task the test
 * screen builds. This is the reference the screen is measured against.
 */
function serverSnapshotFor(stage, role) {
  const task = buildTestTask({ stage, role, userId: VIEWER, categoryKey: CATEGORY.category_key, now: NOW });
  const flow = resolveStatusFlow(task.category, CATEGORY_ROWS);
  const engagement = isEngagement(task, NOW, WINDOWS);
  const occurrence = engagement ? primaryOccurrence(task, NOW) : null;
  return serverContract({
    task,
    role: role === 'worker' ? 'worker' : 'publisher',
    userId: VIEWER,
    flow,
    schedule: {
      isEngagement: engagement,
      occurrenceLabel: occurrence ? formatOccurrence(occurrence) : '',
    },
    t,
    categoryLabel: CATEGORY.label,
    now: NOW,
    revision: 5,
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   1. The test screen shows the SERVER contract's own words
   ══════════════════════════════════════════════════════════════════════════ */
describe('the local test screen renders the real mapping', () => {
  it('builds from a real service category, not an invented one', () => {
    expect(CATEGORY).toBeTruthy();
    expect(CATEGORY.node_type).toBe('service');
    // dj_service overrides ONE step, so the resolved flow proves inheritance
    // rather than a generic fallback.
    const flow = resolveStatusFlow(CATEGORY.category_key, CATEGORY_ROWS);
    expect(flow.steps.map((s) => s.label)).toEqual(['בדרך לאירוע', 'הציוד מורכב', 'סיימתי את העבודה']);
  });

  for (const stage of TEST_STAGES) {
    for (const role of ['publisher', 'worker']) {
      it(`${stage.key} / ${role} is byte-identical to the server contract`, () => {
        const screen = buildTestSnapshot({
          stage: stage.key,
          role,
          revision: 5,
          userId: VIEWER,
          t,
          catRows: CATEGORY_ROWS,
          settings: {},
          now: NOW,
        });
        const expected = serverSnapshotFor(stage.key, role);

        if (!stage.roles.includes(role)) {
          // The screen must refuse a stage the role cannot own — not relabel it.
          expect(screen).toBeNull();
          expect(expected).toBeNull();
          return;
        }
        expect(plain(screen)).toEqual(plain(expected));
        expect(screen.title).toBeTruthy();
      });
    }
  }

  it('has no hand-written status copy left in the fixture', () => {
    const fixture = read('src/lib/liveActivityTestState.js');
    // The fixture may DESCRIBE the old copy in its comments, but it must not
    // carry a hand-written ladder: the old PHASES/STEPS tables are what made the
    // screen's words unrelated to the app's.
    expect(fixture).not.toContain('const PHASES');
    expect(fixture).not.toContain('const STEPS');
    expect(fixture).toContain('buildTaskActivitySnapshot');
  });

  it('never reads or writes a task on the server', () => {
    const fixture = read('src/lib/liveActivityTestState.js');
    expect(fixture).not.toContain('base44.entities.Task');
    expect(fixture).not.toContain('base44.functions');
    expect(TEST_TASK_ID.startsWith('joba-local')).toBe(true);
    expect(firstAssignedStage('publisher')).toBe('awaiting_start');
    expect(stagesForRole('worker').some((s) => s.key === 'open')).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   2. The client mirror cannot drift from the backend contract
   ══════════════════════════════════════════════════════════════════════════ */
describe('client contract mirror', () => {
  for (const stage of TEST_STAGES) {
    for (const role of ['publisher', 'worker']) {
      it(`${stage.key} / ${role} matches the backend builder exactly`, () => {
        const task = buildTestTask({ stage: stage.key, role, userId: VIEWER, categoryKey: CATEGORY.category_key, now: NOW });
        const flow = resolveStatusFlow(task.category, CATEGORY_ROWS);
        const engagement = isEngagement(task, NOW, WINDOWS);
        const occurrence = engagement ? primaryOccurrence(task, NOW) : null;
        const input = {
          task,
          role: role === 'worker' ? 'worker' : 'publisher',
          userId: VIEWER,
          flow,
          schedule: { isEngagement: engagement, occurrenceLabel: occurrence ? formatOccurrence(occurrence) : '' },
          t,
          categoryLabel: CATEGORY.label,
          now: NOW,
          revision: 2,
        };

        expect(plain(clientContract(input))).toEqual(plain(serverContract(input)));
      });
    }
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   3. End reports what iOS did
   ══════════════════════════════════════════════════════════════════════════ */
describe('end is honest about what happened', () => {
  const plugin = read('ios/App/App/LiveActivityPlugin.swift');
  const bridge = read('src/lib/liveActivityNative.js');

  it('no longer claims success when nothing matched', () => {
    expect(plugin).toContain('"ended": !endedIds.isEmpty');
    expect(plugin).not.toContain('call.resolve(["ended": true, "count": targets.count])');
    expect(plugin).toContain('"reason": endedIds.isEmpty ? "no_activity" : ""');
  });

  it('dismisses immediately unless a delay is asked for', () => {
    // The 60-second linger that made "end" look like a no-op is gone.
    expect(plugin).not.toContain('addingTimeInterval(60)');
    expect(plugin).toContain('"dismissAfter": dismissAfter');
    expect(plugin).toContain('dismissAfter > 0');
    expect(bridge).toContain('dismissAfter: Math.max(0, Number(dismissAfter) || 0)');
  });

  it('proves no orphan survived', () => {
    expect(plugin).toContain('let remaining = Activity<JobaTaskActivity>.activities.count');
    expect(plugin).toContain('"remaining": remaining');
    expect(bridge).toContain('remaining: Number(result?.remaining) || 0');
  });

  it('can close every activity on the device, deliberately', () => {
    expect(plugin).toContain('let endsEverything = call.getBool("all") ?? false');
    expect(bridge).toContain('export function endAllActivities()');
    expect(bridge).toContain('endTaskActivity({ all: true, dismissAfter: 0 })');
    // Seven native methods: the original five, `setActionAuth` (stores the
    // capability the app minted — it sends nothing and reads no task) and
    // `actionStages` (reads back what the Lock Screen tap recorded, so the app
    // can forward it to the diagnostic view). None of them sends anything.
    expect((plugin.match(/CAPPluginMethod\(name: "/g) || []).length).toBe(7);
  });

  it('reports the ActivityKit lifecycle value for every activity', () => {
    expect(plugin).toContain('"activityState": Self.describe(activity.activityState)');
    for (const state of ['active', 'stale', 'ended', 'dismissed']) {
      expect(plugin).toContain(`return "${state}"`);
    }
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   4. The widget stays a pure renderer, sized for small surfaces
   ══════════════════════════════════════════════════════════════════════════ */
describe('the redesigned widget', () => {
  const widget = read('ios/App/JobaActivityWidget/JobaActivityWidgetBundle.swift');

  it('draws only contract fields', () => {
    expect(widget).toContain('context.state.title');
    expect(widget).toContain('context.state.subtitle');
    expect(widget).toContain('ActivityConfiguration(for: JobaTaskActivity.self)');
    expect(widget).not.toContain('task.status');
    expect(widget).not.toContain("=== 'TAKEN'");
  });

  it('never prints a raw phase name', () => {
    // The compact slot used to fall back to `state.phase` — an English token
    // like "on_the_way" shown to a Hebrew user, and truncated besides.
    expect(widget).not.toContain('return state.phase.isEmpty ? "Joba24"');
    expect(widget).not.toContain('Text(state.phase)');
  });

  it('omits the rail when there is no current step', () => {
    expect(widget).toContain('progress.step >= 0');
  });

  it('uses scalable type instead of pinned label sizes', () => {
    expect(widget).toContain('.font(.headline.weight(.bold))');
    expect(widget).toContain('.font(.caption2.weight(.bold))');
    expect(widget).not.toContain('.font(.system(size: 8))');
    expect(widget).toContain('.dynamicTypeSize(');
  });

  it('is laid out right-to-left and adapts to light and dark', () => {
    expect(widget).toContain('layoutDirection, .rightToLeft');
    // Text colours are semantic, so they invert with the system appearance.
    expect(widget).toContain('.foregroundStyle(.secondary)');
    expect(widget).toContain('Color.primary.opacity(0.12)');
  });
});