import { useState, useEffect, useRef, useCallback } from 'react';
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Navigation, X, MapPin, Clock, ChevronRight, Layers, Compass, Building2 } from 'lucide-react';
import { getCategoryLabel } from '@/lib/categories';

const CENTER = { longitude: 34.7818, latitude: 32.0853 };

const MAP_STYLES = [
  { label: '🌅 חם',    style: 'mapbox://styles/mapbox/outdoors-v12' },
  { label: '🏙️ עיר',  style: 'mapbox://styles/mapbox/streets-v12' },
  { label: '🌙 לילה',  style: 'mapbox://styles/mapbox/dark-v11' },
  { label: '🛰️ לוויין', style: 'mapbox://styles/mapbox/satellite-streets-v12' },
];

function calcDist(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const aa = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

function TaskPin({ task, selected, isMyTask }) {
  const bg = isMyTask
    ? (selected ? 'linear-gradient(135deg,#d97706,#f59e0b)' : '#f59e0b')
    : (selected ? 'linear-gradient(135deg,#0a52b0,#1a6fd4)' : '#1a6fd4');
  const arrowColor = isMyTask ? '#f59e0b' : (selected ? '#0a52b0' : '#1a6fd4');
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      cursor: 'pointer',
      transform: selected ? 'scale(1.3)' : 'scale(1)',
      transition: 'transform 0.25s cubic-bezier(0.34,1.5,0.64,1)',
      filter: selected
        ? `drop-shadow(0 6px 16px ${isMyTask ? 'rgba(245,158,11,0.7)' : 'rgba(26,111,212,0.7)'})`
        : 'drop-shadow(0 2px 8px rgba(0,0,0,0.25))',
    }}>
      <div style={{
        background: bg,
        border: selected ? '3px solid white' : '2px solid white',
        boxShadow: selected ? '0 4px 20px rgba(0,0,0,0.35)' : '0 2px 10px rgba(0,0,0,0.2)',
        borderRadius: 20, padding: '5px 10px',
        fontSize: selected ? 13 : 12, fontWeight: 900, color: 'white', whiteSpace: 'nowrap',
      }}>
        {isMyTask ? '⭐ ' : ''}₪{task.price}
      </div>
      <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `8px solid ${arrowColor}`, marginTop: -1 }} />
    </div>
  );
}

