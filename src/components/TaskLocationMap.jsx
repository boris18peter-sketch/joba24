import { useEffect, useState, useRef, useCallback, memo } from 'react';
import React from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, Flag, ArrowUp, ArrowUpRight, ArrowUpLeft, RotateCcw, Navigation, Clock, X } from 'lucide-react';
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { base44 } from '@/api/base44Client';

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

function ManeuverArrow({ type, modifier, size = 28 }) {
  if (type === 'arrive') return <Flag size={size} color="white" />;
  if (modifier?.includes('right')) return <ArrowUpRight size={size} color="white" />;
  if (modifier?.includes('left')) return <ArrowUpLeft size={size} color="white" />;
  if (modifier?.includes('uturn')) return <RotateCcw size={size} color="white" />;
  return <ArrowUp size={size} color="white" />;
}

function UserDot() {
  return (
    <div style={{ position: 'relative', width: 26, height: 26 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(59,130,246,0.22)', animation: 'userPulse 2s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', background: '#3b82f6', border: '2.5px solid white', boxShadow: '0 2px 10px rgba(59,130,246,0.65)' }} />
      <style>{`@keyframes userPulse{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(2.5);opacity:0}}`}</style>
    </div>
  );
}

const TaskPin = memo(({ task, onClick }) => (
  <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
    <div style={{ background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', border: '3px solid white', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(26,111,212,0.55)', fontSize: 17 }}>📍</div>
    {task?.location_name && (
      <div style={{ background: '#1a6fd4', color: 'white', fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 8, marginTop: 3, whiteSpace: 'nowrap', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
        {task.location_name.split(',')[0]}
      </div>
    )}
  </div>
));

// compact=true → no bottom bar, pin click starts nav
// compact=false (expanded) → full nav UI with bottom bar
function MapBody({ mapToken, task, userLocation, height, compact }) {
  const mapRef = useRef(null);
  const [route, setRoute] = useState(null);
  const [navSteps, setNavSteps] = useState([]);
  const [navMode, setNavMode] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  const [routeMeta, setRouteMeta] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [viewState, setViewState] = useState({
    longitude: task.lng, latitude: task.lat, zoom: 14, pitch: 30, bearing: 0,
  });

  const fetchRoute = useCallback(async () => {
    if (!userLocation || !mapToken) return;
    setNavLoading(true);
    setRoute(null); setNavSteps([]); setRouteMeta(null); setCurrentStep(0);
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
    } catch (e) {}
    setNavLoading(false);
  }, [userLocation, mapToken, task.lat, task.lng]);

  const startNav = useCallback(async () => {
    if (!route) await fetchRoute();
    setNavMode(true);
    setCurrentStep(0);
    mapRef.current?.getMap()?.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 17, pitch: 75, bearing: 0, duration: 1200 });
  }, [route, fetchRoute, userLocation]);

  const stopNav = () => {
    setNavMode(false);
    setCurrentStep(0);
    setRoute(null);
    setRouteMeta(null);
    mapRef.current?.getMap()?.easeTo({ center: [task.lng, task.lat], pitch: 30, bearing: 0, zoom: 14, duration: 900 });
  };

  // In expanded mode, auto-fetch route when userLocation is available
  useEffect(() => {
    if (!compact && userLocation) fetchRoute();
  }, [compact, !!userLocation]);

  const step = navSteps[currentStep];
  const nextStep = navSteps[currentStep + 1];
  const remainDist = navSteps.slice(currentStep).reduce((s, st) => s + (st.distance || 0), 0);
  const remainTime = navSteps.slice(currentStep).reduce((s, st) => s + (st.duration || 0), 0);

  return (
    <div style={{ position: 'relative', height, width: '100%' }}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={e => setViewState(e.viewState)}
        mapboxAccessToken={mapToken}
        mapStyle="mapbox://styles/mapbox/standard"
        style={{ width: '100%', height: '100%' }}
        maxPitch={85}
        attributionControl={false}
      >
        {/* Route */}
        {route && (
          <Source id="route-tl" type="geojson" data={route}>
            <Layer id="route-casing-tl" type="line" layout={{ 'line-join': 'round', 'line-cap': 'round' }} paint={{ 'line-color': '#1255c0', 'line-width': 14, 'line-opacity': 1 }} />
            <Layer id="route-fill-tl" type="line" layout={{ 'line-join': 'round', 'line-cap': 'round' }} paint={{ 'line-color': '#4a90ff', 'line-width': 8, 'line-opacity': 1 }} />
          </Source>
        )}
        {/* User location */}
        {userLocation && (
          <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
            <UserDot />
          </Marker>
        )}
        {/* Task pin — click starts nav */}
        {navMode ? (
          <Marker longitude={task.lng} latitude={task.lat} anchor="bottom">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ background: '#ef4444', border: '3px solid white', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 14px rgba(239,68,68,0.6)' }}>
                <Flag size={14} color="white" />
              </div>
              <div style={{ width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '9px solid #ef4444', marginTop: -1 }} />
            </div>
          </Marker>
        ) : (
          <Marker longitude={task.lng} latitude={task.lat} anchor="bottom"
            onClick={e => { e.originalEvent?.stopPropagation(); if (userLocation) startNav(); }}>
            <TaskPin task={task} />
          </Marker>
        )}
        {!navMode && <NavigationControl position="bottom-left" showCompass visualizePitch />}
      </Map>

      {/* Nav HUD — top instruction bar (shown in both compact and expanded when navMode) */}
      {navMode && step && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30, background: 'linear-gradient(160deg,#0a1a4a,#1a3a8f)', padding: '14px 16px 12px', boxShadow: '0 4px 20px rgba(10,26,74,0.5)' }} dir="rtl">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ManeuverArrow type={step.maneuver?.type} modifier={step.maneuver?.modifier} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: -1 }}>{formatDist(step.distance || 0)}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>{step.maneuver?.instruction || step.name || ''}</div>
            </div>
            <button onClick={stopNav} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <X size={16} color="white" />
            </button>
          </div>
          {nextStep && (
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <ManeuverArrow type={nextStep.maneuver?.type} modifier={nextStep.maneuver?.modifier} size={14} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>אחר כך: {nextStep.name || 'המשך ישר'}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginRight: 'auto' }}>{formatDist(nextStep.distance || 0)}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            {currentStep < navSteps.length - 1 && (
              <button onClick={() => setCurrentStep(s => s + 1)} style={{ flex: 1, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>הוראה הבאה ›</button>
            )}
            {currentStep > 0 && (
              <button onClick={() => setCurrentStep(s => s - 1)} style={{ height: 32, padding: '0 12px', borderRadius: 9, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', fontSize: 12, cursor: 'pointer' }}>‹ הקודם</button>
            )}
          </div>
        </div>
      )}

      {/* ETA bar + full controls — only in expanded mode */}
      {!compact && navMode && routeMeta && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30, background: 'var(--card-bg)', borderRadius: '18px 18px 0 0', boxShadow: '0 -6px 30px rgba(0,0,0,0.15)', padding: '14px 16px', paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }} dir="rtl">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid var(--border-1)' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)' }}>{getETA(remainTime)}</div>
              <div style={{ fontSize: 10, color: 'var(--text-2)' }}>הגעה</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid var(--border-1)' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#1a6fd4' }}>{formatDist(remainDist)}</div>
              <div style={{ fontSize: 10, color: 'var(--text-2)' }}>נותר</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)' }}>{formatTime(remainTime)}</div>
              <div style={{ fontSize: 10, color: 'var(--text-2)' }}>זמן</div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar with Waze/GPS/Nav — only in expanded mode, non-nav */}
      {!compact && !navMode && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, background: 'var(--card-bg)', borderTop: '1px solid var(--border-1)', padding: '10px 12px', paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }} dir="rtl">
          {routeMeta && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Navigation size={12} color="#1a6fd4" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1e40af' }}>{formatDist(routeMeta.totalDist)}</div>
                  <div style={{ fontSize: 9, color: '#60a5fa' }}>מרחק</div>
                </div>
              </div>
              <div style={{ flex: 1, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={12} color="#16a34a" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#15803d' }}>{formatTime(routeMeta.totalTime)}</div>
                  <div style={{ fontSize: 9, color: '#4ade80' }}>זמן נסיעה</div>
                </div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={`https://waze.com/ul?ll=${task.lat},${task.lng}&navigate=yes`} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, height: 38, borderRadius: 12, background: 'linear-gradient(135deg,#33ccff,#00b2d9)', color: 'white', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,178,217,0.3)' }}>Waze</a>
            <a href={`https://maps.google.com/maps?daddr=${task.lat},${task.lng}`} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, height: 38, borderRadius: 12, background: 'linear-gradient(135deg,#4285f4,#1967d2)', color: 'white', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', boxShadow: '0 2px 8px rgba(66,133,244,0.3)' }}>GPS</a>
            {userLocation && (
              <button onClick={route ? startNav : fetchRoute} disabled={navLoading}
                style={{ flex: 1.5, height: 38, borderRadius: 12, background: navLoading ? '#93c5fd' : 'linear-gradient(135deg,#0a1a4a,#1a6fd4)', border: 'none', color: 'white', fontWeight: 800, fontSize: 12, cursor: navLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, boxShadow: '0 2px 8px rgba(26,111,212,0.4)' }}>
                <Navigation size={13} />
                {navLoading ? 'מחשב...' : route ? 'התחל ניווט' : 'חשב מסלול'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TaskLocationMap({ task }) {
  const [mapToken, setMapToken] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const taskLat = parseFloat(task?.lat);
  const taskLng = parseFloat(task?.lng);
  const hasLocation = isFinite(taskLat) && isFinite(taskLng);

  useEffect(() => {
    if (!hasLocation) return;
    base44.functions.invoke('getMapboxToken', {}).then(res => {
      if (res.data?.token) setMapToken(res.data.token);
    }).catch(() => {});
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, () => {}, { timeout: 6000 });
    }
  }, [hasLocation]);

  if (!hasLocation) return null;

  const enrichedTask = { ...task, lat: taskLat, lng: taskLng };

  return (
    <>
      {/* Compact inline map — no bottom bar, pin click = nav */}
      <div dir="rtl" style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border-1)', position: 'relative' }}>
        <button onClick={() => setExpanded(true)}
          style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, width: 34, height: 34, borderRadius: 10, background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Maximize2 size={15} color="#334155" />
        </button>
        {mapToken ? (
          <MapBody mapToken={mapToken} task={enrichedTask} userLocation={userLocation} height={220} compact={true} />
        ) : (
          <div style={{ height: 220, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Expanded full-screen map — full controls */}
      {expanded && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999 }} dir="rtl">
          <button onClick={() => setExpanded(false)}
            style={{ position: 'absolute', top: 'max(16px, env(safe-area-inset-top))', left: 16, zIndex: 10, width: 40, height: 40, borderRadius: 12, background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Minimize2 size={17} color="#334155" />
          </button>
          {mapToken ? (
            <MapBody mapToken={mapToken} task={enrichedTask} userLocation={userLocation} height="100dvh" compact={false} />
          ) : (
            <div style={{ height: '100dvh', background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}