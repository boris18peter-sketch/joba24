import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, Navigation, X, FileText } from 'lucide-react';
import Map, { Marker, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { base44 } from '@/api/base44Client';
import InvoiceViewModal from '@/components/InvoiceViewModal';

function calcDistKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(km) {
  if (km < 1) return `${Math.round(km * 1000)} מ'`;
  return `${km.toFixed(1)} ק"מ`;
}
function formatTime(km) {
  const mins = Math.max(1, Math.round(km / 40 * 60));
  if (mins < 60) return `~${mins} דק'`;
  return `~${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')} ש'`;
}

function UserDot() {
  return (
    <div style={{ position: 'relative', width: 22, height: 22 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(59,130,246,0.22)', animation: 'userPulse 2s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', inset: 3, borderRadius: '50%', background: '#3b82f6', border: '2px solid white', boxShadow: '0 2px 8px rgba(59,130,246,0.6)' }} />
      <style>{`@keyframes userPulse{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(2.5);opacity:0}}`}</style>
    </div>
  );
}

function TaskPin({ task, onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
      <div style={{
        background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
        border: '3px solid white',
        borderRadius: '50%',
        width: 34, height: 34,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 14px rgba(26,111,212,0.55)',
        fontSize: 17,
      }}>📍</div>
      {task?.location_name && (
        <div style={{
          background: '#1a6fd4', color: 'white', fontSize: 9, fontWeight: 800,
          padding: '2px 7px', borderRadius: 8, marginTop: 3,
          whiteSpace: 'nowrap', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        }}>
          {task.location_name.split(',')[0]}
        </div>
      )}
    </div>
  );
}

function MapView({ mapToken, task, userLocation, height, onExpand, onCollapse, isExpanded, onInvoiceClick }) {
  const distKm = (userLocation && task.lat && task.lng)
    ? calcDistKm(userLocation.lat, userLocation.lng, task.lat, task.lng)
    : null;

  const [pinInfoVisible, setPinInfoVisible] = useState(false);

  return (
    <div style={{ position: 'relative', height, width: '100%' }}>
      <Map
        initialViewState={{ longitude: task.lng, latitude: task.lat, zoom: 14, pitch: 30, bearing: 0 }}
        mapboxAccessToken={mapToken}
        mapStyle="mapbox://styles/mapbox/standard"
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        {userLocation && (
          <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
            <UserDot />
          </Marker>
        )}
        <Marker longitude={task.lng} latitude={task.lat} anchor="bottom"
          onClick={e => { e.originalEvent?.stopPropagation(); setPinInfoVisible(v => !v); }}>
          <TaskPin task={task} />
        </Marker>
        <NavigationControl position="bottom-left" showCompass visualizePitch />
      </Map>

      {/* Expand/collapse button */}
      <button
        onClick={isExpanded ? onCollapse : onExpand}
        style={{
          position: 'absolute', top: 10, left: 10, zIndex: 10,
          width: 34, height: 34, borderRadius: 10,
          background: 'white', border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
        {isExpanded ? <Minimize2 size={15} color="#334155" /> : <Maximize2 size={15} color="#334155" />}
      </button>

      {/* Pin click info bubble — small, top-right, doesn't cover map */}
      {pinInfoVisible && distKm !== null && (
        <div dir="rtl" style={{
          position: 'absolute', top: 10, right: 10, zIndex: 20,
          background: 'white', borderRadius: 14, padding: '8px 12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)', border: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', gap: 10, minWidth: 130,
        }}>
          <button onClick={() => setPinInfoVisible(false)}
            style={{ position: 'absolute', top: 4, left: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 1 }}>
            <X size={11} color="#94a3b8" />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Navigation size={13} color="#1a6fd4" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#1a6fd4', lineHeight: 1 }}>{formatDist(distKm)}</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{formatTime(distKm)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar: Waze + GPS + Invoice (if exists) */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
        background: 'rgba(255,255,255,0.97)',
        borderTop: '1px solid #e2e8f0',
        padding: '8px 10px',
        paddingBottom: isExpanded ? 'max(8px, env(safe-area-inset-bottom))' : '8px',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href={`https://waze.com/ul?ll=${task.lat},${task.lng}&navigate=yes`}
            target="_blank" rel="noopener noreferrer"
            style={{
              flex: 1, height: 38, borderRadius: 12,
              background: 'linear-gradient(135deg,#33ccff,#00b2d9)',
              color: 'white', fontWeight: 800, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,178,217,0.3)',
            }}
          >
            Waze
          </a>
          <a
            href={`https://maps.google.com/maps?daddr=${task.lat},${task.lng}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              flex: 1, height: 38, borderRadius: 12,
              background: 'linear-gradient(135deg,#4285f4,#1967d2)',
              color: 'white', fontWeight: 800, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              textDecoration: 'none', boxShadow: '0 2px 8px rgba(66,133,244,0.3)',
            }}
          >
            GPS
          </a>
        </div>
        {/* Invoice button — only if invoice exists */}
        {task.invoice_html && (
          <button
            onClick={onInvoiceClick}
            style={{
              width: '100%', height: 38, borderRadius: 12,
              background: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
              color: 'white', fontWeight: 800, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
            }}
          >
            <FileText size={15} /> חשבונית מס — לחץ לצפייה והורדה
          </button>
        )}
      </div>
    </div>
  );
}

export default function TaskLocationMap({ task }) {
  const [mapToken, setMapToken] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  const taskLat = parseFloat(task?.lat);
  const taskLng = parseFloat(task?.lng);
  const hasLocation = isFinite(taskLat) && isFinite(taskLng);

  useEffect(() => {
    if (!hasLocation) return;
    base44.functions.invoke('getMapboxToken', {}).then(res => {
      if (res.data?.token) setMapToken(res.data.token);
    }).catch(() => {});
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}, { timeout: 6000 }
      );
    }
  }, [hasLocation]);

  if (!hasLocation) return null;

  const enrichedTask = { ...task, lat: taskLat, lng: taskLng };

  return (
    <>
      {/* Compact inline map */}
      <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border-1)' }}>
        {mapToken ? (
          <MapView
            mapToken={mapToken}
            task={enrichedTask}
            userLocation={userLocation}
            height={enrichedTask.invoice_html ? 258 : 220}
            onExpand={() => setExpanded(true)}
            onCollapse={() => setExpanded(false)}
            isExpanded={false}
            onInvoiceClick={() => setShowInvoice(true)}
          />
        ) : (
          <div style={{ height: 220, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Full-screen expanded map */}
      {expanded && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999 }}>
          {mapToken ? (
            <MapView
              mapToken={mapToken}
              task={enrichedTask}
              userLocation={userLocation}
              height="100dvh"
              onExpand={() => {}}
              onCollapse={() => setExpanded(false)}
              isExpanded={true}
              onInvoiceClick={() => setShowInvoice(true)}
            />
          ) : (
            <div style={{ height: '100dvh', background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
            </div>
          )}
        </div>,
        document.body
      )}

      {showInvoice && enrichedTask.invoice_html && (
        <InvoiceViewModal invoiceHtml={enrichedTask.invoice_html} onClose={() => setShowInvoice(false)} />
      )}
    </>
  );
}