import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import CreditIcon from '@/components/CreditIcon';

export default function ApplySheet({ task, onClose, onApply, loading }) {
  const [message, setMessage] = useState('');

  const cost = Math.max(1, Math.round((task?.price || 0) * 0.05));

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100002, background: 'rgba(5,15,40,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        dir="rtl"
        style={{ background: 'white', borderRadius: '28px 28px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 0', paddingBottom: 'max(28px, env(safe-area-inset-bottom))', boxShadow: '0 -16px 60px rgba(0,0,0,0.2)', animation: 'sheetSlideUp 0.3s ease' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 20px' }} />

        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: '#0f1e40', marginBottom: 4 }}>הגשת בקשה</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            עלות: <strong style={{ color: '#1a6fd4' }}>{cost}</strong> <CreditIcon size={12} style={{ display: 'inline' }} /> קרדיטים
          </div>
        </div>

        {/* Task summary */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', borderRadius: 10, padding: '6px 12px', color: 'white', fontWeight: 900, fontSize: 16, flexShrink: 0 }}>₪{task?.price}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f2b6b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task?.title}</div>
        </div>

        {/* Message */}
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0f2b6b', marginBottom: 8 }}>
          הוסף הודעה לבעל המשימה <span style={{ color: '#94a3b8', fontWeight: 500 }}>(לא חובה)</span>
        </p>
        <textarea
          placeholder="לדוגמא: יש לי ניסיון של 5 שנים בתחום..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={3}
          style={{ width: '100%', background: '#f8fafc', border: '1.5px solid #dce8f5', borderRadius: 14, padding: '12px 14px', fontSize: 16, fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 14 }}
        />

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => onApply(message)}
            disabled={loading}
            style={{ flex: 1, height: 54, borderRadius: 16, background: loading ? '#93b4d8' : 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: 'white', fontWeight: 800, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15, boxShadow: '0 4px 16px rgba(26,111,212,0.3)' }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={15} /> שלח בקשה</>}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            style={{ height: 54, padding: '0 20px', borderRadius: 16, background: '#f1f5f9', border: 'none', color: '#64748b', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}