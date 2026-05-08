import { useNavigate } from 'react-router-dom';
import { MessageCircle, MapPin, Navigation, ChevronLeft, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const STATUS_STEPS = {
  on_the_way: { label: 'בדרך', icon: '🛵', next: 'הגעת למיקום?', nextAction: 'הגעתי', color: '#3b82f6', step: 0 },
  delayed:    { label: 'מתעכב', icon: '⏳', next: 'הגעת למיקום?', nextAction: 'הגעתי', color: '#f59e0b', step: 0 },
  parking:    { label: 'מחפש חניה', icon: '🚗', next: 'הגעת למיקום?', nextAction: 'הגעתי', color: '#8b5cf6', step: 0 },
  arrived:    { label: 'הגעת', icon: '📍', next: 'סיימת?', nextAction: 'סיימתי את הג׳ובה', color: '#f59e0b', step: 1 },
  starting:   { label: 'מתחיל עבודה', icon: '🔧', next: 'סיימת?', nextAction: 'סיימתי', color: '#10b981', step: 1 },
  finishing:  { label: 'מסיים עבודה', icon: '🏁', next: 'סיימת?', nextAction: 'סיימתי', color: '#059669', step: 1 },
  done:       { label: 'ממתין לאישור תשלום', icon: '🏆', next: null, color: '#10b981', step: 2 },
};

const NO_STATUS_GUIDANCE = 'לחץ "יצאתי לדרך" בדף המשימה כדי להתחיל';

export default function ActiveTaskBanner({ task }) {
  const navigate = useNavigate();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  if (!task) return null;

  const statusInfo = STATUS_STEPS[task.worker_status] || null;
  const isWorker = me?.id === task.worker_id;
  const isOwner = me?.id === task.client_id;
  if (!isWorker && !isOwner) return null;

  // Gradient based on step
  const gradients = {
    0: 'linear-gradient(135deg, #1a6fd4 0%, #3b82f6 100%)',
    1: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    2: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
  };
  const gradient = gradients[statusInfo?.step ?? -1] || 'linear-gradient(135deg, #0f2b6b 0%, #1a6fd4 100%)';

  return (
    <div dir="rtl" style={{ padding: '0 16px 12px' }}>
      {/* Live glow card */}
      <div
        style={{
          background: gradient,
          borderRadius: 22,
          padding: '16px',
          boxShadow: '0 8px 32px rgba(26,111,212,0.3)',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
        }}
        onClick={() => navigate(`/task/${task.id}`)}
      >
        {/* Animated live dot */}
        <div style={{ position: 'absolute', top: 14, left: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ position: 'relative', display: 'inline-flex', width: 9, height: 9 }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', animation: 'livePing 1.5s ease-in-out infinite' }} />
            <span style={{ position: 'relative', width: 9, height: 9, borderRadius: '50%', background: 'white', display: 'inline-flex' }} />
          </span>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: 800, letterSpacing: 0.5 }}>
            {isWorker ? 'המשימה הפעילה שלך' : 'משימה בביצוע'}
          </span>
        </div>

        {/* Decorative circle */}
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

        {/* Top spacer for the live badge */}
        <div style={{ height: 20 }} />

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0, paddingLeft: 8 }}>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 17, lineHeight: 1.2, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
              {isWorker ? `מעסיק: ${task.client_name}` : `פועל: ${task.worker_name}`}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 14, padding: '8px 14px', textAlign: 'center', flexShrink: 0 }}>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 22, lineHeight: 1 }}>₪{task.price}</div>
          </div>
        </div>

        {/* Current status + guidance */}
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '10px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 22 }}>{statusInfo?.icon || '⚡'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'white', fontWeight: 800, fontSize: 13 }}>
              {statusInfo ? `✅ ${statusInfo.label}` : isWorker ? '⏳ ממתין להתחלה' : '⏳ ממתין לעובד'}
            </div>
            {isWorker && (
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 1 }}>
                👉 {statusInfo?.next ? statusInfo.next : NO_STATUS_GUIDANCE}
              </div>
            )}
          </div>
          <ChevronLeft size={18} color="rgba(255,255,255,0.7)" />
        </div>

        {/* Quick action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Chat */}
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/chat/${task.id}`); }}
            style={{ flex: 1, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <MessageCircle size={14} /> צ׳אט
          </button>

          {/* Navigation */}
          {task.location_name && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const dst = task.lat && task.lng ? `${task.lat},${task.lng}` : encodeURIComponent(task.location_name);
                window.open(`https://waze.com/ul?q=${dst}&navigate=yes`, '_blank');
              }}
              style={{ flex: 1, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Navigation size={14} /> נווט
            </button>
          )}

          {/* View details */}
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/task/${task.id}`); }}
            style={{ flex: 1, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            פרטים
          </button>
        </div>
      </div>

      <style>{`
        @keyframes livePing {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}