import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Slider } from '@/components/ui/slider';
import BackButton from '@/components/BackButton';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createPin = (price) => L.divIcon({
  className: '',
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;gap:1px">
      <div style="background:#1a6fd4;border:2.5px solid white;box-shadow:0 3px 12px rgba(26,111,212,0.4);border-radius:20px;padding:4px 9px;font-size:12px;font-weight:900;color:white;white-space:nowrap;">
        ₪${price}
      </div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #1a6fd4;margin-top:-1px;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.15))"></div>
    </div>
  `,
  iconSize: [60, 38],
  iconAnchor: [30, 38],
});

const CENTER = [32.0853, 34.7818];

// Official Waze SVG logo
const WazeSVG = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.54 7.27C19.67 3.13 16.04 0 11.73 0 7.1 0 3.27 3.55 2.7 8.05 1.1 8.62 0 10.14 0 11.9c0 2.16 1.74 3.9 3.9 3.9h.1c.6 2.3 2.4 4.1 4.73 4.7V22c0 1.1.9 2 2 2s2-.9 2-2v-1.5c2.33-.6 4.13-2.4 4.73-4.7h.1c2.16 0 3.9-1.74 3.9-3.9 0-2.04-1.55-3.72-3.52-3.9zM8.5 10a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm7 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"/>
  </svg>
);

// Official Google Maps SVG logo
const GoogleMapsSVG = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C7.8 0 4.4 3.4 4.4 7.6c0 5.7 7.6 16.4 7.6 16.4s7.6-10.7 7.6-16.4C19.6 3.4 16.2 0 12 0zm0 10.4c-1.5 0-2.8-1.3-2.8-2.8S10.5 4.8 12 4.8s2.8 1.3 2.8 2.8-1.3 2.8-2.8 2.8z" fill="#4285F4"/>
    <path d="M12 0v4.8c1.5 0 2.8 1.3 2.8 2.8s-1.3 2.8-2.8 2.8V24s7.6-10.7 7.6-16.4C19.6 3.4 16.2 0 12 0z" fill="#34A853"/>
    <path d="M4.4 7.6C4.4 3.4 7.8 0 12 0v4.8c-1.5 0-2.8 1.3-2.8 2.8s1.3 2.8 2.8 2.8V24S4.4 13.3 4.4 7.6z" fill="#FBBC05"/>
  </svg>
);

function openWaze(lat, lng) {
  window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
}

function openMaps(lat, lng) {
  window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
}

export default function MapView() {
  const [radius, setRadius] = useState(10);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 100),
    refetchInterval: 20000,
  });

  // Only OPEN tasks on the map
  const openTasksWithCoords = tasks.filter(t =>
    t.lat && t.lng && t.status === 'OPEN'
  );

  const mockOpenTasks = tasks
    .filter(t => !t.lat && !t.lng && t.status === 'OPEN')
    .map(t => ({
      ...t,
      lat: CENTER[0] + (Math.random() - 0.5) * 0.05,
      lng: CENTER[1] + (Math.random() - 0.5) * 0.05,
    }));

  const displayTasks = [...openTasksWithCoords, ...mockOpenTasks];

  return (
    <div className="h-screen flex flex-col" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-[1000] border-b px-4 pt-10 pb-3"
        style={{ background: 'rgba(244,247,251,0.97)', borderColor: '#dce8f5', backdropFilter: 'blur(8px)' }}>

        {/* Top row */}
        <div className="flex items-center gap-3 mb-3">
          <BackButton />
          <h1 className="text-lg font-bold" style={{ color: '#0f2b6b' }}>🗺️ מפת ג'ובות</h1>
          <span style={{ fontSize: 12, fontWeight: 700, background: '#dbeafe', color: '#1d4ed8', padding: '3px 10px', borderRadius: 20, marginRight: 'auto' }}>
            {displayTasks.length} פתוחות
          </span>
        </div>

        {/* Slim radius bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', border: '1px solid #dbeafe', borderRadius: 12, padding: '8px 14px' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1a6fd4', whiteSpace: 'nowrap' }}>רדיוס</span>
          <div style={{ flex: 1 }}>
            <Slider
              value={[radius]}
              onValueChange={([v]) => setRadius(v)}
              min={1} max={20} step={1}
            />
          </div>
          <span style={{ fontSize: 13, fontWeight: 900, color: '#0f2b6b', whiteSpace: 'nowrap', minWidth: 40, textAlign: 'left' }}>{radius} ק"מ</span>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer center={CENTER} zoom={13} className="w-full h-full" style={{ zIndex: 1 }}>
          <TileLayer
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {displayTasks.map(task => (
            <Marker
              key={task.id}
              position={[task.lat, task.lng]}
              icon={createPin(task.price)}
            >
              <Popup className="rounded-xl">
                <div className="p-1 min-w-[190px]" dir="rtl">
                  <div className="font-bold text-sm mb-1" style={{ color: '#0f2b6b' }}>{task.title}</div>
                  <div className="font-black text-xl mb-1" style={{ color: '#1a6fd4' }}>₪{task.price}</div>
                  {task.location_name && (
                    <div className="text-xs text-gray-500 mb-2">📍 {task.location_name}</div>
                  )}

                  {/* Navigation buttons with official icons */}
                  <div className="flex gap-1.5 mb-2">
                    <button
                      onClick={() => openWaze(task.lat, task.lng)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-1.5 px-2 rounded-lg text-white"
                      style={{ background: '#1da462' }}
                    >
                      <WazeSVG /> Waze
                    </button>
                    <button
                      onClick={() => openMaps(task.lat, task.lng)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-1.5 px-2 rounded-lg text-white"
                      style={{ background: '#4285f4' }}
                    >
                      <GoogleMapsSVG /> מפות
                    </button>
                  </div>

                  <Link
                    to={`/task/${task.id}`}
                    className="block text-center text-xs font-bold py-2 px-3 rounded-lg"
                    style={{ background: '#1a6fd4', color: 'white' }}
                  >
                    צפה בג'ובה ←
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}