import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, MapPin, Navigation, ChevronLeft, Hammer, User, HardHat, CheckCircle, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import QuickChatDrawer from '@/components/QuickChatDrawer';
import VerifiedBadge from '@/components/VerifiedBadge';

const STATUS_STEPS = {
  on_the_way: { label: 'בדרך', ownerLabel: 'בדרך אליך', step: 0 },
  delayed: { label: 'מתעכב', ownerLabel: 'מתעכב קצת', step: 0 },
  parking: { label: 'מחפש חניה', ownerLabel: 'מחפש חניה', step: 0 },
  arrived: { label: 'הגעתי', ownerLabel: 'הגיע אליך', step: 1 },
  starting: { label: 'מתחיל עבודה', ownerLabel: 'מתחיל לעבוד', step: 1 },
  finishing: { label: 'מסיים עבודה', ownerLabel: 'מסיים עבודה', step: 1 },
  done: { label: 'ממתין לאישור תשלום', ownerLabel: 'סיים — ממתין לאישורך', step: 2 }
};

const gradients = {
  0: 'linear-gradient(135deg, #1a6fd4 0%, #3b82f6 100%)',
  1: 'linear-gradient(135deg, #c07c2a 0%, #d4943e 100%)',
  2: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
  '-1': 'linear-gradient(135deg, #0f2b6b 0%, #1a6fd4 100%)'
};


export default function ActiveTaskBanner({ task, roleHint }) {
  const navigate = useNavigate();
  const [showChat, setShowChat] = useState(false);
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  if (!task || !me) return null;

  const statusInfo = STATUS_STEPS[task.worker_status] || null;
  const isWorker = roleHint === 'worker' || roleHint !== 'client' && me?.id === task.worker_id;
  const isOwner = roleHint === 'client' || roleHint !== 'worker' && me?.id === task.client_id;
  if (!isWorker && !isOwner) return null;

  const stepIdx = statusInfo?.step ?? -1;
  // Owner (client) = green, Worker = blue
  const gradient = isOwner ?
  'linear-gradient(135deg, #059669 0%, #10b981 100%)' :
  stepIdx === 2 ?
  'linear-gradient(135deg, #059669 0%, #10b981 100%)' :
  'linear-gradient(135deg, #1a6fd4 0%, #3b82f6 100%)';

  const statusText = isOwner ?
  statusInfo?.ownerLabel || 'ממתין לעדכון מהעובד' :
  statusInfo?.label || 'לחץ יצאתי לדרך בדף המשימה';

  return (
    <div dir="rtl" style={{ paddingBottom: 0 }}>
      <div
        style={{ background: gradient, borderRadius: 22, padding: '16px', boxShadow: '0 8px 32px rgba(26,111,212,0.3)', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
        onClick={() => navigate(`/task/${task.id}`)}>

        {/* Live dot + badge */}
        <div style={{ position: 'absolute', top: 14, left: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ position: 'relative', display: 'inline-flex', width: 9, height: 9 }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', animation: 'livePing 1.5s ease-in-out infinite' }} />
            <span style={{ position: 'relative', width: 9, height: 9, borderRadius: '50%', background: 'white', display: 'inline-flex' }} />
          </span>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: 800, letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 4 }} className="text-left">
            {isWorker ?
            <><Hammer size={11} /> משימה שאתה מבצע עכשיו</> :
            <><HardHat size={11} /> משימה שלך — בביצוע ע"י עובד</>}
          </span>
        </div>

        {/* Decorative circle */}
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ height: 20 }} />

        {/* Title + price */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0, paddingLeft: 8 }}>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 17, lineHeight: 1.2, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.75)', fontSize: 12, overflow: 'hidden' }}>
              {isWorker ?
              <><User size={12} style={{ flexShrink: 0 }} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>מעסיק: {task.client_name}</span> {task.client_rating > 0 && <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '1px 6px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>⭐ {task.client_rating.toFixed(1)}</span>}</> :
              <><HardHat size={12} style={{ flexShrink: 0 }} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>עובד: {task.worker_name}</span> {task.worker_rating > 0 && <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '1px 6px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>⭐ {task.worker_rating.toFixed(1)}</span>} {task.worker_verified && <VerifiedBadge size="sm" />}</>}
                {isWorker && task.client_verified && <VerifiedBadge size="sm" />}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 14, padding: '8px 14px', textAlign: 'center', flexShrink: 0 }}>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 22, lineHeight: 1 }}>₪{task.price}</div>
          </div>
        </div>

        {/* Status box */}
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '10px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {stepIdx === 2 ? <CheckCircle size={18} color="white" /> : stepIdx === 1 ? <MapPin size={18} color="white" /> : stepIdx === 0 ? <Navigation size={18} color="white" /> : <Clock size={18} color="white" />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'white', fontWeight: 800, fontSize: 13 }}>{statusText}</div>
            {isWorker && statusInfo?.step != null &&
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1 }}>
                {stepIdx === 0 ? 'עדכן כשתגיע למיקום' : stepIdx === 1 ? 'עדכן כשתסיים' : 'ממתין לאישור הלקוח'}
              </div>
            }
            {isOwner &&
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1 }}>
                {stepIdx === 2 ? 'אשר סיום בדף המשימה לשחרור תשלום' : 'לחץ לצפייה בהתקדמות'}
              </div>
            }
          </div>
          <ChevronLeft size={18} color="rgba(255,255,255,0.7)" />
        </div>

        {/* Progress steps (visual only) */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          {['יצא לדרך', 'הגיע', 'סיים'].map((step, i) =>
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= stepIdx ? 'white' : 'rgba(255,255,255,0.25)', transition: 'background 0.3s' }} />
          )}
        </div>

        {/* Quick action buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={(e) => {e.stopPropagation();setShowChat(true);}}
            style={{ flex: 1, height: 46, borderRadius: 14, background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.35)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <MessageCircle size={16} /> צ'אט
          </button>
          {task.location_name &&
          <button
            onClick={(e) => {
              e.stopPropagation();
              const dst = task.lat && task.lng ? `${task.lat},${task.lng}` : encodeURIComponent(task.location_name);
              const wazeUrl = `https://waze.com/ul?q=${dst}&navigate=yes`;
              const mapsUrl = task.lat && task.lng ?
              `https://maps.google.com/maps?daddr=${task.lat},${task.lng}` :
              `https://maps.google.com/maps?q=${encodeURIComponent(task.location_name)}`;
              const choice = window.confirm('נווט עם Waze?\nלחץ ביטול לפתיחה עם Google Maps');
              window.open(choice ? wazeUrl : mapsUrl, '_blank');
            }}
            style={{ flex: 1, height: 46, borderRadius: 14, background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.35)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Navigation size={16} /> נווט
            </button>
          }
          <button
            onClick={(e) => {e.stopPropagation();navigate(`/task/${task.id}`);}}
            style={{ flex: 1, height: 46, borderRadius: 14, background: 'rgba(255,255,255,0.22)', border: '1.5px solid rgba(255,255,255,0.35)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            פרטים
          </button>
        </div>
      </div>

      {showChat && me && <QuickChatDrawer task={task} me={me} onClose={() => setShowChat(false)} />}

      <style>{`
        @keyframes livePing {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>);

}