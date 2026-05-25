import { useState, useEffect, useRef, useCallback } from 'react';
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Navigation, X, MapPin, Clock, ChevronRight, Layers } from 'lucide-react';
import { getCategoryLabel } from '@/lib/categories';


const CENTER = { longitude: 34.7818, latitude: 32.0853 };

const MAP_STYLES = [
  { label: 'בהיר', style: 'mapbox://styles/mapbox/light-v11' },
  { label: 'רחובות', style: 'mapbox://styles/mapbox/streets-v12' },
  { label: 'לילה', style: 'mapbox://styles/mapbox/dark-v11' },
  { label: 'לוויין', style: 'mapbox://styles/mapbox/satellite-streets-v12' },
];

function distKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const aa = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

function TaskPin({ task, selected, isMyTask, onClick }) {
  const bg = isMyTask
    ? (selected ? 'linear-gradient(135deg,#d97706,#f59e0b)' : '#f59e0b')
    : (selected ? 'linear-gradient(135deg,#0a52b0,#1a6fd4)' : '#1a6fd4');
  const arrowColor = isMyTask ? '#f59e0b' : (selected ? '#0a52b0' : '#1a6fd4');

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        cursor: 'pointer',
        transform: selected ? 'scale(1.25)' : 'scale(1)',
        transition: 'transform 0.2s',
        filter: selected ? `drop-shadow(0 4px 12px ${isMyTask ? 'rgba(245,158,11,0.6)' : 'rgba(26,111,212,0.6)'})` : 'none',
      }}
    >
      <div style={{
        background: bg,
        border: selected ? '3px solid white' : '2px solid white',
        boxShadow: selected ? '0 4px 16px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.2)',
        borderRadius: 20, padding: '5px 10px',
        fontSize: selected ? 13 : 12, fontWeight: 900, color: 'white', whiteSpace: 'nowrap',
      }}>
        {isMyTask ? '⭐ ' : ''}₪{task.price}
      </div>
      <div style={{
        width: 0, height: 0,
        borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
        borderTop: `8px solid ${arrowColor}`, marginTop: -1,
      }} />
    </div>
  );
}

function UserPin() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        background: 'white', border: '3px solid #10b981',
        boxShadow: '0 4px 20px rgba(16,185,129,0.5)',
        borderRadius: '50%', width: 38, height: 38,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
      }}>🧑</div>
      <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '8px solid #10b981', marginTop: -1 }} />
    </div>
  );
}

