import Map, { Marker, Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

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
    <div style={{ position: 'relative', width: 20, height: 20 }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'rgba(34,197,94,0.3)', animation: 'workerPulse 1.6s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', inset: 3, borderRadius: '50%',
        background: '#22c55e', border: '2.5px solid white',
        boxShadow: '0 2px 8px rgba(34,197,94,0.6)',
      }} />
      <style>{`@keyframes workerPulse{0%,100%{transform:scale(1);opacity:0.6}50%{transform:scale(2);opacity:0}}`}</style>
    </div>
  );
}

function TaskDot() {
  return (
    <div style={{
      width: 18, height: 18, borderRadius: '50%',
      background: '#1a6fd4', border: '2.5px solid white',
      boxShadow: '0 2px 8px rgba(26,111,212,0.5)',
    }} />
  );
}

export default function LiveWorkerMap({ task }) {
  const workerLat = task?.worker_lat;
  const workerLng = task?.worker_lng;
  const taskLat = task?.lat;
  const taskLng = task?.lng;

  if (!workerLat || !workerLng) return null;

  const distKm = taskLat && taskLng ? calcDistance(workerLat, workerLng, taskLat, taskLng) : null;
  const etaMins = distKm ? Math.max(1, Math.round(distKm * 1.4 / 35 * 60)) : null;

  // Center between worker and task
  const centerLng = taskLng ? (workerLng + taskLng) / 2 : workerLng;
  const centerLat = taskLat ? (workerLat + taskLat) / 2 : workerLat;

  const routeGeoJSON = taskLat && taskLng ? {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [[workerLng, workerLat], [taskLng, taskLat]],
    },
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
        <div style={{ display: 'flex', gap: 10 }}>
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
        </div>
      </div>

      {/* Map */}
      <Map
        initialViewState={{ longitude: centerLng, latitude: centerLat, zoom: 13 }}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ height: 200, width: '100%' }}
        interactive={false}
        attributionControl={false}
      >
        {routeGeoJSON && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            <Layer id="route-line" type="line" paint={{ 'line-color': '#1a6fd4', 'line-width': 2.5, 'line-dasharray': [3, 3], 'line-opacity': 0.8 }} />
          </Source>
        )}

        <Marker longitude={workerLng} latitude={workerLat} anchor="center">
          <WorkerDot />
        </Marker>

        {taskLat && taskLng && (
          <Marker longitude={taskLng} latitude={taskLat} anchor="center">
            <TaskDot />
          </Marker>
        )}
      </Map>
    </div>
  );
}