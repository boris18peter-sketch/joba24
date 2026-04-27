import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import TaskTakenConfetti from '@/components/TaskTakenConfetti';

export default function ApprovedPopup({ task, onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  // Auto-close after 8 seconds
  useEffect(() => {
    const t = setTimeout(onClose, 8000);
    return () => clearTimeout(t);
  }, []);

  const handleStartWork = async () => {
    // ONLY update worker_status — DO NOT change task.status or worker_id
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        await base44.entities.Task.update(task.id, {
          worker_status: 'on_the_way',
          worker_lat: pos.coords.latitude,
          worker_lng: pos.coords.longitude,
        });
        queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      }, async () => {
        await base44.entities.Task.update(task.id, { worker_status: 'on_the_way' });
        queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      });
    } else {
      await base44.entities.Task.update(task.id, { worker_status: 'on_the_way' });
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
    }
    onClose();
  };

  return (
    <>
      <TaskTakenConfetti trigger={true} />
      <div
        style={{
          position: 'fixed',
          top: 80,
          left: 16,
          right: 16,
          zIndex: 99999,
          animation: 'slideDown 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <style>{`
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
        <div
          style={{
            background: 'linear-gradient(135deg, #0a2a12 0%, #14532d 50%, #166534 100%)',
            borderRadius: 20,
            padding: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            border: '1px solid rgba(74,222,128,0.2)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ background: '#16a34a', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={15} color="white" />
              </div>
              <span style={{ color: '#4ade80', fontWeight: 800, fontSize: 13 }}>✅ הבקשה אושרה!</span>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={13} color="white" />
            </button>
          </div>

          {/* Task info */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
              {task?.title}
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ color: '#4ade80', fontWeight: 800, fontSize: 14 }}>₪{task?.price}</span>
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>המשימה מוכנה לביצוע</span>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleStartWork}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              border: 'none',
              borderRadius: 12,
              padding: '12px',
              color: 'white',
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(22,163,74,0.35)',
            }}
          >
            🚀 יאללה, צא לדרך!
          </button>
        </div>
      </div>
    </>
  );
}