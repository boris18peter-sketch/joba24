import { useEffect, useState } from 'react';
import { Navigation } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import TaskTakenConfetti from '@/components/TaskTakenConfetti';
import BottomSheet from '@/components/BottomSheet';

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

  return (
    <>
      <TaskTakenConfetti trigger={true} />
      <BottomSheet onClose={onClose} showCloseBtn={false}>
        {/* Progress bar */}
        <div style={{ height: 4, background: 'var(--surface-3)', position: 'absolute', top: 0, left: 0, right: 0 }}>
          <div style={{
            height: '100%', background: 'linear-gradient(90deg,#059669,#1a6fd4)',
            width: `${progress}%`, transition: 'width 1s linear', borderRadius: 2,
          }} />
        </div>

        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '18px auto 0' }} />

        {/* Green header */}
        <div style={{
          background: 'linear-gradient(135deg,#059669,#047857)',
          padding: '20px 24px', textAlign: 'center', margin: '16px 20px 0',
          borderRadius: 'var(--r-lg)',
        }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>🎉</div>
          <div style={{ color: 'white', fontWeight: 900, fontSize: 22, marginBottom: 4 }}>הבקשה אושרה!</div>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>בעל המשימה בחר בך</div>
        </div>

        {/* Details */}
        <div style={{ padding: '16px 20px' }}>
          <div style={{
            background: 'var(--color-success-bg)', border: `1.5px solid var(--color-success-border)`,
            borderRadius: 'var(--r-md)', padding: 16, marginBottom: 16,
          }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#065f46', marginBottom: 8 }}>{task?.title}</div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-success)' }}>₪{task?.price}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>תשלום</div>
              </div>
              {task?.location_name && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>📍 {task.location_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>מיקום</div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleStartWork}
            disabled={loading}
            style={{
              width: '100%', height: 56, borderRadius: 'var(--r-md)',
              background: loading ? '#6ee7b7' : 'linear-gradient(135deg,#059669,#047857)',
              color: 'white', fontWeight: 900, fontSize: 16, border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 8px 28px rgba(5,150,105,0.4)', marginBottom: 10,
            }}
          >
            {loading ? '⏳ רגע...' : <><Navigation size={18} /> יצא לדרך!</>}
          </button>

          <button
            onClick={onClose}
            style={{
              width: '100%', height: 48, borderRadius: 'var(--r-md)',
              background: 'transparent', border: '1px solid var(--border-1)',
              color: 'var(--text-3)', fontSize: 13, cursor: 'pointer',
            }}
          >
            אראה זאת מאוחר יותר ({timeLeft}s)
          </button>
        </div>
      </BottomSheet>
    </>
  );
}