import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Slider } from '@/components/ui/slider';
import { Navigation } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createPin = (color) => L.divIcon({
  className: '',
  html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:${color};border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.25);transform:rotate(-45deg)"></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

const pinColors = {
  OPEN: '#1a6fd4',
  TAKEN: '#6366f1',
  COMPLETED: '#9ca3af',
};

const CENTER = [32.0853, 34.7818];

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

  const tasksWithCoords = tasks.filter(t =>
    t.lat && t.lng && t.status !== 'CANCELLED' && t.status !== 'EXPIRED' && t.status !== 'COMPLETED'
  );

  const mockTasks = tasks
    .filter(t => !t.lat && !t.lng && t.status !== 'CANCELLED' && t.status !== 'EXPIRED' && t.status !== 'COMPLETED')
    .map((t, i) => ({
      ...t,
      lat: CENTER[0] + (Math.random() - 0.5) * 0.05,
      lng: CENTER[1] + (Math.random() - 0.5) * 0.05,
    }));

  const displayTasks = [...tasksWithCoords, ...mockTasks];

  return (
    <div className="h-screen flex flex-col" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-[1000] backdrop-blur-sm border-b px-4 pt-10 pb-3"
        style={{ background: 'rgba(244,247,251,0.97)', borderColor: '#dce8f5' }}>
        <h1 className="text-lg font-bold mb-3" style={{ color: '#0f2b6b' }}>🗺️ מפת משימות</h1>
        <div className="rounded-2xl p-3 space-y-2" style={{ background: 'white', border: '1px solid #dbeafe' }}>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium" style={{ color: '#1a6fd4' }}>רדיוס חיפוש</span>
            <span className="font-bold" style={{ color: '#1a6fd4' }}>{radius} ק"מ</span>
          </div>
          <Slider
            value={[radius]}
            onValueChange={([v]) => setRadius(v)}
            min={1} max={20} step={1}
            className="w-full"
          />
        </div>
        <div className="flex gap-4 mt-2 text-xs">
          {[{ color: '#1a6fd4', label: 'פתוח' }, { color: '#6366f1', label: 'נלקח' }].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              <span className="font-medium" style={{ color: '#0f2b6b' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer center={CENTER} zoom={13} className="w-full h-full" style={{ zIndex: 1 }}>
          <TileLayer
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {displayTasks.map(task => (
            <Marker
              key={task.id}
              position={[task.lat, task.lng]}
              icon={createPin(pinColors[task.status] || pinColors.OPEN)}
            >
              <Popup className="rounded-xl">
                <div className="p-1 min-w-[180px]" dir="rtl">
                  <div className="font-bold text-sm mb-1" style={{ color: '#0f2b6b' }}>{task.title}</div>
                  <div className="font-black text-xl mb-1" style={{ color: '#1a6fd4' }}>₪{task.price}</div>
                  {task.location_name && (
                    <div className="text-xs text-gray-500 mb-2">📍 {task.location_name}</div>
                  )}

                  {/* Navigation buttons */}
                  <div className="flex gap-1.5 mb-2">
                    <button
                      onClick={() => openWaze(task.lat, task.lng)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs font-bold py-1.5 px-2 rounded-lg text-white"
                      style={{ background: '#1da462' }}
                    >
                      🚗 Waze
                    </button>
                    <button
                      onClick={() => openMaps(task.lat, task.lng)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs font-bold py-1.5 px-2 rounded-lg text-white"
                      style={{ background: '#4285f4' }}
                    >
                      🗺️ מפות
                    </button>
                  </div>

                  <Link
                    to={`/task/${task.id}`}
                    className="block text-center text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors"
                    style={{ background: '#1a6fd4' }}
                  >
                    צפה במשימה ←
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