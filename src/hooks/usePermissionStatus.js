import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { hasCapacitorBridge } from '@/lib/nativeEnv';

/**
 * usePermissionStatus — records the two device permissions the platform cares
 * about on the user's own record, so the admin dashboard can answer "how many
 * of my workers will actually receive a push / share their location?" without
 * guessing.
 *
 * Until now both answers existed only inside a browser or a WebView: the push
 * hook kept the answer in React state, and the location prompt kept it in the
 * OS. Nothing was ever persisted, so the dashboard had no way to show it.
 *
 * The values are 'granted' | 'denied' | 'prompt'. `null` means "could not be
 * read on this platform" and is never written over a known value.
 *
 * Reporting is edge-triggered: it reads the current state on mount and again
 * whenever the app returns to the foreground (a user can flip a permission in
 * the phone's settings while the app is backgrounded), and writes ONLY when the
 * value actually differs from what is already on the record.
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
    if (typeof Notification === 'undefined') return null;
    return Notification.permission; // 'granted' | 'denied' | 'default'
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
    return status.state; // 'granted' | 'denied' | 'prompt'
  } catch {
    return null;
  }
}

// A browser reports "not granted yet" as 'default'; the record uses 'prompt'.
const normalize = (v) => (v === 'default' ? 'prompt' : v);

export default function usePermissionStatus(user) {
  const userId = user?.id;
  const knownPush = user?.push_permission;
  const knownLocation = user?.location_permission;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const report = async () => {
      const [push, location] = await Promise.all([readPush(), readLocation()]);
      if (cancelled) return;
      const patch = {};
      const p = normalize(push);
      const l = normalize(location);
      if (p && p !== knownPush) patch.push_permission = p;
      if (l && l !== knownLocation) patch.location_permission = l;
      if (Object.keys(patch).length === 0) return;
      try {
        await base44.auth.updateMe(patch);
      } catch {
        /* a permission report must never interrupt the app */
      }
    };

    report();
    const onVisible = () => { if (document.visibilityState === 'visible') report(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId, knownPush, knownLocation]);
}