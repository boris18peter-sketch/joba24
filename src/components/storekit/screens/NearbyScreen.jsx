import { useEffect, useState } from 'react';
import { Search, MapPin, Navigation, Plus, Minus } from 'lucide-react';
import TaskCard from '@/components/TaskCard';
import { getMapToken } from '@/lib/mapToken';
import { DEMO_TASKS } from '@/lib/storekit/demoData';

// Tel Aviv — the app's default map centre.
const CENTER = { lng: 34.7818, lat: 32.0853, zoom: 12.7 };
const MAP_W = 393;
const MAP_H = 852;

// Real pins: category emoji + the price the task actually pays.
const PINS = [
  { id: 'p1', emoji: '🚛', price: 420, top: '26%', right: '58%' },
  { id: 'p2', emoji: '🔨', price: 350, top: '41%', right: '28%' },
  { id: 'p3', emoji: '⚡', price: 180, top: '53%', right: '62%' },
  { id: 'p4', emoji: '🐶', price: 60, top: '66%', right: '36%' },
  { id: 'p5', emoji: '🧹', price: 220, top: '35%', right: '74%' },
];

/**
 * FRAME 03 — "העזרה שאתם צריכים. קרוב אליכם."
 * The real Joba24 map experience: the app's own Mapbox Standard style centred on
 * Tel Aviv, real task pins with real prices, and a real task card over the map.
 */
export default function NearbyScreen() {
  const [token, setToken] = useState('');

  useEffect(() => {
    let alive = true;
    getMapToken().then(t => { if (alive) setToken(t || ''); });
    return () => { alive = false; };
  }, []);

  const mapUrl = token
    ? `https://api.mapbox.com/styles/v1/mapbox/standard/static/${CENTER.lng},${CENTER.lat},${CENTER.zoom},0/${MAP_W}x${MAP_H}@2x?access_token=${token}`
    : '';

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden', background: '#e8eef7' }}>
      {mapUrl && (
        <img
          src={mapUrl}
          alt=""
          crossOrigin="anonymous"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}

      {/* Pins */}
      {PINS.map(pin => (
        <div
          key={pin.id}
          style={{
            position: 'absolute',
            top: pin.top,
            right: pin.right,
            transform: 'translate(50%, -50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: '#ffffff',
            border: '2px solid #1a6fd4',
            borderRadius: 999,
            padding: '4px 9px 4px 6px',
            boxShadow: '0 4px 14px rgba(15,40,107,0.24)',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: 13 }}>{pin.emoji}</span>
          <span style={{ fontSize: 12, fontWeight: 900, color: '#0d1e40' }}>₪{pin.price}</span>
        </div>
      ))}

      {/* Floating search header */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 12,
          right: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(255,255,255,0.97)',
          borderRadius: 14,
          padding: '9px 12px',
          boxShadow: '0 6px 20px rgba(15,40,107,0.16)',
        }}
      >
        <Search size={16} color="#1a6fd4" />
        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-3)', flex: 1 }}>
          חיפוש משימות באזור
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            fontSize: 11,
            fontWeight: 800,
            color: '#1a6fd4',
            background: '#eff6ff',
            borderRadius: 999,
            padding: '3px 8px',
          }}
        >
          <Navigation size={10} /> 5 ק״מ
        </span>
      </div>

      {/* Zoom controls */}
      <div
        style={{
          position: 'absolute',
          bottom: 250,
          left: 12,
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 4px 14px rgba(15,40,107,0.18)',
        }}
      >
        <div style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={17} color="#0d1e40" />
        </div>
        <div style={{ height: 1, background: 'var(--border-1)' }} />
        <div style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Minus size={17} color="#0d1e40" />
        </div>
      </div>

      {/* Real task card over the map */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 12px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, paddingRight: 2 }}>
          <MapPin size={12} color="#ffffff" />
          <span style={{ fontSize: 11.5, fontWeight: 800, color: '#ffffff', textShadow: '0 1px 4px rgba(0,0,0,0.45)' }}>
            4 משימות פתוחות במרחק 5 ק״מ
          </span>
        </div>
        <TaskCard task={DEMO_TASKS[1]} currentUserId="store-viewer" />
      </div>
    </div>
  );
}