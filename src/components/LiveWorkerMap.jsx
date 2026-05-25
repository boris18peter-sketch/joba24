import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Haversine distance in km
function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function FitBounds({ workerPos, taskPos }) {
  const map = useMap();
  useEffect(() => {
    const positions = [workerPos, taskPos].filter(Boolean);
    if (positions.length === 2) {
      map.fitBounds(L.latLngBounds(positions), { padding: [36, 36], maxZoom: 15 });
    } else if (positions.length === 1) {
      map.setView(positions[0], 14);
    }
  }, [workerPos?.[0], workerPos?.[1], taskPos?.[0], taskPos?.[1]]);
  return null;
}

const workerIcon = L.divIcon({
  html: `<div style="
    width:20px;height:20px;border-radius:50%;
    background:#22c55e;border:3px solid white;
    box-shadow:0 2px 10px rgba(34,197,94,0.55);
    animation:liveWorkerPulse 1.6s ease-in-out infinite;
  "></div>
  <style>
    @keyframes liveWorkerPulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
      50%      { box-shadow: 0 0 0 10px rgba(34,197,94,0); }
    }
  </style>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const taskIcon = L.divIcon({
  html: `<div style="
    width:18px;height:18px;border-radius:50%;
    background:#1a6fd4;border:3px solid white;
    box-shadow:0 2px 8px rgba(26,111,212,0.45);
  "></div>`,
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export default function LiveWorkerMap({ task }) {
  const workerLat = task?.worker_lat;
  const workerLng = task?.worker_lng;
  const taskLat = task?.lat;
  const taskLng = task?.lng;

  if (!workerLat || !workerLng) return null;

  const workerPos = [workerLat, workerLng];
  const taskPos = taskLat && taskLng ? [taskLat, taskLng] : null;

  const distKm = taskPos ? calcDistance(workerLat, workerLng, taskLat, taskLng) : null;
  // ETA: road factor 1.4×, average speed 35 km/h in city
  const etaMins = distKm ? Math.max(1, Math.round(distKm * 1.4 / 35 * 60)) : null;

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
          <div style={{
            width: 10, height: 10, borderRadius: '50%', background: '#22c55e',
            boxShadow: '0 0 0 3px rgba(34,197,94,0.25)',
            animation: 'lwmDot 1.6s ease-in-out infinite',
          }} />
          <style>{`@keyframes lwmDot{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
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
      <MapContainer
        center={workerPos}
        zoom={13}
        style={{ height: 200, width: '100%', zIndex: 1 }}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={false}
        dragging={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Worker marker */}
        <Marker position={workerPos} icon={workerIcon}>
          <Popup>🟢 {task.worker_name} — בדרך</Popup>
        </Marker>

        {/* Task location marker */}
        {taskPos && (
          <Marker position={taskPos} icon={taskIcon}>
            <Popup>📍 מיקום המשימה</Popup>
          </Marker>
        )}

        {/* Dashed line between worker and task */}
        {taskPos && (
          <Polyline
            positions={[workerPos, taskPos]}
            color="#1a6fd4"
            weight={2}
            dashArray="6 4"
            opacity={0.7}
          />
        )}

        <FitBounds workerPos={workerPos} taskPos={taskPos} />
      </MapContainer>
    </div>
  );
}