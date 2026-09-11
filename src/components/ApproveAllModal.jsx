import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, ShieldCheck } from 'lucide-react';

const CORRECT_CODE = 'joba24';

export default function ApproveAllModal({ count, selectedCount, onConfirm, onClose }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const isCodeCorrect = code.trim().toLowerCase() === CORRECT_CODE;
  const label = selectedCount != null ? `${selectedCount} נבחרים` : `${count} ממתינים`;

  const handleConfirm = async () => {
    if (!isCodeCorrect) return;
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(5,15,40,0.7)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        dir="rtl"
        style={{
          background: 'var(--surface-2)', borderRadius: 20, padding: 24,
          width: '100%', maxWidth: 360,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldCheck size={20} color="#1a6fd4" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)' }}>אישור מרוכז</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{label} יאושרו</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 10, background: 'var(--surface-3)',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <X size={16} color="var(--text-3)" />
          </button>
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.5 }}>
          לאישור, הקלד את קוד האישור:
        </div>

        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="הקלד קוד..."
          autoFocus
          dir="ltr"
          onKeyDown={e => { if (e.key === 'Enter' && isCodeCorrect) handleConfirm(); }}
          style={{
            width: '100%', height: 48, borderRadius: 12,
            border: `1.5px solid ${isCodeCorrect ? '#16a34a' : 'var(--border-1)'}`,
            padding: '0 16px', fontSize: 16, outline: 'none', boxSizing: 'border-box',
            background: 'var(--surface-3)', color: 'var(--text-1)',
            textAlign: 'center', letterSpacing: 2,
          }}
        />
        {code.trim() && !isCodeCorrect && (
          <div style={{ fontSize: 11, color: '#dc2626', marginTop: 6, fontWeight: 600 }}>קוד שגוי — נסה שוב</div>
        )}

        <button
          onClick={handleConfirm}
          disabled={loading || !isCodeCorrect}
          style={{
            width: '100%', height: 48, borderRadius: 12, marginTop: 16,
            background: isCodeCorrect ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : 'var(--surface-3)',
            color: isCodeCorrect ? 'white' : 'var(--text-3)',
            border: 'none', fontWeight: 800, fontSize: 15,
            cursor: isCodeCorrect && !loading ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : `✓ אשר ${label}`}
        </button>
      </div>
    </div>,
    document.body
  );
}