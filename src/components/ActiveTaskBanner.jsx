import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, MapPin, Navigation, ChevronLeft, Hammer, User, HardHat, CheckCircle, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import QuickChatDrawer from '@/components/QuickChatDrawer';

const STATUS_STEPS = {
  on_the_way: { label: 'בדרך', ownerLabel: 'בדרך אליך', step: 0 },
  delayed:    { label: 'מתעכב', ownerLabel: 'מתעכב קצת', step: 0 },
  parking:    { label: 'מחפש חניה', ownerLabel: 'מחפש חניה', step: 0 },
  arrived:    { label: 'הגעתי', ownerLabel: 'הגיע אליך', step: 1 },
  starting:   { label: 'מתחיל עבודה', ownerLabel: 'מתחיל לעבוד', step: 1 },
  finishing:  { label: 'מסיים עבודה', ownerLabel: 'מסיים עבודה', step: 1 },
  done:       { label: 'ממתין לאישור תשלום', ownerLabel: 'סיים — ממתין לאישורך', step: 2 }
};

const gradients = {
  0: 'linear-gradient(135deg, #1a6fd4 0%, #3b82f6 100%)',
  1: 'linear-gradient(135deg, #c07c2a 0%, #d4943e 100%)',
  2: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
  '-1': 'linear-gradient(135deg, #0f2b6b 0%, #1a6fd4 100%)',
};


export default function ActiveTaskBanner({ task, roleHint }) {
  const navigate = useNavigate();
  const [showChat, setShowChat] = useState(false);
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  if (!task || !me) return null;

  const statusInfo = STATUS_STEPS[task.worker_status] || null;
  const isWorker = roleHint === 'worker' || (roleHint !== 'client' && me?.id === task.worker_id);
  const isOwner = roleHint === 'client' || (roleHint !== 'worker' && me?.id === task.client_id);
  if (!isWorker && !isOwner) return null;

  const stepIdx = statusInfo?.step ?? -1;

  // Clean, professional color per step
  const bannerColors = {
    0:  { bg: '#1558b0', accent: '#1a6fd4' },   // on the way — blue
    1:  { bg: '#8a5c10', accent: '#b07828' },   // arrived — warm amber
    2:  { bg: '#0b6e4f', accent: '#0d9266' },   // done — green
    '-1': { bg: '#0f2346', accent: '#1a6fd4' }, // waiting
  };
  const colors = bannerColors[stepIdx] || bannerColors['-1'];

  const statusText = isOwner
    ? (statusInfo?.ownerLabel || 'ממתין לעדכון מהעובד')
    : (statusInfo?.label || 'לחץ יצאתי לדרך בדף המשימה');

  const StepIcon = stepIdx === 2 ? CheckCircle : stepIdx === 1 ? MapPin : stepIdx === 0 ? Navigation : Clock;

  return (
    <div dir="rtl" style={{ padding: '0 16px 12px' }}>
      <div
        style={{
          background: colors.bg,
          borderRadius: 18,
          padding: '14px 16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
          cursor: 'pointer',
          overflow: 'hidden',
          position: 'relative',
        }}
        onClick={() => navigate(`/task/${task.id}`)}>

        {/* Subtle top-right decoration */}
        <div style={{ position: 'absolute', top: -24, left: -24, width: 96, height: 96, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        {/* Live pill */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: '3px 9px', marginBottom: 10 }}>
          <span style={{ position: 'relative', display: 'inline-flex', width: 7, height: 7 }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animation: 'livePing 1.8s ease-in-out infinite' }} />
            <span style={{ position: 'relative', width: 7, height: 7, borderRadius: '50%', background: 'white' }} />
          </span>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: 600, letterSpacing: 0.3 }}>
            {isWorker ? 'משימה בביצוע' : 'משימה שלך בביצוע'}
          </span>
        </div>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 16, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 3 }}>
              {isWorker ? `מעסיק: ${task.client_name}` : `עובד: ${task.worker_name}`}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '6px 10px', textAlign: 'center', flexShrink: 0 }}>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 18, lineHeight: 1 }}>₪{task.price}</div>
          </div>
        </div>

        {/* Status row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 12px', marginBottom: 10 }}>
          <StepIcon size={16} color="rgba(255,255,255,0.9)" strokeWidth={2} />
          <div style={{ flex: 1 }}>
            <div style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>{statusText}</div>
          </div>
          <ChevronLeft size={16} color="rgba(255,255,255,0.5)" />
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: i <= stepIdx ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)', transition: 'background 0.4s' }} />
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowChat(true); }}
            style={{ flex: 1, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.12)', border: 'none', color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <MessageCircle size={13} /> צ'אט
          </button>
          {task.location_name && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const dst = task.lat && task.lng ? `${task.lat},${task.lng}` : encodeURIComponent(task.location_name);
                const choice = window.confirm('נווט עם Waze?\nלחץ ביטול לפתיחה עם Google Maps');
                window.open(choice ? `https://waze.com/ul?q=${dst}&navigate=yes` : (task.lat && task.lng ? `https://maps.google.com/maps?daddr=${task.lat},${task.lng}` : `https://maps.google.com/maps?q=${encodeURIComponent(task.location_name)}`), '_blank');
              }}
              style={{ flex: 1, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.12)', border: 'none', color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <Navigation size={13} /> נווט
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/task/${task.id}`); }}
            style={{ flex: 1, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.12)', border: 'none', color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            פרטים
          </button>
        </div>
      </div>

      {showChat && me && <QuickChatDrawer task={task} me={me} onClose={() => setShowChat(false)} />}

      <style>{`
        @keyframes livePing {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}