/**
 * The desktop scale.
 *
 * From a tablet upwards the app is rendered larger than on a phone: the whole
 * surface is scaled up with `zoom` on the root element, so every screen keeps
 * its exact layout, order and behaviour and simply reads at a comfortable size
 * (see the desktop block in src/index.css).
 *
 * `zoom` multiplies every length — viewport units included. Whether a
 * viewport-relative length is measured against the window and then painted at
 * the scaled size, or already accounts for the scale, differs between engines.
 * Where it does not account for it, a `100dvh` box is a third taller than the
 * window it sits in: the bottom of a long list, the last rows of a detail list
 * and the footer of a sheet fall off the screen — and because the document
 * itself has no overflow, there is nothing to scroll them into view.
 *
 * So it is measured rather than assumed. Two probes — one sized `100dvh`, one
 * `100vw` — are compared with the window itself, and the results are published
 * as `--vh-fix` / `--vw-fix`:
 *
 *   1        the engine already accounts for the scale on that axis — every rule
 *            using it is a no-op, and the app is simply scaled
 *   1/ratio  it does not — that axis is divided back to the visible window, and
 *            `j-zoom-overflow` is set so the few rules that only matter in that
 *            case switch on
 *
 * Each axis is measured on its own because an engine can scale the layout width
 * while leaving the height alone; correcting an axis that was already right
 * would leave the app short of the window instead of filling it.
 *
 * At the phone scale (`--ui-scale: 1`) nothing is measured and nothing changes:
 * on a phone, and in the native app, this module is inert.
 */

const OVERFLOW_CLASS = 'j-zoom-overflow';

function readScale() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--ui-scale');
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function clear(root) {
  root.classList.remove(OVERFLOW_CLASS);
  root.style.setProperty('--vh-fix', '1');
  root.style.setProperty('--vw-fix', '1');
}

/**
 * How much bigger than the window a `100dvh` / `100vw` box is painted.
 *
 * Rects are reported in the space that is actually on screen — a box filling the
 * window measures exactly the window — so a box measuring more than the window
 * is one whose unit was resolved unscaled and then painted scaled.
 */
function measureAxis(unit) {
  const probe = document.createElement('div');
  // `dvh`, not `vh`, so the probe measures the same unit the app's own
  // full-height boxes use. Where the unit is unsupported the probe measures 0
  // and the caller leaves the app untouched rather than guessing.
  probe.style.cssText =
    `position:absolute;top:0;left:0;visibility:hidden;pointer-events:none;` +
    (unit === 'dvh' ? 'width:0;height:100dvh;' : 'width:100vw;height:0;');
  document.documentElement.appendChild(probe);
  const rect = probe.getBoundingClientRect();
  const painted = unit === 'dvh' ? rect.height : rect.width;
  probe.remove();
  return painted;
}

function measure() {
  const root = document.documentElement;

  // Phone / native: no scaling is applied, so there is nothing to correct.
  if (readScale() <= 1) {
    clear(root);
    return;
  }

  const paintedH = measureAxis('dvh');
  const paintedW = measureAxis('vw');
  const windowH = window.innerHeight;
  const windowW = window.innerWidth;

  if (!(paintedH > 0) || !(paintedW > 0) || !(windowH > 0) || !(windowW > 0)) {
    clear(root);
    return;
  }

  const ratioH = paintedH / windowH;
  const ratioW = paintedW / windowW;
  const fixH = ratioH > 1.01;
  const fixW = ratioW > 1.01;

  root.classList.toggle(OVERFLOW_CLASS, fixH || fixW);
  root.style.setProperty('--vh-fix', fixH ? String(1 / ratioH) : '1');
  root.style.setProperty('--vw-fix', fixW ? String(1 / ratioW) : '1');
}

export function installDesktopScale() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Measured synchronously, before the first paint, so the app never renders a
  // frame at the wrong size.
  measure();

  // The scale only changes at the two breakpoints, so this re-measures on the
  // events that can cross one — never in a loop.
  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      measure();
    });
  };
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);

  // …and once more on the next frame: the measurement above runs the instant
  // this module does, and re-reading it after the first layout costs nothing
  // while covering a stylesheet that had not been applied yet.
  schedule();
}