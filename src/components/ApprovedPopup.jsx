import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import TaskTakenConfetti from '@/components/TaskTakenConfetti';

export default function ApprovedPopup({ task, onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(s => {
        if (s <= 1) { clearInterval(t); onClose(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const handleStartWork = async () => {
    setLoading(true);
    const update = { status: 'TAKEN', worker_status: 'on_the_way', worker_id: me?.id, worker_name: me?.full_name, on_the_way_at: new Date().toISOString() };
    if (navigator.geolocation) {
      await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => { update.worker_lat = pos.coords.latitude; update.worker_lng = pos.coords.longitude; resolve(); },
          () => resolve(), { timeout: 3000 }
        );
      });
    }
    await base44.entities.Task.update(task.id, update);
    await queryClient.invalidateQueries({ queryKey: ['task', task.id] });
    await queryClient.refetchQueries({ queryKey: ['task', task.id] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    setLoading(false);
    onClose();
    navigate(`/task/${task.id}`);
  };

  const progress = (timeLeft / 20) * 100;

  return createPortal(
    <>
      <TaskTakenConfetti trigger={true} />
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 999999,
          background: 'rgba(5,15,40,0.65)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          padding: '0 0 0',
          touchAction: 'none',
        }}
        dir="rtl"
      >
        <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />
        <div style={{
          position: 'relative', background: 'white',
          borderRadius: '28px 28px 0 0',
          width: '100%', maxWidth: 480,
          overflow: 'hidden', boxShadow: '0 -20px 80px rgba(0,0,0,0.25)',
          animation: 'slideUpModal 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
        }}>
          {/* Progress bar */}
          <div style={{ height: 4, background: '#f1f5f9' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg,#059669,#1a6fd4)', width: `${progress}%`, transition: 'width 1s linear', borderRadius: 2 }} />
          </div>

          {/* Handle */}
          <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '14px auto 0' }} />

          {/* Green header */}
          <div style={{ background: 'linear-gradient(135deg,#059669,#047857)', padding: '20px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 8 }}>🎉</div>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 22, marginBottom: 4 }}>הבקשה אושרה!</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>בעל המשימה בחר בך</div>
          </div>

          {/* Details */}
          <div style={{ padding: '20px 24px' }}>
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#065f46', marginBottom: 8 }}>{task?.title}</div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#059669' }}>₪{task?.price}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>תשלום</div>
                </div>
                {task?.location_name && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>📍 {task.location_name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>מיקום</div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleStartWork}
              disabled={loading}
              style={{ width: '100%', height: 56, borderRadius: 18, background: loading ? '#6ee7b7' : 'linear-gradient(135deg,#059669,#047857)', color: 'white', fontWeight: 900, fontSize: 16, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 28px rgba(5,150,105,0.4)', marginBottom: 10 }}
            >
              {loading ? '⏳ רגע...' : <><Navigation size={18} /> יצא לדרך!</>}
            </button>

            <button onClick={onClose} style={{ width: '100%', height: 44, borderRadius: 14, background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>
              אראה זאת מאוחר יותר ({timeLeft}s)
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes slideUpModal{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </>,
    document.body
  );
}