import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The fast lane's three guarantees, pinned to the source that implements them.
 *
 * These are CONTRACT tests, not behaviour simulations: each asserts the exact
 * structural fact the guarantee rests on, so a later edit that quietly drops a
 * call site, forks the implementation, or re-opens the start gate fails here
 * rather than on somebody's Lock Screen.
 */
const read = (p) => fs.readFileSync(path.resolve(process.cwd(), p), 'utf8');

const ACTION = 'base44/functions/liveActivityAction/entry.ts';
const ENTRY = 'base44/functions/taskTransitionDispatch/entry.ts';
const LANE = 'base44/shared/taskTransitionFastLane.ts';
const NOTIFY = 'base44/functions/notifyTaskWorkerStatusChange/entry.ts';
const PLANNER = 'base44/shared/liveActivityDispatch.ts';
const SENDER = 'base44/shared/liveActivitySend.ts';

describe('fast lane — reachable from the Lock Screen, not only from the web app', () => {
  it('runs for every publish action the native endpoint can perform', () => {
    const src = read(ACTION);
    // worker_step, publisher_assign, publisher_approve — one awaited call each.
    const calls = src.match(/await runTaskTransition\(/g) || [];
    expect(calls.length).toBe(3);
    expect(src).toContain("from '../../shared/taskTransitionFastLane.ts'");
  });

  it('awards the stage notification only to the worker-step branch', () => {
    const src = read(ACTION);
    const stageBlocks = src.match(/notifyStage: true/g) || [];
    expect(stageBlocks.length).toBe(1);
  });

  it('is ONE implementation shared by both entry points', () => {
    // The user-facing entry point must delegate, never re-implement: a second
    // copy of the dispatch is exactly how the two paths would drift apart.
    const entry = read(ENTRY);
    expect(entry).toContain("from '../../shared/taskTransitionFastLane.ts'");
    expect(entry).not.toContain('dispatchRecipient');
    expect(entry).not.toContain('loadCategoryChain');

    const lane = read(LANE);
    expect(lane).toContain('dispatchRecipient({');
    // Authorization stays at the entry points, which are the only places that
    // know who is calling.
    expect(lane).not.toContain('auth.me()');
  });
});

describe('fast lane — no duplicate notifications beside the workflow', () => {
  it('refuses a (task, stage) that was already sent, whatever asked for it', () => {
    const src = read(NOTIFY);
    expect(src).toContain('already_sent_for_task_stage');
    // The gate must be scoped by the TASK and the STAGE — a per-user cooldown
    // cannot answer this, because the workflow can arrive minutes later.
    expect(src).toMatch(/task_id:\s*taskId/);
    expect(src).toMatch(/event_key:\s*`worker_status_\$\{newStatus\}`/);
    expect(src).toMatch(/status:\s*'sent'/);
  });

  it('leaves the workflow as the fallback when the fast lane never sends', () => {
    // The gate is a READ of the log, so a fast lane that failed or timed out
    // writes no row and the workflow still delivers the notification.
    const src = read(NOTIFY);
    const gateIndex = src.indexOf('already_sent_for_task_stage');
    const invokeIndex = src.indexOf("invoke('notificationManager'");
    expect(gateIndex).toBeGreaterThan(-1);
    expect(invokeIndex).toBeGreaterThan(gateIndex);
    expect(src).toContain('.catch(() => null)');
  });
});

describe('a finished task can never be STARTED, remotes included', () => {
  it('the planner turns a terminal task into an end, before any send', () => {
    const src = read(PLANNER);
    const terminalIndex = src.indexOf('TERMINAL_TASK_STATUSES.includes(task.status)');
    expect(terminalIndex).toBeGreaterThan(-1);
    const branch = src.slice(terminalIndex, terminalIndex + 2600);
    // The default for a finished task is still the END…
    expect(branch).toContain("kind: 'end'");
    // …with exactly ONE exception, and it is narrow on purpose: a finished card
    // may carry only the star row — a `rate` phase that actually has stars for
    // this recipient. Anything else on a terminal task still ends the card.
    expect(branch).toContain("snapshot.phase === RATING_PHASE && snapshot.rating");
    // The terminal rule is applied before authorization and before revisions.
    const authIndex = src.indexOf('authorizeActivity(task, role, userId)');
    expect(terminalIndex).toBeLessThan(authIndex);
  });

  it('a start requires kind send AND a pair that never committed a revision', () => {
    const src = read(SENDER);
    const match = src.match(/const remoteStart =[\s\S]{0,260}?;/);
    expect(match).not.toBeNull();
    const rule = match[0];
    expect(rule).toContain("plan.kind === 'send'");
    expect(rule).toContain('!(Number(state?.revision) > 0)');
    expect(rule).toContain('startTokens.length > 0');
    // …and the payload follows the decision, so a non-send plan can never be
    // rendered as a start payload.
    expect(src).toContain("const event = plan.kind === 'end' ? 'end' : (remoteStart ? 'start' : 'update')");
  });
});