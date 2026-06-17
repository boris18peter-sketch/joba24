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
    // Try to get existing registration with exact path
    let reg = null;
    try {
      reg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    } catch (e) {
      // Some browsers don't support getRegistration with absolute paths
    }
    
    if (reg) {
      console.log('[FCM] SW already registered');
      return reg;
    }
    
    // Register with root scope for iOS/Android compatibility
    reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    console.log('[FCM] SW registered successfully');
    return reg;
  } catch (err) {
    console.error('[FCM] SW registration failed:', err.message);
    return null;
  }
}

export async function requestNotificationPermission() {
  if (typeof Notification === 'undefined') {
    console.warn('[FCM] Notification API not supported');
    return 'denied';
  }
  
  // Check if running as standalone PWA (especially important for iOS)
  const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  if (!isStandalone) {
    console.warn('[FCM] Not in standalone mode - notifications may not work');
  }
  
  try {
    const permission = await Notification.requestPermission();
    console.log('[FCM] Permission request result:', permission, 'Standalone:', isStandalone);
    return permission;
  } catch (err) {
    console.error('[FCM] Permission request failed:', err.message);
    return 'denied';
  }
}

export async function getFCMToken() {
  const messaging = await ensureFirebase();
  if (!messaging) {
    console.warn('[FCM] Firebase messaging not available');
    return null;
  }
  
  try {
    const swRegistration = await ensureSW();
    if (!swRegistration) {
      console.warn('[FCM] Service Worker not registered');
    }
    
    const currentToken = await messaging.getToken({
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration || undefined,
    });
    
    // Detailed logging for debugging
    if (currentToken) {
      const tokenPreview = currentToken.substring(0, 30) + '...';
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      const isStandalone = window.navigator.standalone === true;
      const displayMode = window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser';
      
      console.log('[FCM] ✅ Token obtained');
      console.log('[FCM] Token:', tokenPreview);
      console.log('[FCM] Platform:', isIOS ? 'iOS' : isAndroid ? 'Android' : 'Web');
      console.log('[FCM] Mode:', displayMode);
      console.log('[FCM] Standalone:', isStandalone);
    } else {
      console.warn('[FCM] ⚠️ No token returned from Firebase');
    }
    
    return currentToken || null;
  } catch (err) {
    console.error('[FCM] ❌ Token generation failed:', err.message);
    console.error('[FCM] Error details:', err);
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