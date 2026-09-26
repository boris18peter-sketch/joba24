import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Bell, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { isAndroidWebView, hasCapacitorBridge } from '@/lib/nativeEnv';
import { waitForLocationPermissionSettled } from '@/lib/nativeGeolocation';
import {
  getLocationStatus, requestLocation,
  getNotificationStatus, requestNotifications,
  registerPushToken, getAppSettingsIntent,
} from '@/lib/permissions';

/**
 * Permission gate — runs on every app launch.
 *
 * If location or notifications are still not granted it asks for them again
 * (showing the OS dialog while the user has not answered yet, and an in-app
 * prompt that links to device settings once the OS will no longer ask), so a
 * user is reminded on each entry until both are enabled.
 *
 * Sequencing matters on Android: the system shows ONE runtime-permission
 * dialog at a time, so location is asked first and the notification request
 * waits for that dialog to be answered — asking in parallel made the
 * notification dialog silently disappear until the next launch.
 */
export default function PermissionGate() {
  const [missing, setMissing] = useState([]);   // ['location', 'notifications']
  const [dismissed, setDismissed] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const listeners = [];

    const apply = (loc, notif) => {
      if (cancelled) return;
      const still = [];
      if (loc !== 'granted') still.push('location');
      if (notif !== 'granted') still.push('notifications');
      setMissing(still);
    };

    // ── Native app ──
    const runNative = async () => {
      // Wait for the app's own startup flow to finish asking for location (it
      // may already have opened the dialog) before asking ourselves.
      await waitForLocationPermissionSettled(4000);

      let loc = await getLocationStatus();
      if (loc === 'prompt') loc = await requestLocation();

      let notif = await getNotificationStatus();
      if (notif === 'prompt') {
        // Only now is it safe to open a second runtime-permission dialog.
        await waitForLocationPermissionSettled();
        notif = await requestNotifications();
      }

      if (notif === 'granted') await registerPushToken();
      apply(loc, notif);
    };

    // ── Web ──
    const runWeb = async () => {
      const loc = await getLocationStatus();
      const notif = await getNotificationStatus();
      if (loc === 'granted' && notif === 'granted') return;

      // Browsers only open these dialogs in response to a user gesture.
      const onGesture = async () => {
        listeners.forEach(([ev, fn]) => document.removeEventListener(ev, fn));
        const locNow = loc === 'prompt' ? await requestLocation() : loc;
        const notifNow = notif === 'prompt' ? await requestNotifications() : notif;
        if (notifNow === 'granted') await registerPushToken();
        apply(locNow, notifNow);
      };
      listeners.push(['click', onGesture], ['touchend', onGesture]);
      listeners.forEach(([ev, fn]) => document.addEventListener(ev, fn));
    };

    // ── Android WebView with no Capacitor bridge ──
    // The WebView cannot show the OS notification dialog at all, so the only
    // route is the device settings screen.
    const runUnsupportedWebView = async () => {
      const me = await base44.auth.me().catch(() => null);
      if (!me || (me.fcm_tokens?.length || 0) > 0) return;
      if (cancelled) return;
      setMissing(['notifications']);
    };

    if (isAndroidWebView() && !hasCapacitorBridge()) {
      runUnsupportedWebView().catch(() => {});
    } else if (hasCapacitorBridge()) {
      runNative().catch(() => {});
    } else {
      runWeb().catch(() => {});
    }

    return () => {
      cancelled = true;
      listeners.forEach(([ev, fn]) => document.removeEventListener(ev, fn));
    };
  }, []);

  const handleAllow = async () => {
    setWorking(true);
    let loc = await getLocationStatus();
    if (loc === 'prompt') loc = await requestLocation();
    let notif = await getNotificationStatus();
    if (notif === 'prompt') notif = await requestNotifications();
    if (notif === 'granted') await registerPushToken();

    const still = [];
    if (loc !== 'granted') still.push('location');
    if (notif !== 'granted') still.push('notifications');
    setMissing(still);
    if (still.length === 0) setDismissed(true);
    setWorking(false);
  };

  if (dismissed || missing.length === 0) return null;

  const notificationIntent = missing.includes('notifications') ? getAppSettingsIntent('notifications') : null;
  const locationIntent = missing.includes('location') ? getAppSettingsIntent('location') : null;
  // iOS has no settings deep link, so fall back to written steps.
  const showSteps = !notificationIntent && !locationIntent;

  return createPortal(
    <div
      dir="rtl"
      onClick={(e) => { if (e.target === e.currentTarget && !working) setDismissed(true); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100002,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, background: 'rgba(5,15,40,0.7)', backdropFilter: 'blur(6px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 380, borderRadius: 24,
          background: 'var(--surface-2)', padding: '26px 22px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)', position: 'relative',
        }}
      >
        <button
          onClick={() => setDismissed(true)}
          disabled={working}
          style={{ position: 'absolute', top: 14, left: 14, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-2)' }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', boxShadow: '0 4px 16px rgba(26,111,212,0.3)',
          }}>
            {missing.includes('location') ? <MapPin size={26} color="white" /> : <Bell size={26} color="white" />}
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', margin: '0 0 8px' }}>
            הפעלת הרשאות
          </h3>
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
            כדי לקבל משימות בקרבתכם ועדכונים בזמן אמת, יש לאשר:
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {missing.includes('location') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-3)', borderRadius: 12, padding: '11px 13px' }}>
              <MapPin size={16} color="#0369a1" />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)' }}>הרשאת מיקום</span>
            </div>
          )}
          {missing.includes('notifications') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-3)', borderRadius: 12, padding: '11px 13px' }}>
              <Bell size={16} color="#d97706" />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)' }}>הרשאת התראות</span>
            </div>
          )}
        </div>

        <button
          onClick={handleAllow}
          disabled={working}
          style={{
            width: '100%', height: 52, borderRadius: 16,
            background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
            border: 'none', color: 'white', fontWeight: 900, fontSize: 15,
            cursor: working ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 16px rgba(26,111,212,0.35)', opacity: working ? 0.75 : 1,
          }}
        >
          {working ? <Loader2 size={18} className="animate-spin" /> : 'אישור הרשאות'}
        </button>

        {(locationIntent || notificationIntent) && (
          <a
            href={locationIntent || notificationIntent}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', height: 48, borderRadius: 16, marginTop: 10,
              background: 'var(--surface-3)', border: '1px solid var(--border-1)',
              color: 'var(--text-1)', textDecoration: 'none', fontWeight: 700, fontSize: 14,
            }}
          >
            פתח הגדרות המכשיר
          </a>
        )}

        {showSteps && (
          <div style={{ background: 'var(--surface-3)', borderRadius: 12, padding: '11px 13px', marginTop: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-2)', lineHeight: 1.8 }}>
              הגדרות ← Joba24 ← הפעלת מיקום והתראות
            </div>
          </div>
        )}

        <button
          onClick={() => setDismissed(true)}
          disabled={working}
          style={{
            width: '100%', height: 44, borderRadius: 14, marginTop: 10,
            background: 'transparent', border: 'none',
            color: 'var(--text-3)', fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
          }}
        >
          אולי אחר כך
        </button>
      </div>
    </div>,
    document.body
  );
}