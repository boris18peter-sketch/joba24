import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function CancelSuccessPopup({ task, onClose }) {
  const navigate = useNavigate();

  // Auto-close after 4 seconds and navigate
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
      navigate('/');
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose, navigate]);

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
          padding: '24px 20px 16px',
          animation: 'slideUpModal 0.3s cubic-bezier(0.34,1.4,0.64,1)',
          maxHeight: '90dvh',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#e5e7eb', margin: '0 auto 24px' }} />

        {/* Close button */}
        <button
          onClick={onClose}
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
            cursor: 'pointer',
            zIndex: 10,
            transition: 'background 0.2s',
          }}
        >
          <X size={18} color="#6b7280" />
        </button>

        {/* Icon + Title + Description */}
        <div style={{ textAlign: 'center', marginBottom: 28, marginTop: 8 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            animation: 'successPop 0.4s cubic-bezier(0.34,1.6,0.64,1)',
          }}>
            <span style={{ fontSize: 32 }}>✅</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0f1e40', marginBottom: 10 }}>המשימה בוטלה</div>
          <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7, marginBottom: 12 }}>
            הכסף בסך <strong style={{ color: '#1f2937', fontSize: 16 }}>₪{task.price}</strong> יוחזר לחשבונך
          </div>
          <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
            תוך 1-3 ימי עסקים
          </div>
        </div>

        {/* Info box - Success */}
        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>✓</span> המשימה בוטלה בהצלחה
          </div>
          <div style={{ fontSize: 12, color: '#15803d' }}>הכסף חוזר לחשבון הבנק שלך</div>
        </div>

        {/* Info box - Explanation */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 14px', marginBottom: 28 }}>
          <div style={{ fontSize: 12, color: '#1a6fd4', lineHeight: 1.6 }}>
            <strong>איך זה עובד:</strong><br/>
            הכסף שלך לא יצא מהחשבון שלך — הוא תמיד היה מוחזק בנאמנות על ידי Joba24
          </div>
        </div>

        {/* Button */}
        <button
          onClick={onClose}
          className="btn-tap"
          style={{
            width: '100%',
            height: 52,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
            border: 'none',
            color: 'white',
            fontWeight: 900,
            fontSize: 16,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: '0 4px 16px rgba(26, 111, 212, 0.35)',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          חזור לפיד
        </button>

        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#999' }}>
          מחזיר בעוד שניות...
        </div>
      </div>

      <style>{`
        @keyframes fadeInBackdrop { from{opacity:0} to{opacity:1} }
        @keyframes slideUpModal { from{transform:translateY(50px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes successPop { 0%{transform:scale(0.5);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
      `}</style>
    </div>
  );
}