import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Slider } from '@/components/ui/slider';

// Fix leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createPin = (color) => L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);transform:rotate(-45deg)"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const pinColors = {
  OPEN: '#22c55e',
  TAKEN: '#3b82f6',
  COMPLETED: '#9ca3af',
};

const CENTER = [32.0853, 34.7818]; // Tel Aviv

export default function MapView() {
  const [radius, setRadius] = useState(10);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 100),
    refetchInterval: 20000,
  });

  const tasksWithCoords = tasks.filter(t =>
    t.lat && t.lng && t.status !== 'CANCELLED'
  );

  const mockTasks = tasks.filter(t => !t.lat && !t.lng && t.status !== 'CANCELLED').map((t, i) => ({
    ...t,
    lat: CENTER[0] + (Math.random() - 0.5) * 0.05,
    lng: CENTER[1] + (Math.random() - 0.5) * 0.05,
  }));

  const displayTasks = [...tasksWithCoords, ...mockTasks];

  return (
    <div className="h-screen flex flex-col" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-[1000] bg-background/95 backdrop-blur-sm border-b border-border px-4 pt-12 pb-3">
        <h1 className="text-lg font-bold mb-3">מפת משימות</h1>
        <div className="bg-card border border-border rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">רדיוס חיפוש</span>
            <span className="font-bold text-primary">{radius} ק"מ</span>
          </div>
          <Slider
            value={[radius]}
            onValueChange={([v]) => setRadius(v)}
            min={1} max={20} step={1}
            className="w-full"
          />
        </div>
        <div className="flex gap-3 mt-2 text-xs">
          {[{ color: '#22c55e', label: 'פתוח' }, { color: '#3b82f6', label: 'נלקח' }, { color: '#9ca3af', label: 'הושלם' }].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={CENTER}
          zoom={13}
          className="w-full h-full"
          style={{ zIndex: 1 }}
        >
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
                <div className="p-1 min-w-[160px]" dir="rtl">
                  <div className="font-bold text-sm mb-1">{task.title}</div>
                  <div className="text-primary font-bold text-lg mb-2">₪{task.price}</div>
                  {task.location_name && (
                    <div className="text-xs text-gray-500 mb-2">{task.location_name}</div>
                  )}
                  <Link
                    to={`/task/${task.id}`}
                    className="block text-center bg-blue-600 text-white text-xs font-medium py-1.5 px-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    צפה במשימה
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