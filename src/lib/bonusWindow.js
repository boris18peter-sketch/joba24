/**
 * bonusWindow — "is a bonus about to be shown?"
 *
 * ── THE ONE ORDER AT THE END OF A JOB ───────────────────────────────────────
 *   rating  →  bonus (only if there is one)  →  the closing note
 *
 * The rating and the note are known synchronously; the bonus is NOT. It is a
 * `Loyalty_Reward` row written by the SERVER when the other side rated, so all
 * this screen can do is ask. That question is what this module is: a window that
 * says "a bonus may still be on its way, do not take the screen yet".
 *
 * The note used to open on a fixed 1.2s settle and simply hope the bonus had
 * claimed the screen by then. When the bonus took longer (finding it is two
 * server reads) the note appeared first and the bonus — which mounts later, on
 * top of the same z-index — was drawn OVER it: the "I see the completion popup
 * for a second and then the bonus jumps on it" report.
 *
 * So the window is opened when the rating is submitted and CLOSED by the answer:
 *   • the bonus that arrives takes the screen and holds it until it is closed
 *     (the popup gate), after which the note may come; or
 *   • `resolveBonusWindow()` — the hook actually asked the server and there is
 *     nothing to announce — and the note comes straight away.
 * The timer is only a safety net so a failed read can never swallow the note.
 */
const SAFETY_MS = 3500;

let until = 0;
const listeners = new Set();

const notify = () => listeners.forEach((fn) => fn());

/** A bonus may still be on its way (called the moment the rating is submitted). */
export function expectBonus(windowMs = SAFETY_MS) {
  until = Date.now() + windowMs;
  notify();
}

/** The question has an answer and nothing is coming: the note may take the screen. */
export function resolveBonusWindow() {
  if (!until) return;
  until = 0;
  notify();
}

export function isBonusExpected() {
  return Date.now() < until;
}

export function subscribeBonusWindow(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}