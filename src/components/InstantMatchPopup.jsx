import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { MapPin, Zap, X } from 'lucide-react';
import { getCategoryLabel } from '@/lib/categories';
import { useQuery } from '@tanstack/react-query';

function getDistanceKm(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const DURATION = 18;

// Returns a relevance score for showing a popup to a worker
function calcRelevanceScore({ task, currentUser, userLocation, myApplications, myCompletedTasks, activeCategory }) {
  if (!task || !currentUser) return 0;
  let score = 0;

  // 1. Category match with preferred_categories
  if (currentUser.preferred_categories?.includes(task.category)) score += 40;

  // 2. Category match with past applications
  const appliedCategories = myApplications.map(a => a._category).filter(Boolean);
  if (appliedCategories.includes(task.category)) score += 30;

  // 3. Category match with completed tasks
  const completedCategories = myCompletedTasks.map(t => t.category).filter(Boolean);
  if (completedCategories.includes(task.category)) score += 35;

  // 4. Currently browsing same category
  if (activeCategory && activeCategory === task.category) score += 50;

  // 5. Distance score (< 3km = full score, 3-8km = partial)
  if (userLocation && task.lat && task.lng) {
    const dist = getDistanceKm(userLocation.lat, userLocation.lng, task.lat, task.lng);
    if (dist !== null) {
      if (dist <= 3) score += 25;
      else if (dist <= 8) score += 10;
      else return 0; // too far — never show
    }
  }

  return score;
}

export default function InstantMatchPopup({ userLocation, currentUserId, activeCategory }) {
  const [popup, setPopup] = useState(null);
  const [countdown, setCountdown] = useState(DURATION);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  // Fetch current user profile + past activity for smart matching
  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    enabled: !!currentUserId,
    staleTime: 120000,
  });
  const { data: myApplications = [] } = useQuery({
    queryKey: ['myApplicationsFeed', currentUserId],
    enabled: !!currentUserId,
    staleTime: 120000,
  });
  const { data: myCompletedTasks = [] } = useQuery({
    queryKey: ['myCompletedTasks', currentUserId],
    queryFn: () => base44.entities.Task.filter({ worker_id: currentUserId, status: 'COMPLETED' }, '-created_date', 30),
    enabled: !!currentUserId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const shown = new Set();
    const unsub = base44.entities.Task.subscribe(event => {
      const task = event.data;
      if (!task || task.status !== 'OPEN') return;
      if (task.client_id === currentUserId) return;

      const isNewTask = event.type === 'create';
      const isBoosted = event.type === 'update' && task.last_boost_at &&
        (Date.now() - new Date(task.last_boost_at).getTime()) < 15000; // boosted within last 15s

      if (!isNewTask && !isBoosted) return;

      // Deduplicate — don't show same task twice quickly
      const dedupKey = `${task.id}_${isNewTask ? 'new' : task.last_boost_at}`;
      if (shown.has(dedupKey)) return;
      shown.add(dedupKey);

      const dist = userLocation
        ? getDistanceKm(userLocation.lat, userLocation.lng, task.lat, task.lng)
        : null;

      const score = calcRelevanceScore({ task, currentUser, userLocation, myApplications, myCompletedTasks, activeCategory });

      if (!currentUserId) {
        if (dist !== null && dist > 5) return;
      } else {
        if (score < 25 && !isBoosted) return;
        // Boosted tasks get a lower threshold — show to relevant workers
        if (isBoosted && score < 10) return;
      }

      // For boosted tasks — also persist to localStorage notifications
      if (isBoosted && currentUserId) {
        const stored = JSON.parse(localStorage.getItem('joba24_notifications') || '[]');
        const alreadyStored = stored.some(n => n.taskId === task.id && n.type === 'boost_signal' &&
          Math.abs(Date.now() - new Date(n.timestamp).getTime()) < 60000);
        if (!alreadyStored) {
          const notif = {
            type: 'boost_signal',
            taskId: task.id,
            taskTitle: task.title,
            preview: `${task.location_name ? task.location_name.split(',')[0] + ' · ' : ''}₪${Math.round(task.price || 0)}`,
            timestamp: new Date().toISOString(),
            read: false,
          };
          localStorage.setItem('joba24_notifications', JSON.stringify([notif, ...stored].slice(0, 50)));
          window.dispatchEvent(new Event('joba24_notif_update'));
        }
      }

      setPopup({ task, dist, isBoosted });
      setCountdown(DURATION);
    });
    return unsub;
  }, [userLocation, currentUserId, currentUser, myApplications, myCompletedTasks, activeCategory]);

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

  const { task, dist, isBoosted } = popup;
  const progress = (countdown / DURATION) * 100;
  const isUrgent = countdown <= 6;

  return (
    <div style={{ position: 'fixed', bottom: 'calc(80px + max(0px, env(safe-area-inset-bottom)) + 12px)', left: 12, right: 12, zIndex: 100000 }} dir="rtl">
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
            <div style={{ fontSize: 11, fontWeight: 700, color: isUrgent ? '#ef4444' : isBoosted ? '#7c3aed' : '#f59e0b', marginBottom: 3 }}>
              {isBoosted ? '⚡ איתות חדש — משימה מתאימה לך' : 'משימה חדשה בקרבתך'} • {countdown}s
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
            {isUrgent ? '🔥 קח עכשיו לפני שנגמר!' : '⚡ צפה במשימה מיד'}
          </button>
        </div>
      </div>
    </div>
  );
}