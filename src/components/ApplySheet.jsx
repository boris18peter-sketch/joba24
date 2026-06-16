import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Send, X } from 'lucide-react';
import CreditIcon from '@/components/CreditIcon';
import ImageUploader from '@/components/ImageUploader';

export default function ApplySheet({ task, onClose, onApply, loading }) {
  const [message, setMessage] = useState('');
  const [images, setImages] = useState([]);
  const cost = Math.max(1, Math.round((task?.price || 0) * 0.05));

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(5,15,40,0.65)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        touchAction: 'none',
      }}
      onClick={onClose}
      onPointerDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
    >
      <div
        dir="rtl"
        style={{
          background: 'white', borderRadius: '28px 28px 0 0',
          width: '100%', maxWidth: 480,
          padding: '0 20px', paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
          boxShadow: '0 -20px 80px rgba(0,0,0,0.25)',
          animation: 'sheetSlideUp 0.3s cubic-bezier(0.34,1.4,0.64,1)',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '14px auto 20px' }} />

        {/* Close */}
        <button onClick={onClose} style={{ position: 'absolute', top: 16, left: 16, width: 36, height: 36, borderRadius: 12, background: '#f3f4f6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
          <X size={18} color="#6b7280" />
        </button>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', borderRadius: 18, padding: '16px 20px', marginBottom: 16, color: 'white' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>עלות הגשה:</span>
            <CreditIcon size={12} />
            <span style={{ fontWeight: 800 }}>{cost}</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>₪{task?.price}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{task?.title}</div>
        </div>

        {/* Message */}
        <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 18, padding: '14px 16px', marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#1e40af', marginBottom: 10 }}>
            הוסף הודעה לבעל המשימה (לא חובה)
          </p>
          <textarea
            placeholder="לדוגמא: יש לי ניסיון של 5 שנים בתחום..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            style={{ width: '100%', background: 'white', border: '1.5px solid #dce8f5', borderRadius: 12, padding: '12px 14px', fontSize: 15, fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Images */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>תמונות (לא חובה)</p>
          <ImageUploader images={images} onChange={setImages} />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => onApply(message, images)}
            disabled={loading}
            style={{ flex: 1, height: 52, borderRadius: 16, background: loading ? '#93b4d8' : 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: 'white', fontWeight: 800, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15, boxShadow: '0 4px 16px rgba(26,111,212,0.3)' }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={15} /> שלח בקשה</>}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            style={{ height: 52, padding: '0 18px', borderRadius: 16, background: 'white', border: '1.5px solid #dce8f5', color: '#64748b', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}