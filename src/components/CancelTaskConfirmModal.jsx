import { Loader2, X, Trash2 } from 'lucide-react';

export default function CancelTaskConfirmModal({ task, onConfirm, onClose, isLoading }) {
  const handleConfirm = async (e) => {
    e.preventDefault();
    await onConfirm();
  };

  return (
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
          background: 'white',
          borderRadius: '28px 28px 0 0',
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 -20px 80px rgba(0,0,0,0.3)',
          padding: '24px 20px 40px',
          animation: 'slideUpModal 0.3s cubic-bezier(0.34,1.4,0.64,1)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#e5e7eb', margin: '0 auto 24px' }} />

        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            width: 36,
            height: 36,
            borderRadius: 12,
            background: '#f3f4f6',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.5 : 1,
            zIndex: 10,
            transition: 'background 0.2s',
          }}
        >
          <X size={18} color="#6b7280" />
        </button>

        {/* Icon + Title + Description */}
        <div style={{ textAlign: 'center', marginBottom: 28, marginTop: 8 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Trash2 size={32} color="#dc2626" strokeWidth={1.5} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0f1e40', marginBottom: 10 }}>בטל משימה?</div>
          <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7, marginBottom: 12 }}>
            אתה מבטל את המשימה <strong style={{ color: '#1f2937' }}>"{task.title}"</strong>
          </div>
          <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
            הכסף בסך <strong style={{ color: '#0f1e40', fontSize: 15 }}>₪{task.price}</strong> יוחזר לחשבונך תוך 1-3 ימי עסקים
          </div>
        </div>

        {/* Info box - Safety */}
        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 14, padding: '14px 16px', marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>✓</span> פעולה בטוחה
          </div>
          <div style={{ fontSize: 12, color: '#15803d' }}>הכסף לא יצא מחשבונך — הוא היה מוחזק בנאמנות מלחלוחין</div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            style={{
              width: '100%',
              height: 54,
              borderRadius: 14,
              background: isLoading ? '#fca5a5' : 'linear-gradient(135deg, #ef4444, #dc2626)',
              border: 'none',
              color: 'white',
              fontWeight: 900,
              fontSize: 16,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              boxShadow: isLoading ? 'none' : '0 4px 16px rgba(220, 38, 38, 0.4)',
              transition: 'all 0.2s',
              opacity: isLoading ? 0.8 : 1,
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>מבטל...</span>
              </>
            ) : (
              <>
                <Trash2 size={18} strokeWidth={2} />
                כן, בטל משימה
              </>
            )}
          </button>

          {/* Cancel button */}
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              width: '100%',
              height: 50,
              borderRadius: 14,
              background: 'white',
              border: '1.5px solid #d1d5db',
              color: '#374151',
              fontWeight: 700,
              fontSize: 15,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            חזור
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeInBackdrop { from{opacity:0} to{opacity:1} }
        @keyframes slideUpModal { from{transform:translateY(60px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>
    </div>
  );
}