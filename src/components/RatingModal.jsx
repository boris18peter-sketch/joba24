import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Star, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RatingModal({ task, me, onClose }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  const isOwner = me?.id === task.client_id;
  const revieweeId = isOwner ? task.worker_id : task.client_id;
  const revieweeName = isOwner ? task.worker_name : task.client_name;
  const role = isOwner ? 'client' : 'worker';

  // Each side confirms independently based on their own status
  const needsPaymentConfirm = task.status === 'COMPLETED' && (isOwner ? !task.client_confirmed : !task.worker_confirmed);
  const canSubmit = rating > 0 && (!needsPaymentConfirm || paymentConfirmed);

  const handleSubmit = async () => {
    if (!rating) { toast.error('בחר דירוג'); return; }
    if (needsPaymentConfirm && !paymentConfirmed) {
      toast.error(isOwner ? 'יש לאשר שהעבודה הושלמה כראוי' : 'יש לאשר שסיימת את הג״ובה');
      return;
    }
    setLoading(true);

    // Save payment confirmation on task
    if (paymentConfirmed) {
      const update = isOwner ? { client_confirmed: true } : { worker_confirmed: true };
      base44.entities.Task.update(task.id, update).catch(() => {});
    }

    // Close immediately for snappy UX — save in background
    toast.success('הביקורת נשמרה! תודה ⭐');
    window.dispatchEvent(new CustomEvent('new_review', {
      detail: { reviewerName: me?.full_name, revieweeName, rating, comment, revieweeId }
    }));
    onClose();

    // Background: create review + update user rating
    try {
      await base44.entities.Review.create({
        task_id: task.id,
        reviewer_id: me.id,
        reviewee_id: revieweeId,
        rating,
        comment,
        role,
      });

      const allReviews = await base44.entities.Review.filter({ reviewee_id: revieweeId });
      const avg = allReviews.length > 0 ? allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length : rating;
      await base44.entities.User.update(revieweeId, { rating: Math.round(avg * 10) / 10, rating_count: allReviews.length });

      // 3.3 Loyalty Reward: if client rated worker 5 stars → grant bonus
      if (isOwner && rating === 5 && task.worker_id) {
        base44.functions.invoke('grantLoyaltyReward', {
          taskId: task.id,
          workerId: task.worker_id,
          rating,
        }).catch(e => console.error('Loyalty reward failed:', e));
      }

      queryClient.invalidateQueries({ queryKey: ['myReviews', revieweeId] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['myReview'] });
    } catch (e) {
      console.error('Review save failed:', e);
    }
  };

  return (
    <div className="mobile-sheet-overlay" onClick={onClose}>
      <div
        dir="rtl"
        onClick={e => e.stopPropagation()}
        className="mobile-sheet"
        style={{ width: '100%', maxWidth: 480, padding: '24px 20px 0' }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: 99, margin: '0 auto 20px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f2b6b', margin: 0 }}>
            {isOwner ? `איך היה עם ${revieweeName}?` : 'דרג את בעל המשימה'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="#999" />
          </button>
        </div>

        <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
          {isOwner ? 'הביקורת שלך עוזרת לעובדים אחרים לקבל החלטות טובות יותר' : 'הביקורת תעזור לבעל המשימה לשפר את החוויה עבור עובדים עתידיים'}
        </p>

        {/* Stars */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
          {[1,2,3,4,5].map(s => (
            <button key={s}
              onClick={() => setRating(s)}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(0)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, transform: (hovered || rating) >= s ? 'scale(1.18)' : 'scale(1)', transition: 'transform 0.1s' }}
            >
              <Star
                size={38}
                color={(hovered || rating) >= s ? '#fbbf24' : '#e2e8f0'}
                fill={(hovered || rating) >= s ? '#fbbf24' : '#e2e8f0'}
              />
            </button>
          ))}
        </div>

        {rating > 0 && (
          <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 14, fontWeight: 700, color: '#1a6fd4' }}>
            {['', '😞 לא טוב', '😐 בינוני', '🙂 סבבה', '😊 טוב מאוד', '🤩 מצוין!'][rating]}
          </div>
        )}

        {/* Payment confirmation */}
        {needsPaymentConfirm && (
          <button
            onClick={() => setPaymentConfirmed(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 16, marginBottom: 16, cursor: 'pointer',
              border: paymentConfirmed ? '2px solid #10b981' : '2px solid #e2e8f0',
              background: paymentConfirmed ? '#f0fdf4' : '#f8fafc',
              textAlign: 'right', transition: 'all 0.2s',
            }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: 8, flexShrink: 0,
              background: paymentConfirmed ? '#10b981' : 'white',
              border: paymentConfirmed ? '2px solid #10b981' : '2px solid #d1d5db',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
            }}>
              {paymentConfirmed && <CheckCircle2 size={15} color="white" strokeWidth={2.5} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: paymentConfirmed ? '#065f46' : '#1e293b' }}>
                {isOwner ? '✅ העבודה בוצעה לשביעות רצוני' : '✅ ביצעתי את העבודה בהצלחה'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {isOwner ? 'אשר שהעבודה הושלמה כנדרש' : 'אשר שסיימת את ביצוע הג\'ובה'}
              </div>
            </div>
          </button>
        )}

        {/* Comment */}
        <textarea
          placeholder="הוסף ביקורת מילולית (לא חובה)..."
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '1px solid #dce8f5', background: '#f4f7fb', fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />

        <button onClick={handleSubmit} disabled={loading || !canSubmit}
          style={{ marginTop: 14, width: '100%', height: 52, borderRadius: 16, background: canSubmit ? 'linear-gradient(135deg, #1a6fd4, #0a52b0)' : '#e2e8f0', color: canSubmit ? 'white' : '#aaa', fontWeight: 900, fontSize: 15, border: 'none', cursor: canSubmit ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          ⭐ שלח ביקורת
        </button>
      </div>
    </div>
  );
}