/**
 * SignalModal — "📡 איתות נוסף" boost modal
 * Costs 5 credits. Shown when owner taps "שלח איתות נוסף"
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import CreditIcon from '@/components/CreditIcon';

const SIGNAL_COST = 5;

export default function SignalModal({ task, onClose }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const queryClient = useQueryClient();

  const handleSignal = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const me = await base44.auth.me();
      const credits = me?.worker_credits ?? 0;

      if (credits < SIGNAL_COST) {
        toast.error(`אין מספיק קרדיטים. נדרש: ${SIGNAL_COST}`);
        setLoading(false);
        return;
      }

      // Deduct credits
      await base44.auth.updateMe({ worker_credits: credits - SIGNAL_COST });

      // Add urgency + bump views to trigger re-distribution
      await base44.entities.Task.update(task.id, {
        urgency_tag: task.urgency_tag === 'immediate' ? 'immediate' : 'few_hours',
      });

      // Log credit transaction
      await base44.entities.CreditTransaction.create({
        user_id: me.id,
        amount: -SIGNAL_COST,
        type: 'Application_Fee',
        task_id: task.id,
        task_title: task.title,
        balance_after: credits - SIGNAL_COST,
        note: 'איתות נוסף למשימה',
      });

      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks', me.id] });

      setDone(true);
      setTimeout(() => onClose(), 2200);
    } catch {
      toast.error('שגיאה, נסה שוב');
      setLoading(false);
    }
  };

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(5,15,40,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        dir="rtl"
        style={{ background: 'var(--sheet-bg)', borderRadius: '28px 28px 0 0', width: '100%', maxWidth: 480, padding: '16px 20px', paddingBottom: 'max(32px, env(safe-area-inset-bottom))', boxShadow: '0 -16px 60px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '0 auto 16px' }} />

        {/* Close */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 4 }}>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-3)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} color="#9ca3af" />
          </button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>📡</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)', marginBottom: 8 }}>האיתות נשלח!</div>
            <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>המשימה קודמה בפיד לשעתיים<br />ונשלחו התראות לעובדים מתאימים</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>📡</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)', marginBottom: 6 }}>שלח איתות נוסף</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                הקפץ את המשימה לראש הפיד, שלח Push לעובדים מתאימים<br />והוסף תג <strong>⚡ איתות חדש</strong> לשעתיים
              </div>
            </div>

            {/* What you get */}
            <div style={{ background: 'var(--surface-3)', borderRadius: 16, padding: '14px 16px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: '🔔', text: 'Push מיידי לעובדים מתאימים' },
                { icon: '⬆️', text: 'עדיפות בראש הפיד' },
                { icon: '⚡', text: 'תג "איתות חדש" לשעתיים' },
                { icon: '📊', text: 'הגברת חשיפה' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-1)', fontWeight: 600 }}>
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  {item.text}
                </div>
              ))}
            </div>

            {/* Cost */}
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#92400e', fontWeight: 700 }}>עלות האיתות</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 16, fontWeight: 900, color: '#b45309' }}>
                {SIGNAL_COST} <CreditIcon size={16} />
              </span>
            </div>

            {/* CTA */}
            <button
              onClick={handleSignal}
              disabled={loading}
              style={{ width: '100%', height: 54, borderRadius: 16, background: loading ? '#93b4d8' : 'linear-gradient(135deg,#0f2b6b,#1a6fd4)', border: 'none', color: 'white', fontWeight: 900, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 6px 20px rgba(26,111,212,0.35)', WebkitTapHighlightColor: 'transparent' }}
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : '📡 שלח איתות נוסף'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', marginTop: 10 }}>
              זמין רק כאשר אין עובד פעיל ועברו 3 שעות
            </p>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}