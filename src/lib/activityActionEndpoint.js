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
const PUBLIC_APP_ORIGIN = 'https://joba24.com';

export function actionEndpoint() {
  try {
    const origin = window.location?.origin || '';
    if (/^https:\/\//.test(origin)) return `${origin}/functions/liveActivityAction`;
  } catch {
    // No window, or a container that exposes no origin — use the public domain.
  }
  return `${PUBLIC_APP_ORIGIN}/functions/liveActivityAction`;
}