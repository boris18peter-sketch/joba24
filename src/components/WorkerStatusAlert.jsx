import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Navigation, X } from 'lucide-react';
import { toast } from 'sonner';

// Shown to workers who took a task but didn't update status within 3 minutes
export default function WorkerStatusAlert({ task, me }) {
  const [show, setShow] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const queryClient = useQueryClient();

  const isMyTask = task?.worker_id === me?.id && task?.status === 'TAKEN' && !task?.worker_status;

  useEffect(() => {
    if (!isMyTask) return;
    const takenAt = new Date(task.updated_date || task.created_date).getTime();
    const elapsed = (Date.now() - takenAt) / 1000;
    const remaining = 180 - elapsed;

    if (remaining <= 0) { releaseTask(); return; }
    const showTimer = setTimeout(() => { setShow(true); setSecondsLeft(60); }, remaining * 1000);
    return () => clearTimeout(showTimer);
  }, [isMyTask]);

  useEffect(() => {
    if (!show) return;
    if (secondsLeft <= 0) { releaseTask(); return; }
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [show, secondsLeft]);

  const releaseTask = async () => {
    await base44.entities.Task.update(task.id, { status: 'OPEN', worker_id: null, worker_name: null });
    queryClient.invalidateQueries({ queryKey: ['task', task.id] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    toast.error('המשימה שוחררה כי לא עדכנת סטטוס');
    setShow(false);
  };

  const markOnTheWay = async () => {
    await base44.entities.Task.update(task.id, {
      worker_status: 'on_the_way',
      on_the_way_at: new Date().toISOString(),
    });
    queryClient.invalidateQueries({ queryKey: ['task', task.id] });
    setShow(false);
    toast.success('עודכן — יצאת לדרך! 🛵');
  };

  if (!show) return null;

  const urgent = secondsLeft <= 20;
  const progress = (secondsLeft / 60) * 100;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }} dir="rtl">
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'relative',
        background: 'white',
        borderRadius: 28,
        width: '100%',
        maxWidth: 400,
        overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
        animation: 'slideUpAlert 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <style>{`@keyframes slideUpAlert { from { opacity:0; transform: translateY(40px) scale(0.95); } to { opacity:1; transform: translateY(0) scale(1); } }`}</style>

        {/* Progress bar */}
        <div style={{ height: 4, background: '#f1f5f9' }}>
          <div style={{ height: '100%', background: urgent ? '#ef4444' : '#f59e0b', width: `${progress}%`, transition: 'width 1s linear', borderRadius: 2 }} />
        </div>

        {/* Header */}
        <div style={{ background: urgent ? 'linear-gradient(135deg, #dc2626, #ef4444)' : 'linear-gradient(135deg, #d97706, #f59e0b)', padding: '20px 20px 18px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{urgent ? '🚨' : '⚠️'}</div>
          <div style={{ color: 'white', fontWeight: 900, fontSize: 20, marginBottom: 4 }}>
            {urgent ? 'המשימה עומדת להשתחרר!' : 'עדכן את הסטטוס שלך'}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
            {task?.title}
          </div>
        </div>

        {/* Countdown */}
        <div style={{ padding: '20px 24px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 52, fontWeight: 900, color: urgent ? '#ef4444' : '#f59e0b', fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginBottom: 6 }}>
            {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>
            {urgent ? 'המשימה תשוחרר לציבור!' : 'שניות עד לשחרור אוטומטי'}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={markOnTheWay}
            style={{ width: '100%', height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', color: 'white', fontWeight: 900, fontSize: 16, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(26,111,212,0.3)' }}
          >
            <Navigation size={18} />
            יצאתי לדרך
          </button>
          <button
            onClick={releaseTask}
            style={{ width: '100%', height: 44, borderRadius: 14, background: 'transparent', border: '1px solid #fca5a5', color: '#ef4444', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            <X size={14} style={{ display: 'inline', marginLeft: 6 }} />
            בטל לקיחת המשימה
          </button>
        </div>
      </div>
    </div>
  );
}