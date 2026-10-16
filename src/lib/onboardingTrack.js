/**
 * Onboarding track — which first-run path the visitor picked.
 *
 *   publish → "I need help": posts a task
 *   worker  → "I'm looking for work": does tasks
 *
 * This is a LOCAL presentation preference ONLY. It decides which explainer
 * screens and which spotlight-tutorial steps are shown, and where an
 * unauthenticated returning visitor is sent. It never grants a role, never
 * gates a feature, and never touches authentication, OAuth, task publishing or
 * the worker profile.
 *
 * Three independent pieces of state, each kept PER TRACK so finishing one
 * journey never silently skips the other:
 *   joba24_onboarding_track            the chosen track
 *   joba24_onboarding_explainer_<t>    the three explainer screens were seen
 *   joba_welcome_seen_<t>              the in-app spotlight tutorial was seen
 */

export const TRACKS = {
  PUBLISH: 'publish',
  WORKER: 'worker',
};

const TRACK_KEY = 'joba24_onboarding_track';

/** The chosen track, or null when the visitor has not chosen yet. */
export function getOnboardingTrack() {
  try {
    const value = localStorage.getItem(TRACK_KEY);
    return value === TRACKS.PUBLISH || value === TRACKS.WORKER ? value : null;
  } catch (e) {
    return null;
  }
}

export function setOnboardingTrack(track) {
  if (track !== TRACKS.PUBLISH && track !== TRACKS.WORKER) return;
  try {
    localStorage.setItem(TRACK_KEY, track);
  } catch (e) {
    /* storage unavailable — the choice simply is not remembered */
  }
}

export const explainerKey = (track) => `joba24_onboarding_explainer_${track}`;

export function isExplainerDone(track) {
  if (!track) return false;
  try {
    return localStorage.getItem(explainerKey(track)) === '1';
  } catch (e) {
    return false;
  }
}

export function markExplainerDone(track) {
  if (!track) return;
  try {
    localStorage.setItem(explainerKey(track), '1');
  } catch (e) {
    /* ignore */
  }
}

/** Where a track's EXISTING flow starts — never a new route, never a new flow. */
export function destinationForTrack(track) {
  return track === TRACKS.PUBLISH ? '/create-task' : '/join';
}