/**
 * InvoiceModal — lets a worker fill in their business details and
 * generate an invoice record for a completed task.
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { X, FileText, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { calculateCurrentPrice } from '@/lib/priceCalculator';

export default function InvoiceModal({ task, me, onClose }) {
  const currentPrice = Math.round(calculateCurrentPrice(task));
  const [form, setForm] = useState({
    business_name: me?.business_name || '',
    business_id: me?.business_id || '',   // ח"פ / ע"מ
    address: me?.business_address || '',
    phone: me?.phone || '',
    price: String(currentPrice),
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.business_name || !form.business_id) {
      toast.error('יש למלא שם עסק ומספר ח"פ');
      return;
    }
    setLoading(true);
    try {
      // Save business details to user profile for next time
      await base44.auth.updateMe({
        business_name: form.business_name,
        business_id: form.business_id,
        business_address: form.address,
      });

      // Build invoice HTML
      const invoiceHtml = `
        <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#7c3aed;border-bottom:2px solid #7c3aed;padding-bottom:10px">חשבונית מס / קבלה</h2>
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr><td style="padding:8px;color:#666;font-weight:bold">ספק:</td><td style="padding:8px">${form.business_name}</td></tr>
            <tr><td style="padding:8px;color:#666;font-weight:bold">ח"פ / ע"מ:</td><td style="padding:8px">${form.business_id}</td></tr>
            ${form.address ? `<tr><td style="padding:8px;color:#666;font-weight:bold">כתובת:</td><td style="padding:8px">${form.address}</td></tr>` : ''}
            ${form.phone ? `<tr><td style="padding:8px;color:#666;font-weight:bold">טלפון:</td><td style="padding:8px">${form.phone}</td></tr>` : ''}
            <tr style="background:#f9f5ff"><td style="padding:8px;color:#666;font-weight:bold">משימה:</td><td style="padding:8px;font-weight:bold">${task.title}</td></tr>
            <tr style="background:#f9f5ff"><td style="padding:8px;color:#666;font-weight:bold">סכום:</td><td style="padding:8px;font-size:20px;font-weight:900;color:#7c3aed">₪${form.price}</td></tr>
            <tr><td style="padding:8px;color:#666;font-weight:bold">לקוח:</td><td style="padding:8px">${task.client_name || ''}</td></tr>
            <tr><td style="padding:8px;color:#666;font-weight:bold">תאריך:</td><td style="padding:8px">${new Date().toLocaleDateString('he-IL')}</td></tr>
          </table>
          <p style="color:#999;font-size:12px;margin-top:30px">הופק דרך Joba24 · joba24.com</p>
        </div>`;

      // Save invoice HTML on the task — both parties can view & download from TaskDetail
      await base44.entities.Task.update(task.id, { invoice_html: invoiceHtml });

      setDone(true);
      setTimeout(() => onClose(), 2400);
    } catch {
      toast.error('שגיאה בהפקת החשבונית, נסה שוב');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(5,15,40,0.72)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(8px)', touchAction: 'none' }}
      onClick={e => e.target === e.currentTarget && onClose()}
      onPointerDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
    >
      <div dir="rtl" onClick={e => e.stopPropagation()} style={{ background: 'var(--sheet-bg)', borderRadius: '28px 28px 0 0', width: '100%', maxWidth: 480, padding: '0 20px', paddingBottom: 'max(28px, env(safe-area-inset-bottom))', boxShadow: '0 -20px 80px rgba(0,0,0,0.25)', maxHeight: '92dvh', overflowY: 'auto' }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '14px auto 20px' }} />

        {/* Close */}
        <button onClick={onClose} style={{ position: 'absolute', top: 16, left: 20, width: 36, height: 36, borderRadius: 12, background: '#f3f4f6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <X size={18} color="#6b7280" />
        </button>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0 30px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#e9d5ff,#c4b5fd)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 0 0 8px rgba(168,85,247,.1)' }}>
              <CheckCircle size={30} color="#7c3aed" />
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#0f2b6b', marginBottom: 8 }}>החשבונית הופקה! 📄</div>
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>החשבונית זמינה להורדה בתוך המשימה עבורך ועבור המפרסם</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={22} color="white" />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)' }}>הפקת חשבונית מס</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{task.title} · <strong style={{ color: '#7c3aed' }}>₪{form.price}</strong></div>
              </div>
            </div>

            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {[
                { key: 'business_name', label: 'שם העסק / שם פרטי *', placeholder: 'לדוגמה: נגרות אלמוג' },
                { key: 'business_id', label: 'מספר ח"פ / ע"מ / ת.ז. *', placeholder: 'לדוגמה: 555123456' },
                { key: 'address', label: 'כתובת', placeholder: 'לדוגמה: רחוב הרצל 5, תל אביב' },
                { key: 'phone', label: 'טלפון', placeholder: 'לדוגמה: 050-1234567' },
              ].map(f => (
                <div key={f.key}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>{f.label}</div>
                  <input
                    value={form[f.key]}
                    onChange={e => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border-1)', background: 'var(--input-bg)', fontSize: 16, outline: 'none', color: 'var(--text-1)', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>
              ))}
              {/* Editable price */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>סכום לחשבונית (₪)</div>
                <input
                  type="number"
                  value={form.price}
                  onChange={e => set('price', e.target.value)}
                  placeholder="סכום"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #d8b4fe', background: '#faf5ff', fontSize: 16, outline: 'none', color: '#7c3aed', fontWeight: 800, boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 12, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#7c3aed', lineHeight: 1.6 }}>
              📄 החשבונית תוצג בתוך המשימה — אתה והמפרסם תוכלו להוריד אותה
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ width: '100%', height: 52, borderRadius: 16, background: loading ? '#a78bfa' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', fontWeight: 900, fontSize: 15, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}>
              {loading ? <Loader2 size={20} className="animate-spin" /> : <><FileText size={18} /> הפק חשבונית</>}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}