export default function MapView() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const seedRef = useRef({});

  const [userLocation, setUserLocation] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [styleIdx, setStyleIdx] = useState(0);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [viewState, setViewState] = useState({ longitude: CENTER.longitude, latitude: CENTER.latitude, zoom: 13 });
  const [mounted, setMounted] = useState(false);
  const [mapToken, setMapToken] = useState('');
  const containerRef = useRef(null);

  // Fetch Mapbox token from backend (VITE_ vars not available in sandbox)
  useEffect(() => {
    base44.functions.invoke('getMapboxToken', {}).then(res => {
      if (res.data?.token) setMapToken(res.data.token);
    }).catch(() => {});
  }, []);

  // Suppress known Mapbox mouseover NaN bug
  useEffect(() => {
    const handler = (e) => {
      if (e.message?.includes('Invalid LngLat')) { e.preventDefault(); e.stopImmediatePropagation(); }
    };
    window.addEventListener('error', handler, true);
    return () => window.removeEventListener('error', handler, true);
  }, []);

  useEffect(() => {
    // Fallback: mount after 300ms regardless
    const fallback = setTimeout(() => setMounted(true), 300);
    if (!containerRef.current) return () => clearTimeout(fallback);
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) { clearTimeout(fallback); setMounted(true); ro.disconnect(); }
    });
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); clearTimeout(fallback); };
  }, []);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 100),
    staleTime: 20000,
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, []);

  const displayTasks = tasks.filter(t => t.status === 'OPEN').map(t => {
    const lat = parseFloat(t.lat);
    const lng = parseFloat(t.lng);
    if (isFinite(lat) && isFinite(lng)) return { ...t, lat, lng };
    if (!seedRef.current[t.id]) {
      seedRef.current[t.id] = {
        lat: CENTER.latitude + (Math.random() - 0.5) * 0.06,
        lng: CENTER.longitude + (Math.random() - 0.5) * 0.06,
      };
    }
    return { ...t, ...seedRef.current[t.id] };
  });

  // Fit bounds after tasks load
  const didFit = useRef(false);
  useEffect(() => {
    if (didFit.current || displayTasks.length === 0 || !mapRef.current) return;
    didFit.current = true;
    const map = mapRef.current.getMap();
    if (displayTasks.length === 1) {
      map.flyTo({ center: [displayTasks[0].lng, displayTasks[0].lat], zoom: 14, duration: 1200 });
    } else {
      const lngs = displayTasks.map(t => t.lng);
      const lats = displayTasks.map(t => t.lat);
      if (userLocation) { lngs.push(userLocation.lng); lats.push(userLocation.lat); }
      map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 60, maxZoom: 15, duration: 1200 }
      );
    }
  }, [displayTasks.length, userLocation, mapRef.current]);

  // Fly to selected task
  useEffect(() => {
    if (!selectedTask || !mapRef.current) return;
    mapRef.current.getMap().flyTo({
      center: [selectedTask.lng, selectedTask.lat],
      zoom: Math.max(viewState.zoom, 15),
      duration: 800,
    });
  }, [selectedTask?.id]);

  const dist = selectedTask && userLocation
    ? distKm(userLocation, { lat: selectedTask.lat, lng: selectedTask.lng })
    : null;

  // Route GeoJSON
  const routeGeoJSON = selectedTask && userLocation ? {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [userLocation.lng, userLocation.lat],
        [selectedTask.lng, selectedTask.lat],
      ],
    },
  } : null;

  return (
    <div style={{ height: 'calc(100dvh - 56px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} dir="rtl">
      <PageHeader
        title="🗺️ מפת ג'ובות"
        right={
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowStylePicker(v => !v)}
              style={{ width: 36, height: 36, borderRadius: 10, background: showStylePicker ? '#dbeafe' : 'white', border: '1px solid #dce8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Layers size={16} color="#1a6fd4" />
            </button>
            {showStylePicker && (
              <div style={{ position: 'absolute', top: 44, left: 0, background: 'white', border: '1px solid #dce8f5', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', zIndex: 1001, overflow: 'hidden', minWidth: 110 }}>
                {MAP_STYLES.map((s, i) => (
                  <button key={i} onClick={() => { setStyleIdx(i); setShowStylePicker(false); }}
                    style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'right', background: styleIdx === i ? '#eff6ff' : 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: styleIdx === i ? 700 : 400, color: styleIdx === i ? '#1a6fd4' : '#374151' }}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />

      <div style={{ background: 'white', borderBottom: '1px solid #dce8f5', padding: '8px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>
        {displayTasks.length} ג'ובות פתוחות
      </div>

      <div ref={containerRef} style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {mounted && (
        <Map
          ref={mapRef}
          {...viewState}
          onMove={e => setViewState(e.viewState)}
          onLoad={() => { try { mapRef.current?.getMap()?.resize(); } catch(e) {} }}
          onError={(e) => console.warn('Mapbox error:', e.error?.message)}
          mapboxAccessToken={mapToken}
          mapStyle={MAP_STYLES[styleIdx].style}
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="bottom-left" showCompass={false} />

          {/* Route line */}
          {routeGeoJSON && (
            <>
              <Source id="route" type="geojson" data={routeGeoJSON}>
                <Layer id="route-bg" type="line" paint={{ 'line-color': '#bfdbfe', 'line-width': 9, 'line-opacity': 0.6 }} />
                <Layer id="route-line" type="line" paint={{ 'line-color': '#1a6fd4', 'line-width': 4, 'line-dasharray': [2, 2], 'line-opacity': 0.9 }} />
              </Source>
              {/* Destination pulse circle */}
              <Source id="dest" type="geojson" data={{ type: 'Feature', geometry: { type: 'Point', coordinates: [selectedTask.lng, selectedTask.lat] } }}>
                <Layer id="dest-circle" type="circle" paint={{ 'circle-radius': 30, 'circle-color': '#1a6fd4', 'circle-opacity': 0.12, 'circle-stroke-width': 2, 'circle-stroke-color': '#1a6fd4', 'circle-stroke-opacity': 0.4 }} />
              </Source>
            </>
          )}

          {/* User marker */}
          {userLocation && (
            <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="bottom">
              <UserPin />
            </Marker>
          )}

          {/* Task markers */}
          {displayTasks.filter(t => isFinite(t.lat) && isFinite(t.lng)).map(task => (
            <Marker
              key={task.id}
              longitude={task.lng}
              latitude={task.lat}
              anchor="bottom"
              onClick={e => { e.originalEvent.stopPropagation(); setSelectedTask(prev => prev?.id === task.id ? null : task); }}
            >
              <TaskPin
                task={task}
                selected={selectedTask?.id === task.id}
                isMyTask={task.client_id === me?.id}
                onClick={() => {}}
              />
            </Marker>
          ))}
        </Map>
        )}

        {/* Legend */}
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, background: 'white', borderRadius: 12, padding: '8px 12px', boxShadow: '0 2px 10px rgba(0,0,0,0.12)', border: '1px solid #e5e9f5', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#374151' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: '#1a6fd4' }} />
            <span>משימות זמינות</span>
          </div>
          {me && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#374151' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: '#f59e0b' }} />
              <span>המשימות שלי</span>
            </div>
          )}
        </div>

        {/* Floating task card */}
        {selectedTask && (
          <div
            style={{
              position: 'absolute', bottom: 20, left: 16, right: 16, zIndex: 10,
              background: 'white', borderRadius: 24,
              boxShadow: '0 8px 40px rgba(15,43,107,0.22)',
              padding: '16px 16px 14px', border: '1px solid #dce8f5',
              animation: 'slideUpCard 0.25s cubic-bezier(0.34,1.3,0.64,1)',
            }}
            dir="rtl"
          >
            <button
              onClick={() => setSelectedTask(null)}
              style={{ position: 'absolute', top: 12, left: 12, width: 28, height: 28, borderRadius: 8, background: '#f3f4f6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={14} color="#6b7280" />
            </button>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <div style={{ background: 'linear-gradient(135deg,#0f2b6b,#1a6fd4)', borderRadius: 14, padding: '10px 14px', flexShrink: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'white', letterSpacing: -1 }}>₪{selectedTask.price}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#0f2b6b', marginBottom: 3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {selectedTask.title}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  {selectedTask.location_name && <><MapPin size={10} /><span>{selectedTask.location_name}</span></>}
                  {selectedTask.estimated_time && <><Clock size={10} /><span>{selectedTask.estimated_time}</span></>}
                  <span style={{ background: '#f1f5f9', borderRadius: 10, padding: '1px 7px', fontSize: 10 }}>{getCategoryLabel(selectedTask.category)}</span>
                </div>
              </div>
            </div>

            {dist != null && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '8px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Navigation size={13} color="#1a6fd4" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1e40af' }}>
                  {dist < 1 ? `${Math.round(dist * 1000)} מטר ממך` : `${dist.toFixed(1)} ק"מ ממך`}
                </span>
                <span style={{ fontSize: 11, color: '#93c5fd', marginRight: 'auto' }}>המסלול מוצג במפה</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => window.open(`https://waze.com/ul?ll=${selectedTask.lat},${selectedTask.lng}&navigate=yes`, '_blank')}
                style={{ flex: 1, height: 40, borderRadius: 12, background: '#1da462', border: 'none', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >Waze</button>
              <button
                onClick={() => window.open(`https://maps.google.com/?q=${selectedTask.lat},${selectedTask.lng}`, '_blank')}
                style={{ flex: 1, height: 40, borderRadius: 12, background: '#4285f4', border: 'none', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >Google Maps</button>
              <button
                onClick={() => navigate(`/task/${selectedTask.id}`)}
                style={{ flex: 1, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', border: 'none', color: 'white', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
              >
                פרטים <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes slideUpCard { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }`}</style>
    </div>
  );
}