// Firebase Cloud Messaging — uses compat SDK loaded via CDN script tags in index.html
// This avoids Vite pre-bundling firebase/messaging (which needs browser APIs)

const VAPID_KEY = "BMGA4Y0BwTCSY44y0Q1y4dkPklK4vBLMboxjxPUpGQQS7NBNXvYAvtEdsbl0uOaRsJADoXDTjffFsp3sr2dvcCw";

function getMessaging() {
  if (typeof window === 'undefined') return null;
  const fb = window.firebase;
  if (!fb?.messaging) return null;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  try {
    return fb.messaging();
  } catch (e) {
    console.warn('FCM not available:', e.message);
    return null;
  }
}

export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Notification permission error:', err);
    return 'denied';
  }
}

export async function getFCMToken() {
  const messaging = getMessaging();
  if (!messaging || !navigator.serviceWorker) return null;
  try {
    const swRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    const currentToken = await messaging.getToken({
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration || undefined,
    });
    return currentToken || null;
  } catch (err) {
    console.error('FCM token error:', err);
    return null;
  }
}

export function onForegroundMessage(callback) {
  const messaging = getMessaging();
  if (!messaging) return () => {};
  const unsubscribe = messaging.onMessage((payload) => {
    callback(payload);
  });
  return unsubscribe;
}