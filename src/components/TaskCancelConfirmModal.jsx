import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function TaskCancelConfirmModal({ task, isLoading, onConfirm, onClose }) {
  const totalPrice = task.price || 0;
  // If story was promoted, assume 20% was for story promotion (not refunded)
  const storyDeduction = task.is_story ? Math.round(totalPrice * 0.2) : 0;
  const refundAmount = totalPrice - storyDeduction;

  return createPortal(
    <div className="mobile-sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div dir="rtl" className="mobile-sheet" style={{ width: '100%', maxWidth: 480, padding: '20px 20px 0' }}>
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 20px' }} />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#0f1e40', marginBottom: 8 }}>בטל משימה?</div>
          <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
            אתה לא יכול לשחזר את זה — המשימה לא תהיה פעילה עוד
          </div>
        </div>

        {/* Explanation Box */}
        <div style={{ background: '#f8faff', border: '1px solid #bfdbfe', borderRadius: 16, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a6fd4', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={15} strokeWidth={2} /> מה קורה?
          </div>
          
          {/* Refund info */}
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>💰 החזר כספי:</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
              <span>סך הכל:</span>
              <span style={{ fontWeight: 700, color: '#1a6fd4' }}>₪{totalPrice}</span>
            </div>
            {task.is_story && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, color: '#ea580c' }}>
                  <span style={{ fontSize: 12 }}>(-) הוצאות סטורי (שיווק):</span>
                  <span style={{ fontWeight: 700 }}>₪{storyDeduction}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid #fed7aa' }}>
                  <span style={{ fontWeight: 700 }}>סה״כ החזר:</span>
                  <span style={{ fontWeight: 900, color: '#059669', fontSize: 15 }}>₪{refundAmount}</span>
                </div>
              </>
            )}
          </div>

          {/* Info about story */}
          {task.is_story && (
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: 10, marginTop: 12 }}>
              <div style={{ fontSize: 11, color: '#92400e', lineHeight: 1.5 }}>
                <strong>ℹ️ סטורי:</strong> הוצאות הסטורי (פרסום בפיד) לא חוזרות — זה עלות שיווק בפלטפורמה
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              height: 52,
              borderRadius: 16,
              background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
              border: 'none',
              color: 'white',
              fontWeight: 900,
              fontSize: 15,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(26,111,212,0.35)',
            }}
          >
            שמור את המשימה
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 16,
              background: 'white',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontWeight: 700,
              fontSize: 14,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'כן, בטל את המשימה'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}