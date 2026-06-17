// Firebase Cloud Messaging — loads compat SDK on-demand (no blocking CDN scripts in index.html)
// Protected: checks for Notification API support before any Firebase Messaging init

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD4GmTgh-fFEyBzrv6bHN8PyKvOKFHC_wc",
  authDomain: "joba24.firebaseapp.com",
  projectId: "joba24",
  storageBucket: "joba24.firebasestorage.app",
  messagingSenderId: "79738163466",
  appId: "1:79738163466:web:a7fea9dd112a0909bfeaf3",
};

const VAPID_KEY = "BMGA4Y0BwTCSY44y0Q1y4dkPklK4vBLMboxjxPUpGQQS7NBNXvYAvtEdsbl0uOaRsJADoXDTjffFsp3sr2dvcCw";

// Early check: if Notifications API is not supported, bail out entirely
const isNotificationsSupported = () => {
  return typeof Notification !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
};

let loadPromise = null;
let messagingInstance = null;
let loadFailed = false;

// Dynamically load a script element
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(script);
  });
}

// Load Firebase compat SDK + initialize messaging — called once, cached, never throws
async function ensureFirebase() {
  // Early guard: if Notifications API is not supported, don't even try
  if (!isNotificationsSupported()) {
    loadFailed = true;
    return null;
  }

  if (messagingInstance) return messagingInstance;
  if (loadFailed) return null;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      if (!isNotificationsSupported()) {
        loadFailed = true;
        return null;
      }

      if (!window.firebase) {
        await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
        await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');
      }

      try {
        window.firebase.initializeApp(FIREBASE_CONFIG);
      } catch (e) {
        // Already initialized
      }

      messagingInstance = window.firebase.messaging();
      return messagingInstance;
    } catch (err) {
      console.warn('FCM not available:', err.message);
      loadFailed = true;
      return null;
    }
  })();

  try {
    return await loadPromise;
  } catch {
    loadFailed = true;
    return null;
  }
}

// Register the service worker — separate from messaging init so SW can register even without messaging
async function ensureSW() {
  // Don't even try to register SW if Notifications are not supported
  if (!isNotificationsSupported()) return null;
  
  try {
    const reg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (reg) return reg;
    return await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  } catch (err) {
    console.warn('FCM SW registration failed:', err);
    return null;
  }
}

export async function requestNotificationPermission() {
  if (typeof Notification === 'undefined') return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    return 'denied';
  }
}

export async function getFCMToken() {
  const messaging = await ensureFirebase();
  if (!messaging) return null;
  try {
    const swRegistration = await ensureSW();
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
  // Ensure Firebase is loaded (async, but the listener will attach once ready)
  ensureFirebase().then((messaging) => {
    if (!messaging) return;
    messaging.onMessage((payload) => {
      callback(payload);
    });
  });
  return () => {}; // No-op unsubscribe (Firebase compat doesn't support unsubscribing onMessage easily)
}