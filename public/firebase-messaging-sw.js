// Firebase Cloud Messaging Service Worker
// Handles background push notifications — ensures each notification shows ONLY ONCE

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD4GmTgh-fFEyBzrv6bHN8PyKvOKFHC_wc",
  authDomain: "joba24.firebaseapp.com",
  projectId: "joba24",
  storageBucket: "joba24.firebasestorage.app",
  messagingSenderId: "79738163466",
  appId: "1:79738163466:web:a7fea9dd112a0909bfeaf3",
});

const messaging = firebase.messaging();

// Track recently shown notifications to prevent duplicates
// (covers edge cases where onBackgroundMessage fires twice for the same push)
const recentlyShown = new Set();

function shouldShow(tag) {
  const dedupKey = tag || 'default';
  const now = Date.now();
  // Clean old entries
  for (const key of recentlyShown) {
    if (now - key.split('::')[1] > 5000) recentlyShown.delete(key);
  }
  const fullKey = `${dedupKey}::${now}`;
  for (const key of recentlyShown) {
    if (key.startsWith(`${dedupKey}::`) && now - key.split('::')[1] < 3000) {
      return false; // Already shown within 3 seconds
    }
  }
  recentlyShown.add(fullKey);
  return true;
}

// onBackgroundMessage — the ONLY place we show notifications.
// Data-only payloads (no top-level `notification` field) are NOT auto-displayed
// by the SDK, so this handler is the sole source of background notifications.
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || 'Joba24';
  const body = data.body || '';
  const url = data.url || '/';
  const tag = data.tag || 'joba24';

  // Dedup: skip if we just showed this exact notification
  if (!shouldShow(tag)) return;

  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    data: { url, tag },
    tag,
    requireInteraction: false,
  });
});

// Handle notification click — open/focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
