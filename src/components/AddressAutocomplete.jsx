import { useState, useRef, useEffect } from 'react';
import { MapPin, CheckCircle, Loader2 } from 'lucide-react';

/**
 * AddressAutocomplete — uses Nominatim (OpenStreetMap) — no API key needed.
 * Prioritizes results near the user's location (if available).
 * Allows free-text input and confirms via selection.
 */
export default function AddressAutocomplete({ value, onSelect, error, onBlur, initialConfirmed = false }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(initialConfirmed || !!value);
  const [userLocation, setUserLocation] = useState(null);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // Try to get user location once for prioritization
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { timeout: 5000 }
      );
    }
  }, []);

  // Sync if parent resets value or sets it externally
  useEffect(() => {
    if (!value) { setQuery(''); setConfirmed(false); }
    else if (value !== query) { setQuery(value); if (value) setConfirmed(true); }
  }, [value]);

  const search = async (q) => {
    if (q.length < 2) { setSuggestions([]); return; }
    setLoading(true);

    // Build URL — add viewbox around user location for prioritization
    let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=8&accept-language=he&countrycodes=il`;
    if (userLocation) {
      // viewbox: 0.5 degree radius around user (~55km)
      const delta = 0.5;
      const minLng = userLocation.lng - delta;
      const maxLng = userLocation.lng + delta;
      const minLat = userLocation.lat - delta;
      const maxLat = userLocation.lat + delta;
      url += `&viewbox=${minLng},${maxLat},${maxLng},${minLat}&bounded=0`;
    }

    const res = await fetch(url, { headers: { 'Accept-Language': 'he' } });
    const data = await res.json();

    // Sort: results in user's city first
    let sorted = data;
    if (userLocation && data.length > 1) {
      sorted = [...data].sort((a, b) => {
        const distA = Math.hypot(parseFloat(a.lat) - userLocation.lat, parseFloat(a.lon) - userLocation.lng);
        const distB = Math.hypot(parseFloat(b.lat) - userLocation.lat, parseFloat(b.lon) - userLocation.lng);
        return distA - distB;
      });
    }

    setSuggestions(sorted);
    setLoading(false);
  };

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    setConfirmed(false);
    // Don't reset parent — allow free typing; only reset coordinates
    onSelect({ location_name: v, city: '', lat: null, lng: null });
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 300);
  };

  const handleSelect = (item) => {
    const addr = item.address || {};
    const city = addr.city || addr.town || addr.village || addr.county || '';
    const road = addr.road || addr.pedestrian || addr.neighbourhood || '';
    const houseNumber = addr.house_number || '';
    const street = road + (houseNumber ? ` ${houseNumber}` : '');
    const display = street ? `${street}, ${city}` : item.display_name.split(',').slice(0, 3).join(',').trim();

    setQuery(display);
    setSuggestions([]);
    setConfirmed(true);
    onSelect({ location_name: display, city, lat: parseFloat(item.lat), lng: parseFloat(item.lon) });
  };

  // Allow confirming typed free text (press Enter or blur)
  const handleBlur = () => {
    if (query && !confirmed) {
      // Allow free text — mark as confirmed with no coords
      // The parent can decide whether to enforce coordinate selection
    }
    setTimeout(() => setSuggestions([]), 150);
    onBlur?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && suggestions.length > 0) {
      handleSelect(suggestions[0]);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const borderColor = confirmed ? '#16a34a' : error ? '#ef4444' : '#dce8f5';
  const bgColor = confirmed ? '#f0fdf4' : error ? '#fff5f5' : '#f4f7fb';

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="הקלד רחוב, מספר בית ועיר..."
          dir="rtl"
          style={{
            width: '100%',
            height: 48,
            borderRadius: 12,
            border: `1.5px solid ${borderColor}`,
            background: bgColor,
            padding: '0 42px 0 14px',
            fontSize: 16,
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
            color: 'var(--text-1)',
          }}
        />
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
          {loading
            ? <Loader2 size={16} color="#1a6fd4" className="animate-spin" />
            : confirmed
              ? <CheckCircle size={16} color="#16a34a" />
              : <MapPin size={16} color={error ? '#ef4444' : '#9ca3af'} />
          }
        </div>
      </div>

      {/* Confirmed badge */}
      {confirmed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, fontSize: 11, color: '#16a34a', fontWeight: 700 }}>
          <CheckCircle size={11} /> הכתובת אומתה — המיקום נשמר במדויק
        </div>
      )}

      {/* Error message */}
      {error && !confirmed && (
        <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontWeight: 600 }}>
          ⚠️ חובה לבחור כתובת מדויקת מתוך הרשימה כדי שהעובד יוכל לנווט אליך
        </div>
      )}

      {/* Dropdown */}
      {suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, left: 0, zIndex: 9999,
          background: 'white', borderRadius: 14, border: '1px solid #dce8f5',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden', marginTop: 4,
        }}>
          {suggestions.map((item, i) => {
            const addr = item.address || {};
            const city = addr.city || addr.town || addr.village || addr.county || '';
            const road = addr.road || addr.pedestrian || addr.neighbourhood || '';
            const houseNumber = addr.house_number || '';
            const label = road ? `${road}${houseNumber ? ` ${houseNumber}` : ''}` : item.display_name.split(',')[0];
            return (
              <button
                key={item.place_id}
                onMouseDown={() => handleSelect(item)}
                style={{
                  width: '100%', textAlign: 'right', padding: '11px 14px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: i < suggestions.length - 1 ? '1px solid #f0f4f8' : 'none',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <MapPin size={14} color="#1a6fd4" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{city}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}