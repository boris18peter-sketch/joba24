// Lightweight sessionStorage-backed store for the buy-credits flow.
// When a user taps a legal link (Terms / Privacy) from inside the purchase
// flow, we save the current flow state here so that pressing "back" on the
// legal page can restore the exact purchase step the user was on.
const KEY = 'joba24_buy_flow_restore';

export function saveBuyFlow(state) {
  try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

export function peekBuyFlow() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearBuyFlow() {
  try { sessionStorage.removeItem(KEY); } catch {}
}