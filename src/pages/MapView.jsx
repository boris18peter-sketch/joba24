import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Circle } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import BackButton from '@/components/BackButton';
import PageHeader from '@/components/PageHeader';
import { Navigation, X, MapPin, Clock, ChevronRight, Layers } from 'lucide-react';
import { getCategoryLabel } from '@/lib/categories';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const CENTER = [32.0853, 34.7818];

const createPin = (price, selected = false, isMyTask = false) => {
  const bg = isMyTask
    ? (selected ? 'linear-gradient(135deg,#d97706,#f59e0b)' : '#f59e0b')
    : (selected ? 'linear-gradient(135deg,#0a52b0,#1a6fd4)' : '#1a6fd4');
  const shadow = isMyTask
    ? (selected ? '0 4px 16px rgba(245,158,11,0.6)' : '0 2px 10px rgba(245,158,11,0.4)')
    : (selected ? '0 4px 16px rgba(26,111,212,0.5)' : '0 2px 10px rgba(26,111,212,0.35)');
  const arrowColor = isMyTask ? '#f59e0b' : '#1a6fd4';

  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:0;cursor:pointer;transform:${selected ? 'scale(1.25)' : 'scale(1)'};transition:transform 0.2s;filter:${selected ? `drop-shadow(0 4px 12px ${isMyTask ? 'rgba(245,158,11,0.6)' : 'rgba(26,111,212,0.6)'})` : 'none'}">
      <div style="background:${bg};border:${selected ? '3px solid white' : '2px solid white'};box-shadow:${shadow};border-radius:20px;padding:5px 10px;font-size:${selected ? '13px' : '12px'};font-weight:900;color:white;white-space:nowrap;">${isMyTask ? '⭐ ' : ''}₪${price}</div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${arrowColor};margin-top:-1px;"></div>
    </div>`,
    iconSize: [64, 40],
    iconAnchor: [32, 40]
  });
};

const createUserPin = () => L.divIcon({
  className: '',
  html: `<div style="display:flex;flex-direction:column;align-items:center;">
    <div style="background:white;border:3px solid #10b981;box-shadow:0 4px 20px rgba(16,185,129,0.5);border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:20px;">🧑</div>
    <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #10b981;margin-top:-1px;"></div>
  </div>`,
  iconSize: [38, 50],
  iconAnchor: [19, 50]
});

// Smart zoom: fit all tasks in view
function SmartZoom({ tasks, userLocation, selectedTask }) {
  const map = useMap();
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current || tasks.length === 0) return;
    didInit.current = true;

    const center = userLocation || CENTER;
    const points = tasks.map(t => [t.lat, t.lng]);

    if (userLocation) points.push([userLocation.lat, userLocation.lng]);

    if (points.length >= 2) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15, animate: true, duration: 1.2 });
    } else {
      map.flyTo(center, 14, { duration: 1.2 });
    }
  }, [tasks.length, userLocation]);

  // Fly to selected task
  useEffect(() => {
    if (!selectedTask) return;
    map.flyTo([selectedTask.lat, selectedTask.lng], Math.max(map.getZoom(), 15), { duration: 0.8 });
  }, [selectedTask?.id]);

  return null;
}

// Draw route from user to selected task
function RoutePolyline({ userLocation, task }) {
  if (!userLocation || !task) return null;
  const points = [
    [userLocation.lat, userLocation.lng],
    [task.lat, task.lng],
  ];
  return (
    <>
      <Polyline
        positions={points}
        pathOptions={{ color: '#1a6fd4', weight: 5, opacity: 0.85, dashArray: '10 6' }}
      />
      <Circle
        center={[task.lat, task.lng]}
        radius={40}
        pathOptions={{ color: '#1a6fd4', fillColor: '#1a6fd4', fillOpacity: 0.15, weight: 2 }}
      />
    </>
  );
}

// Map style options
const MAP_STYLES = [
  { label: 'בהיר', url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' },
  { label: 'רחובות', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' },
  { label: 'לילה', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' },
];

export default function MapView() {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [styleIdx, setStyleIdx] = useState(0);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

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
  // Give mock coords to tasks without location (spread near Israel center)
  const seed = useRef({});
  const displayTasks = tasks
    .filter(t => t.status === 'OPEN')
    .map(t => {
      if (t.lat && t.lng) return t;
      if (!seed.current[t.id]) {
        seed.current[t.id] = {
          lat: CENTER[0] + (Math.random() - 0.5) * 0.06,
          lng: CENTER[1] + (Math.random() - 0.5) * 0.06,
        };
      }
      return { ...t, ...seed.current[t.id] };
    });

  const distKm = (a, b) => {
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const aa = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  };

  const dist = selectedTask && userLocation
    ? distKm(userLocation, { lat: selectedTask.lat, lng: selectedTask.lng })
    : null;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }} dir="rtl">
      {/* Header with PageHeader + style picker */}
      <PageHeader
        title="🗺️ מפת ג'ובות"
        right={<button onClick={() => setShowStylePicker(v => !v)} style={{ width: 36, height: 36, borderRadius: 10, background: showStylePicker ? '#dbeafe' : 'white', border: '1px solid #dce8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
          <Layers size={16} color="#1a6fd4" />
          {showStylePicker && (
            <div style={{ position: 'absolute', top: 44, left: 0, background: 'white', border: '1px solid #dce8f5', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', zIndex: 1001, overflow: 'hidden', minWidth: 100 }}>
              {MAP_STYLES.map((s, i) => (
                <button key={i} onClick={() => { setStyleIdx(i); setShowStylePicker(false); }}
                  style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'right', background: styleIdx === i ? '#eff6ff' : 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: styleIdx === i ? 700 : 400, color: styleIdx === i ? '#1a6fd4' : '#374151' }}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </button>}
      />

      {/* Counter badge */}
      <div style={{ background: 'white', borderBottom: '1px solid #dce8f5', padding: '8px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>
        {displayTasks.length} ג'ובות פתוחות
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={CENTER}
          zoom={13}
          style={{ width: '100%', height: '100%', zIndex: 1 }}
          zoomControl={false}
        >
          <TileLayer
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url={MAP_STYLES[styleIdx].url}
            key={styleIdx}
          />

          <SmartZoom tasks={displayTasks} userLocation={userLocation} selectedTask={selectedTask} />

          {/* Route line */}
          {selectedTask && <RoutePolyline userLocation={userLocation} task={selectedTask} />}

          {/* User pin */}
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserPin()}>
              <Popup>
                <div dir="rtl" style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>📍 המיקום שלי</div>
              </Popup>
            </Marker>
          )}

          {/* Task pins */}
          {displayTasks.map((task) => (
            <Marker
              key={task.id}
              position={[task.lat, task.lng]}
              icon={createPin(task.price, selectedTask?.id === task.id, task.client_id === me?.id)}
              eventHandlers={{
                click: () => setSelectedTask(prev => prev?.id === task.id ? null : task),
              }}
            >
            </Marker>
          ))}
        </MapContainer>

        {/* Legend */}
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000, background: 'white', borderRadius: 12, padding: '8px 12px', boxShadow: '0 2px 10px rgba(0,0,0,0.12)', border: '1px solid #e5e9f5', display: 'flex', flexDirection: 'column', gap: 5 }}>
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

        {/* Floating task card when selected */}
        {selectedTask && (
          <div
            style={{
              position: 'absolute',
              bottom: 20,
              left: 16,
              right: 16,
              zIndex: 1000,
              background: 'white',
              borderRadius: 24,
              boxShadow: '0 8px 40px rgba(15,43,107,0.22)',
              padding: '16px 16px 14px',
              border: '1px solid #dce8f5',
              animation: 'slideUpCard 0.25s cubic-bezier(0.34,1.3,0.64,1)',
            }}
            dir="rtl"
          >
            {/* Close */}
            <button
              onClick={() => setSelectedTask(null)}
              style={{ position: 'absolute', top: 12, left: 12, width: 28, height: 28, borderRadius: 8, background: '#f3f4f6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={14} color="#6b7280" />
            </button>

            {/* Top: price + title */}
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

            {/* Distance + route info */}
            {dist != null && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '8px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Navigation size={13} color="#1a6fd4" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1e40af' }}>
                  {dist < 1 ? `${Math.round(dist * 1000)} מטר ממך` : `${dist.toFixed(1)} ק"מ ממך`}
                </span>
                <span style={{ fontSize: 11, color: '#93c5fd', marginRight: 'auto' }}>המסלול מוצג במפה</span>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => window.open(`https://waze.com/ul?ll=${selectedTask.lat},${selectedTask.lng}&navigate=yes`, '_blank')}
                style={{ flex: 1, height: 40, borderRadius: 12, background: '#1da462', border: 'none', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                Waze
              </button>
              <button
                onClick={() => window.open(`https://maps.google.com/?q=${selectedTask.lat},${selectedTask.lng}`, '_blank')}
                style={{ flex: 1, height: 40, borderRadius: 12, background: '#4285f4', border: 'none', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                Google Maps
              </button>
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