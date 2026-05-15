import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';

export default function CancelTaskConfirmModal({ task, onConfirm, onClose, isLoading }) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(5,15,40,0.55)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        backdropFilter: 'blur(6px)',
        animation: 'fadeInBackdrop 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        dir="rtl"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fafbff',
          borderRadius: '28px 28px 0 0',
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 -16px 60px rgba(0,0,0,0.2)',
          padding: '20px 20px 40px',
          animation: 'slideUpModal 0.28s cubic-bezier(0.34,1.4,0.64,1)',
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 20px' }} />

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            width: 34,
            height: 34,
            borderRadius: 11,
            background: '#f0f2f7',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <X size={16} color="#9ca3af" />
        </button>

        {/* Icon + Title */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#0f1e40', marginBottom: 8 }}>בטל משימה?</div>
          <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
            בביטול המשימה, הכסף בסך ₪<strong>{task.price}</strong> יוחזר לחשבונך תוך 1-3 ימי עסקים
          </div>
        </div>

        {/* Info box */}
        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 16, padding: '14px 16px', marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 4 }}>✓ פעולה בטוחה וקנינה</div>
          <div style={{ fontSize: 12, color: '#16a34a' }}>הכסף לא יצא מחשבונך — הוא תמיד היה מוחזק בנאמנות</div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            style={{
              width: '100%',
              height: 52,
              borderRadius: 16,
              background: isLoading ? '#fca5a5' : 'linear-gradient(135deg, #dc2626, #b91c1c)',
              border: 'none',
              color: 'white',
              fontWeight: 900,
              fontSize: 15,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: isLoading ? 'none' : '0 4px 16px rgba(220, 38, 38, 0.35)',
            }}
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'כן, בטל משימה'}
          </button>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 16,
              background: 'white',
              border: '1px solid #dce8f5',
              color: '#64748b',
              fontWeight: 700,
              fontSize: 14,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            ביטול
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeInBackdrop { from{opacity:0} to{opacity:1} }
        @keyframes slideUpModal { from{transform:translateY(60px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>
    </div>,
    document.body
  );
}