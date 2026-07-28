/**
 * notificationStore — global pub/sub for live notification popups.
 * Works on ALL pages (including routes outside Layout like /chat/:taskId).
 * Layout's addNotification delegates here; GlobalPopups (rendered in App.jsx) renders the popups.
 */
const listeners = new Set();
let active = [];
let queue = [];
let isShowing = false;

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

function showNext() {
  if (queue.length === 0) { isShowing = false; active = []; emit(); return; }
  isShowing = true;
  active = [queue.shift()];
  emit();
}

export const notificationStore = {
  subscribe(fn) {
    listeners.add(fn);
    fn(active);
    return () => listeners.delete(fn);
  },
  addNotification(notification) {
    persist(notification);
    const notifObj = { ...notification, id: Date.now() + Math.random() };
    if (!isShowing) { isShowing = true; active = [notifObj]; emit(); }
    else queue.push(notifObj);
  },
  removeNotification() {
    active = [];
    emit();
    setTimeout(showNext, 400);
  },
};