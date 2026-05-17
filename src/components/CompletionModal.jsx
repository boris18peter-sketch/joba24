import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Loader2, X } from 'lucide-react';
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
      toast.success('🎉 הג\'ובה הושלמה בהצלחה!');
      onClose();
      navigate('/');
    },
  });

  return (
    <div className="mobile-sheet-overlay" onClick={onClose}>
      <div className="mobile-sheet" dir="rtl" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, padding: '24px 20px 0' }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: 99, margin: '0 auto 20px' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f2b6b', margin: 0 }}>
            {isWorker ? '💪 סיימת עבודה מעולה!' : '✅ אשר סיום הג\'ובה'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="#999" />
          </button>
        </div>

        {/* Task summary */}
        <div style={{ background: '#f8fafc', borderRadius: 16, padding: 14, marginBottom: 16, textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>משימה</div>
          <div style={{ fontWeight: 800, color: '#0f2b6b', fontSize: 15 }}>{task.title}</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#0f2b6b', marginTop: 4 }}>₪{task.price}</div>
        </div>

        <p style={{ textAlign: 'center', color: '#888', fontSize: 13, marginBottom: 16, fontWeight: 500 }}>
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
          style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '1px solid #dce8f5', background: '#f4f7fb', fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 14 }}
        />

        <button
          onClick={() => completeMutation.mutate()}
          disabled={completeMutation.isPending}
          style={{ width: '100%', height: 52, borderRadius: 16, background: completeMutation.isPending ? '#93c5fd' : 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: 'white', fontWeight: 900, fontSize: 15, border: 'none', cursor: completeMutation.isPending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(26,111,212,0.3)' }}
        >
          {completeMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : isWorker ? '✅ סיימתי את הג\'ובה!' : '✅ סיימתי הג\'ובה'}
        </button>
      </div>
    </div>
  );
}