import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyD4GmTgh-fFEyBzrv6bHN8PyKvOKFHC_wc",
  authDomain: "joba24.firebaseapp.com",
  projectId: "joba24",
  storageBucket: "joba24.firebasestorage.app",
  messagingSenderId: "79738163466",
  appId: "1:79738163466:web:a7fea9dd112a0909bfeaf3",
  measurementId: "G-XG93SJ38SB"
};

const VAPID_KEY = "BMGA4Y0BwTCSY44y0Q1y4dkPklK4vBLMboxjxPUpGQQS7NBNXvYAvtEdsbl0uOaRsJADoXDTjffFsp3sr2dvcCw";

const app = initializeApp(firebaseConfig);

let messaging = null;
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
    messaging = getMessaging(app);
  }
} catch (e) {
  console.warn('Firebase messaging not available in this environment');
}

export { messaging, VAPID_KEY, app };

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
  if (!messaging || !navigator.serviceWorker) return null;
  try {
    const swRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    const currentToken = await getToken(messaging, {
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
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
}