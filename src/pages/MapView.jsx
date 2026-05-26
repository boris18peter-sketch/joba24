import { useState, useEffect, useRef, useCallback } from 'react';
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Navigation, X, MapPin, Clock, ChevronRight, ArrowRight, ArrowUp, ArrowUpRight, ArrowUpLeft, RotateCcw, Flag } from 'lucide-react';
import { getCategoryLabel } from '@/lib/categories';
import { useAuth } from '@/lib/AuthContext';

const CENTER = { longitude: 34.7818, latitude: 32.0853 };
const MAP_STYLE = 'mapbox://styles/mapbox/standard';

function formatDist(meters) {
  if (meters < 1000) return `${Math.round(meters)} מ'`;
  return `${(meters / 1000).toFixed(1)} ק"מ`;
}

function formatTime(seconds) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} דק'`;
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')} ש'`;
}

function getETA(seconds) {
  const d = new Date(Date.now() + seconds * 1000);
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}

function ManeuverArrow({ type, modifier, size = 32 }) {
  const color = 'white';
  if (type === 'arrive') return <Flag size={size} color={color} />;
  if (modifier?.includes('sharp right') || modifier?.includes('right')) return <ArrowUpRight size={size} color={color} />;
  if (modifier?.includes('sharp left') || modifier?.includes('left')) return <ArrowUpLeft size={size} color={color} />;
  if (modifier?.includes('uturn')) return <RotateCcw size={size} color={color} />;
  return <ArrowUp size={size} color={color} />;
}

function NavArrowMarker({ bearing }) {
  return (
    <div style={{
      width: 0, height: 0,
      borderLeft: '14px solid transparent',
      borderRight: '14px solid transparent',
      borderBottom: '28px solid #1a6fd4',
      filter: 'drop-shadow(0 4px 12px rgba(26,111,212,0.8))',
      transform: `rotate(${bearing || 0}deg)`,
    }} />
  );
}

function TaskPin({ task, selected, isMyTask }) {
  const color = isMyTask ? '#f59e0b' : '#1a6fd4';
  const colorDark = isMyTask ? '#d97706' : '#0a52b0';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer',
      transform: selected ? 'scale(1.35)' : 'scale(1)',
      transition: 'transform 0.25s cubic-bezier(0.34,1.5,0.64,1)',
      filter: selected ? `drop-shadow(0 6px 18px ${color}cc)` : 'drop-shadow(0 2px 8px rgba(0,0,0,0.22))',
    }}>
      <div style={{
        background: selected ? `linear-gradient(135deg,${colorDark},${color})` : color,
        border: selected ? '3px solid white' : '2px solid white',
        borderRadius: 22, padding: '5px 12px',
        fontSize: 13, fontWeight: 900, color: 'white', whiteSpace: 'nowrap',
        boxShadow: selected ? '0 6px 22px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.18)',
      }}>
        {isMyTask ? '⭐ ' : ''}₪{task.price}
      </div>
      <div style={{ width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: `9px solid ${selected ? colorDark : color}`, marginTop: -1 }} />
    </div>
  );
}

function UserDot() {
  return (
    <div style={{ position: 'relative', width: 30, height: 30 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(59,130,246,0.22)', animation: 'userPulse 2s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', inset: 5, borderRadius: '50%', background: '#3b82f6', border: '2.5px solid white', boxShadow: '0 2px 12px rgba(59,130,246,0.65)' }} />
      <style>{`@keyframes userPulse{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(2.5);opacity:0}}`}</style>
    </div>
  );
}

export default function MapView() {
  const mapRef = useRef(null);
  const seedRef = useRef({});
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [userLocation, setUserLocation] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [mapToken, setMapToken] = useState('');

  // Route & nav state
  const [route, setRoute] = useState(null);
  const [navSteps, setNavSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [navMode, setNavMode] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  const [routeMeta, setRouteMeta] = useState(null); // { totalDist (m), totalTime (s) }

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

  const { data: me } = useQuery({
    queryKey: ['me'], queryFn: () => base44.auth.me(), enabled: isAuthenticated
  });
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

  // Fetch Mapbox Directions route
  const fetchRoute = useCallback(async (task) => {
    if (!userLocation || !mapToken) return;
    setNavLoading(true);
    setRoute(null);
    setNavSteps([]);
    setCurrentStep(0);
    setRouteMeta(null);
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${userLocation.lng},${userLocation.lat};${task.lng},${task.lat}?steps=true&overview=full&geometries=geojson&language=he&access_token=${mapToken}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes?.length > 0) {
        const r = data.routes[0];
        setRoute({ type: 'Feature', geometry: r.geometry });
        setNavSteps(r.legs[0]?.steps || []);
        setRouteMeta({ totalDist: r.distance, totalTime: r.duration });
      }
    } catch (e) { console.warn('Directions error:', e); }
    setNavLoading(false);
  }, [userLocation, mapToken]);

  // Fetch route when task selected
  useEffect(() => {
    if (selectedTask && userLocation) {
      fetchRoute(selectedTask);
    } else {
      setRoute(null);
      setNavSteps([]);
      setNavMode(false);
      setRouteMeta(null);
    }
  }, [selectedTask?.id]);

  // Fly to task when selected
  useEffect(() => {
    if (!selectedTask || !mapRef.current) return;
    mapRef.current.getMap().flyTo({
      center: [selectedTask.lng, selectedTask.lat],
      zoom: 16, pitch: 62, bearing: 20, duration: 1300,
    });
  }, [selectedTask?.id]);

  const startNav = () => {
    setNavMode(true);
    setCurrentStep(0);
    const map = mapRef.current?.getMap();
    if (!map || !userLocation) return;
    map.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 17.5, pitch: 75, bearing: 0, duration: 1200 });
  };

  const stopNav = () => {
    setNavMode(false);
    setCurrentStep(0);
    setRoute(null);
    setSelectedTask(null);
    setRouteMeta(null);
    mapRef.current?.getMap()?.easeTo({ pitch: 52, bearing: 0, zoom: 13.5, duration: 900 });
  };

  const step = navSteps[currentStep];
  const nextStep = navSteps[currentStep + 1];
  // Remaining distance/time (approximate: sum from current step onward)
  const remainDist = navSteps.slice(currentStep).reduce((s, st) => s + (st.distance || 0), 0);
  const remainTime = navSteps.slice(currentStep).reduce((s, st) => s + (st.duration || 0), 0);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }} dir="rtl">
      <div style={{ position: 'absolute', inset: 0 }}>
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
            {/* Road route */}
            {route && (
              <Source id="route" type="geojson" data={route}>
                <Layer id="route-shadow" type="line" layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                  paint={{ 'line-color': '#000', 'line-width': 18, 'line-opacity': 0.12, 'line-blur': 4 }} />
                <Layer id="route-casing" type="line" layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                  paint={{ 'line-color': '#1255c0', 'line-width': 16, 'line-opacity': 1 }} />
                <Layer id="route-fill" type="line" layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                  paint={{ 'line-color': '#4a90ff', 'line-width': 10, 'line-opacity': 1 }} />
                <Layer id="route-highlight" type="line" layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                  paint={{ 'line-color': '#a8caff', 'line-width': 3.5, 'line-opacity': 0.85 }} />
              </Source>
            )}

            {/* User location */}
            {userLocation && (
              <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
                {navMode ? <NavArrowMarker bearing={viewState.bearing} /> : <UserDot />}
              </Marker>
            )}

            {/* Destination */}
            {navMode && selectedTask && (
              <Marker longitude={selectedTask.lng} latitude={selectedTask.lat} anchor="bottom">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ background: '#ef4444', border: '3px solid white', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 14px rgba(239,68,68,0.6)' }}>
                    <Flag size={15} color="white" />
                  </div>
                  <div style={{ width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '9px solid #ef4444', marginTop: -1 }} />
                </div>
              </Marker>
            )}

            {/* Task pins (hidden in nav mode) */}
            {!navMode && displayTasks.map(task => (
              <Marker key={task.id} longitude={task.lng} latitude={task.lat} anchor="bottom"
                onClick={e => { e.originalEvent.stopPropagation(); setSelectedTask(prev => prev?.id === task.id ? null : task); }}>
                <TaskPin task={task} selected={selectedTask?.id === task.id} isMyTask={task.client_id === me?.id} />
              </Marker>
            ))}

            {!navMode && <NavigationControl position="bottom-left" showCompass visualizePitch />}
          </Map>
        )}

        {/* ── Back button ── */}
        {!navMode && (
          <button onClick={() => navigate(-1)} style={{
            position: 'absolute', top: 'calc(70px + env(safe-area-inset-top))', right: 14, zIndex: 20,
            width: 44, height: 44, borderRadius: 14,
            background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 2px 14px rgba(0,0,0,0.14)',
          }}>
            <ArrowRight size={19} color="#374151" />
          </button>
        )}

        {/* ── Task counter ── */}
        {!navMode && (
          <div style={{
            position: 'absolute', top: 'calc(70px + env(safe-area-inset-top))', left: 14, zIndex: 20,
            background: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: '10px 14px',
            boxShadow: '0 2px 14px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.07)',
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <span style={{ background: '#1a6fd4', color: 'white', borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 800 }}>{displayTasks.length}</span>
            <span style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>משימות פתוחות</span>
          </div>
        )}

        {/* ════════════════════════════════
             WAZE-STYLE NAV HUD
            ════════════════════════════════ */}
        {navMode && step && (
          <>
            {/* TOP instruction bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
              background: 'linear-gradient(160deg, #0a1a4a 0%, #1a3a8f 100%)',
              paddingTop: 'max(18px, calc(env(safe-area-inset-top) + 10px))',
              paddingBottom: 16, paddingLeft: 18, paddingRight: 18,
              boxShadow: '0 6px 30px rgba(10,26,74,0.55)',
            }}>
              {/* Main instruction row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                {/* Maneuver box */}
                <div style={{
                  width: 64, height: 64, borderRadius: 18, flexShrink: 0,
                  background: 'rgba(255,255,255,0.15)',
                  border: '2px solid rgba(255,255,255,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(4px)',
                }}>
                  <ManeuverArrow type={step.maneuver?.type} modifier={step.maneuver?.modifier} size={30} />
                </div>

                {/* Distance + street */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 36, fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: -1.5, marginBottom: 4 }}>
                    {formatDist(step.distance || 0)}
                  </div>
                  <div style={{
                    fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: 600,
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  }}>
                    {step.maneuver?.instruction || step.name || ''}
                  </div>
                </div>
              </div>

              {/* Next street row */}
              {nextStep && (
                <div style={{
                  background: 'rgba(255,255,255,0.1)', borderRadius: 12,
                  padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10,
                  border: '1px solid rgba(255,255,255,0.12)',
                }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ManeuverArrow type={nextStep.maneuver?.type} modifier={nextStep.maneuver?.modifier} size={15} />
                  </div>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                    אחר כך: {nextStep.name || nextStep.maneuver?.instruction || 'המשך ישר'}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginRight: 'auto' }}>
                    {formatDist(nextStep.distance || 0)}
                  </span>
                </div>
              )}

              {/* Step nav buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                {currentStep < navSteps.length - 1 && (
                  <button onClick={() => setCurrentStep(s => s + 1)} style={{
                    flex: 1, height: 38, borderRadius: 11, background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}>
                    הוראה הבאה ›
                  </button>
                )}
                {currentStep > 0 && (
                  <button onClick={() => setCurrentStep(s => s - 1)} style={{
                    height: 38, padding: '0 14px', borderRadius: 11, background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer',
                  }}>
                    ‹ הקודם
                  </button>
                )}
              </div>
            </div>

            {/* BOTTOM ETA bar — Waze-style */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
              background: 'white',
              borderRadius: '22px 22px 0 0',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
              paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
              padding: '18px 22px',
              paddingBottom: 'max(22px, env(safe-area-inset-bottom))',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                {/* ETA */}
                <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #f0f4f8' }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: '#0a1a4a', letterSpacing: -1 }}>
                    {getETA(remainTime)}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, marginTop: 1 }}>הגעה משוערת</div>
                </div>
                {/* Remaining distance */}
                <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #f0f4f8' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#1a6fd4', letterSpacing: -0.5 }}>
                    {formatDist(remainDist)}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, marginTop: 1 }}>נותר</div>
                </div>
                {/* Time */}
                <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #f0f4f8' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#374151', letterSpacing: -0.5 }}>
                    {formatTime(remainTime)}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, marginTop: 1 }}>זמן נסיעה</div>
                </div>
                {/* Stop */}
                <div style={{ paddingRight: 8 }}>
                  <button onClick={stopNav} style={{
                    width: 52, height: 52, borderRadius: 16,
                    background: '#fef2f2', border: '1.5px solid #fecaca',
                    color: '#dc2626', fontWeight: 900, fontSize: 11, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2,
                  }}>
                    <X size={18} />
                    עצור
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Task selection card ── */}
        {selectedTask && !navMode && (
          <div style={{
            position: 'absolute', bottom: 24, left: 16, right: 16, zIndex: 20,
            background: 'white', borderRadius: 24,
            boxShadow: '0 10px 50px rgba(15,43,107,0.22)',
            padding: '18px 18px 16px', border: '1px solid #dce8f5',
            animation: 'slideUpCard 0.25s cubic-bezier(0.34,1.3,0.64,1)',
          }} dir="rtl">
            <button onClick={() => setSelectedTask(null)} style={{
              position: 'absolute', top: 14, left: 14, width: 30, height: 30,
              borderRadius: 9, background: '#f3f4f6', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}>
              <X size={15} color="#6b7280" />
            </button>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <div style={{ background: 'linear-gradient(135deg,#0f2b6b,#1a6fd4)', borderRadius: 14, padding: '10px 15px', flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'white', letterSpacing: -1 }}>₪{selectedTask.price}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#0f2b6b', marginBottom: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {selectedTask.title}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  {selectedTask.location_name && <><MapPin size={10} /><span>{selectedTask.location_name}</span></>}
                  {selectedTask.estimated_time && <><Clock size={10} /><span>{selectedTask.estimated_time}</span></>}
                  <span style={{ background: '#f1f5f9', borderRadius: 10, padding: '1px 7px', fontSize: 10 }}>{getCategoryLabel(selectedTask.category)}</span>
                </div>
              </div>
            </div>

            {/* Route info (Mapbox Directions only) */}
            {navLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8faff', border: '1px solid #dce8f5', borderRadius: 12, padding: '9px 12px', marginBottom: 12 }}>
                <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                <span style={{ fontSize: 12, color: '#64748b' }}>מחשב מסלול...</span>
              </div>
            )}
            {!navLoading && routeMeta && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Navigation size={13} color="#1a6fd4" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1e40af' }}>{formatDist(routeMeta.totalDist)}</div>
                    <div style={{ fontSize: 10, color: '#60a5fa' }}>מרחק בכביש</div>
                  </div>
                </div>
                <div style={{ flex: 1, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={13} color="#16a34a" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#15803d' }}>{formatTime(routeMeta.totalTime)}</div>
                    <div style={{ fontSize: 10, color: '#4ade80' }}>זמן נסיעה</div>
                  </div>
                </div>
              </div>
            )}
            {!navLoading && !routeMeta && !userLocation && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={13} /> אפשר גישה למיקום לצפייה במרחק ובניווט
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={startNav}
                disabled={navLoading || !route}
                style={{
                  flex: 2, height: 46, borderRadius: 14,
                  background: navLoading || !route ? '#93c5fd' : 'linear-gradient(135deg,#0a1a4a,#1a6fd4)',
                  border: 'none', color: 'white', fontWeight: 800, fontSize: 14, cursor: navLoading || !route ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  boxShadow: navLoading || !route ? 'none' : '0 5px 18px rgba(26,111,212,0.45)',
                }}>
                <Navigation size={16} />
                {navLoading ? 'מחשב...' : !route ? 'ללא מיקום' : 'התחל ניווט'}
              </button>
              <button onClick={() => window.location.href = `/task/${selectedTask.id}`} style={{
                flex: 1, height: 46, borderRadius: 14, background: '#f8faff',
                border: '1.5px solid #dce8f5', color: '#1a6fd4', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
                פרטים <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUpCard {
          from { transform: translateY(32px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}