import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Silent location permission requester — directly triggers the native OS dialog
 * (the same dialog other apps show: "Allow Joba24 to use your location?").
 *
 * Mirrors NotificationsPermissionPrompt exactly:
 *  - No custom popup — fires the native OS dialog directly
 *  - On iOS PWA, geolocation.getCurrentPosition() must be from a user gesture,
 *    so we listen for the first click/touch and then request
 *  - If permission already granted → silently saves coordinates (and refreshes if stale)
 *  - If already denied → does nothing (user must re-enable via browser/OS settings)
 */
const STALE_MS = 30 * 60 * 1000; // 30 minutes
const PROMPT_KEY = 'joba24_loc_prompt_shown';

export default function LocationPermissionPrompt() {
  const queryClient = useQueryClient();
  const savingRef = useRef(false);
  const gestureHandlerRef = useRef(null);

  const saveCoords = async (lat, lng) => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      await base44.auth.updateMe({
        last_lat: lat,
        last_lng: lng,
        last_location_update: new Date().toISOString(),
        location_sharing_enabled: true,
      });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      window.dispatchEvent(new Event('location_permission_changed'));
    } catch (err) {
      console.error('[Location] Failed to save coordinates:', err?.message);
    } finally {
      savingRef.current = false;
    }
  };

  const fetchPosition = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          console.warn('[Location] Error:', err.message);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    });
  };

  const getPermissionState = () => {
    return new Promise((resolve) => {
      if (!navigator.permissions || !navigator.permissions.query) {
        resolve('prompt');
        return;
      }
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        resolve(result.state);
      }).catch(() => resolve('prompt'));
    });
  };

  useEffect(() => {
    if (!navigator.geolocation) return;

    let cancelled = false;

    (async () => {
      const me = await base44.auth.me().catch(() => null);
      if (cancelled || !me) return;

      const locationEnabled = me.location_sharing_enabled === true;
      const lastUpdate = me.last_location_update;
      const isStale = !lastUpdate || (Date.now() - new Date(lastUpdate).getTime() > STALE_MS);
      const permState = await getPermissionState();

      // ── Already granted: save/refresh coordinates silently ──
      if (permState === 'granted') {
        if (!locationEnabled || isStale) {
          const pos = await fetchPosition();
          if (!cancelled && pos) await saveCoords(pos.lat, pos.lng);
        }
        return;
      }

      // ── Undetermined ('prompt'): wait for first user gesture (iOS PWA requirement) ──
      if (permState !== 'prompt') return; // 'denied' → skip
      if (localStorage.getItem(PROMPT_KEY)) return;

      let triggered = false;
      const requestOnGesture = () => {
        if (triggered) return;
        triggered = true;
        localStorage.setItem(PROMPT_KEY, '1');
        document.removeEventListener('click', requestOnGesture);
        document.removeEventListener('touchend', requestOnGesture);

        (async () => {
          const pos = await fetchPosition();
          if (pos) await saveCoords(pos.lat, pos.lng);
        })();
      };

      gestureHandlerRef.current = requestOnGesture;
      document.addEventListener('click', requestOnGesture, { once: false });
      document.addEventListener('touchend', requestOnGesture, { once: false });
    })();

    return () => {
      cancelled = true;
      const handler = gestureHandlerRef.current;
      if (handler) {
        document.removeEventListener('click', handler);
        document.removeEventListener('touchend', handler);
      }
    };
  }, []);

  return null;
}