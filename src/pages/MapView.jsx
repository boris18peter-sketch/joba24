import { useState, useEffect, useRef, useCallback } from 'react';
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Navigation, X, MapPin, Clock, ChevronRight, ArrowRight, ArrowUp, ArrowUpRight, ArrowUpLeft, RotateCcw, CheckCircle } from 'lucide-react';
import { getCategoryLabel } from '@/lib/categories';

const CENTER = { longitude: 34.7818, latitude: 32.0853 };

// Warm, soft style like Apple Maps / Mapbox Standard
const MAP_STYLE = 'mapbox://styles/mapbox/standard';

function calcDist(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const aa = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

function formatDist(km) {
  return km < 1 ? `${Math.round(km * 1000)} מ'` : `${km.toFixed(1)} ק"מ`;
}

function formatTime(seconds) {
  const mins = Math.round(seconds / 60);
  return mins < 60 ? `${mins} דק'` : `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')} ש'`;
}

function getManeuverIcon(type, modifier) {
  if (!type) return <ArrowUp size={22} color="white" />;
  if (type === 'turn') {
    if (modifier?.includes('right')) return <ArrowUpRight size={22} color="white" />;
    if (modifier?.includes('left')) return <ArrowUpLeft size={22} color="white" />;
    if (modifier?.includes('uturn')) return <RotateCcw size={22} color="white" />;
  }
  if (type === 'arrive') return <CheckCircle size={22} color="white" />;
  return <ArrowUp size={22} color="white" />;
}

function TaskPin({ task, selected, isMyTask }) {
  const color = isMyTask ? '#f59e0b' : '#1a6fd4';
  const colorDark = isMyTask ? '#d97706' : '#0a52b0';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer',
      transform: selected ? 'scale(1.35)' : 'scale(1)',
      transition: 'transform 0.25s cubic-bezier(0.34,1.5,0.64,1)',
      filter: selected ? `drop-shadow(0 6px 16px ${color}cc)` : 'drop-shadow(0 2px 8px rgba(0,0,0,0.22))',
    }}>
      <div style={{
        background: selected ? `linear-gradient(135deg,${colorDark},${color})` : color,
        border: selected ? '3px solid white' : '2px solid white',
        borderRadius: 20, padding: '5px 11px',
        fontSize: 12, fontWeight: 900, color: 'white', whiteSpace: 'nowrap',
        boxShadow: selected ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.18)',
      }}>
        {isMyTask ? '⭐ ' : ''}₪{task.price}
      </div>
      <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `8px solid ${selected ? colorDark : color}`, marginTop: -1 }} />
    </div>
  );
}

