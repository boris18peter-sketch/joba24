/**
 * taskAlertStore — global pub/sub for the full-screen task alerts that must
 * appear on EVERY route, including pages rendered outside Layout
 * (e.g. /chat/:taskId, /support).
 *
 * Previously these alerts (task cancelled by publisher, approval revoked,
 * cancellation success) lived in Layout state, so a worker sitting in a chat
 * thread never saw them. GlobalPopups (mounted in App.jsx) now renders them.
 *
 * Only ONE alert is shown at a time; the latest one wins.
 */
const listeners = new Set();
let current = null;

function emit() {
  listeners.forEach((fn) => fn(current));
}

export const taskAlertStore = {
  subscribe(fn) {
    listeners.add(fn);
    fn(current);
    return () => listeners.delete(fn);
  },
  /** kind: 'cancelled' | 'revoked' | 'cancel_success' */
  raise(kind, task) {
    if (!kind || !task) return;
    current = { kind, task, id: Date.now() };
    emit();
  },
  clear() {
    current = null;
    emit();
  },
};