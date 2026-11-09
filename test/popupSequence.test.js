import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  expectBonus,
  resolveBonusWindow,
  isBonusExpected,
  subscribeBonusWindow,
} from '../src/lib/bonusWindow.js';

/**
 * The end of a job has ONE order: rating → bonus (if there is one) → the closing
 * note. Two separate bugs produced the same report, twice:
 *
 *   • "the bonus appears after I close and reopen the app" — nothing re-asked the
 *     server;
 *   • "the completion popup shows for a second and then the bonus jumps on top
 *     of it" — the note opened on a fixed settle, before the bonus had been found.
 *
 * A fixed delay cannot express an order that depends on a server round trip, so
 * the note now waits for an ANSWER. These tests pin the window itself and every
 * wiring point that opens or closes it. If one of those points is removed, the
 * order silently goes back to a race.
 */

const here = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(resolve(here, '..', path), 'utf8');

afterEach(() => {
  vi.useRealTimers();
  // Leave the module in its resting state for the next test.
  resolveBonusWindow();
});

describe('bonusWindow — the answer the closing note waits for', () => {
  it('is closed until a rating is submitted', () => {
    expect(isBonusExpected()).toBe(false);
  });

  it('holds while a bonus may be on its way', () => {
    expectBonus();
    expect(isBonusExpected()).toBe(true);
  });

  it('releases the instant the answer arrives', () => {
    expectBonus();
    const listener = vi.fn();
    const unsub = subscribeBonusWindow(listener);
    resolveBonusWindow();
    expect(isBonusExpected()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });

  it('never swallows the note: the safety window expires on its own', () => {
    vi.useFakeTimers();
    expectBonus(1000);
    expect(isBonusExpected()).toBe(true);
    vi.advanceTimersByTime(1001);
    expect(isBonusExpected()).toBe(false);
  });

  it('a second rating opens a fresh window', () => {
    vi.useFakeTimers();
    expectBonus(1000);
    vi.advanceTimersByTime(900);
    expectBonus(1000);
    vi.advanceTimersByTime(500);
    // 1400ms after the first open, 500ms after the second — still open.
    expect(isBonusExpected()).toBe(true);
  });

  it('resolving a closed window is a no-op, not a spurious event', () => {
    const listener = vi.fn();
    const unsub = subscribeBonusWindow(listener);
    resolveBonusWindow();
    expect(listener).not.toHaveBeenCalled();
    unsub();
  });
});

describe('the order is wired at both ends', () => {
  it('opens the window when a rating was actually submitted', () => {
    expect(read('src/components/RatingModal.jsx')).toContain('onClose({ submitted: true })');

    const layout = read('src/components/Layout.jsx');
    // The window is opened BEFORE the rating's gate is released — that release is
    // the moment the bonus starts being looked for.
    const openAt = layout.indexOf("if (opts?.submitted) expectBonus();");
    const releaseAt = layout.indexOf("setPopupBlock('rating', false)", openAt);
    expect(openAt).toBeGreaterThan(-1);
    expect(releaseAt).toBeGreaterThan(openAt);
  });

  it('the note is drawn only when nothing is on screen AND no bonus may come', () => {
    const layout = read('src/components/Layout.jsx');
    const effect = layout.slice(
      layout.indexOf('const attempt = () => {'),
      layout.indexOf('}, [pendingCongrats]);'),
    );
    expect(effect).toContain('isPopupBlocked()');
    expect(effect).toContain('isBonusExpected()');
    // …and it is released by events, not only by the tick.
    expect(effect).toContain('subscribePopupGate(attempt)');
    expect(effect).toContain('subscribeBonusWindow(attempt)');
    // The old "wait four ticks and hope" settle is gone.
    expect(layout).not.toContain('if (ticks < 4 || isPopupBlocked()) return;');
  });

  it('a note raised without a rating also waits for the bonus answer', () => {
    const layout = read('src/components/Layout.jsx');
    const showCongrats = layout.slice(
      layout.indexOf('const showCongrats = useCallback'),
      layout.indexOf('}, [me?.id, sheetTaskId, closeTaskSheet]);'),
    );
    expect(showCongrats).toContain('expectBonus();');
  });

  it('the note steps aside if a bonus still arrives on screen', () => {
    const layout = read('src/components/Layout.jsx');
    const block = layout.slice(
      layout.indexOf('AND THE NOTE STEPS ASIDE'),
      layout.indexOf('}, [congratsTask]);'),
    );
    // Excluding its own key is what makes this a check for OTHER popups.
    expect(block).toContain("isPopupBlocked('congrats')");
    expect(block).toContain('setCongratsTask(null)');
    expect(block).toContain('setPendingCongrats(congratsTask)');
  });

  it('the bonus hook answers the question in both outcomes', () => {
    const hook = read('src/hooks/useLoyaltyBonus.js');
    // Nothing to announce → release the note.
    expect(hook).toContain('if (!cancelled && !queued) resolveBonusWindow();');
    // A bonus was shown → it holds the screen itself, so release the window too.
    const flushBlock = hook.slice(hook.indexOf('setBonus({'), hook.indexOf('const catchUp'));
    expect(flushBlock).toContain('resolveBonusWindow()');
    // `offer` must report the outcome, or the note waits the whole window.
    expect(hook).toContain('if (!tx?.id) return false;');
    expect(hook).toContain('return true;');
  });
});