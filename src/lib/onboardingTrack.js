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
 * ── The states, deliberately kept APART ─────────────────────────────────────
 * Each answers ONE question and none of them implies another. Nothing here
 * decides two things at once:
 *
 *   joba24_onboarding_track          WHICH journey was chosen (publish/worker)
 *   joba24_onboarding_explainer_<t>  THAT journey's three screens were finished
 *   joba_welcome_seen_<t>            the in-app spotlight tutorial was seen
 *   isAuthenticated (server)         whether an account session exists
 *   worker profile (server, on User) whether the worker profile was completed
 *
 * Therefore:
 *   · choosing a track is NOT finishing it;
 *   · finishing the three screens is NOT publishing a task, and NOT completing
 *     a worker profile;
 *   · a finished explainer means "never show me the first-run screens again",
 *     never "send me to the sign-up".
 *
 * The CONTINUATION destination is derived from the choice — it is not a fourth
 * stored state, so it can never fall out of sync with the track:
 *   publish → /create-task   (open to visitors; sign-in only at publish)
 *   worker  → /join          (the existing sign-up + worker profile flow)
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

/**
 * Has this visitor already walked the first-run flow?
 *
 * True once a track has been chosen AND that track's explainer screens were
 * finished or skipped. The root gate reads this, so a visitor who has already
 * been through the flow is never dragged back into it — that bounce is what
 * turned the publish form's close button into a dead end.
 */
export function hasSeenFirstRun() {
  const track = getOnboardingTrack();
  return !!track && isExplainerDone(track);
}

/** Where a track's EXISTING flow starts — never a new route, never a new flow. */
export function destinationForTrack(track) {
  return track === TRACKS.PUBLISH ? '/create-task' : '/join';
}