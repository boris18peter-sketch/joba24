import { useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { readCampaign } from '@/lib/analytics/campaign';

/**
 * Publisher funnel — records how far one publishing attempt got.
 *
 * WHY THE STEPS ARE DERIVED AND NOT FIRED FROM THE MARKUP
 * A funnel is only worth reading if it cannot miss. Firing a call from each
 * screen, each button and each field would mean eight chances to forget one,
 * and a forgotten one reads as a drop-off that never happened. So the form
 * derives WHICH steps are true from its own state and hands them here.
 *
 * ── EVERY TRUE STEP, IN ORDER — NOT ONLY THE FURTHEST ONE ───────────────────
 * The form used to hand over ONE step: the furthest condition that happened to
 * be met. That is wrong whenever a lower step is satisfied later than a higher
 * one — a publisher who confirms the address before writing the description
 * reported 'location' immediately, and writing the description afterwards could
 * never be seen, because the ladder still answered 'location'. The description
 * was therefore invisible in the data even though it is the field that takes the
 * most effort.
 *
 * The form now hands over the ascending list of satisfied steps and this hook
 * fires them in order. Because it only ever moves forward, the first pass sends
 * the whole prefix at once and later passes send only what is new — so the
 * request count is the same, but no step can be skipped.
 *
 * The order itself is not defined here — the backend owns it and refuses a name
 * it does not recognise. This list exists so a request is never even attempted
 * for a step the server would reject.
 */
export const PUBLISH_FUNNEL_STEPS = [
  'opened', 'category', 'details', 'location', 'pricing', 'contact', 'ready', 'published',
];

const SESSION_KEY = 'joba24_publish_funnel_sid';

// An id that survives a remount of the form but not a new session: one row per
// ATTEMPT, not one row per component mount. If storage is unavailable (iOS
// WebView blocks it in some states) the id is kept in memory instead — a
// slightly worse id beats a thrown exception on the publish screen.
let memorySid = null;

function makeSid() {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
  return `pf_${stamp}_${rand}`;
}

function getSessionId() {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = makeSid();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch (_) {
    if (!memorySid) memorySid = makeSid();
    return memorySid;
  }
}

export function usePublishFunnel() {
  const sidRef = useRef(null);
  const stepRef = useRef(-1);

  return useCallback((step, extra = {}) => {
    const index = PUBLISH_FUNNEL_STEPS.indexOf(step);
    if (index < 0) return;

    // Monotonic per mount: the same step is never sent twice, and a lower step
    // is never sent after a higher one. The server enforces the same rule, so
    // this is only what keeps the network quiet.
    if (index <= stepRef.current) return;
    stepRef.current = index;

    if (!sidRef.current) sidRef.current = getSessionId();

    // The campaign travels with every call so the row is attributed from its
    // very first step — including the visit that never gets past 'opened',
    // which is exactly the population the campaign is paying for.
    const campaign = readCampaign() || {};

    // Fire-and-forget. Funnel capture must never be able to block or break
    // publishing, so a failed request is swallowed.
    base44.functions.invoke('trackPublishFunnel', {
      session_id: sidRef.current,
      step,
      ...campaign,
      ...extra,
    }).catch(() => {});
  }, []);
}