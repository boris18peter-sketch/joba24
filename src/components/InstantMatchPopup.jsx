import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { MapPin, Zap, X } from 'lucide-react';
import { getCategoryLabel } from '@/lib/categories';

function getDistanceKm(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const DURATION = 18;

export default function InstantMatchPopup({ userLocation, currentUserId }) {
  const [popup, setPopup] = useState(null);
  const [countdown, setCountdown] = useState(DURATION);
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

      if (dist !== null && dist > 5) return;

      setPopup({ task, dist });
      setCountdown(DURATION);
    });
    return unsub;
  }, [userLocation, currentUserId]);

  useEffect(() => {
    if (!popup) return;
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timerRef.current); setPopup(null); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [popup]);

  if (!popup) return null;

  const { task, dist } = popup;
  const progress = (countdown / DURATION) * 100;
  const isUrgent = countdown <= 6;

  return (
    <div style={{ position: 'fixed', bottom: 100, left: 12, right: 12, zIndex: 99998 }} dir="rtl">
      <style>{`
        @keyframes slideUpPop {
          from { opacity: 0; transform: translateY(30px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div style={{
        background: 'white',
        borderRadius: 22,
        overflow: 'hidden',
        boxShadow: '0 16px 60px rgba(0,0,0,0.2)',
        border: isUrgent ? '2px solid #ef4444' : '1.5px solid #e2e8f0',
        animation: 'slideUpPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transition: 'border 0.3s',
      }}>
        {/* Progress bar */}
        <div style={{ height: 3, background: '#f1f5f9' }}>
          <div style={{
            height: '100%',
            background: isUrgent ? '#ef4444' : '#f59e0b',
            width: `${progress}%`,
            transition: 'width 1s linear, background 0.3s',
            borderRadius: 2,
          }} />
        </div>

        {/* Content */}
        <div style={{ padding: '14px 16px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          {/* Left: icon */}
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: isUrgent ? '#fee2e2' : '#fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            flexShrink: 0,
          }}>
            ⚡
          </div>

          {/* Middle: info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: isUrgent ? '#ef4444' : '#f59e0b', marginBottom: 3 }}>
              משימה חדשה בקרבתך • {countdown}s
            </div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#0f2b6b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
              {task.title}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#111' }}>₪{task.price}</span>
              {dist !== null && (
                <span style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <MapPin size={11} />
                  {dist < 1 ? `${Math.round(dist * 1000)}מ'` : `${dist.toFixed(1)}ק"מ`}
                </span>
              )}
              {task.category && (
                <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '2px 7px', borderRadius: 20, fontWeight: 600 }}>
                  {getCategoryLabel(task.category)}
                </span>
              )}
            </div>
          </div>

          {/* Close */}
          <button
            onClick={() => setPopup(null)}
            style={{ width: 28, height: 28, borderRadius: 8, background: '#f1f5f9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <X size={14} color="#94a3b8" />
          </button>
        </div>

        {/* CTA */}
        <div style={{ padding: '0 16px 14px' }}>
          <button
            onClick={() => { navigate(`/task/${task.id}`); setPopup(null); }}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 14,
              background: isUrgent
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: 'white',
              fontWeight: 900,
              fontSize: 15,
              border: 'none',
              cursor: 'pointer',
              boxShadow: isUrgent ? '0 4px 16px rgba(239,68,68,0.35)' : '0 4px 16px rgba(245,158,11,0.35)',
            }}
          >
            {isUrgent ? '🔥 קח עכשיו לפני שנגמר!' : '⚡ צפה במשימה'}
          </button>
        </div>
      </div>
    </div>
  );
}