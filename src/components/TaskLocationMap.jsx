import { useEffect, useState, useRef } from 'react';
import { getCurrentPosition } from '@/lib/nativeGeolocation';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, Navigation, X, FileText } from 'lucide-react';
import Map, { Marker, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getMapToken } from '@/lib/mapToken';
import InvoiceViewModal from '@/components/InvoiceViewModal';
import MapUnavailableCard from '@/components/map/MapUnavailableCard';
import { useLanguage } from '@/lib/LanguageContext';
import { haversineKm, formatDistance, formatTravelTime } from '@/lib/distance';

// Distance and travel time come from @/lib/distance — this file used to carry
// its own copy of both, with a different unit format ("9.7 ק"מ") and its own
// 40 km/h estimate, so its bubble disagreed with the map popup for the same
// task. One contract now, shared by every surface.

function UserDot() {
  return (
    <div style={{ position: 'relative', width: 22, height: 22 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(59,130,246,0.22)', animation: 'userPulse 2s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', inset: 3, borderRadius: '50%', background: 'var(--brand-primary)', border: '2px solid white', boxShadow: '0 2px 8px rgba(59,130,246,0.6)' }} />
      <style>{`@keyframes userPulse{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(2.5);opacity:0}}`}</style>
    </div>
  );
}

function TaskPin({ task, onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
      <div style={{
        background: 'linear-gradient(135deg,var(--brand-primary),var(--brand-primary-dark))',
        border: '3px solid white',
        borderRadius: '50%',
        width: 34, height: 34,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 14px rgba(26,111,212,0.55)',
        fontSize: 17,
      }}>📍</div>
      {task?.location_name && (
        <div style={{
          background: 'var(--brand-primary)', color: 'white', fontSize: 9, fontWeight: 800,
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

function MapView({ mapToken, task, userLocation, height, onExpand, onCollapse, isExpanded, onInvoiceClick, onGenerateInvoice, t }) {
  const distKm = (userLocation && task.lat && task.lng)
    ? haversineKm(userLocation.lat, userLocation.lng, task.lat, task.lng)
    : null;

  const [pinInfoVisible, setPinInfoVisible] = useState(false);

  // In the full-screen view the overlay is portaled to <body> and covers the
  // device status bar — a button at top:10 sits underneath it and can't be
  // tapped. Push the top row below the safe area so expand/collapse is always
  // reachable.
  const topOffset = isExpanded ? 'max(44px, calc(env(safe-area-inset-top, 0px) + 8px))' : 10;

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
          position: 'absolute', top: topOffset, left: 10, zIndex: 10,
          width: 34, height: 34, borderRadius: 10,
          background: 'var(--brand-surface-elevated, var(--surface-2))', border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
        {isExpanded ? <Minimize2 size={15} color="#334155" /> : <Maximize2 size={15} color="#334155" />}
      </button>

      {/* Pin click info bubble — small, top-right, doesn't cover map */}
      {pinInfoVisible && distKm !== null && (
        <div dir="rtl" style={{
          position: 'absolute', top: topOffset, right: 10, zIndex: 20,
          background: 'var(--brand-surface-elevated, var(--surface-2))', borderRadius: 14, padding: '8px 12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)', border: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', gap: 10, minWidth: 130,
        }}>
          <button onClick={() => setPinInfoVisible(false)}
            style={{ position: 'absolute', top: 4, left: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 1 }}>
            <X size={11} color="#94a3b8" />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Navigation size={13} color="var(--brand-primary)" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--brand-primary)', lineHeight: 1 }}>{formatDistance(distKm, t)}</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{formatTravelTime(distKm, t)}</div>
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
          {/* Navigation is a QUIET secondary here — two brand-coloured slabs
              under the map pulled the eye away from the task itself, so these
              wear the same neutral surface every other secondary uses. */}
          <a
            href={`https://waze.com/ul?ll=${task.lat},${task.lng}&navigate=yes`}
            target="_blank" rel="noopener noreferrer"
            style={{
              flex: 1, height: 38, borderRadius: 12,
              background: 'var(--surface-3)',
              border: '1px solid var(--border-1)',
              color: 'var(--text-2)', fontWeight: 700, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              textDecoration: 'none',
            }}
          >
            Waze
          </a>
          <a
            href={`https://maps.google.com/maps?daddr=${task.lat},${task.lng}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              flex: 1, height: 38, borderRadius: 12,
              background: 'var(--surface-3)',
              border: '1px solid var(--border-1)',
              color: 'var(--text-2)', fontWeight: 700, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              textDecoration: 'none',
            }}
          >
            GPS
          </a>
        </div>
        {/* Invoice: view existing OR generate new */}
        {task.invoice_html ? (
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
            <FileText size={15} /> {t('tax_invoice_view') || 'Tax invoice — click to view and download'}
          </button>
        ) : onGenerateInvoice && (
          <button
            onClick={onGenerateInvoice}
            style={{
              width: '100%', height: 38, borderRadius: 12,
              background: task.requires_invoice ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : '#faf5ff',
              color: task.requires_invoice ? 'white' : '#7c3aed',
              fontWeight: 800, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              border: task.requires_invoice ? 'none' : '1.5px solid #e9d5ff',
              cursor: 'pointer',
              boxShadow: task.requires_invoice ? '0 2px 8px rgba(124,58,237,0.3)' : 'none',
            }}
          >
            <FileText size={15} /> {task.requires_invoice ? (t('generate_tax_invoice_required') || '📄 Generate tax invoice (required by client)') : (t('generate_tax_invoice_btn') || 'Generate tax invoice')}
          </button>
        )}
      </div>
    </div>
  );
}

export default function TaskLocationMap({ task, onGenerateInvoice }) {
  const { t } = useLanguage();
  const [mapToken, setMapToken] = useState('');
  const [mapFailed, setMapFailed] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  const taskLat = parseFloat(task?.lat);
  const taskLng = parseFloat(task?.lng);
  const hasLocation = isFinite(taskLat) && isFinite(taskLng);

  useEffect(() => {
    if (!hasLocation) return;
    let cancelled = false;
    // ── A MAP THAT NEVER ARRIVES MUST SAY SO ─────────────────────────────────
    // The token can fail, be rejected, or simply never resolve. Each of those
    // used to leave the box spinning forever, so the location was never shown at
    // all. A bounded wait is what turns "waiting" into "not available", which is
    // the state that can actually offer the navigation buttons instead.
    const giveUp = setTimeout(() => { if (!cancelled && !mapToken) setMapFailed(true); }, 7000);
    getMapToken()
      .then((token) => {
        if (cancelled) return;
        if (token) setMapToken(token);
        else setMapFailed(true);
      })
      .catch(() => { if (!cancelled) setMapFailed(true); });
    if (navigator.geolocation) {
      getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}, { timeout: 6000 }
      );
    }
    return () => { cancelled = true; clearTimeout(giveUp); };
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
            height={(enrichedTask.invoice_html || onGenerateInvoice) ? 258 : 220}
            onExpand={() => setExpanded(true)}
            onCollapse={() => setExpanded(false)}
            isExpanded={false}
            onInvoiceClick={() => setShowInvoice(true)}
            onGenerateInvoice={onGenerateInvoice}
            t={t}
          />
        ) : mapFailed ? (
          <MapUnavailableCard task={enrichedTask} height={220} t={t} />
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
              onGenerateInvoice={onGenerateInvoice}
              t={t}
            />
          ) : mapFailed ? (
            <MapUnavailableCard task={enrichedTask} fullScreen t={t} />
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