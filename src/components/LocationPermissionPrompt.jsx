import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Silent location permission requester — directly triggers the native OS dialog
 * (the same dialog other apps show: "Allow Joba24 to use your location?").
 *
 * No custom popup is shown. Only fires when:
 *  - geolocation API is available
 *  - the user hasn't already enabled location sharing (location_sharing_enabled !== true)
 *  - we haven't already asked on this device (localStorage flag)
 *
 * On iOS PWA, geolocation.getCurrentPosition() must be triggered from a user gesture.
 * We listen for the first user interaction (click/touch) and then request permission.
 *
 * If location_sharing_enabled is already true but coordinates are stale (> 30 min),
 * we silently refresh them in the background (no dialog).
 */
const STALE_MS = 30 * 60 * 1000; // 30 minutes

export default function LocationPermissionPrompt({ me }) {
  const queryClient = useQueryClient();
  const savingRef = useRef(false);

  // Save coordinates to user record
  const saveCoords = async (lat, lng, enabled = true) => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      await base44.auth.updateMe({
        last_lat: lat,
        last_lng: lng,
        last_location_update: new Date().toISOString(),
        location_sharing_enabled: enabled,
      });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (err) {
      console.error('[Location] Failed to save coordinates:', err?.message);
    } finally {
      savingRef.current = false;
    }
  };

  // Fetch position — triggers native OS dialog on first call
  const fetchPosition = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          console.warn('[Location] Error:', err.message);
          // If permission denied, mark as asked so we don't keep trying
          if (err.code === err.PERMISSION_DENIED) {
            localStorage.setItem('joba24_loc_prompt_shown', '1');
          }
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    });
  };

  useEffect(() => {
    if (!me?.id) return;
    if (!navigator.geolocation) return;

    const locationEnabled = me.location_sharing_enabled === true;
    const lastUpdate = me.last_location_update;
    const isStale = !lastUpdate || (Date.now() - new Date(lastUpdate).getTime() > STALE_MS);

    // ── Case A: Already enabled — silently refresh coordinates if stale ──
    if (locationEnabled && isStale) {
      (async () => {
        const pos = await fetchPosition();
        if (pos) await saveCoords(pos.lat, pos.lng);
      })();
      return;
    }

    // ── Case B: Not enabled yet — wait for first user gesture (iOS PWA requirement) ──
    if (locationEnabled) return; // already enabled and fresh, nothing to do
    if (localStorage.getItem('joba24_loc_prompt_shown')) return;

    let triggered = false;
    const requestOnGesture = () => {
      if (triggered) return;
      triggered = true;
      localStorage.setItem('joba24_loc_prompt_shown', '1');
      document.removeEventListener('click', requestOnGesture);
      document.removeEventListener('touchend', requestOnGesture);

      (async () => {
        const pos = await fetchPosition();
        if (pos) await saveCoords(pos.lat, pos.lng, true);
      })();
    };

    // Listen for first user gesture
    document.addEventListener('click', requestOnGesture, { once: false });
    document.addEventListener('touchend', requestOnGesture, { once: false });

    return () => {
      document.removeEventListener('click', requestOnGesture);
      document.removeEventListener('touchend', requestOnGesture);
    };
  }, [me?.id, me?.location_sharing_enabled, me?.last_location_update]);

  return null;
}