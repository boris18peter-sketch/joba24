import { useEffect, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2 } from 'lucide-react';
import Map, { Marker } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { base44 } from '@/api/base44Client';

// NavButtons extracted outside to avoid re-creating on every render
const NavButtons = ({ taskLat, taskLng }) => (
  <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: 'var(--surface-2)', borderTop: '1px solid var(--border-1)' }}>
    <a href={`https://waze.com/ul?ll=${taskLat},${taskLng}&navigate=yes`} target="_blank" rel="noopener noreferrer"
      style={{ flex: 1, height: 38, borderRadius: 12, background: 'linear-gradient(135deg,#33ccff,#00b2d9)', color: 'white', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,178,217,0.3)' }}
    >🗺️ Waze</a>
    <a href={`https://maps.google.com/maps?daddr=${taskLat},${taskLng}`} target="_blank" rel="noopener noreferrer"
      style={{ flex: 1, height: 38, borderRadius: 12, background: 'linear-gradient(135deg,#4285f4,#1967d2)', color: 'white', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none', boxShadow: '0 2px 8px rgba(66,133,244,0.3)' }}
    >📍 GPS</a>
  </div>
);

// MapContent extracted to module-level component to prevent re-mounting on every parent render
const MapContent = memo(({ mapToken, taskLng, taskLat, locationName, height }) => {
  if (!mapToken) {
    return (
      <div style={{ height, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }
  return (
    <Map
      initialViewState={{ longitude: taskLng, latitude: taskLat, zoom: 15 }}
      mapboxAccessToken={mapToken}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      language="he"
      style={{ height, width: '100%' }}
      interactive={true}
      attributionControl={false}
      scrollZoom={true}
      dragPan={true}
    >
      <Marker longitude={taskLng} latitude={taskLat} anchor="bottom">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', border: '3px solid white', boxShadow: '0 3px 12px rgba(26,111,212,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📍</div>
          {locationName && (
            <div style={{ background: '#1a6fd4', color: 'white', fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 8, marginTop: 3, whiteSpace: 'nowrap', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
              {locationName.split(',')[0]}
            </div>
          )}
        </div>
      </Marker>
    </Map>
  );
});

export default function TaskLocationMap({ task }) {
  const [mapToken, setMapToken] = useState('');
  const [expanded, setExpanded] = useState(false);

  const taskLat = parseFloat(task?.lat);
  const taskLng = parseFloat(task?.lng);
  const hasLocation = isFinite(taskLat) && isFinite(taskLng);
  const locationName = task?.location_name;

  useEffect(() => {
    if (!hasLocation) return;
    base44.functions.invoke('getMapboxToken', {}).then(res => {
      if (res.data?.token) setMapToken(res.data.token);
    }).catch(() => {});
  }, [hasLocation]);

  if (!hasLocation) return null;

  return (
    <>
      <div dir="rtl" style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border-1)', position: 'relative' }}>
        <button
          onClick={() => setExpanded(true)}
          style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, width: 34, height: 34, borderRadius: 10, background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Maximize2 size={15} color="#334155" />
        </button>
        <MapContent mapToken={mapToken} taskLng={taskLng} taskLat={taskLat} locationName={locationName} height={220} />
        <NavButtons taskLat={taskLat} taskLng={taskLng} />
      </div>

      {expanded && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'white', display: 'flex', flexDirection: 'column' }} dir="rtl">
          <div style={{ position: 'relative', flex: 1 }}>
            <MapContent mapToken={mapToken} taskLng={taskLng} taskLat={taskLat} locationName={locationName} height="100%" />
            <button
              onClick={() => setExpanded(false)}
              style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, width: 40, height: 40, borderRadius: 12, background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Minimize2 size={17} color="#334155" />
            </button>
          </div>
          <NavButtons taskLat={taskLat} taskLng={taskLng} />
        </div>,
        document.body
      )}
    </>
  );
}