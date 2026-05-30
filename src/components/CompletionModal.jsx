import { useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Loader2, X, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function CompletionModal({ task, me, onClose }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const isWorker = me?.id === task.worker_id;
  const revieweeId = isWorker ? task.client_id : task.worker_id;

  const completeMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Task.update(task.id, { status: 'COMPLETED' });
      await base44.entities.Review.create({
        task_id: task.id,
        reviewer_id: me.id,
        reviewee_id: revieweeId,
        rating,
        comment,
        role: isWorker ? 'worker' : 'client',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('🎉 המשימה הושלמה בהצלחה!');
      onClose();
      navigate('/');
    },
  });

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(5,15,40,0.65)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        touchAction: 'none',
      }}
      onClick={onClose}
      onPointerDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
    >
      <div
        dir="rtl"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: '28px 28px 0 0',
          width: '100%', maxWidth: 480,
          padding: '0 20px', paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
          boxShadow: '0 -20px 80px rgba(0,0,0,0.25)',
          animation: 'slideUpModal 0.3s cubic-bezier(0.34,1.4,0.64,1)',
          maxHeight: '92dvh', overflowY: 'auto',
          position: 'relative',
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '14px auto 20px' }} />

        {/* Close */}
        <button onClick={onClose} style={{ position: 'absolute', top: 16, left: 16, width: 36, height: 36, borderRadius: 12, background: '#f3f4f6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
          <X size={18} color="#6b7280" />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f2b6b', margin: 0 }}>
            {isWorker ? '💪 סיימת עבודה מעולה!' : '✅ אשר סיום המשימה'}
          </h2>
        </div>

        {/* Task summary */}
        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 16, padding: 14, marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#15803d', marginBottom: 2, fontWeight: 600 }}>משימה</div>
          <div style={{ fontWeight: 800, color: '#065f46', fontSize: 15 }}>{task.title}</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#059669', marginTop: 4 }}>₪{task.price}</div>
        </div>

        <p style={{ textAlign: 'center', color: '#64748b', fontSize: 13, marginBottom: 16, fontWeight: 500 }}>
          {isWorker ? `איך היה לעבוד עם ${task.client_name || 'הלקוח'}?` : `איך היה לעבוד עם ${task.worker_name || 'הביצועיסט'}?`}
        </p>

        {/* Stars */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          {[1, 2, 3, 4, 5].map(s => (
            <button key={s} onClick={() => setRating(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <Star size={36} color={s <= rating ? '#fbbf24' : '#e2e8f0'} fill={s <= rating ? '#fbbf24' : '#e2e8f0'} style={{ transition: 'all 0.1s' }} />
            </button>
          ))}
        </div>

        <textarea
          placeholder="שתף חוויה (אופציונלי)..."
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={2}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '1.5px solid #dce8f5', background: '#f4f7fb', fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 14 }}
        />

        <button
          onClick={() => completeMutation.mutate()}
          disabled={completeMutation.isPending}
          style={{ width: '100%', height: 52, borderRadius: 16, background: completeMutation.isPending ? '#6ee7b7' : 'linear-gradient(135deg,#059669,#047857)', color: 'white', fontWeight: 900, fontSize: 15, border: 'none', cursor: completeMutation.isPending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(5,150,105,0.3)' }}
        >
          {completeMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <><CheckCircle size={18} />{isWorker ? 'סיימתי את המשימה!' : 'אשר סיום המשימה'}</>}
        </button>
      </div>

      <style>{`@keyframes slideUpModal{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>,
    document.body
  );
}