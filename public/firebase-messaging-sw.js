// Firebase Cloud Messaging Service Worker
// Handles background push notifications

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD4GmTgh-fFEyBzrv6bHN8PyKvOKFHC_wc",
  authDomain: "joba24.firebaseapp.com",
  projectId: "joba24",
  storageBucket: "joba24.firebasestorage.app",
  messagingSenderId: "79738163466",
  appId: "1:79738163466:web:a7fea9dd112a0909bfeaf3",
};

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

try {
  firebase.initializeApp(FIREBASE_CONFIG);
  const messaging = firebase.messaging();
  
  // Handle background messages
  messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification?.title || 'Joba24';
    const notificationOptions = {
      body: payload.notification?.body || '',
      icon: payload.notification?.icon || 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg',
      badge: payload.notification?.badge || 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg',
      tag: payload.data?.tag || 'joba24',
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: {
        url: payload.data?.url || '/',
        tag: payload.data?.tag || 'joba24',
      },
    };
    
    self.registration.showNotification(notificationTitle, notificationOptions);
  });
  
  // Handle notification click
  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  });
  
} catch (err) {
  console.error('Firebase messaging SW error:', err);
}
