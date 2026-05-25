import { X, AlertCircle } from 'lucide-react';

export default function ApprovalRevokedPopup({ task, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100001,
        background: 'rgba(5,15,40,0.55)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(6px)',
        animation: 'fadeInBackdrop 0.2s ease',
        touchAction: 'none',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '28px 28px 0 0',
          width: '100%', maxWidth: 480,
          boxShadow: '0 -20px 80px rgba(0,0,0,0.3)',
          padding: '24px 20px',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
          animation: 'slideUpModal 0.3s cubic-bezier(0.34,1.4,0.64,1)',
          maxHeight: '90dvh', overflowY: 'auto',
          position: 'relative',
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#e5e7eb', margin: '0 auto 24px' }} />

        {/* Close button — top right (left in CSS for RTL) */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, left: 16,
            width: 36, height: 36, borderRadius: 12,
            background: '#f3f4f6', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10,
          }}
        >
          <X size={18} color="#6b7280" />
        </button>

        {/* Icon + Title */}
        <div style={{ textAlign: 'center', marginBottom: 24, marginTop: 8 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: '#fef2f2', border: '2px solid #fecaca',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <AlertCircle size={32} color="#dc2626" strokeWidth={2} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0f1e40', marginBottom: 8 }}>הבקשה בוטלה</div>
          <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7 }}>
            המפרסם ביטל את בקשת העבודה שלך
          </div>
        </div>

        {/* Task details */}
        {task && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 14, padding: '14px 16px', marginBottom: 24,
          }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#7f1d1d', marginBottom: 4 }}>{task.title}</div>
            {task.location_name && (
              <div style={{ fontSize: 13, color: '#374151' }}>📍 {task.location_name}</div>
            )}
          </div>
        )}

        {/* Info */}
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: 12, padding: '12px 14px', marginBottom: 24,
        }}>
          <div style={{ fontSize: 12, color: '#1a6fd4', lineHeight: 1.6 }}>
            תוכל להגיש בקשות למשימות אחרות בפיד
          </div>
        </div>

        {/* Button */}
        <button
          onClick={onClose}
          className="btn-tap"
          style={{
            width: '100%', height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
            border: 'none', color: 'white', fontWeight: 900, fontSize: 16,
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(26,111,212,0.35)',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          הבנתי
        </button>
      </div>

      <style>{`
        @keyframes fadeInBackdrop { from{opacity:0} to{opacity:1} }
        @keyframes slideUpModal { from{transform:translateY(60px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>
    </div>
  );
}