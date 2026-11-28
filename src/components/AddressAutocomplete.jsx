import { useState, useRef, useEffect } from 'react';
import { getCurrentPosition, checkLocationPermission } from '@/lib/nativeGeolocation';
import { showPermissionPopup } from '@/lib/permissionPopup';
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

// ── A PLACE NAME, NEVER AN ADMINISTRATIVE PREFIX ─────────────────────────────
// Nominatim answers a city with its whole administrative stack — "הרצליה, נפת
// תל אביב, מחוז תל אביב" — and this field used to print the first three parts of
// that. Typing a city and getting "נפת …" back reads like the app answered a
// different question, and a district is not a place anyone navigates to. Only
// real place names are ever shown, and district / province parts are dropped.
const isAdminPart = (s) =>
  /^(נפת|מחוז|מחוזות|מדינת)(\s|$)/.test(s) ||
  /^(state|district|county|region|province|subdistrict|governorate)(\s|$)/i.test(s);

/** The city a result belongs to, or '' when the only candidate is a district. */
const cityOf = (a = {}) => {
  const direct = a.city || a.town || a.village || a.municipality || a.suburb || a.hamlet || '';
  if (direct) return direct;
  const county = a.county || '';
  return county && !isAdminPart(county) ? county : '';
};

const streetOf = (a = {}) => {
  const road = a.road || a.pedestrian || a.footway || a.square || '';
  if (!road) return '';
  return a.house_number ? `${road} ${a.house_number}` : road;
};

