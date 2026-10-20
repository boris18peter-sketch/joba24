/**
 * The desktop scale.
 *
 * From a tablet upwards the app is rendered larger than on a phone: the whole
 * surface is scaled up with `zoom` on the root element, so every screen keeps its
 * exact layout, order and behaviour and simply reads at a comfortable size (see
 * the desktop block in src/index.css).
 *
 * `zoom` multiplies every length — viewport units included — so a box sized
 * `100dvh` inside the scaled surface would be painted taller than the window it
 * sits in, and its bottom would fall off the screen. This module is what stops
 * that: it measures the window and publishes the app's OWN box in px, already
 * divided by the scale. `html`/`body` take that box, and every viewport-unit
 * height in the app is capped at it, so the app is always exactly the window it
 * is painted into and nothing can extend past it.
 *
 * The scale is applied to the ROOT, so the sheets and popups — portaled to
 * <body> — are scaled with everything else.
 *
 * On a phone (`scale` 1) nothing is written and nothing changes: this module is
 * inert, and so is every rule that depends on it.
 */

const CLASS = 'j-desktop-scale';

/**
 * The scale for a window — the same breakpoints the stylesheet's comment names.
 *
 * A WIDE WINDOW IS NOT ENOUGH: IT MUST ALSO BE A TALL ONE.
 * A phone rotated to landscape reports a desktop-like WIDTH (a Pixel 7 is
 * 915×412 CSS px, a Pixel 8 Pro 998×448) while its height stays phone-sized. On
 * width alone those crossed the 900px breakpoint, so rotating an Android phone
 * applied the 1.3× desktop zoom to a 412px-tall screen — the app was laid out as
 * if the window were 704×317 and then magnified. A real desktop or tablet is
 * never that short, so requiring a desktop-like height keeps the scale where it
 * belongs and leaves a rotated phone at scale 1.
 */
function scaleFor(width, height) {
  if (height < 600) return 1;
  if (width >= 1900) return 1.7;
  if (width >= 1440) return 1.5;
  if (width >= 900) return 1.3;
  return 1;
}

function apply() {
  const root = document.documentElement;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const scale = scaleFor(width, height);

  if (!(scale > 1) || !(width > 0) || !(height > 0)) {
    root.classList.remove(CLASS);
    root.style.removeProperty('--ui-scale');
    root.style.removeProperty('--app-w');
    root.style.removeProperty('--app-h');
    return;
  }

  root.classList.add(CLASS);
  root.style.setProperty('--ui-scale', String(scale));
  // The box the app is painted into, in px: the window, divided by the scale it
  // is about to be multiplied by.
  root.style.setProperty('--app-w', `${Math.round(width / scale)}px`);
  root.style.setProperty('--app-h', `${Math.round(height / scale)}px`);
}

export function installDesktopScale() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Measured synchronously, before the first paint, so the app never renders a
  // frame at the wrong size.
  apply();

  // The scale only changes at the breakpoints, so this re-measures on the events
  // that can cross one — never in a loop.
  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      apply();
    });
  };
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);

  // …and once more on the next frame: the measurement above runs the instant
  // this module does, and re-reading it after the first layout costs nothing
  // while covering a stylesheet that had not been applied yet.
  schedule();
}