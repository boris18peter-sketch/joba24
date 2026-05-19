import { AlertCircle } from 'lucide-react';

export default function ApprovalRevokedPopup({ task, onClose }) {
  return (
    <div className="mobile-sheet-overlay" dir="rtl">
      <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />
      <div style={{
        position: 'relative',
        background: 'white',
        borderRadius: 28,
        width: '100%',
        maxWidth: 400,
        margin: '0 16px 16px',
        overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
        animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(40px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        {/* Top color band — red */}
        <div style={{ background: '#dc2626', padding: '32px 24px 28px', textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <AlertCircle size={40} color="white" strokeWidth={2} />
          </div>
          <div style={{ color: 'white', fontWeight: 900, fontSize: 22, marginBottom: 6 }}>הבקשה בוטלה</div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>המפרסם ביטל את בקשת העבודה שלך</div>
        </div>

        {/* Task details */}
        <div style={{ padding: '20px 24px 24px' }}>
          {task && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 16, padding: 16, marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#7f1d1d' }}>{task.title}</div>
              {task.location_name && (
                <div style={{ fontSize: 13, color: '#374151', marginTop: 6 }}>📍 {task.location_name}</div>
              )}
            </div>
          )}

          <button
            onClick={onClose}
            style={{
              width: '100%',
              height: 54,
              borderRadius: 18,
              background: '#dc2626',
              color: 'white',
              fontWeight: 900,
              fontSize: 16,
              border: 'none',
              cursor: 'pointer',
              boxShadow: 'none',
            }}
          >
            הבנתי
          </button>
        </div>
      </div>
    </div>
  );
}