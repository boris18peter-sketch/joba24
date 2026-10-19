/**
 * consentBannerGate — lets a running tutorial hold the cookie notice back.
 *
 * The consent notice is a slim strip pinned to the bottom edge of the viewport.
 * The first-run tutorial walks the visitor through the app with a tooltip
 * anchored to the publish button in the bottom bar — the same band — so the two
 * were on screen at once: the notice sat across the tooltip and its arrow, and
 * the arrow ended up pointing at the notice instead of at the button.
 *
 * The notice is passive housekeeping; the tutorial is the thing the visitor is
 * actually doing. So the notice steps aside while a tutorial is running and
 * comes straight back when it finishes or is skipped — the choice is still
 * collected, just not during the one moment it competes with the guidance.
 *
 * Deliberately a plain module store rather than context: the notice is portaled
 * to <body> from the app root and the tutorial lives inside the keep-alive home
 * tab, so they are in different trees and a module-level flag is the smallest
 * thing that reaches both.
 */
let suppressed = false;
const listeners = new Set();

export function setConsentBannerSuppressed(next) {
  const value = !!next;
  if (suppressed === value) return;
  suppressed = value;
  listeners.forEach((fn) => fn());
}

export function isConsentBannerSuppressed() {
  return suppressed;
}

export function subscribeConsentBannerGate(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}