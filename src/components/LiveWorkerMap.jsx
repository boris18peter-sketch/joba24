import { useEffect, useRef, useState } from 'react';
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { base44 } from '@/api/base44Client';

function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function WorkerDot() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
    <div style={{ position: 'relative', width: 30, height: 30 }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'rgba(34,197,94,0.25)', animation: 'workerPulse 1.6s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', inset: 4, borderRadius: '50%',
        background: '#22c55e', border: '2.5px solid white',
        boxShadow: '0 2px 10px rgba(34,197,94,0.6)',
      }} />
      <style>{`@keyframes workerPulse{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(2.2);opacity:0}}`}</style>
    </div>
    <div style={{ background: '#22c55e', color: 'white', fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 6, whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>עובד</div>
    </div>
  );
}

function TaskDot({ title }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <div style={{
        width: 26, height: 26, borderRadius: '50%',
        background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
        border: '2.5px solid white',
        boxShadow: '0 2px 10px rgba(26,111,212,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13,
      }}>🏠</div>
      <div style={{ background: '#1a6fd4', color: 'white', fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 6, whiteSpace: 'nowrap', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>יעד</div>
    </div>
  );
}

export default function LiveWorkerMap({ task }) {
  const mapRef = useRef(null);
  const [mapToken, setMapToken] = useState('');
  const [dashOffset, setDashOffset] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const animRef = useRef(null);
  const initialDistRef = useRef(null); // track starting distance for progress %
  const lastUpdateRef = useRef(Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);

  const workerLat = parseFloat(task?.worker_lat);
  const workerLng = parseFloat(task?.worker_lng);
  const taskLat = parseFloat(task?.lat);
  const taskLng = parseFloat(task?.lng);

  const hasWorker = isFinite(workerLat) && isFinite(workerLng);
  const hasTask = isFinite(taskLat) && isFinite(taskLng);

  const distKm = (hasWorker && hasTask) ? calcDistance(workerLat, workerLng, taskLat, taskLng) : null;
  const etaMins = distKm ? Math.max(1, Math.round(distKm * 1.4 / 35 * 60)) : null;

  // Track initial distance for progress %
  useEffect(() => {
    if (distKm !== null && initialDistRef.current === null) {
      initialDistRef.current = distKm;
    }
  }, [distKm !== null]);

  const progressPct = (initialDistRef.current && distKm !== null)
    ? Math.min(100, Math.max(0, Math.round((1 - distKm / initialDistRef.current) * 100)))
    : 0;

  // Live "freshness" counter
  useEffect(() => {
    if (!hasWorker) return;
    lastUpdateRef.current = Date.now();
    setSecondsAgo(0);
    const iv = setInterval(() => setSecondsAgo(Math.floor((Date.now() - lastUpdateRef.current) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [workerLat, workerLng]);

  // Fetch token
  useEffect(() => {
    base44.functions.invoke('getMapboxToken', {}).then(res => {
      if (res.data?.token) setMapToken(res.data.token);
    }).catch(() => {});
  }, []);

  // Animate route dashes
  useEffect(() => {
    if (!hasWorker || !hasTask) return;
    const animate = () => {
      setDashOffset(v => (v + 0.18) % 10);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [hasWorker, hasTask]);

  // Fly to worker when location updates
  useEffect(() => {
    if (!hasWorker || !mapRef.current) return;
    const map = mapRef.current.getMap?.();
    if (!map) return;
    map.easeTo({
      center: hasTask ? [(workerLng + taskLng) / 2, (workerLat + taskLat) / 2] : [workerLng, workerLat],
      duration: 800,
      easing: t => 1 - Math.pow(1 - t, 3),
    });
  }, [workerLat, workerLng]);

  // Add 3D buildings on load with warm colors
  const onLoad = () => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    if (!map.getLayer('3d-buildings-live')) {
      map.addLayer({
        id: '3d-buildings-live',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 14,
        paint: {
          'fill-extrusion-color': ['interpolate', ['linear'], ['zoom'], 14, '#d9956f', 17, '#c88555'],
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 17, ['get', 'height']],
          'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 14, 0, 17, ['get', 'min_height']],
          'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0.5, 17, 0.7],
          'fill-extrusion-vertical-gradient': true,
        },
      });
      map.setLight({
        anchor: 'viewport',
        color: '#ffb366',
        intensity: 0.55,
        position: [1.2, 205, 35],
      });
    }
  };

  if (!hasWorker) return null;

  const centerLng = hasTask ? (workerLng + taskLng) / 2 : workerLng;
  const centerLat = hasTask ? (workerLat + taskLat) / 2 : workerLat;

  const routeGeoJSON = hasTask ? {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [[workerLng, workerLat], [taskLng, taskLat]] },
  } : null;

  return (
    <div dir="rtl" style={{ borderRadius: 20, overflow: 'hidden', border: '1.5px solid #bae6fd', background: '#f0f9ff' }}>
      {/* Header: worker name + live dot + collapse */}
      <div style={{ padding: '12px 14px 10px', background: 'linear-gradient(135deg,#0c4a6e,#0369a1)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', width: 12, height: 12, flexShrink: 0 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(34,197,94,0.4)', animation: 'workerPulse 1.6s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', inset: 2, borderRadius: '50%', background: '#22c55e' }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'white', flex: 1 }}>🚗 {task.worker_name} בדרך אליך</span>
        {secondsAgo < 30 && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>עדכון לפני {secondsAgo}ש'</span>}
        <button onClick={() => setExpanded(v => !v)}
          style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 800 }}>
          {expanded ? '✕' : '⛶'}
        </button>
      </div>

      {/* ETA + Distance + Progress */}
      <div style={{ padding: '10px 14px', background: 'white', borderBottom: '1.5px solid #e0f2fe' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {/* ETA card */}
          <div style={{ flex: 1, background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1.5px solid #86efac', borderRadius: 14, padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#15803d', lineHeight: 1 }}>{etaMins ? `~${etaMins}` : '–'}</div>
            <div style={{ fontSize: 10, color: '#166534', fontWeight: 700, marginTop: 2 }}>דקות להגעה</div>
          </div>
          {/* Distance card */}
          <div style={{ flex: 1, background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '1.5px solid #93c5fd', borderRadius: 14, padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#1d4ed8', lineHeight: 1 }}>
              {distKm ? (distKm < 1 ? `${Math.round(distKm * 1000)}` : distKm.toFixed(1)) : '–'}
            </div>
            <div style={{ fontSize: 10, color: '#1e40af', fontWeight: 700, marginTop: 2 }}>{distKm && distKm < 1 ? 'מטרים' : 'ק"מ נותרו'}</div>
          </div>
          {/* Progress card */}
          <div style={{ flex: 1, background: 'linear-gradient(135deg,#fff7ed,#fef3c7)', border: '1.5px solid #fcd34d', borderRadius: 14, padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#b45309', lineHeight: 1 }}>{progressPct}%</div>
            <div style={{ fontSize: 10, color: '#92400e', fontWeight: 700, marginTop: 2 }}>של המסלול</div>
          </div>
        </div>
        {/* Route progress bar */}
        <div style={{ height: 8, background: '#e0f2fe', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            background: progressPct > 70 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : progressPct > 30 ? 'linear-gradient(90deg,#3b82f6,#1d4ed8)' : 'linear-gradient(90deg,#f59e0b,#d97706)',
            borderRadius: 99,
            transition: 'width 1.2s ease, background 0.5s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>
          <span>יצא</span>
          <span>הגיע</span>
        </div>
      </div>

      {/* 3D Map */}
      {mapToken ? (
        <Map
          ref={mapRef}
          initialViewState={{
            longitude: centerLng,
            latitude: centerLat,
            zoom: 14,
            pitch: 52,
            bearing: 30,
          }}
          mapboxAccessToken={mapToken}
          mapStyle="mapbox://styles/mapbox/outdoors-v12"
          style={{ height: expanded ? 'calc(100dvh - 110px)' : 220, width: '100%', transition: 'height 0.35s ease' }}
          interactive={expanded}
          attributionControl={false}
          onLoad={onLoad}
        >
          {routeGeoJSON && (
            <Source id="live-route" type="geojson" data={routeGeoJSON}>
              <Layer id="live-route-glow" type="line" paint={{
                'line-color': '#3b82f6',
                'line-width': 10,
                'line-opacity': 0.15,
                'line-blur': 4,
              }} />
              <Layer id="live-route-bg" type="line" paint={{
                'line-color': '#bfdbfe',
                'line-width': 6,
                'line-opacity': 0.7,
              }} />
              <Layer id="live-route-line" type="line" paint={{
                'line-color': '#1a6fd4',
                'line-width': 3,
                'line-opacity': 0.9,
                'line-dasharray': [2, dashOffset % 5 < 2.5 ? 3 : 1],
              }} />
            </Source>
          )}

          <Marker longitude={workerLng} latitude={workerLat} anchor="center">
            <WorkerDot />
          </Marker>

          {hasTask && (
            <Marker longitude={taskLng} latitude={taskLat} anchor="bottom">
              <TaskDot title={task.title} />
            </Marker>
          )}
        </Map>
      ) : (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f9ff' }}>
          <div className="w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Navigation buttons */}
      {hasTask && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: '#f0f9ff', borderTop: '1px solid #bae6fd' }}>
          <a
            href={`https://waze.com/ul?ll=${taskLat},${taskLng}&navigate=yes`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ flex: 1, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#33ccff,#00b2d9)', border: 'none', color: 'white', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,178,217,0.35)' }}
          >
            🗺 ווייז
          </a>
          <a
            href={`https://maps.google.com/maps?daddr=${taskLat},${taskLng}&amp;ll=`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ flex: 1, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#4285f4,#1967d2)', border: 'none', color: 'white', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none', boxShadow: '0 2px 8px rgba(66,133,244,0.35)' }}
          >
            📍 ניווט GPS
          </a>
        </div>
      )}
    </div>
  );
}