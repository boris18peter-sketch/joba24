import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const MESSAGES = [
  { icon: '👀', text: 'עובדים צופים במשימה', color: '#1a6fd4' },
  { icon: '📍', text: 'עובדים זמינים בקרבת מקום', color: '#059669' },
  { icon: '⚡', text: 'הג\'ובה פעילה ומחפשת עובד', color: '#d97706' },
  { icon: '🔔', text: 'התראות נשלחו לעובדים', color: '#7c3aed' },
];

export default function LiveActivityPulse({ task, compact }) {
  const queryClient = useQueryClient();
  const [msgIdx, setMsgIdx] = useState(0);
  const intervalRef = useRef(null);

  // Real: application count for this task
  const { data: applications = [] } = useQuery({
    queryKey: ['applications-pulse', task?.id],
    queryFn: () => base44.entities.TaskApplication.filter({ task_id: task.id }),
    enabled: !!task?.id,
    refetchInterval: 12000,
    staleTime: 8000,
  });
  const applicationCount = applications.filter(a => a.status !== 'cancelled').length;

  // Real: online workers count
  const { data: onlineWorkers = [] } = useQuery({
    queryKey: ['online-workers-pulse'],
    queryFn: () => base44.entities.UserPresence.filter({ is_online: true }),
    refetchInterval: 20000,
    staleTime: 15000,
  });
  const onlineCount = onlineWorkers.length;

  // Subscribe to new applications for this task in real time
  useEffect(() => {
    if (!task?.id) return;
    const unsub = base44.entities.TaskApplication.subscribe((event) => {
      if (event.data?.task_id === task.id) {
        queryClient.invalidateQueries({ queryKey: ['applications-pulse', task.id] });
      }
    });
    return () => unsub();
  }, [task?.id]);

  // Rotate status messages
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setMsgIdx(i => (i + 1) % MESSAGES.length);
    }, 4000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const msg = MESSAGES[msgIdx];

  if (compact) return (
    <div dir="rtl" style={{ background: 'linear-gradient(90deg,#f0f9ff,#e0f2fe)', border: '1px solid #bae6fd', borderRadius: 10, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'relative', width: 8, height: 8, flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#22c55e', animation: 'lapPulse 1.8s ease-in-out infinite' }} />
      </div>
      <div key={msgIdx} style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#0c4a6e' }}>{msg.icon} {msg.text}</div>
      <div style={{ fontSize: 10, color: '#0369a1', display: 'flex', gap: 4, flexShrink: 0 }}>
        {onlineCount > 0 && <span>🟢 <strong>{onlineCount}</strong></span>}
        {applicationCount > 0 && <span style={{ color: '#059669' }}>· <strong>{applicationCount}</strong> בקשות</span>}
      </div>
      <style>{`@keyframes lapPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:0.5}}`}</style>
    </div>
  );

  return (
    <div dir="rtl" style={{
      background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
      border: '1px solid #bae6fd',
      borderRadius: 16, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      overflow: 'hidden', position: 'relative',
    }}>
      <style>{`
        @keyframes lapPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.3); opacity: 0.5; } }
        @keyframes lapRing  { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(2.2); opacity: 0; } }
        @keyframes lapSlideIn { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lapShimmer { 0% { transform: translateX(120%); } 100% { transform: translateX(-120%); } }
      `}</style>

      {/* Shimmer */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
        animation: 'lapShimmer 3.2s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Live pulse dot with ring */}
      <div style={{ position: 'relative', width: 14, height: 14, flexShrink: 0 }}>
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%', background: '#22c55e',
          animation: 'lapPulse 1.8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', inset: -3,
          borderRadius: '50%', border: '2px solid #22c55e',
          animation: 'lapRing 1.8s ease-out infinite',
        }} />
      </div>

      {/* Message area */}
      <div key={msgIdx} style={{ flex: 1, animation: 'lapSlideIn 0.3s ease' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0c4a6e', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span>{msg.icon}</span> {msg.text}
        </div>
        <div style={{ fontSize: 11, color: '#0369a1', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {onlineCount > 0 && (
            <span>🟢 <strong>{onlineCount}</strong> עובדים זמינים כרגע</span>
          )}
          {applicationCount > 0 && (
            <span style={{ color: '#059669' }}>· <strong>{applicationCount}</strong> הגישו בקשה</span>
          )}
          {applicationCount === 0 && onlineCount === 0 && (
            <span>הג'ובה זמינה עכשיו · היה הראשון!</span>
          )}
        </div>
      </div>

      {/* Badge */}
      {applicationCount === 0 ? (
        <div style={{
          background: '#1a6fd4', color: 'white',
          fontSize: 10, fontWeight: 800,
          padding: '3px 9px', borderRadius: 20, flexShrink: 0, letterSpacing: 0.3,
        }}>חי</div>
      ) : (
        <div style={{
          background: '#059669', color: 'white',
          fontSize: 10, fontWeight: 800,
          padding: '3px 9px', borderRadius: 20, flexShrink: 0,
        }}>{applicationCount} בקשות</div>
      )}
    </div>
  );
}