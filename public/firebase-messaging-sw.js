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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
