import { useCallback, useEffect, useState } from 'react';
import { hasCapacitorBridge } from '@/lib/nativeEnv';

/**
 * useDevicePermissions — the LIVE answer to "may this device show notifications
 * and share its location right now?".
 *
 * ── WHY IT READS THE DEVICE, NOT THE RECORD ────────────────────────────────
 * A permission can be changed in the phone's settings while the app is closed,
 * so a value remembered from a previous launch is a guess. Every read here asks
 * the OS itself (Capacitor plugins on the native build, the Permissions API in a
 * browser) and never opens a dialog — asking is a separate, deliberate action.
 *
 * The state is re-read whenever the app comes back to the foreground, which is
 * exactly the moment a user returns from the settings screen.
 */
async function readPush() {
  try {
    if (hasCapacitorBridge()) {
      const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
      const { receive } = await FirebaseMessaging.checkPermissions();
      if (receive === 'granted') return 'granted';
      if (receive === 'denied') return 'denied';
      return 'prompt';
    }
    if (typeof Notification === 'undefined') return 'unavailable';
    return Notification.permission === 'default' ? 'prompt' : Notification.permission;
  } catch {
    return null;
  }
}

async function readLocation() {
  try {
    if (hasCapacitorBridge()) {
      const { Geolocation } = await import('@capacitor/geolocation');
      const p = await Geolocation.checkPermissions();
      if (p.location === 'granted') return 'granted';
      if (p.location === 'denied') return 'denied';
      return 'prompt';
    }
    if (!navigator.permissions?.query) return null;
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state === 'default' ? 'prompt' : status.state;
  } catch {
    return null;
  }
}

export default function useDevicePermissions() {
  const [push, setPush] = useState('prompt');
  const [location, setLocation] = useState('prompt');

  const refresh = useCallback(async () => {
    const [p, l] = await Promise.all([readPush(), readLocation()]);
    if (p) setPush(p);
    if (l) setLocation(l);
  }, []);

  useEffect(() => {
    refresh();
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [refresh]);

  return { push, location, refresh };
}