/** The label a publisher should SEE for a result — clean, and only real places. */
const placeLabel = (item = {}) => {
  const a = item.address || {};
  const city = cityOf(a);
  const street = streetOf(a);
  if (street && city) return `${street}, ${city}`;
  if (street) return street;
  if (city) return city;
  const parts = String(item.display_name || '').split(',').map((s) => s.trim()).filter(Boolean);
  return parts.find((p) => !isAdminPart(p)) || parts[0] || '';
};

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
  // Every query this session has already answered, so typing a letter and
  // deleting it again is instant instead of a second round trip.
  const cacheRef = useRef(new Map());

  // Use the position for prioritisation ONLY when it is already allowed.
  // Opening this form used to request the position outright, so the OS location
  // dialog met the publisher before they had asked for anything — a form must
  // never ask for a permission on load. The position is collected here only if
  // the device already permits it, and a refusal is explained only when the
  // visitor presses "השתמש במיקום הנוכחי שלי" (see locateMe below).
  const locateSilently = () => {
    getCurrentPosition(
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
  };

  useEffect(() => {
    if (!navigator.geolocation) return;
    checkLocationPermission()
      .then(state => { if (state === 'granted') locateSilently(); })
      .catch(() => {});
  }, []);

  // Sync if parent resets value or sets it externally
  useEffect(() => {
    if (!value) { setQuery(''); setConfirmed(false); }
    else if (value !== query) { setQuery(value); if (value) setConfirmed(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const search = async (q) => {
    const key = q.trim();
    if (key.length < 2) { setSuggestions([]); return; }
    if (cacheRef.current.has(key)) { setSuggestions(cacheRef.current.get(key)); setLoading(false); return; }
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

    // ── RANKED BY WHAT THE PUBLISHER IS ACTUALLY TYPING ────────────────────
    // A place whose own name matches the text comes first (an exact city match
    // above a prefix), then a street that starts with it, then the user's own
    // city, and only then distance. Typing "הרצליה" therefore puts Herzliya at
    // the top of the list instead of a street in another town that happens to
    // sit closer to the device.
    let sorted = data;
    if (data.length > 1) {
      const ql = key.toLowerCase();
      const rank = (r) => {
        const a = r.address || {};
        const city = cityOf(a).toLowerCase();
        const road = streetOf(a).toLowerCase();
        let s = 0;
        if (city && city === ql) s += 5;
        else if (city && city.startsWith(ql)) s += 4;
        else if (city && city.includes(ql)) s += 2;
        if (road && road.startsWith(ql)) s += 3;
        if (userCity && city && city.includes(userCity.toLowerCase())) s += 1;
        return s;
      };
      sorted = [...data].sort((a, b) => {
        const d = rank(b) - rank(a);
        if (d) return d;
        if (userLocation) {
          const distA = Math.hypot(parseFloat(a.lat) - userLocation.lat, parseFloat(a.lon) - userLocation.lng);
          const distB = Math.hypot(parseFloat(b.lat) - userLocation.lat, parseFloat(b.lon) - userLocation.lng);
          return distA - distB;
        }
        return 0;
      });
    }

    cacheRef.current.set(key, sorted);
    setSuggestions(sorted);
    setLoading(false);
  };

  const applySelection = (item) => {
    const addr = item.address || {};
    const city = cityOf(addr);
    // Built from real place names only: "הרצליה" stays "הרצליה" and never
    // becomes "הרצליה, נפת תל אביב, מחוז תל אביב".
    const display = placeLabel(item);

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
    debounceRef.current = setTimeout(() => search(v), 220);
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
    getCurrentPosition(
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
      (err) => {
        setLocating(false);
        // The visitor asked for this exact thing, so a refusal is explained —
        // and the sheet's retry runs the same request again.
        if (err?.code === 1) {
          showPermissionPopup({ kind: 'location', mode: 'denied', onRetry: locateMe });
        }
      },
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

  // Theme-aware: a hardcoded light background paired with `var(--text-1)` text
  // turned the input invisible in dark mode (white text on a near-white field).
  const borderColor = confirmed ? 'var(--color-success)' : error ? 'var(--color-danger)' : 'var(--border-1)';
  const bgColor = confirmed ? 'var(--color-success-bg)' : error ? 'var(--color-danger-bg)' : 'var(--surface-3)';
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
          placeholder="רחוב, מספר בית ועיר"
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
            ? <Loader2 size={16} color="var(--brand-input-focus, var(--brand-primary))" className="animate-spin" />
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
          background: 'var(--pub-bg, var(--surface-2))', borderRadius: 12, border: '1px solid var(--pub-border, var(--border-1))',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden', marginTop: 4,
        }}>
          {/* Empty-query quick picks: use current location + recent addresses */}
          {!query && (
            <>
              <button
                onMouseDown={(e) => { e.preventDefault(); locateMe(); }}
                style={{
                  width: '100%', textAlign: 'right', padding: '12px 14px',
                  background: 'linear-gradient(135deg,var(--brand-primary-light),var(--brand-primary-light))', border: 'none',
                  cursor: 'pointer', borderBottom: '1px solid var(--border-2)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--brand-input-focus, var(--brand-primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {locating ? <Loader2 size={15} color="white" className="animate-spin" /> : <Locate size={15} color="white" />}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--brand-input-focus, var(--brand-primary))' }}>{locating ? 'מאתר מיקום...' : 'השתמש במיקום הנוכחי שלי'}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--brand-primary)', marginTop: 1 }}>מילוי אוטומטי לפי ה-GPS</div>
                </div>
              </button>

              {recent.length > 0 && (
                <>
                  <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.3 }}>כתובות אחרונות</div>
                  {/* ── EVERY ROW BELOW USES THEME TOKENS ────────────────────
                      The rows were painted with a fixed near-black ink (#111)
                      and a fixed near-white divider. On the dark sheet that is
                      dark-on-dark: the suggestions were there, invisible, which
                      is exactly what "the options can't be seen" meant. The ink,
                      the divider and the hover now come from the tokens, so the
                      list is readable in both schemes and follows a Brand. */}
                  {recent.map((addr, i) => (
                    <button
                      key={i}
                      onMouseDown={(e) => { e.preventDefault(); pickRecent(addr); }}
                      style={{
                        width: '100%', textAlign: 'right', padding: '10px 14px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        borderBottom: i < recent.length - 1 ? '1px solid var(--border-1)' : 'none',
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                      }}
                    >
                      <Clock size={13} color="var(--text-3)" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{addr.location_name}</div>
                        {addr.city && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{addr.city}</div>}
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
            const city = cityOf(addr);
            const label = placeLabel(item);
            // The second line shows the city only when the label is not already
            // the city itself — a city result never repeats its own name.
            const sub = city && !label.includes(city) ? city : '';
            const inUserCity = userCity && city && city.includes(userCity);
            return (
              <button
                key={item.place_id}
                onMouseDown={(e) => { e.preventDefault(); applySelection(item); }}
                style={{
                  width: '100%', textAlign: 'right', padding: '11px 14px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: i < suggestions.length - 1 ? '1px solid var(--border-1)' : 'none',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <MapPin size={14} color={inUserCity ? '#16a34a' : 'var(--brand-input-focus, var(--brand-primary))'} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{label}</div>
                  {(sub || inUserCity) && (
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                      {sub}{sub && inUserCity ? ' · ' : ''}
                      {inUserCity && <span style={{ color: '#16a34a', fontWeight: 700 }}>בעיר שלך</span>}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}