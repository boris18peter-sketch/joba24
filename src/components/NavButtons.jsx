/**
 * Official Waze & Google Maps navigation buttons.
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
      {/* Waze official button */}
      <a
        href={wazeUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 12px',
          borderRadius: 10,
          textDecoration: 'none',
          background: '#33ccff',
          boxShadow: '0 2px 8px rgba(51,204,255,0.3)',
          border: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        {/* Waze logo SVG */}
        <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
          <ellipse cx="24" cy="24" rx="22" ry="22" fill="#33ccff"/>
          <path d="M24 8C15.163 8 8 15.163 8 24c0 5.523 2.686 10.406 6.832 13.5l-.832 4.5 4.5-.832A15.93 15.93 0 0024 42c8.837 0 16-7.163 16-16S32.837 8 24 8z" fill="white"/>
          <circle cx="18" cy="26" r="2.5" fill="#33ccff"/>
          <circle cx="30" cy="26" r="2.5" fill="#33ccff"/>
          <path d="M18 32s2 3 6 3 6-3 6-3" stroke="#33ccff" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>Waze</span>
      </a>

      {/* Google Maps official button */}
      <a
        href={gmapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 12px',
          borderRadius: 10,
          textDecoration: 'none',
          background: 'white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Google Maps logo SVG */}
        <svg width="16" height="16" viewBox="0 0 48 48">
          <path fill="#4285F4" d="M24 4C15.16 4 8 11.16 8 20c0 13.5 16 24 16 24S40 33.5 40 20c0-8.84-7.16-16-16-16z"/>
          <circle cx="24" cy="20" r="6" fill="white"/>
        </svg>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#374151' }}>Maps</span>
      </a>
    </div>
  );
}