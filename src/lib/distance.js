/**
 * ONE distance and travel-time contract for the whole app.
 *
 * Distance and travel time were being derived in four different places, each
 * with its own formula and its own formatting:
 *
 *   - the feed card            haversine, "9.7ק״מ"   (no space, custom quote)
 *   - the task sheet's meta     haversine, "9.7ק״מ"
 *   - the sheet's map bubble    haversine, 9.7 ק"מ + ~15 דק'  (km / 40 km/h)
 *   - the map popup             Mapbox driving route, 12.3 ק״מ + 20 דק׳
 *
 * So the same task showed two different distances and two different travel
 * times on two screens of the same app — and the popup's "20 דקות" sat right
 * next to the task's own 30-minute duration, which read as a contradiction.
 *
 * Everything now comes from here: one geometry (the straight line between the
 * visitor and the task, which every screen can compute without a network call),
 * one wording, and one travel estimate derived from that same number — so the
 * distance and the time can never disagree again.
 */

/** Great-circle distance in km between two coordinates. */
export function haversineKm(lat1, lng1, lat2, lng2) {
  if (![lat1, lng1, lat2, lng2].every(v => Number.isFinite(Number(v)))) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** "850 מ׳" / "9.7 ק״מ" — one format, used by every surface. */
export function formatDistance(km, t) {
  if (km == null || !isFinite(km)) return null;
  if (km < 1) return `${Math.round(km * 1000)} ${t('meters_short')}`;
  return `${km.toFixed(1)} ${t('km_short')}`;
}

/**
 * Door-to-door city driving: about 30 km/h once traffic, parking and the walk
 * to the entrance are counted — i.e. two minutes per kilometre, never under
 * three minutes. Deliberately derived from the SAME distance the screen shows,
 * so a task that reads "9.7 ק״מ" always reads the same travel time too.
 */
export function travelMinutes(km) {
  if (km == null || !isFinite(km)) return null;
  return Math.max(3, Math.round(km * 2));
}

/** "19 דק׳" / "1:05 ש׳" — the travel estimate for a distance. */
export function formatTravelTime(km, t) {
  const mins = travelMinutes(km);
  if (mins == null) return null;
  if (mins < 60) return `${mins} ${t('min_short')}`;
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')} ${t('h_short')}`;
}