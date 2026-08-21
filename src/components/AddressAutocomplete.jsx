import { useState, useRef, useEffect } from 'react';
import { MapPin, CheckCircle, Loader2, Locate, Clock } from 'lucide-react';

const RECENT_KEY = 'joba24_recent_addresses';

function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
function saveRecent(addr) {
  try {
    const prev = loadRecent().filter(a => a.location_name !== addr.location_name);
    const next = [addr, ...prev].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    return next;
  } catch { return loadRecent(); }
}

/**
 * AddressAutocomplete — uses Nominatim (OpenStreetMap) — no API key needed.
 * - Prioritizes results near the user's location / matching the user's city.
 * - Offers a one-tap "use my current location" shortcut.
 * - Surfaces recently used addresses for fast reuse.
 * - Allows free-text input and confirms via selection.
 */
export default function AddressAutocomplete({ value, onSelect, error, onBlur, initialConfirmed = false }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [confirmed, setConfirmed] = useState(initialConfirmed || !!value);
  const [userLocation, setUserLocation] = useState(null);
  const [userCity, setUserCity] = useState('');
  const [recent, setRecent] = useState(() => loadRecent());
  const [showQuickPick, setShowQuickPick] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // Try to get user location once for prioritization + reverse-geocoded city
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        // Reverse-geocode to learn the user's city — used to rank typed results
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}&zoom=14&addressdetails=1&accept-language=he`);
          const d = await r.json();
          const a = d.address || {};
          setUserCity(a.city || a.town || a.village || a.county || '');
        } catch {}
      },
      () => {},
      { timeout: 5000 }
    );
  }, []);

  // Sync if parent resets value or sets it externally
  useEffect(() => {
    if (!value) { setQuery(''); setConfirmed(false); }
    else if (value !== query) { setQuery(value); if (value) setConfirmed(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const search = async (q) => {
    if (q.length < 2) { setSuggestions([]); return; }
    setLoading(true);

    let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=8&accept-language=he&countrycodes=il`;
    if (userLocation) {
      const delta = 0.5;
      url += `&viewbox=${userLocation.lng - delta},${userLocation.lat + delta},${userLocation.lng + delta},${userLocation.lat - delta}&bounded=0`;
    }

    let data = [];
    try {
      const res = await fetch(url, { headers: { 'Accept-Language': 'he' } });
      data = await res.json();
    } catch { data = []; }

    // Sort: results in the user's city first (by name), then by distance.
    let sorted = data;
    if (data.length > 1) {
      sorted = [...data].sort((a, b) => {
        const aCity = (a.address?.city || a.address?.town || a.address?.village || a.address?.county || '').trim();
        const bCity = (b.address?.city || b.address?.town || b.address?.village || b.address?.county || '').trim();
        const aInCity = userCity && aCity && aCity.includes(userCity);
        const bInCity = userCity && bCity && bCity.includes(userCity);
        if (aInCity !== bInCity) return aInCity ? -1 : 1;
        if (userLocation) {
          const distA = Math.hypot(parseFloat(a.lat) - userLocation.lat, parseFloat(a.lon) - userLocation.lng);
          const distB = Math.hypot(parseFloat(b.lat) - userLocation.lat, parseFloat(b.lon) - userLocation.lng);
          return distA - distB;
        }
        return 0;
      });
    }

    setSuggestions(sorted);
    setLoading(false);
  };

  const applySelection = (item) => {
    const addr = item.address || {};
    const city = addr.city || addr.town || addr.village || addr.county || '';
    const road = addr.road || addr.pedestrian || addr.neighbourhood || '';
    const houseNumber = addr.house_number || '';
    const street = road + (houseNumber ? ` ${houseNumber}` : '');
    const display = street ? `${street}, ${city}` : item.display_name.split(',').slice(0, 3).join(',').trim();

    setQuery(display);
    setSuggestions([]);
    setConfirmed(true);
    setShowQuickPick(false);
    const payload = { location_name: display, city, lat: parseFloat(item.lat), lng: parseFloat(item.lon) };
    setRecent(saveRecent(payload));
    onSelect(payload);
  };

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    setConfirmed(false);
    setShowQuickPick(false);
    onSelect({ location_name: v, city: '', lat: null, lng: null });
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 300);
  };

  // Allow confirming typed free text (press Enter on first suggestion)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && suggestions.length > 0) {
      applySelection(suggestions[0]);
    }
  };

  const handleBlur = () => {
    if (query && !confirmed) {
      // Allow free text — mark as confirmed with no coords (parent decides)
    }
    setTimeout(() => { setSuggestions([]); setShowQuickPick(false); }, 150);
    onBlur?.();
  };

  const handleFocus = () => {
    if (!query) setShowQuickPick(true);
  };

  // "Use my current location" — reverse geocode and select
  const locateMe = async () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=18&addressdetails=1&accept-language=he`);
          const d = await r.json();
          setLocating(false);
          if (!d) return;
          // Nominatim reverse result has lat/lon at top level
          applySelection({ ...d, lat: d.lat, lon: d.lon });
        } catch { setLocating(false); }
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const pickRecent = (addr) => {
    setQuery(addr.location_name);
    setSuggestions([]);
    setShowQuickPick(false);
    setConfirmed(true);
    onSelect({ location_name: addr.location_name, city: addr.city || '', lat: addr.lat, lng: addr.lng });
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setSuggestions([]);
        setShowQuickPick(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const borderColor = confirmed ? '#16a34a' : error ? '#ef4444' : '#dce8f5';
  const bgColor = confirmed ? '#f0fdf4' : error ? '#fff5f5' : '#f4f7fb';
  const showDropdown = suggestions.length > 0 || (showQuickPick && !query);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
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

      {/* Dropdown — quick-pick (current location + recent) when empty, or search results */}
      {showDropdown && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, left: 0, zIndex: 9999,
          background: 'white', borderRadius: 14, border: '1px solid #dce8f5',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden', marginTop: 4,
        }}>
          {/* Empty-query quick picks: use current location + recent addresses */}
          {!query && (
            <>
              <button
                onMouseDown={(e) => { e.preventDefault(); locateMe(); }}
                style={{
                  width: '100%', textAlign: 'right', padding: '12px 14px',
                  background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: 'none',
                  cursor: 'pointer', borderBottom: '1px solid #bfdbfe',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <div style={{ width: 30, height: 30, borderRadius: 8, background: '#1a6fd4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {locating ? <Loader2 size={15} color="white" className="animate-spin" /> : <Locate size={15} color="white" />}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1a6fd4' }}>{locating ? 'מאתר מיקום...' : 'השתמש במיקום הנוכחי שלי'}</div>
                  <div style={{ fontSize: 10.5, color: '#3b82f6', marginTop: 1 }}>מילוי אוטומטי לפי ה-GPS</div>
                </div>
              </button>

              {recent.length > 0 && (
                <>
                  <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: 0.3 }}>כתובות אחרונות</div>
                  {recent.map((addr, i) => (
                    <button
                      key={i}
                      onMouseDown={(e) => { e.preventDefault(); pickRecent(addr); }}
                      style={{
                        width: '100%', textAlign: 'right', padding: '10px 14px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        borderBottom: i < recent.length - 1 ? '1px solid #f0f4f8' : 'none',
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                      }}
                    >
                      <Clock size={13} color="#9ca3af" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{addr.location_name}</div>
                        {addr.city && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{addr.city}</div>}
                      </div>
                    </button>
                  ))}
                </>
              )}
            </>
          )}

          {/* Search results */}
          {query && suggestions.map((item, i) => {
            const addr = item.address || {};
            const city = addr.city || addr.town || addr.village || addr.county || '';
            const road = addr.road || addr.pedestrian || addr.neighbourhood || '';
            const houseNumber = addr.house_number || '';
            const label = road ? `${road}${houseNumber ? ` ${houseNumber}` : ''}` : item.display_name.split(',')[0];
            const inUserCity = userCity && city && city.includes(userCity);
            return (
              <button
                key={item.place_id}
                onMouseDown={(e) => { e.preventDefault(); applySelection(item); }}
                style={{
                  width: '100%', textAlign: 'right', padding: '11px 14px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: i < suggestions.length - 1 ? '1px solid #f0f4f8' : 'none',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <MapPin size={14} color={inUserCity ? '#16a34a' : '#1a6fd4'} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                    {city}{inUserCity && <span style={{ color: '#16a34a', fontWeight: 700 }}> · בעיר שלך</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}