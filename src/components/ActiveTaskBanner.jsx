import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, MapPin, Navigation, ChevronLeft, Hammer, User, HardHat, CheckCircle, Clock, Send, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
  1: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
  2: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
  '-1': 'linear-gradient(135deg, #0f2b6b 0%, #1a6fd4 100%)',
};

// Quick chat popup — sends a message without leaving the feed
function QuickChatPopup({ task, me, onClose }) {
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  const send = async () => {
    if (!msg.trim()) return;
    setSending(true);
    await base44.entities.ChatMessage.create({
      task_id: task.id,
      sender_id: me.id,
      sender_name: me.full_name,
      content: msg.trim(),
    });
    setSending(false);
    setMsg('');
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', background: 'white', borderRadius: '24px 24px 0 0', padding: '20px 16px', boxShadow: '0 -8px 40px rgba(0,0,0,0.18)' }} dir="rtl">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#0f2b6b' }}>הודעה מהירה</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#9ca3af" /></button>
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>{task.title}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            autoFocus
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="כתוב הודעה..."
            style={{ flex: 1, height: 44, borderRadius: 14, border: '1.5px solid #dce8f5', padding: '0 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
          />
          <button onClick={send} disabled={!msg.trim() || sending}
            style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: msg.trim() ? 'pointer' : 'not-allowed', opacity: msg.trim() ? 1 : 0.5 }}>
            <Send size={16} color="white" />
          </button>
        </div>
        <button onClick={() => navigate(`/chat/${task.id}`)}
          style={{ width: '100%', height: 38, marginTop: 10, borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1a6fd4', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          פתח צ'אט מלא
        </button>
      </div>
    </div>
  );
}

export default function ActiveTaskBanner({ task }) {
  const navigate = useNavigate();
  const [showChat, setShowChat] = useState(false);
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  if (!task || !me) return null;

  const statusInfo = STATUS_STEPS[task.worker_status] || null;
  const isWorker = me?.id === task.worker_id;
  const isOwner = me?.id === task.client_id;
  if (!isWorker && !isOwner) return null;

  const stepIdx = statusInfo?.step ?? -1;
  const gradient = gradients[stepIdx] || gradients['-1'];

  const statusText = isOwner
    ? (statusInfo?.ownerLabel || 'ממתין לעדכון מהעובד')
    : (statusInfo?.label || 'לחץ יצאתי לדרך בדף המשימה');

  return (
    <div dir="rtl" style={{ padding: '0 16px 12px' }}>
      <div
        style={{ background: gradient, borderRadius: 22, padding: '16px', boxShadow: '0 8px 32px rgba(26,111,212,0.3)', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
        onClick={() => navigate(`/task/${task.id}`)}>

        {/* Live dot + badge */}
        <div style={{ position: 'absolute', top: 14, left: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ position: 'relative', display: 'inline-flex', width: 9, height: 9 }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', animation: 'livePing 1.5s ease-in-out infinite' }} />
            <span style={{ position: 'relative', width: 9, height: 9, borderRadius: '50%', background: 'white', display: 'inline-flex' }} />
          </span>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: 800, letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 4 }}>
            {isWorker
              ? <><Hammer size={11} /> משימה שאתה מבצע עכשיו</>
              : <><HardHat size={11} /> משימה שלך — בביצוע ע"י עובד</>}
          </span>
        </div>

        {/* Decorative circle */}
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ height: 20 }} />

        {/* Title + price */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0, paddingLeft: 8 }}>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 17, lineHeight: 1.2, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
              {isWorker
                ? <><User size={12} /> מעסיק: {task.client_name} {task.client_rating > 0 && <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>⭐ {task.client_rating.toFixed(1)}</span>}</>
                : <><HardHat size={12} /> עובד: {task.worker_name}</>}
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
            {isWorker && statusInfo?.step != null && (
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1 }}>
                {stepIdx === 0 ? 'עדכן כשתגיע למיקום' : stepIdx === 1 ? 'עדכן כשתסיים' : 'ממתין לאישור הלקוח'}
              </div>
            )}
            {isOwner && (
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1 }}>
                {stepIdx === 2 ? 'אשר סיום בדף המשימה לשחרור תשלום' : 'לחץ לצפייה בהתקדמות'}
              </div>
            )}
          </div>
          <ChevronLeft size={18} color="rgba(255,255,255,0.7)" />
        </div>

        {/* Progress steps (visual only) */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          {['יצא לדרך', 'הגיע', 'סיים'].map((step, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= stepIdx ? 'white' : 'rgba(255,255,255,0.25)', transition: 'background 0.3s' }} />
          ))}
        </div>

        {/* Quick action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowChat(true); }}
            style={{ flex: 1, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <MessageCircle size={14} /> צ'אט
          </button>
          {task.location_name && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const dst = task.lat && task.lng ? `${task.lat},${task.lng}` : encodeURIComponent(task.location_name);
                window.open(`https://waze.com/ul?q=${dst}&navigate=yes`, '_blank');
              }}
              style={{ flex: 1, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Navigation size={14} /> נווט
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/task/${task.id}`); }}
            style={{ flex: 1, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            פרטים
          </button>
        </div>
      </div>

      {showChat && me && <QuickChatPopup task={task} me={me} onClose={() => setShowChat(false)} />}

      <style>{`
        @keyframes livePing {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}