/**
 * Official Waze & Google Maps navigation buttons — text only.
 * Pass lat/lng for coordinates, or locationName for text search.
 */
export default function NavButtons({ lat, lng, locationName }) {
  const wazeUrl = lat && lng
    ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(locationName || '')}&navigate=yes`;

  const gmapsUrl = lat && lng
    ? `https://maps.google.com/?q=${lat},${lng}`
    : `https://maps.google.com/?q=${encodeURIComponent(locationName || '')}`;

  if (!lat && !lng && !locationName) return null;

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <a href={wazeUrl} target="_blank" rel="noopener noreferrer"
        style={{ display: 'flex', alignItems: 'center', padding: '7px 14px', borderRadius: 10, textDecoration: 'none', background: '#33ccff', boxShadow: '0 2px 8px rgba(51,204,255,0.3)', border: '1px solid rgba(0,0,0,0.06)' }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>Waze</span>
      </a>
      <a href={gmapsUrl} target="_blank" rel="noopener noreferrer"
        style={{ display: 'flex', alignItems: 'center', padding: '7px 14px', borderRadius: 10, textDecoration: 'none', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', border: '1px solid #e2e8f0' }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#374151' }}>Maps</span>
      </a>
    </div>
  );
}