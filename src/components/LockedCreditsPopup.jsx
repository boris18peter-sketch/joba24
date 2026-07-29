import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Loader2, Lock, RotateCcw, MapPin, Banknote, ArrowLeft } from 'lucide-react';
import CreditIcon from '@/components/CreditIcon';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * LockedCreditsPopup — shows pending applications (jobas held in commitment).
 * Lets the user see exactly which tasks hold their jobas and cancel if they want.
 */
export default function LockedCreditsPopup({ applications, lockedTotal, onClose }) {
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const { openTaskSheet } = useTaskSheet();
  const [cancellingId, setCancellingId] = useState(null);

  const pendingApps = (applications || []).filter(a => a.status === 'pending');

  const handleCancel = async (app) => {
    if (cancellingId) return;
    setCancellingId(app.id);
    try {
      const res = await base44.functions.invoke('cancelMyApplication', {
        applicationId: app.id,
        taskId: app.task_id,
      });
      if (!res.data?.success) throw new Error(res.data?.error || 'שגיאה');
      queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed'] });
      queryClient.invalidateQueries({ queryKey: ['myLockedJobas'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch {
      // error — keep item
    } finally {
      setCancellingId(null);
    }
  };

  return createPortal(
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(5,15,40,0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        touchAction: 'manipulation',
      }}
    >
      <div
        style={{
          background: 'var(--sheet-bg)',
          borderRadius: '28px 28px 0 0',
          width: '100%', maxWidth: 480,
          maxHeight: '88dvh', overflowY: 'auto',
          boxShadow: '0 -16px 60px rgba(0,0,0,0.25)',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
          animation: 'sheetSlideUp 0.3s cubic-bezier(0.34,1.4,0.64,1)',
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '14px auto 18px' }} />

        {/* Close */}
        <button onClick={onClose} style={{ position: 'absolute', top: 16, left: 16, width: 34, height: 34, borderRadius: 11, background: 'var(--surface-3)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
          <X size={16} color="var(--text-2)" />
        </button>

        {/* Header */}
        <div style={{ padding: '0 20px 16px', borderBottom: '1px solid var(--border-1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Lock size={20} color="white" strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)' }}>ג'ובות בהתחייבות</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 1 }}>
                ג'ובות שהוקפאו עבור בקשות שממתינות לאישור
              </div>
            </div>
          </div>

          {/* Total locked badge */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)',
            borderRadius: 14, padding: '12px 16px',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>סה"כ בהתחייבות</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 20, fontWeight: 900, color: '#b45309' }}>
              {lockedTotal}
              <CreditIcon size={18} />
            </span>
          </div>
        </div>

        {/* Explanation */}
        <div style={{ padding: '14px 20px', fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.65 }}>
          הג'ובות האלה מוקפאות כל עוד הבקשה ממתינה לאישור. אם לא נבחרת או המשימה בוטלה — הן חוזרות אוטומטית ליתרה הזמינה. ניתן לבטל בקשה בכל רגע כדי לשחרר את הג'ובות מיד.
        </div>

        {/* Applications list */}
        <div style={{ padding: '0 16px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pendingApps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)', fontSize: 14 }}>
              <Lock size={36} color="var(--border-2)" style={{ margin: '0 auto 12px', display: 'block' }} />
              אין כרגע ג'ובות בהתחייבות
            </div>
          ) : (
            pendingApps.map((app) => (
              <div key={app.id} style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-1)',
                borderRadius: 16,
                padding: '13px 14px',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                {/* Row 1: title + charged */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div
                    onClick={() => { openTaskSheet(app.task_id); onClose(); }}
                    style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', flex: 1, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {app.task_title || 'משימה'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, fontSize: 13, fontWeight: 900, color: '#b45309' }}>
                    <Lock size={12} color="#b45309" />
                    {app.credits_charged || 0}
                    <CreditIcon size={13} />
                  </div>
                </div>

                {/* Row 2: status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#d97706', display: 'inline-block', animation: 'pulse-app 1.5s infinite' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#b45309' }}>ממתינה לאישור המפרסם</span>
                </div>

                {/* Row 3: actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => { openTaskSheet(app.task_id); onClose(); }}
                    style={{
                      flex: 1, height: 38, borderRadius: 10,
                      background: 'var(--brand-primary-light)', border: '1px solid #bfdbfe',
                      color: 'var(--brand-primary)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}
                  >
                    <ArrowLeft size={13} /> צפה במשימה
                  </button>
                  <button
                    onClick={() => handleCancel(app)}
                    disabled={cancellingId === app.id}
                    style={{
                      flex: 1, height: 38, borderRadius: 10,
                      background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)',
                      color: 'var(--color-danger)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}
                  >
                    {cancellingId === app.id ? <Loader2 size={14} className="animate-spin" /> : <><RotateCcw size={13} /> בטל בקשה</>}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}