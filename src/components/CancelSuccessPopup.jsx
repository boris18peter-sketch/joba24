import { createPortal } from 'react-dom';
import { X, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function CancelSuccessPopup({ task, onClose }) {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => { onClose(); navigate('/'); }, 4000);
    return () => clearTimeout(timer);
  }, [onClose, navigate]);

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(5,15,40,0.65)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        touchAction: 'none',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div
        dir="rtl"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: '28px 28px 0 0',
          width: '100%', maxWidth: 480,
          padding: '0 20px', paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
          boxShadow: '0 -20px 80px rgba(0,0,0,0.25)',
          animation: 'slideUpModal 0.3s cubic-bezier(0.34,1.4,0.64,1)',
          maxHeight: '90dvh', overflowY: 'auto',
          position: 'relative',
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '14px auto 20px' }} />

        {/* Close */}
        <button onClick={onClose} style={{ position: 'absolute', top: 16, left: 16, width: 36, height: 36, borderRadius: 12, background: '#f3f4f6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
          <X size={18} color="#6b7280" />
        </button>

        {/* Icon + Title */}
        <div style={{ textAlign: 'center', marginBottom: 24, marginTop: 8 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#dcfce7', border: '2px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', animation: 'successPop 0.4s cubic-bezier(0.34,1.6,0.64,1)' }}>
            <CheckCircle size={36} color="#059669" strokeWidth={2} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0f1e40', marginBottom: 8 }}>המשימה בוטלה</div>
          <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7 }}>המשימה בוטלה בהצלחה</div>
        </div>

        {/* Info - success */}
        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 14, padding: '14px 16px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#059669', marginBottom: 4 }}>✓ המשימה בוטלה בהצלחה</div>
          <div style={{ fontSize: 12, color: '#15803d' }}>תוכל לחפש משימות נוספות בפיד</div>
        </div>

        {/* Info - blue */}
        <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 14, padding: '12px 16px', marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: '#1a6fd4', lineHeight: 1.6, fontWeight: 600 }}>
            <strong>בחזרה לחיפוש:</strong><br />
            גלה עוד משימות מעניינות בפיד ובחר את הבאה שלך
          </div>
        </div>

        <button onClick={onClose} style={{ width: '100%', height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', border: 'none', color: 'white', fontWeight: 900, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 16px rgba(26,111,212,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          חזור לפיד
        </button>

        <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: '#94a3b8' }}>מחזיר בעוד שניות...</div>
      </div>

      <style>{`
        @keyframes slideUpModal{from{transform:translateY(50px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes successPop{0%{transform:scale(0.5);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
      `}</style>
    </div>,
    document.body
  );
}