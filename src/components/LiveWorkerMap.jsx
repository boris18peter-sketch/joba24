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
    <div style={{ position: 'relative', width: 26, height: 26 }}>
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
  );
}

function TaskDot() {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: '50%',
      background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
      border: '2.5px solid white',
      boxShadow: '0 2px 10px rgba(26,111,212,0.55)',
    }} />
  );
}

export default function LiveWorkerMap({ task }) {
  const mapRef = useRef(null);
  const [mapToken, setMapToken] = useState('');
  const [dashOffset, setDashOffset] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const animRef = useRef(null);

  const workerLat = parseFloat(task?.worker_lat);
  const workerLng = parseFloat(task?.worker_lng);
  const taskLat = parseFloat(task?.lat);
  const taskLng = parseFloat(task?.lng);

  const hasWorker = isFinite(workerLat) && isFinite(workerLng);
  const hasTask = isFinite(taskLat) && isFinite(taskLng);

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

  const distKm = hasTask ? calcDistance(workerLat, workerLng, taskLat, taskLng) : null;
  const etaMins = distKm ? Math.max(1, Math.round(distKm * 1.4 / 35 * 60)) : null;
  const centerLng = hasTask ? (workerLng + taskLng) / 2 : workerLng;
  const centerLat = hasTask ? (workerLat + taskLat) / 2 : workerLat;

  const routeGeoJSON = hasTask ? {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [[workerLng, workerLat], [taskLng, taskLat]] },
  } : null;

  return (
    <div dir="rtl" style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid #bae6fd', background: '#f0f9ff' }}>
      {/* Top banner */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        background: 'linear-gradient(135deg, #e0f2fe, #f0f9ff)',
        borderBottom: '1px solid #bae6fd',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 3px rgba(34,197,94,0.25)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0c4a6e' }}>
            🚗 {task.worker_name} בדרך אליך
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {distKm && (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', background: 'white', border: '1px solid #bae6fd', borderRadius: 20, padding: '3px 10px' }}>
              📍 {distKm < 1 ? `${Math.round(distKm * 1000)} מ'` : `${distKm.toFixed(1)} ק"מ`}
            </span>
          )}
          {etaMins && (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', background: 'white', border: '1px solid #bae6fd', borderRadius: 20, padding: '3px 10px' }}>
              ⏱ ~{etaMins} דק'
            </span>
          )}
          <button
            onClick={() => setExpanded(v => !v)}
            style={{ width: 32, height: 32, borderRadius: 10, background: '#0369a1', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'white', fontSize: 16 }}
          >
            {expanded ? '↙️' : '↗️'}
          </button>
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
            <Marker longitude={taskLng} latitude={taskLat} anchor="center">
              <TaskDot />
            </Marker>
          )}
        </Map>
      ) : (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f9ff' }}>
          <div className="w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}