function UserDot() {
  return (
    <div style={{ position: 'relative', width: 28, height: 28 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(59,130,246,0.25)', animation: 'userPulse 2s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', inset: 5, borderRadius: '50%', background: '#3b82f6', border: '2.5px solid white', boxShadow: '0 2px 10px rgba(59,130,246,0.6)' }} />
      <style>{`@keyframes userPulse{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(2.4);opacity:0}}`}</style>
    </div>
  );
}

export default function MapView() {
  const mapRef = useRef(null);
  const seedRef = useRef({});
  const navigate = useNavigate();

  const [userLocation, setUserLocation] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [mapToken, setMapToken] = useState('');
  const [route, setRoute] = useState(null);           // GeoJSON LineString from Directions API
  const [navSteps, setNavSteps] = useState([]);       // turn-by-turn steps
  const [currentStep, setCurrentStep] = useState(0); // current step index
  const [navMode, setNavMode] = useState(false);      // full nav HUD
  const [navLoading, setNavLoading] = useState(false);
  const [totalDist, setTotalDist] = useState(null);
  const [totalTime, setTotalTime] = useState(null);
  const containerRef = useRef(null);

  const [viewState, setViewState] = useState({
    longitude: CENTER.longitude, latitude: CENTER.latitude,
    zoom: 13.5, pitch: 52, bearing: 0,
  });

  useEffect(() => {
    base44.functions.invoke('getMapboxToken', {}).then(res => {
      if (res.data?.token) setMapToken(res.data.token);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, []);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 100),
    staleTime: 20000,
  });

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

  // Fetch real road route from Mapbox Directions
  const fetchRoute = useCallback(async (task) => {
    if (!userLocation || !mapToken) return;
    setNavLoading(true);
    setRoute(null);
    setNavSteps([]);
    setCurrentStep(0);
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${userLocation.lng},${userLocation.lat};${task.lng},${task.lat}?steps=true&overview=full&geometries=geojson&language=he&access_token=${mapToken}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes?.length > 0) {
        const r = data.routes[0];
        setRoute({ type: 'Feature', geometry: r.geometry });
        setNavSteps(r.legs[0]?.steps || []);
        setTotalDist(r.distance / 1000);
        setTotalTime(r.duration);
      }
    } catch (e) {
      console.warn('Directions API error:', e);
    }
    setNavLoading(false);
  }, [userLocation, mapToken]);

  // When task selected, fetch route
  useEffect(() => {
    if (selectedTask && userLocation) {
      fetchRoute(selectedTask);
    } else {
      setRoute(null);
      setNavSteps([]);
      setNavMode(false);
    }
  }, [selectedTask?.id]);

  // Fly to task pin when selected
  useEffect(() => {
    if (!selectedTask || !mapRef.current) return;
    const map = mapRef.current.getMap();
    if (navMode) {
      // In nav mode: center between user and task
      if (userLocation) {
        map.flyTo({
          center: [(userLocation.lng + selectedTask.lng) / 2, (userLocation.lat + selectedTask.lat) / 2],
          zoom: 14, pitch: 65, bearing: 0, duration: 1200,
        });
      }
    } else {
      map.flyTo({ center: [selectedTask.lng, selectedTask.lat], zoom: 16.5, pitch: 62, bearing: 20, duration: 1400 });
    }
  }, [selectedTask?.id]);

  // Enter nav mode — zoom to route
  const startNav = () => {
    setNavMode(true);
    setCurrentStep(0);
    const map = mapRef.current?.getMap();
    if (!map || !userLocation || !selectedTask) return;
    map.flyTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: 17, pitch: 72, bearing: 0, duration: 1200,
    });
  };

  const stopNav = () => {
    setNavMode(false);
    setCurrentStep(0);
    setRoute(null);
    setSelectedTask(null);
    mapRef.current?.getMap()?.flyTo({ pitch: 52, bearing: 0, zoom: 13.5, duration: 800 });
  };

  const step = navSteps[currentStep];
  const dist = selectedTask && userLocation ? calcDist(userLocation, { lat: selectedTask.lat, lng: selectedTask.lng }) : null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }} dir="rtl">
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
        {mounted && mapToken && (
          <Map
            ref={mapRef}
            {...viewState}
            onMove={e => setViewState(e.viewState)}
            mapboxAccessToken={mapToken}
            mapStyle={MAP_STYLE}
            style={{ width: '100%', height: '100%' }}
            maxPitch={85}
            minZoom={8}
            attributionControl={false}
          >
            {/* Real road route */}
            {route && (
              <Source id="route" type="geojson" data={route}>
                <Layer id="route-casing" type="line" layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                  paint={{ 'line-color': '#1460c8', 'line-width': 14, 'line-opacity': 0.95 }} />
                <Layer id="route-fill" type="line" layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                  paint={{ 'line-color': '#3b7cff', 'line-width': 9, 'line-opacity': 1 }} />
                <Layer id="route-center" type="line" layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                  paint={{ 'line-color': '#7eb8ff', 'line-width': 3, 'line-opacity': 0.7 }} />
              </Source>
            )}

            {/* User location */}
            {userLocation && (
              <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
                {navMode ? (
                  <div style={{ width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderBottom: '22px solid #3b82f6', filter: 'drop-shadow(0 3px 8px rgba(59,130,246,0.8))' }} />
                ) : (
                  <UserDot />
                )}
              </Marker>
            )}

            {/* Task pins */}
            {!navMode && displayTasks.map(task => (
              <Marker key={task.id} longitude={task.lng} latitude={task.lat} anchor="bottom"
                onClick={e => { e.originalEvent.stopPropagation(); setSelectedTask(prev => prev?.id === task.id ? null : task); }}>
                <TaskPin task={task} selected={selectedTask?.id === task.id} isMyTask={task.client_id === me?.id} />
              </Marker>
            ))}

            {/* Destination pin in nav */}
            {navMode && selectedTask && (
              <Marker longitude={selectedTask.lng} latitude={selectedTask.lat} anchor="bottom">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ background: '#ef4444', border: '3px solid white', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 14px rgba(239,68,68,0.6)' }}>
                    <MapPin size={14} color="white" />
                  </div>
                  <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '8px solid #ef4444', marginTop: -1 }} />
                </div>
              </Marker>
            )}

            {!navMode && <NavigationControl position="bottom-left" showCompass visualizePitch />}
          </Map>
        )}

        {/* ── Back button ── */}
        {!navMode && (
          <button onClick={() => navigate(-1)} style={{
            position: 'absolute', top: 'calc(72px + env(safe-area-inset-top))', right: 14, zIndex: 20,
            width: 42, height: 42, borderRadius: 14,
            background: 'rgba(255,255,255,0.94)', border: '1px solid rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.14)',
          }}>
            <ArrowRight size={18} color="#374151" />
          </button>
        )}

        {/* ── Task counter ── */}
        {!navMode && (
          <div style={{
            position: 'absolute', top: 'calc(72px + env(safe-area-inset-top))', left: 14, zIndex: 20,
            background: 'rgba(255,255,255,0.94)', borderRadius: 14, padding: '9px 13px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.07)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ background: '#1a6fd4', color: 'white', borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 800 }}>{displayTasks.length}</span>
            <span style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>משימות פתוחות</span>
          </div>
        )}

        {/* ── NAV HUD top ── */}
        {navMode && step && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
            background: '#1e40af',
            paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))',
            paddingBottom: 14, paddingLeft: 16, paddingRight: 16,
            boxShadow: '0 4px 24px rgba(30,64,175,0.45)',
          }}>
            {/* Main instruction */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {getManeuverIcon(step.maneuver?.type, step.maneuver?.modifier)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'white', lineHeight: 1.2, letterSpacing: -0.5 }}>
                  {step.distance > 1000 ? `${(step.distance / 1000).toFixed(1)} ק"מ` : `${Math.round(step.distance)} מ'`}
                </div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: 600, marginTop: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {step.maneuver?.instruction || step.name || ''}
                </div>
              </div>
              {/* Total info */}
              <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '6px 10px', flexShrink: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: 'white' }}>{totalDist ? formatDist(totalDist) : ''}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{totalTime ? formatTime(totalTime) : ''}</div>
              </div>
            </div>

            {/* Street name bar */}
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '7px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                {navSteps[currentStep + 1] ? `⬆ ${navSteps[currentStep + 1].name || 'המשך ישר'}` : '🎯 יעד בסיום'}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                {currentStep < navSteps.length - 1 && (
                  <button onClick={() => setCurrentStep(s => s + 1)} style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>הבא ›</button>
                )}
                <button onClick={stopNav} style={{ padding: '4px 10px', borderRadius: 8, background: '#ef4444', border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>עצור</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Task card (before nav) ── */}
        {selectedTask && !navMode && (
          <div style={{
            position: 'absolute', bottom: 24, left: 16, right: 16, zIndex: 20,
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

            {/* Distance */}
            {dist != null && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '7px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Navigation size={13} color="#1a6fd4" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1e40af' }}>{formatDist(dist)} ממך</span>
                {totalDist && (
                  <span style={{ fontSize: 11, color: '#60a5fa', marginRight: 'auto' }}>
                    🛣 {formatDist(totalDist)} · ⏱ {formatTime(totalTime)}
                  </span>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              {/* Start navigation button */}
              <button
                onClick={startNav}
                disabled={navLoading || !route}
                style={{ flex: 2, height: 44, borderRadius: 14, background: navLoading ? '#93c5fd' : 'linear-gradient(135deg,#1e40af,#3b7cff)', border: 'none', color: 'white', fontWeight: 800, fontSize: 14, cursor: navLoading || !route ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 16px rgba(59,124,255,0.4)' }}>
                <Navigation size={15} />
                {navLoading ? 'טוען...' : !route ? 'ללא מיקום' : 'נווט עכשיו'}
              </button>
              <button onClick={() => window.location.href = `/task/${selectedTask.id}`} style={{ flex: 1, height: 44, borderRadius: 14, background: '#f8faff', border: '1.5px solid #dce8f5', color: '#1a6fd4', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                פרטים <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUpCard {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}