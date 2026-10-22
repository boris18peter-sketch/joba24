import { useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Publisher funnel — records how far one publishing attempt got.
 *
 * WHY THE STEP IS DERIVED AND NOT FIRED FROM THE MARKUP
 * A funnel is only worth reading if it cannot miss. Firing a call from each
 * screen, each button and each field would mean eight chances to forget one,
 * and a forgotten one reads as a drop-off that never happened. So the form
 * derives ONE step from its own state and hands it here; this hook only decides
 * whether it is worth a request.
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

    // Fire-and-forget. Funnel capture must never be able to block or break
    // publishing, so a failed request is swallowed.
    base44.functions.invoke('trackPublishFunnel', {
      session_id: sidRef.current,
      step,
      ...extra,
    }).catch(() => {});
  }, []);
}