// Firebase Messaging Service Worker — resilient: swallows CDN failures
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');
} catch (e) {
  console.warn('FCM SW: CDN load failed — background push unavailable:', e.message);
}

try {
  firebase.initializeApp({
    apiKey: "AIzaSyD4GmTgh-fFEyBzrv6bHN8PyKvOKFHC_wc",
    authDomain: "joba24.firebaseapp.com",
    projectId: "joba24",
    storageBucket: "joba24.firebasestorage.app",
    messagingSenderId: "79738163466",
    appId: "1:79738163466:web:a7fea9dd112a0909bfeaf3",
  });
} catch (e) { /* already initialized */ }

try {
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const { title, body, icon, data } = payload.notification || payload.data || {};
    self.registration.showNotification(title || 'Joba24', {
      body: body || '',
      icon: icon || 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg',
      badge: 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg',
      data: data || {},
      tag: data?.tag || 'default',
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200],
    });
  });
} catch (e) {
  console.warn('FCM SW: messaging init failed:', e.message);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || 'https://joba24.com/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
