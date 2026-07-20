import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Silent location permission requester — directly triggers the native OS dialog
 * (the same dialog other apps show: "Allow Joba24 to use your location?").
 *
 * Mirrors NotificationsPermissionPrompt:
 *  - No custom popup — fires the native OS dialog directly
 *  - On iOS PWA, geolocation.getCurrentPosition() MUST be called synchronously
 *    from within the user gesture handler
 *  - Gesture listener is attached IMMEDIATELY on mount — doesn't wait for
 *    base44.auth.me() to resolve (which could miss the user's first tap)
 *  - If permission already granted → silently saves coordinates (and refreshes if stale)
 *  - If already denied → removes the listener (user must re-enable via OS settings)
 */
const STALE_MS = 30 * 60 * 1000; // 30 minutes
const PROMPT_KEY = 'joba24_loc_prompt_shown';

export default function LocationPermissionPrompt() {
  const queryClient = useQueryClient();
  const savingRef = useRef(false);

  const saveCoords = (lat, lng) => {
    if (savingRef.current) return;
    savingRef.current = true;
    base44.auth.updateMe({
      last_lat: lat,
      last_lng: lng,
      last_location_update: new Date().toISOString(),
      location_sharing_enabled: true,
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      window.dispatchEvent(new Event('location_permission_changed'));
    }).catch(err => {
      console.error('[Location] Failed to save coordinates:', err?.message);
    }).finally(() => {
      savingRef.current = false;
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
    let triggered = false;

    const gestureHandler = () => {
      if (triggered) return;
      triggered = true;
      localStorage.setItem(PROMPT_KEY, '1');
      document.removeEventListener('click', gestureHandler);
      document.removeEventListener('touchend', gestureHandler);

      // CRITICAL: Call getCurrentPosition SYNCHRONOUSLY in the gesture handler.
      // iOS PWA requires the call to be in the direct user-activation context.
      navigator.geolocation.getCurrentPosition(
        (pos) => saveCoords(pos.coords.latitude, pos.coords.longitude),
        (err) => console.warn('[Location] Error:', err.message),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    };

    // ── Attach gesture listener IMMEDIATELY (before async me() resolves) ──
    if (!localStorage.getItem(PROMPT_KEY)) {
      document.addEventListener('click', gestureHandler, { once: false });
      document.addEventListener('touchend', gestureHandler, { once: false });
    }

    // ── Async background check — may remove listener if not needed ──
    (async () => {
      const me = await base44.auth.me().catch(() => null);
      if (cancelled || !me) return;

      const permState = await getPermissionState();
      const locationEnabled = me.location_sharing_enabled === true;
      const lastUpdate = me.last_location_update;
      const isStale = !lastUpdate || (Date.now() - new Date(lastUpdate).getTime() > STALE_MS);

      if (permState === 'granted') {
        // Already granted — remove gesture listener (not needed)
        document.removeEventListener('click', gestureHandler);
        document.removeEventListener('touchend', gestureHandler);
        // Silently save/refresh coordinates if needed
        if (!locationEnabled || isStale) {
          navigator.geolocation.getCurrentPosition(
            (pos) => { if (!cancelled) saveCoords(pos.coords.latitude, pos.coords.longitude); },
            (err) => console.warn('[Location] Error:', err.message),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
          );
        }
      } else if (permState === 'denied') {
        // Denied — remove gesture listener
        document.removeEventListener('click', gestureHandler);
        document.removeEventListener('touchend', gestureHandler);
      }
      // If 'prompt' — keep the listener attached (already attached immediately)
    })();

    return () => {
      cancelled = true;
      document.removeEventListener('click', gestureHandler);
      document.removeEventListener('touchend', gestureHandler);
    };
  }, []);

  return null;
}