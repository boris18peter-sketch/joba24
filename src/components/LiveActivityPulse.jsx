import { useState, useEffect, useRef } from 'react';
import { Eye, MapPin, Zap, Bell } from 'lucide-react';

const MESSAGES = [
  { icon: '👀', text: 'עובדים צופים במשימה', color: '#1a6fd4' },
  { icon: '📍', text: 'עובדים בקרבת מקום', color: '#059669' },
  { icon: '⚡', text: 'הג\'ובה פעילה ומחפשת עובד', color: '#d97706' },
  { icon: '🔔', text: 'התראות נשלחו לעובדים', color: '#7c3aed' },
];

export default function LiveActivityPulse({ task, applicationCount = 0 }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [viewCount, setViewCount] = useState(() => Math.max(applicationCount * 4, Math.floor(Math.random() * 18) + 6));
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Rotate messages every 4s
    intervalRef.current = setInterval(() => {
      setMsgIdx(i => (i + 1) % MESSAGES.length);
    }, 4000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Slowly increment view count
  useEffect(() => {
    const t = setInterval(() => {
      if (Math.random() > 0.65) {
        setViewCount(v => v + 1);
      }
    }, 8000);
    return () => clearInterval(t);
  }, []);

  const msg = MESSAGES[msgIdx];

  if (!visible) return null;

  return (
    <div dir="rtl" style={{
      background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
      border: '1px solid #bae6fd',
      borderRadius: 16, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      overflow: 'hidden', position: 'relative',
    }}>
      <style>{`
        @keyframes lapPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.25); opacity: 0.6; } }
        @keyframes lapSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lapShimmer { from { transform: translateX(120%); } to { transform: translateX(-120%); } }
      `}</style>

      {/* Shimmer line */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
        animation: 'lapShimmer 3s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Live pulse dot */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: '#22c55e',
          boxShadow: '0 0 0 0 rgba(34,197,94,0.4)',
          animation: 'lapPulse 1.8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', inset: -4,
          borderRadius: '50%',
          border: '2px solid rgba(34,197,94,0.25)',
          animation: 'lapPulse 1.8s ease-in-out infinite',
          animationDelay: '0.4s',
        }} />
      </div>

      {/* Rotating message */}
      <div key={msgIdx} style={{ flex: 1, animation: 'lapSlideIn 0.35s ease' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0c4a6e', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{msg.icon}</span> {msg.text}
        </div>
        <div style={{ fontSize: 11, color: '#0369a1', marginTop: 1 }}>
          {viewCount} אנשים צפו בג'ובה זו
        </div>
      </div>

      {/* Urgency badge */}
      {applicationCount === 0 && (
        <div style={{
          background: '#1a6fd4', color: 'white',
          fontSize: 10, fontWeight: 800,
          padding: '3px 8px', borderRadius: 20,
          flexShrink: 0,
          letterSpacing: 0.3,
        }}>
          חי
        </div>
      )}
      {applicationCount > 0 && (
        <div style={{
          background: '#059669', color: 'white',
          fontSize: 10, fontWeight: 800,
          padding: '3px 8px', borderRadius: 20,
          flexShrink: 0,
        }}>
          {applicationCount} בקשות
        </div>
      )}
    </div>
  );
}