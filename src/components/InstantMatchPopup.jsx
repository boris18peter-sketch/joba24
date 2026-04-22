import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { MapPin, Zap, X, Clock } from 'lucide-react';

function getDistanceKm(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function InstantMatchPopup({ userLocation, currentUserId }) {
  const [popup, setPopup] = useState(null);
  const [countdown, setCountdown] = useState(15);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = base44.entities.Task.subscribe(event => {
      if (event.type !== 'create') return;
      const task = event.data;
      if (!task || task.status !== 'OPEN') return;
      if (task.client_id === currentUserId) return;

      const dist = userLocation
        ? getDistanceKm(userLocation.lat, userLocation.lng, task.lat, task.lng)
        : null;

      if (dist !== null && dist > 5) return; // only within 5km

      setPopup({ task, dist });
      setCountdown(15);
    });
    return unsub;
  }, [userLocation, currentUserId]);

  useEffect(() => {
    if (!popup) return;
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timerRef.current);
          setPopup(null);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [popup]);

  if (!popup) return null;

  const { task, dist } = popup;
  const categoryEmoji = { moving: '🚛', shopping: '🛒', repairs: '🔧', cleaning: '🧹', other: '📋' };

  return (
    <div
      style={{
        position: 'fixed',
        top: 80,
        left: 16,
        right: 16,
        zIndex: 99999,
        animation: 'slideDown 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          borderRadius: 20,
          padding: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: '#f59e0b', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={14} color="white" />
            </div>
            <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: 13 }}>⚡ משימה קרובה!</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} color="#f59e0b" />
              <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 700 }}>{countdown}s</span>
            </div>
            <button
              onClick={() => setPopup(null)}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={13} color="white" />
            </button>
          </div>
        </div>

        {/* Task info */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 16 }}>{categoryEmoji[task.category] || '📋'}</span>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{task.title}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {dist !== null && (
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={12} color="#60a5fa" />
                {dist < 1 ? `${Math.round(dist * 1000)}מ'` : `${dist.toFixed(1)}ק"מ`}
              </span>
            )}
            <span style={{ color: '#4ade80', fontWeight: 800, fontSize: 14 }}>₪{task.price}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 4, height: 3, marginBottom: 12 }}>
          <div
            style={{
              background: '#f59e0b',
              height: '100%',
              borderRadius: 4,
              width: `${(countdown / 15) * 100}%`,
              transition: 'width 1s linear',
            }}
          />
        </div>

        {/* CTA */}
        <button
          onClick={() => { navigate(`/task/${task.id}`); setPopup(null); }}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            border: 'none',
            borderRadius: 12,
            padding: '12px',
            color: 'white',
            fontWeight: 800,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          ⚡ קח את המשימה עכשיו
        </button>
      </div>
    </div>
  );
}