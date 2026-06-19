import { useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Star, X, CheckCircle2, Loader2 } from 'lucide-react';
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
    if (loading || !canSubmit) return;
    if (!paymentConfirmed) {
      toast.error(isOwner ? 'יש לאשר שהעבודה הושלמה כראוי' : 'יש לאשר שסיימת את הג״ובה');
      return;
    }
    setLoading(true);

    if (comment && comment.trim().length > 3) {
      const modResult = await moderateText(comment);
      if (modResult.flagged) {
        setLoading(false);
        toast.error('הביקורת מכילה תוכן שאינו עומד בכללי הקהילה.');
        return;
      }
    }

    try {
      const res = await base44.functions.invoke('submitReview', {
        taskId: task.id,
        revieweeId,
        rating,
        comment: comment.trim(),
        role,
        isOwner,
        arrivedOnTime: structured.arrivedOnTime,
        professional: structured.professional,
        goodCommunication: structured.goodCommunication,
        fairPricing: structured.fairPricing,
        wouldHireAgain: structured.wouldHireAgain,
      });

      if (!res.data?.success) throw new Error(res.data?.error || 'שגיאה');

      toast.success('הביקורת נשמרה! תודה ⭐');
      window.dispatchEvent(new CustomEvent('new_review', {
        detail: { reviewerName: me?.full_name, revieweeName, rating, comment, revieweeId }
      }));

      // Refresh caches
      queryClient.invalidateQueries({ queryKey: ['myReview'] });
      queryClient.invalidateQueries({ queryKey: ['myReviews', revieweeId] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });

      onClose();
    } catch (e) {
      console.error('Review submit failed:', e);
      toast.error('שגיאה בשמירת הביקורת, נסה שוב');
    } finally {
      setLoading(false);
    }
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
          background: 'var(--sheet-bg)', borderRadius: 'var(--r-2xl) var(--r-2xl) 0 0',
          width: '100%', maxWidth: 480,
          padding: '0 20px', paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
          boxShadow: 'var(--shadow-xl)',
          animation: 'sheetSlideUp 0.3s cubic-bezier(0.32,1.2,0.64,1) both',
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
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'var(--surface-3)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
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
                  style={{ padding: '6px 13px', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 700, border: `1.5px solid ${structured[item.key] ? 'var(--brand-primary)' : 'var(--border-1)'}`, background: structured[item.key] ? 'var(--brand-primary-light)' : 'var(--surface-2)', color: structured[item.key] ? 'var(--brand-primary)' : 'var(--text-2)', cursor: 'pointer', transition: 'all 0.15s' }}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Payment confirm */}
        <button onClick={() => setPaymentConfirmed(v => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 'var(--r-md)', marginBottom: 16, cursor: 'pointer', border: paymentConfirmed ? '2px solid var(--color-success)' : '2px solid var(--border-1)', background: paymentConfirmed ? 'var(--color-success-bg)' : 'var(--surface-3)', textAlign: 'right', transition: 'all 0.2s' }}>
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
          style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--r-md)', border: '1.5px solid var(--border-2)', background: 'var(--input-bg)', color: 'var(--text-1)', fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />

        <button onClick={handleSubmit} disabled={loading || !canSubmit}
          style={{ marginTop: 14, width: '100%', height: 52, borderRadius: 'var(--r-md)', background: canSubmit ? 'linear-gradient(135deg,var(--brand-primary),var(--brand-primary-dark))' : 'var(--surface-3)', color: canSubmit ? 'white' : 'var(--text-3)', fontWeight: 900, fontSize: 15, border: 'none', cursor: canSubmit && !loading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: canSubmit ? 'var(--shadow-md)' : 'none', pointerEvents: loading ? 'none' : 'auto' }}>
          {loading ? <Loader2 size={20} className="animate-spin" /> : '⭐ שלח ביקורת'}
        </button>
      </div>

      <style>{`@keyframes sheetSlideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>,
    document.body
  );
}