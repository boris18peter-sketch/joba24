/**
 * notificationStore — global pub/sub for live notification banners.
 * Works on ALL pages (including routes outside Layout like /chat/:taskId).
 * Layout's addNotification delegates here; GlobalPopups (rendered in App.jsx) renders the banners.
 *
 * ── WHY THIS IS A SHORT STACK AND NOT A ONE-AT-A-TIME QUEUE ─────────────────
 * It used to hold a single banner and queue the rest. Three notifications
 * arriving together — which is exactly what happens when a worker accepts a
 * task and the publisher gets "task taken", then "message", then "on the way" —
 * became a 22-second relay: one banner, 7.5s, a 400ms gap, the next, and so on.
 * By the third one the user had scrolled away and had no idea the first two had
 * existed, and the gap between them read as the app glitching.
 *
 * A stack of up to three shows the whole situation at once, in the order it
 * happened, and each one leaves on its own timer. Nothing is ever hidden behind
 * something else the user never saw.
 *
 * The full history still goes to localStorage untouched — this only changes
 * what is on screen at any moment.
 */
const MAX_VISIBLE = 3;
const listeners = new Set();
let active = [];

function emit() {
  listeners.forEach((fn) => fn(active));
}

function persist(notification) {
  try {
    const stored = JSON.parse(localStorage.getItem('joba24_notifications') || '[]');
    const updated = [{ ...notification, timestamp: new Date().toISOString(), read: false }, ...stored].slice(0, 50);
    localStorage.setItem('joba24_notifications', JSON.stringify(updated));
  } catch {}
}

/**
 * Two banners are "the same event" when they describe the same thing happening
 * to the same task involving the same person. Realtime subscriptions and the
 * notify functions can both report one event, which is what produced two
 * identical banners arriving a second apart — the "notifications one after
 * another" that looked like a bug. An identical banner already on screen is
 * simply not added again.
 */
function eventKey(n) {
  return [n.type, n.taskId, n.actorId, n.senderName, n.workerName].filter(Boolean).join('|');
}

export const notificationStore = {
  subscribe(fn) {
    listeners.add(fn);
    fn(active);
    return () => listeners.delete(fn);
  },

  addNotification(notification) {
    const key = eventKey(notification);
    if (active.some((n) => eventKey(n) === key)) return;

    persist(notification);
    const notifObj = { ...notification, id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}` };
    // Newest first: the banner the user just earned is the one they read.
    active = [notifObj, ...active].slice(0, MAX_VISIBLE);
    emit();
  },

  removeNotification(id) {
    active = id ? active.filter((n) => n.id !== id) : active.slice(1);
    emit();
  },
};