import { useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Star, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { moderateText } from '@/hooks/useModeration';

export default function RatingModal({ task, me, onClose }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [structured, setStructured] = useState({
    arrivedOnTime: null, professional: null,
    goodCommunication: null, fairPricing: null, wouldHireAgain: null,
  });

  const toggleStructured = (key) => setStructured(s => ({ ...s, [key]: s[key] === true ? null : true }));

  const isOwner = me?.id === task.client_id;
  const revieweeId = isOwner ? task.worker_id : task.client_id;
  const revieweeName = isOwner ? task.worker_name : task.client_name;
  const role = isOwner ? 'client' : 'worker';
  const canSubmit = rating > 0 && paymentConfirmed;

  const handleSubmit = async () => {
    if (loading) return; // prevent double submit
    if (!rating) { toast.error('בחר דירוג'); return; }
    if (!paymentConfirmed) {
      toast.error(isOwner ? 'יש לאשר שהעבודה הושלמה כראוי' : 'יש לאשר שסיימת את הג״ובה');
      return;
    }
    setLoading(true);
    if (comment && comment.trim().length > 3) {
      const modResult = await moderateText(comment);
      if (modResult.flagged) { setLoading(false); toast.error('הביקורת מכילה תוכן שאינו עומד בכללי הקהילה.'); return; }
    }
    if (paymentConfirmed) {
      if (isOwner) {
        // completeTask: marks COMPLETED + triggers releasePayment internally
        base44.functions.invoke('completeTask', { taskId: task.id }).catch(() => {});
      } else {
        base44.entities.Task.update(task.id, { worker_confirmed: true }).catch(() => {});
      }
    }
    toast.success('הביקורת נשמרה! תודה ⭐');
    window.dispatchEvent(new CustomEvent('new_review', { detail: { reviewerName: me?.full_name, revieweeName, rating, comment, revieweeId } }));
    onClose();
    try {
      await base44.entities.Review.create({ task_id: task.id, reviewer_id: me.id, reviewee_id: revieweeId, rating, comment, role, arrived_on_time: structured.arrivedOnTime, professional: structured.professional, good_communication: structured.goodCommunication, fair_pricing: structured.fairPricing, would_hire_again: structured.wouldHireAgain });
      const allReviews = await base44.entities.Review.filter({ reviewee_id: revieweeId });
      const avg = allReviews.length > 0 ? allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length : rating;
      const clientRevs = allReviews.filter(r => r.role === 'client');
      const withOnTime = clientRevs.filter(r => r.arrived_on_time !== null && r.arrived_on_time !== undefined);
      const onTimeRate = withOnTime.length >= 2 ? Math.round((withOnTime.filter(r => r.arrived_on_time === true).length / withOnTime.length) * 100) : null;
      const repeatHires = clientRevs.filter(r => r.would_hire_again === true).length;
      const userUpdate = { rating: Math.round(avg * 10) / 10, rating_count: allReviews.length };
      if (onTimeRate !== null) userUpdate.on_time_rate = onTimeRate;
      if (isOwner) userUpdate.repeat_hires = repeatHires;
      await base44.entities.User.update(revieweeId, userUpdate);
      if (isOwner && rating === 5 && task.worker_id) {
        base44.functions.invoke('grantLoyaltyReward', { taskId: task.id, workerId: task.worker_id, rating, taskTitle: task.title }).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ['myReviews', revieweeId] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['myReview'] });
    } catch (e) { console.error('Review save failed:', e); }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(5,15,40,0.65)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        touchAction: 'none',
      }}
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
          animation: 'sheetSlideUp 0.32s cubic-bezier(0.34,1.4,0.64,1) both',
          maxHeight: '92dvh', overflowY: 'auto',
          position: 'relative',
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '14px auto 20px' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f2b6b', margin: 0 }}>
            {isOwner ? `איך היה עם ${revieweeName}?` : 'דרג את בעל המשימה'}
          </h2>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 12, background: '#f3f4f6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={18} color="#6b7280" />
          </button>
        </div>

        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
          {isOwner ? 'הביקורת שלך עוזרת לעובדים אחרים לקבל החלטות טובות יותר' : 'הביקורת תעזור לבעל המשימה לשפר את החוויה עבור עובדים עתידיים'}
        </p>

        {/* Stars */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          {[1,2,3,4,5].map(s => (
            <button key={s} onClick={() => setRating(s)} onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, transform: (hovered || rating) >= s ? 'scale(1.18)' : 'scale(1)', transition: 'transform 0.1s' }}>
              <Star size={38} color={(hovered || rating) >= s ? '#fbbf24' : '#e2e8f0'} fill={(hovered || rating) >= s ? '#fbbf24' : '#e2e8f0'} />
            </button>
          ))}
        </div>

        {rating > 0 && (
          <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 14, fontWeight: 700, color: '#1a6fd4' }}>
            {['', '😞 לא טוב', '😐 בינוני', '🙂 סבבה', '😊 טוב מאוד', '🤩 מצוין!'][rating]}
          </div>
        )}

        {/* Chips */}
        {rating > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 10 }}>
              {isOwner ? 'מה היה טוב? (לא חובה)' : 'איך היה הלקוח?'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {(isOwner ? [
                { key: 'arrivedOnTime', label: '⏱️ הגיע בזמן' },
                { key: 'professional', label: '💼 מקצועי' },
                { key: 'goodCommunication', label: '💬 תקשורת טובה' },
                { key: 'fairPricing', label: '💰 מחיר הוגן' },
                { key: 'wouldHireAgain', label: '🔁 אשכור שוב' },
              ] : [
                { key: 'arrivedOnTime', label: '⏱️ תיאם בזמן' },
                { key: 'goodCommunication', label: '💬 תקשורת ברורה' },
                { key: 'fairPricing', label: '💰 שילם כמוסכם' },
                { key: 'wouldHireAgain', label: '🔁 אעבוד שוב' },
              ]).map(item => (
                <button key={item.key} onClick={() => toggleStructured(item.key)}
                  style={{ padding: '6px 13px', borderRadius: 99, fontSize: 12, fontWeight: 700, border: `1.5px solid ${structured[item.key] ? '#1a6fd4' : '#e2e8f0'}`, background: structured[item.key] ? '#eff6ff' : 'white', color: structured[item.key] ? '#1a6fd4' : '#64748b', cursor: 'pointer', transition: 'all 0.15s' }}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Payment confirm */}
        <button onClick={() => setPaymentConfirmed(v => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 16, marginBottom: 16, cursor: 'pointer', border: paymentConfirmed ? '2px solid #059669' : '2px solid #e2e8f0', background: paymentConfirmed ? '#f0fdf4' : '#f8fafc', textAlign: 'right', transition: 'all 0.2s' }}>
          <div style={{ width: 24, height: 24, borderRadius: 8, flexShrink: 0, background: paymentConfirmed ? '#059669' : 'white', border: paymentConfirmed ? '2px solid #059669' : '2px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
            {paymentConfirmed && <CheckCircle2 size={15} color="white" strokeWidth={2.5} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: paymentConfirmed ? '#065f46' : '#1e293b' }}>
              {isOwner ? '✅ העבודה בוצעה לשביעות רצוני' : '✅ ביצעתי את העבודה בהצלחה'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {isOwner ? 'אשר שהתשלום יבוצע כמוסכם ושני הצדדים הסתדרו' : 'אשר שסיימת את הג\'ובה והתשלום יתקבל כמוסכם'}
            </div>
          </div>
        </button>

        <textarea
          placeholder="הוסף ביקורת מילולית (לא חובה)..."
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '1.5px solid #dce8f5', background: '#f4f7fb', fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />

        <button onClick={handleSubmit} disabled={loading || !canSubmit}
          style={{ marginTop: 14, width: '100%', height: 52, borderRadius: 16, background: canSubmit ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : '#e2e8f0', color: canSubmit ? 'white' : '#aaa', fontWeight: 900, fontSize: 15, border: 'none', cursor: canSubmit && !loading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: canSubmit ? '0 4px 16px rgba(26,111,212,0.3)' : 'none', pointerEvents: loading ? 'none' : 'auto' }}>
          ⭐ שלח ביקורת
        </button>
      </div>

      <style>{`@keyframes sheetSlideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>,
    document.body
  );
}