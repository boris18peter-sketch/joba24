import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import BackButton from '@/components/BackButton';
import { clusterTasks } from '@/components/MapCluster';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const createPin = (price) => L.divIcon({
  className: '',
  html: `<div style="display:flex;flex-direction:column;align-items:center;gap:1px">
    <div style="background:#1a6fd4;border:2.5px solid white;box-shadow:0 3px 12px rgba(26,111,212,0.4);border-radius:20px;padding:4px 9px;font-size:12px;font-weight:900;color:white;white-space:nowrap;">₪${price}</div>
    <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #1a6fd4;margin-top:-1px;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.15))"></div>
  </div>`,
  iconSize: [60, 38],
  iconAnchor: [30, 38]
});

const createClusterPin = (count, avgPrice) => L.divIcon({
  className: '',
  html: `<div style="display:flex;flex-direction:column;align-items:center;gap:1px">
    <div style="background:linear-gradient(135deg,#0f2b6b,#1a6fd4);border:3px solid white;box-shadow:0 4px 16px rgba(15,43,107,0.45);border-radius:24px;padding:6px 12px;font-size:13px;font-weight:900;color:white;white-space:nowrap;display:flex;align-items:center;gap:5px;">
      <span style="background:rgba(255,255,255,0.25);border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;">${count}</span>
      ₪${avgPrice}+
    </div>
    <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid #1a6fd4;margin-top:-1px;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.15))"></div>
  </div>`,
  iconSize: [90, 42],
  iconAnchor: [45, 42]
});

const createUserPin = () => L.divIcon({
  className: '',
  html: `<div style="display:flex;flex-direction:column;align-items:center;gap:1px">
    <div style="background:white;border:3px solid #1a6fd4;box-shadow:0 4px 16px rgba(26,111,212,0.4);border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;">🧑</div>
    <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #1a6fd4;margin-top:-1px;"></div>
  </div>`,
  iconSize: [36, 48],
  iconAnchor: [18, 48]
});

const CENTER = [32.0853, 34.7818];

function openWaze(lat, lng) { window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank'); }
function openMaps(lat, lng) { window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank'); }

// Component to handle auto-zoom to user location
function AutoZoom({ userLocation }) {
  const map = useMap();
  const didZoom = useRef(false);

  useEffect(() => {
    if (userLocation && !didZoom.current) {
      map.flyTo([userLocation.lat, userLocation.lng], 14, { duration: 1.2 });
      didZoom.current = true;
    }
  }, [userLocation, map]);

  return null;
}

// Component to track zoom level
function ZoomTracker({ onZoomChange }) {
  const map = useMap();
  useEffect(() => {
    const handler = () => onZoomChange(map.getZoom());
    map.on('zoomend', handler);
    return () => map.off('zoomend', handler);
  }, [map]);
  return null;
}

export default function MapView() {
  const [zoom, setZoom] = useState(13);
  const [userLocation, setUserLocation] = useState(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 100),
    refetchInterval: 20000
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, []);

  const openTasksWithCoords = tasks.filter(t => t.lat && t.lng && t.status === 'OPEN');
  const mockOpenTasks = tasks
    .filter(t => !t.lat && !t.lng && t.status === 'OPEN')
    .map(t => ({
      ...t,
      lat: CENTER[0] + (Math.random() - 0.5) * 0.05,
      lng: CENTER[1] + (Math.random() - 0.5) * 0.05
    }));

  const displayTasks = [...openTasksWithCoords, ...mockOpenTasks];
  const clusters = clusterTasks(displayTasks, zoom);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }} dir="rtl">
      {/* Header */}
      <div style={{ background: 'rgba(244,247,251,0.97)', borderBottom: '1px solid #dce8f5', backdropFilter: 'blur(8px)', padding: '44px 16px 12px', zIndex: 1000, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <BackButton />
          <h1 style={{ fontSize: 17, fontWeight: 800, color: '#0f2b6b', margin: 0, flex: 1 }}>🗺️ מפת ג'ובות</h1>
          <span style={{ fontSize: 12, fontWeight: 700, background: '#dbeafe', color: '#1d4ed8', padding: '3px 10px', borderRadius: 20 }}>
            {displayTasks.length} פתוחות
          </span>
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer center={CENTER} zoom={13} style={{ width: '100%', height: '100%', zIndex: 1 }}>
          <TileLayer
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <AutoZoom userLocation={userLocation} />
          <ZoomTracker onZoomChange={setZoom} />

          {/* User location pin */}
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserPin()}>
              <Popup>
                <div dir="rtl" style={{ fontSize: 13, fontWeight: 700, color: '#1a6fd4' }}>📍 המיקום שלי</div>
              </Popup>
            </Marker>
          )}

          {/* Task clusters */}
          {clusters.map((cluster, idx) => {
            const isSingle = cluster.tasks.length === 1;
            const task = cluster.tasks[0];
            const avgPrice = Math.round(cluster.tasks.reduce((s, t) => s + t.price, 0) / cluster.tasks.length);

            return (
              <Marker
                key={idx}
                position={[cluster.lat, cluster.lng]}
                icon={isSingle ? createPin(task.price) : createClusterPin(cluster.tasks.length, avgPrice)}
              >
                <Popup className="rounded-xl">
                  <div style={{ padding: 4, minWidth: 200 }} dir="rtl">
                    {isSingle ? (
                      <>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#0f2b6b', marginBottom: 4 }}>{task.title}</div>
                        <div style={{ fontWeight: 900, fontSize: 20, color: '#1a6fd4', marginBottom: 4 }}>₪{task.price}</div>
                        {task.location_name && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>📍 {task.location_name}</div>}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                          <button onClick={() => openWaze(task.lat, task.lng)}
                            style={{ flex: 1, background: '#1da462', color: 'white', border: 'none', borderRadius: 8, padding: '6px 4px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            Waze
                          </button>
                          <button onClick={() => openMaps(task.lat, task.lng)}
                            style={{ flex: 1, background: '#4285f4', color: 'white', border: 'none', borderRadius: 8, padding: '6px 4px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            מפות
                          </button>
                        </div>
                        <Link to={`/task/${task.id}`}
                          style={{ display: 'block', textAlign: 'center', background: '#1a6fd4', color: 'white', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                          צפה בג'ובה ←
                        </Link>
                      </>
                    ) : (
                      <>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#0f2b6b', marginBottom: 6 }}>{cluster.tasks.length} ג'ובות קרובות</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
                          {cluster.tasks.map(t => (
                            <Link key={t.id} to={`/task/${t.id}`}
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8faff', borderRadius: 8, padding: '6px 10px', textDecoration: 'none' }}>
                              <span style={{ fontSize: 12, color: '#0f2b6b', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                              <span style={{ fontSize: 12, fontWeight: 800, color: '#1a6fd4', flexShrink: 0, marginRight: 8 }}>₪{t.price}</span>
                            </Link>
                          ))}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, textAlign: 'center' }}>זום פנימה לצפייה נפרדת</div>
                      </>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}