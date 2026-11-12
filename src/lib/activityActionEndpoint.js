/**
 * activityActionEndpoint — the https origin a card's button posts to.
 *
 * ── WHY IT IS A MODULE ─────────────────────────────────────────────────────
 * Both platforms perform the same call from a surface that has no session (the
 * iOS App Intent, the Android broadcast receiver), so both must be handed the
 * SAME absolute endpoint. Deriving it twice would eventually derive it two
 * different ways, and the failure is silent: a tap that never leaves the phone.
 *
 * ── WHY window.location.origin IS NOT ENOUGH ───────────────────────────────
 * Inside the native apps the page is served from `capacitor://localhost`, so the
 * stored endpoint used to be `capacitor://localhost/functions/liveActivityAction`
 * — a scheme URL that URLSession refuses outright and that Android's
 * HttpURLConnection cannot reach at all. Every tap then failed without a single
 * packet leaving the device, and the button was dead in the only build that
 * matters.
 *
 * A browser build keeps posting to the origin it is served from (so previews
 * work); a native shell, which has no https origin at all, posts to the public
 * app domain.
 */
// ── THE HOST THE NATIVE APPS MUST POST TO ───────────────────────────────────
// The app's own functions are served from its Base44 origin. A custom domain
// fronts the WEB app, and any hop there may answer a POST on /functions/... with
// a redirect or with the web app's index.html — and Android's HttpURLConnection
// does not resend a POST body across a redirect, while an HTML answer arrives
// with status 200 and was read as success. Either way the tap was lost in
// silence. This is the origin the platform itself documents for a function URL.
const BASE44_APP_ORIGIN = 'https://joba24.base44.app';

export function actionEndpoint() {
  try {
    const origin = window.location?.origin || '';
    // A browser build is served from the app itself, so its own origin is exact.
    // A native shell has no https origin (capacitor://localhost, or the empty
    // string), so it gets the canonical function origin.
    if (/^https:\/\//.test(origin) && !/^https:\/\/joba24\.com/.test(origin)) {
      return `${origin}/functions/liveActivityAction`;
    }
  } catch {
    // No window, or a container that exposes no origin — use the app's own.
  }
  return `${BASE44_APP_ORIGIN}/functions/liveActivityAction`;
}