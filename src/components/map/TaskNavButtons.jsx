/**
 * TaskNavButtons — the task's two navigation buttons (Waze / GPS).
 *
 * ONE definition, because a task shows where it is on two surfaces: under the
 * map, and on its own when there is no map to draw. The no-map card used to
 * carry a different pair (bright official Waze/Maps badges), so the same two
 * actions looked like a different control depending on whether the map had
 * loaded. Both now render exactly this.
 */
const BTN = {
  flex: 1, height: 38, borderRadius: 12,
  boxSizing: 'border-box',
  background: 'var(--surface-3)',
  border: '1px solid var(--border-1)',
  color: 'var(--text-2)', fontWeight: 700, fontSize: 13,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
  textDecoration: 'none',
};

export default function TaskNavButtons({ lat, lng, locationName, height = 38, radius = 12 }) {
  const hasCoords = Number.isFinite(parseFloat(lat)) && Number.isFinite(parseFloat(lng));
  const q = encodeURIComponent(locationName || '');

  const wazeUrl = hasCoords
    ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
    : `https://waze.com/ul?q=${q}&navigate=yes`;
  const gpsUrl = hasCoords
    ? `https://maps.google.com/maps?daddr=${lat},${lng}`
    : `https://maps.google.com/maps?q=${q}`;

  const btn = { ...BTN, height, borderRadius: radius };

  return (
    <div style={{ display: 'flex', gap: 8, width: '100%' }}>
      <a href={wazeUrl} target="_blank" rel="noopener noreferrer" style={btn}>Waze</a>
      <a href={gpsUrl} target="_blank" rel="noopener noreferrer" style={btn}>GPS</a>
    </div>
  );
}