import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Navigation } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import TaskTakenConfetti from '@/components/TaskTakenConfetti';

export default function ApprovedPopup({ task, onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);

  // Countdown auto-close
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
    const update = {
      status: 'TAKEN',
      worker_status: 'on_the_way',
      worker_id: me?.id,
      worker_name: me?.full_name,
      on_the_way_at: new Date().toISOString(),
    };

    if (navigator.geolocation) {
      await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => { update.worker_lat = pos.coords.latitude; update.worker_lng = pos.coords.longitude; resolve(); },
          () => resolve(),
          { timeout: 3000 }
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
      <div className="mobile-sheet-overlay" style={{ padding: 16 }} dir="rtl">
        <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />

        <div style={{
          position: 'relative',
          background: 'white',
          borderRadius: 28,
          width: '100%',
          maxWidth: 400,
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
          animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          <style>{`
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(40px) scale(0.95); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

          {/* Progress bar */}
          <div style={{ height: 4, background: '#f1f5f9' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #10b981, #1a6fd4)', width: `${progress}%`, transition: 'width 1s linear', borderRadius: 2 }} />
          </div>

          {/* Top color band */}
          <div style={{ background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', padding: '24px 24px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>🎉</div>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 22, marginBottom: 4 }}>הבקשה אושרה!</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>בעל המשימה בחר בך</div>
          </div>

          {/* Task details */}
          <div style={{ padding: '20px 24px' }}>
            <div style={{ background: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 16, border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#0f2b6b', marginBottom: 8 }}>{task?.title}</div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#1a6fd4' }}>₪{task?.price}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>תשלום</div>
                </div>
                {task?.location_name && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>📍 {task.location_name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>מיקום</div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleStartWork}
              disabled={loading}
              style={{
                width: '100%',
                height: 56,
                borderRadius: 18,
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
                color: 'white',
                fontWeight: 900,
                fontSize: 16,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 8px 28px rgba(26,111,212,0.4)',
                marginBottom: 10,
              }}
            >
              {loading ? '⏳ רגע...' : <><Navigation size={18} /> יצא לדרך!</>}
            </button>

            <button
              onClick={onClose}
              style={{ width: '100%', height: 44, borderRadius: 14, background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}
            >
              אראה זאת מאוחר יותר ({timeLeft}s)
            </button>
          </div>
        </div>
      </div>
    </>
  );
}