function WorkerLivePin({ task }) {
  return (
    <div onClick={() => {}} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        background: 'linear-gradient(135deg,#059669,#10b981)',
        border: '2.5px solid white', borderRadius: 20, padding: '5px 10px',
        fontSize: 12, fontWeight: 900, color: 'white', whiteSpace: 'nowrap',
        boxShadow: '0 3px 14px rgba(16,185,129,0.55)',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <span style={{ fontSize: 10 }}>🚗</span> {task.worker_name?.split(' ')[0]}
      </div>
      <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '8px solid #10b981', marginTop: -1 }} />
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
  const mapRef = useRef(null);
  const seedRef = useRef({});
  const dashOffsetRef = useRef(0);
  const cinematicDoneRef = useRef(false);
  const didFit = useRef(false);

  const [userLocation, setUserLocation] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [styleIdx, setStyleIdx] = useState(0);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [show3D, setShow3D] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [mapToken, setMapToken] = useState('');
  const [routeOffset, setRouteOffset] = useState(0);
  const [viewState, setViewState] = useState({
    longitude: CENTER.longitude, latitude: CENTER.latitude,
    zoom: 13, pitch: 50, bearing: 25,
  });
  const containerRef = useRef(null);

  useEffect(() => {
    base44.functions.invoke('getMapboxToken', {}).then(res => {
      if (res.data?.token) setMapToken(res.data.token);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const fallback = setTimeout(() => setMounted(true), 300);
    if (!containerRef.current) return () => clearTimeout(fallback);
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) { clearTimeout(fallback); setMounted(true); ro.disconnect(); }
    });
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); clearTimeout(fallback); };
  }, []);

  // Animate route dashes
  useEffect(() => {
    if (!selectedTask) return;
    let frame;
    const animate = () => {
      dashOffsetRef.current = (dashOffsetRef.current + 0.15) % 10;
      setRouteOffset(dashOffsetRef.current);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [selectedTask?.id]);

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
    const lat = parseFloat(t.lat), lng = parseFloat(t.lng);
    if (isFinite(lat) && isFinite(lng)) return { ...t, lat, lng };
    if (!seedRef.current[t.id]) {
      seedRef.current[t.id] = {
        lat: CENTER.latitude + (Math.random() - 0.5) * 0.06,
        lng: CENTER.longitude + (Math.random() - 0.5) * 0.06,
      };
    }
    return { ...t, ...seedRef.current[t.id] };
  });

  // Workers actively on the way (live tracking pins)
  const activeTakenTasks = tasks.filter(t =>
    t.status === 'TAKEN' &&
    t.worker_status === 'on_the_way' &&
    isFinite(parseFloat(t.worker_lat)) &&
    isFinite(parseFloat(t.worker_lng))
  ).map(t => ({ ...t, worker_lat: parseFloat(t.worker_lat), worker_lng: parseFloat(t.worker_lng) }));

  const onMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.resize();
    if (!map.getLayer('3d-buildings')) {
      map.addLayer({
        id: '3d-buildings', source: 'composite', 'source-layer': 'building',
        filter: ['==', 'extrude', 'true'], type: 'fill-extrusion', minzoom: 13,
        paint: {
          'fill-extrusion-color': ['interpolate', ['linear'], ['zoom'], 13, '#d4a574', 16, '#c8956f'],
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, 0, 16, ['get', 'height']],
          'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 13, 0, 16, ['get', 'min_height']],
          'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.5, 16, 0.75],
          'fill-extrusion-vertical-gradient': true,
        },
      });
      map.setLight({ anchor: 'viewport', color: '#ffb366', intensity: 0.6, position: [1.15, 210, 30] });
    }
    if (!cinematicDoneRef.current) {
      cinematicDoneRef.current = true;
      setTimeout(() => {
        map.flyTo({ center: [CENTER.longitude, CENTER.latitude], zoom: 14.5, pitch: 60, bearing: 35, duration: 3800, easing: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t });
      }, 600);
    }
  }, []);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !map.getLayer('3d-buildings')) return;
    map.setPaintProperty('3d-buildings', 'fill-extrusion-opacity', show3D ? ['interpolate', ['linear'], ['zoom'], 13, 0.5, 16, 0.75] : 0);
  }, [show3D]);

  useEffect(() => {
    if (didFit.current || displayTasks.length === 0 || !mapRef.current) return;
    didFit.current = true;
    const map = mapRef.current.getMap();
    if (displayTasks.length === 1) {
      map.flyTo({ center: [displayTasks[0].lng, displayTasks[0].lat], zoom: 15, pitch: 55, bearing: 25, duration: 1400 });
    } else {
      const lngs = displayTasks.map(t => t.lng);
      const lats = displayTasks.map(t => t.lat);
      if (userLocation) { lngs.push(userLocation.lng); lats.push(userLocation.lat); }
      map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 80, maxZoom: 15, duration: 1400, pitch: 50, bearing: 25 });
    }
  }, [displayTasks.length]);

  useEffect(() => {
    if (!selectedTask || !mapRef.current) return;
    const map = mapRef.current.getMap();
    map.flyTo({ center: [selectedTask.lng, selectedTask.lat], zoom: 16.5, pitch: 65, bearing: 30 + Math.random() * 50, duration: 1400, easing: t => 1 - Math.pow(1 - t, 3) });
  }, [selectedTask?.id]);

  useEffect(() => {
    if (selectedTask) return;
    mapRef.current?.getMap()?.easeTo({ pitch: 50, bearing: 25, duration: 900 });
  }, [selectedTask]);

  const dist = selectedTask && userLocation ? calcDist(userLocation, { lat: selectedTask.lat, lng: selectedTask.lng }) : null;
  const routeGeoJSON = selectedTask && userLocation ? {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: [[userLocation.lng, userLocation.lat], [selectedTask.lng, selectedTask.lat]] } }],
  } : null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }} dir="rtl">
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
        {mounted && mapToken && (
          <Map
            ref={mapRef}
            {...viewState}
            onMove={e => setViewState(e.viewState)}
            onLoad={onMapLoad}
            onError={(e) => console.warn('Mapbox error:', e.error?.message)}
            mapboxAccessToken={mapToken}
            mapStyle={MAP_STYLES[styleIdx].style}
            style={{ width: '100%', height: '100%' }}
            maxPitch={85}
            minZoom={8}
            attributionControl={false}
          >
            <NavigationControl position="bottom-left" showCompass visualizePitch />

            {/* Route */}
            {routeGeoJSON && (
              <>
                <Source id="route-bg" type="geojson" data={routeGeoJSON}>
                  <Layer id="route-glow" type="line" paint={{ 'line-color': '#3b82f6', 'line-width': 14, 'line-opacity': 0.18, 'line-blur': 6 }} />
                  <Layer id="route-casing" type="line" paint={{ 'line-color': '#bfdbfe', 'line-width': 8, 'line-opacity': 0.7 }} />
                  <Layer id="route-line" type="line" paint={{ 'line-color': '#1a6fd4', 'line-width': 4, 'line-opacity': 0.95, 'line-dasharray': [0, 2, 6, 0] }} />
                </Source>
                <Source id="route-anim" type="geojson" data={routeGeoJSON}>
                  <Layer id="route-dash" type="line" paint={{ 'line-color': 'white', 'line-width': 2, 'line-opacity': 0.8, 'line-dasharray': [0, routeOffset % 10 < 5 ? 4 : 0, 6, 0] }} />
                </Source>
                <Source id="dest-pulse" type="geojson" data={{ type: 'Feature', geometry: { type: 'Point', coordinates: [selectedTask.lng, selectedTask.lat] } }}>
                  <Layer id="dest-circle-outer" type="circle" paint={{ 'circle-radius': 40, 'circle-color': '#1a6fd4', 'circle-opacity': 0.08, 'circle-stroke-width': 2, 'circle-stroke-color': '#1a6fd4', 'circle-stroke-opacity': 0.25 }} />
                </Source>
              </>
            )}

            {/* User */}
            {userLocation && (
              <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="bottom">
                <UserPin />
              </Marker>
            )}

            {/* OPEN task markers */}
            {displayTasks.filter(t => isFinite(t.lat) && isFinite(t.lng)).map(task => (
              <Marker key={task.id} longitude={task.lng} latitude={task.lat} anchor="bottom"
                onClick={e => { e.originalEvent.stopPropagation(); setSelectedTask(prev => prev?.id === task.id ? null : task); }}>
                <TaskPin task={task} selected={selectedTask?.id === task.id} isMyTask={task.client_id === me?.id} />
              </Marker>
            ))}

            {/* Live worker pins */}
            {activeTakenTasks.map(task => (
              <Marker key={`worker-${task.id}`} longitude={task.worker_lng} latitude={task.worker_lat} anchor="bottom"
                onClick={e => { e.originalEvent.stopPropagation(); }}>
                <WorkerLivePin task={task} />
              </Marker>
            ))}
          </Map>
        )}

        {/* Floating controls — top right */}
        <div style={{ position: 'absolute', top: 'calc(72px + env(safe-area-inset-top))', right: 12, zIndex: 10, display: 'flex', gap: 8, flexDirection: 'column' }}>
          <button onClick={() => setShow3D(v => !v)} style={{ width: 40, height: 40, borderRadius: 12, background: show3D ? '#dbeafe' : 'rgba(255,255,255,0.92)', border: `1.5px solid ${show3D ? '#3b82f6' : 'rgba(0,0,0,0.09)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <Building2 size={16} color={show3D ? '#1a6fd4' : '#6b7280'} />
          </button>
          <button onClick={() => { mapRef.current?.getMap()?.flyTo({ center: [CENTER.longitude, CENTER.latitude], zoom: 13.5, pitch: 50, bearing: 25, duration: 1200 }); }} style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.92)', border: '1.5px solid rgba(0,0,0,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <Compass size={16} color="#1a6fd4" />
          </button>
          <button onClick={() => setShowStylePicker(v => !v)} style={{ width: 40, height: 40, borderRadius: 12, background: showStylePicker ? '#dbeafe' : 'rgba(255,255,255,0.92)', border: '1.5px solid rgba(0,0,0,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <Layers size={16} color="#1a6fd4" />
          </button>
          {showStylePicker && (
            <div style={{ position: 'absolute', top: 128, right: 0, background: 'white', border: '1px solid #dce8f5', borderRadius: 14, boxShadow: '0 6px 24px rgba(0,0,0,0.14)', zIndex: 1001, overflow: 'hidden', minWidth: 120 }}>
              {MAP_STYLES.map((s, i) => (
                <button key={i} onClick={() => { setStyleIdx(i); setShowStylePicker(false); }}
                  style={{ display: 'block', width: '100%', padding: '11px 14px', textAlign: 'right', background: styleIdx === i ? '#eff6ff' : 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: styleIdx === i ? 700 : 400, color: styleIdx === i ? '#1a6fd4' : '#374151' }}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Task counter — top left */}
        <div style={{ position: 'absolute', top: 'calc(72px + env(safe-area-inset-top))', left: 12, zIndex: 10, background: 'rgba(255,255,255,0.92)', borderRadius: 12, padding: '8px 12px', boxShadow: '0 2px 12px rgba(0,0,0,0.12)', border: '1px solid #e5e9f5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ background: '#1a6fd4', color: 'white', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>{displayTasks.length}</span>
              <span style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>משימות</span>
            </div>
            {activeTakenTasks.length > 0 && (
              <>
                <span style={{ fontSize: 11, color: '#bbb', opacity: 0.5 }}>·</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ background: '#10b981', color: 'white', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>🚗</span>
                  <span style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>{activeTakenTasks.length}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Legend — bottom right */}
        <div style={{
          position: 'absolute', bottom: 140, right: 12, zIndex: 10,
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
          borderRadius: 12, padding: '8px 12px', boxShadow: '0 2px 12px rgba(0,0,0,0.12)', border: '1px solid #e5e9f5',
          display: 'flex', flexDirection: 'column', gap: 5,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#374151' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: '#1a6fd4' }} /><span>פתוחות</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#374151' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: '#10b981' }} /><span>בדרך</span>
          </div>
          {me && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#374151' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: '#f59e0b' }} /><span>שלי</span>
            </div>
          )}
        </div>

        {/* Task card */}
        {selectedTask && (
          <div style={{
            position: 'absolute', bottom: 24, left: 16, right: 16, zIndex: 10,
            background: 'white', borderRadius: 24,
            boxShadow: '0 8px 40px rgba(15,43,107,0.22)',
            padding: '16px 16px 14px', border: '1px solid #dce8f5',
            animation: 'slideUpCard 0.25s cubic-bezier(0.34,1.3,0.64,1)',
          }} dir="rtl">
            <button onClick={() => setSelectedTask(null)} style={{ position: 'absolute', top: 12, left: 12, width: 28, height: 28, borderRadius: 8, background: '#f3f4f6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
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
                <span style={{ fontSize: 11, color: '#93c5fd', marginRight: 'auto' }}>מסלול מוצג</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => window.open(`https://waze.com/ul?ll=${selectedTask.lat},${selectedTask.lng}&navigate=yes`, '_blank')} style={{ flex: 1, height: 40, borderRadius: 12, background: '#1da462', border: 'none', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Waze</button>
              <button onClick={() => window.open(`https://maps.google.com/?q=${selectedTask.lat},${selectedTask.lng}`, '_blank')} style={{ flex: 1, height: 40, borderRadius: 12, background: '#4285f4', border: 'none', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Google</button>
              <button onClick={() => window.location.href = `/task/${selectedTask.id}`} style={{ flex: 1, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', border: 'none', color: 'white', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                פרטים <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes slideUpCard{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}