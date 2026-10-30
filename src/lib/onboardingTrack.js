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
 *   worker  → /welcome       (the flow that ENDS in the join step)
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

/**
 * Which journey this visitor is in RIGHT NOW, for recording on their account.
 *
 * The stored choice is the truth. A visitor who arrived straight into a
 * journey's own screen (a shared /join link, a direct /create-task link) never
 * saw the chooser, so the path they are on names the journey instead of leaving
 * the answer blank. This is only read once per account, on the first signed-in
 * load — see AuthContext.
 */
export function resolveJourneyTrack(pathname = typeof window !== 'undefined' ? window.location.pathname : '') {
  const stored = getOnboardingTrack();
  if (stored) return stored;
  if (pathname.startsWith('/join')) return TRACKS.WORKER;
  if (pathname.startsWith('/create-task')) return TRACKS.PUBLISH;
  return null;
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

/**
 * Where a track's flow continues.
 *
 *   publish → the publish form, open to visitors
 *   worker  → the first-run flow itself, whose LAST step is the join screen.
 *
 * The worker journey no longer continues to a separate /join page. That page
 * showed the same join screen the flow's final step already shows, so the two
 * could both be open at once and the join screen ended up painted over the app.
 * There is now ONE join screen, in ONE place, and /join is only ever the
 * worker PROFILE STEPPER for a signed-in account.
 */
export function destinationForTrack(track) {
  return track === TRACKS.PUBLISH ? '/create-task' : '/welcome';
}

/**
 * The journey a CAMPAIGN link names.
 *
 *   ?track=publish  (also ?flow=publisher, ?track=post…) → the publisher journey
 *   ?track=worker   (also ?flow=helper, ?track=earn…)    → the worker journey
 *
 * A campaign link is sent to ONE audience, so it already knows which journey
 * that audience wants: opening the "which one are you?" screen in front of them
 * is exactly the step the link was meant to remove. Accepts the app's own word
 * as well as the ones a marketing link is likely to use; anything else returns
 * null, so a typo falls back to the normal first-run screen rather than sending
 * someone into the wrong journey.
 */
export function campaignTrackFromUrl(search = window.location.search) {
  const params = new URLSearchParams(search || '');
  const raw = (params.get('track') || params.get('flow') || '').trim().toLowerCase();
  if (['publish', 'publisher', 'client', 'post'].includes(raw)) return TRACKS.PUBLISH;
  if (['worker', 'helper', 'work', 'earn'].includes(raw)) return TRACKS.WORKER;
  return null;
}