import { createPortal } from 'react-dom';
import { Loader2, X, Trash2 } from 'lucide-react';

export default function CancelTaskConfirmModal({ task, onConfirm, onClose, isLoading }) {
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
          background: 'var(--sheet-bg)', borderRadius: '28px 28px 0 0',
          width: '100%', maxWidth: 480,
          padding: '0 20px', paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
          boxShadow: '0 -20px 80px rgba(0,0,0,0.25)',
          animation: 'sheetSlideUp 0.32s cubic-bezier(0.34,1.4,0.64,1) both',
          maxHeight: '90dvh', overflowY: 'auto',
          position: 'relative',
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '14px auto 20px' }} />

        {/* Close */}
        <button onClick={onClose} disabled={isLoading} style={{ position: 'absolute', top: 16, left: 16, width: 36, height: 36, borderRadius: 12, background: 'var(--surface-3)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.5 : 1, zIndex: 10 }}>
          <X size={18} color="var(--text-2)" />
        </button>

        {/* Icon + Title */}
        <div style={{ textAlign: 'center', marginBottom: 24, marginTop: 8 }}>
          <div style={{ width: 68, height: 68, borderRadius: 22, background: 'var(--danger-bg)', border: '2px solid var(--danger-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Trash2 size={32} color="#dc2626" strokeWidth={1.8} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)', marginBottom: 10 }}>בטל משימה?</div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>
            אתה מבטל את המשימה <strong style={{ color: 'var(--text-1)' }}>"{task.title}"</strong>
          </div>
        </div>

        {/* Warning box */}
        <div style={{ background: 'var(--danger-bg)', border: '1.5px solid var(--danger-border)', borderRadius: 14, padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#dc2626', lineHeight: 1.6, fontWeight: 600 }}>
            ⚠️ לא ניתן לבטל פעולה זו לאחר האישור
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={async (e) => { e.preventDefault(); await onConfirm(); }}
            disabled={isLoading}
            style={{ width: '100%', height: 54, borderRadius: 16, background: isLoading ? '#fca5a5' : 'linear-gradient(135deg,#ef4444,#dc2626)', border: 'none', color: 'white', fontWeight: 900, fontSize: 16, cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: isLoading ? 'none' : '0 4px 16px rgba(220,38,38,0.35)', opacity: isLoading ? 0.8 : 1 }}
          >
            {isLoading ? <><Loader2 size={20} className="animate-spin" /><span>מבטל...</span></> : <><Trash2 size={18} strokeWidth={2} />כן, בטל משימה</>}
          </button>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{ width: '100%', height: 50, borderRadius: 14, background: 'var(--surface-2)', border: '1.5px solid var(--border-1)', color: 'var(--text-1)', fontWeight: 700, fontSize: 15, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.5 : 1 }}
          >
            חזור
          </button>
        </div>
      </div>

      <style>{`@keyframes sheetSlideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>,
    document.body
  );
}