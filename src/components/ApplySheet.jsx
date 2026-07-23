import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Send, X, CheckCircle2 } from 'lucide-react';
import CreditIcon from '@/components/CreditIcon';
import ImageUploader from '@/components/ImageUploader';
import { getActiveRequirements } from '@/lib/requirements';
import { getCategoryLabel } from '@/lib/categories';

export default function ApplySheet({ task, onClose, onApply, loading, showImages = true }) {
  const [message, setMessage] = useState('');
  const [images, setImages] = useState([]);
  const cost = Math.max(1, Math.round((task?.price || 0) * 0.05));

  // Build requirements list for display
  const reqs = getActiveRequirements(task?.requirements, task?.category).map(r =>
    r.value ? `${r.label}: ${r.value}` : r.label
  );
  if (task?.requires_invoice) reqs.push('דרושה חשבונית מס');
  if (task?.verification_required) reqs.push('דרוש ווי ירוק');

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

        {/* Task details & requirements summary */}
        {(task?.category || reqs.length > 0 || task?.location_name || task?.payment_method) && (
          <div style={{ background: '#f8faff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '12px 14px', marginBottom: 16 }}>
            {task?.category && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: reqs.length > 0 ? 8 : 0 }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>קטגוריה:</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1a6fd4' }}>{getCategoryLabel(task.category)}</span>
              </div>
            )}
            {task?.location_name && (
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: reqs.length > 0 ? 8 : 0 }}>
                📍 {task.location_name.split(',')[0]}
              </div>
            )}
            {task?.payment_method && (
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: reqs.length > 0 ? 8 : 0 }}>
                💳 {task.payment_method === 'Cash' ? 'מזומן' : task.payment_method}
              </div>
            )}
            {reqs.length > 0 && (
              <div style={{ borderTop: task?.category || task?.location_name || task?.payment_method ? '1px solid #e2e8f0' : 'none', paddingTop: 8 }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 6 }}>דרישות המשימה:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {reqs.map((req, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '4px 8px', fontSize: 11, fontWeight: 600, color: '#166534' }}>
                      <CheckCircle2 size={11} color="#059669" /> {req}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Credit refund explanation */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: '#166534', fontWeight: 600, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>💡 איך עובדים הקרדיטים?</div>
          הקרדיטים מופרדים בעת ההגשה אך <strong>מוחזרים אוטומטית</strong> אם:<br />
          • הבקשה שלך לא אושרה על ידי המפרסם<br />
          • המשימה בוטלה או פג תוקפה<br />
          • נבחר עובד אחר לביצוע המשימה<br />
          <strong>התשלום בפועל נספר רק אם תבצע את המשימה והיא תאושר.</strong>
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
        {showImages && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>תמונות (לא חובה)</p>
            <ImageUploader images={images} onChange={setImages} />
          </div>
        )}

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