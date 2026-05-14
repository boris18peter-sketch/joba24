import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Star, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

export default function RatingModal({ task, me, onClose }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const isOwner = me?.id === task.client_id;
  const revieweeId = isOwner ? task.worker_id : task.client_id;
  const revieweeName = isOwner ? task.worker_name : task.client_name;
  const role = isOwner ? 'client' : 'worker';

  const handleSubmit = async () => {
    if (!rating) { toast.error('בחר דירוג'); return; }
    setLoading(true);

    // Save review
    await base44.entities.Review.create({
      task_id: task.id,
      reviewer_id: me.id,
      reviewee_id: revieweeId,
      rating,
      comment,
      role,
    });

    // Update the reviewee's average rating on their User record
    const allReviews = await base44.entities.Review.filter({ reviewee_id: revieweeId });
    const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    // Update via User entity (works for any user, not just current user)
    await base44.entities.User.update(revieweeId, { rating: avg, rating_count: allReviews.length });

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['myReviews', revieweeId] });
    queryClient.invalidateQueries({ queryKey: ['me'] });
    queryClient.invalidateQueries({ queryKey: ['myReview'] });

    setLoading(false);
    toast.success('הביקורת נשמרה! תודה');
    // Dispatch custom event for notification
    window.dispatchEvent(new CustomEvent('new_review', {
      detail: { reviewerName: me?.full_name, revieweeName, rating, comment, revieweeId }
    }));
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
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

        {/* Comment */}
        <textarea
          placeholder="הוסף ביקורת מילולית (לא חובה)..."
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '1px solid #dce8f5', background: '#f4f7fb', fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />

        <button onClick={handleSubmit} disabled={loading || !rating}
          style={{ marginTop: 14, width: '100%', height: 52, borderRadius: 16, background: rating ? 'linear-gradient(135deg, #1a6fd4, #0a52b0)' : '#e2e8f0', color: rating ? 'white' : '#aaa', fontWeight: 900, fontSize: 15, border: 'none', cursor: rating ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : '⭐ שלח ביקורת'}
        </button>
      </div>
    </div>
  );
}