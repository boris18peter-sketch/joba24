// Firebase Messaging Service Worker
// Handles background push notifications when app is NOT in foreground.
// When app IS in foreground, the JS SDK's onMessage handles it — we must NOT show a duplicate.

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

// Handle background messages (app is NOT in foreground)
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] onBackgroundMessage:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'Joba24';
  const notificationBody  = payload.notification?.body  || payload.data?.body  || '';
  const clickUrl          = payload.data?.url || payload.fcmOptions?.link || '/';
  const tag               = payload.data?.tag || 'joba24';

  return self.registration.showNotification(notificationTitle, {
    body:    notificationBody,
    icon:    'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg',
    badge:   'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg',
    tag,                     // same tag = replaces previous notification of same type
    renotify: false,         // don't vibrate again if same tag already shown
    requireInteraction: true,
    data: { url: clickUrl },
  });
});

// Notification click — open or focus the app tab
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If the app is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// Push event fallback — handles raw push events if onBackgroundMessage doesn't catch them
// Guard: skip if the app has a focused window open (would cause duplicates)
self.addEventListener('push', (event) => {
  // onBackgroundMessage handles FCM pushes — this fallback is only for non-FCM raw pushes
  // We rely on onBackgroundMessage above and skip raw push to avoid duplicates
});
