import { createPortal } from 'react-dom';
import { X, Download, Loader2, Share } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { downloadHtmlInvoice } from '@/lib/utils';

export default function InvoiceViewModal({ invoiceHtml, onClose }) {
  const [downloading, setDownloading] = useState(false);
  const handleDownload = async () => {
    setDownloading(true);
    const ok = await downloadHtmlInvoice('חשבונית.html', invoiceHtml);
    setDownloading(false);
    if (!ok) toast.error('לא ניתן לשמור את החשבונית בסביבה זו — ניתן לצלם מסך או לפתוח בדפדפן');
  };

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(5,15,40,0.72)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(8px)', touchAction: 'none' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div dir="rtl" style={{ background: 'var(--sheet-bg)', borderRadius: '28px 28px 0 0', width: '100%', maxWidth: 480, boxShadow: '0 -20px 80px rgba(0,0,0,0.25)', maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '14px auto 0', flexShrink: 0 }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 10px', flexShrink: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)' }}>חשבונית מס / קבלה</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleDownload}
              disabled={downloading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', border: 'none', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: downloading ? 0.7 : 1 }}
            >
              {downloading ? <Loader2 size={14} className="animate-spin" /> : (navigator.canShare ? <><Share size={14} /> שיתוף</> : <><Download size={14} /> הורד</>)}
            </button>
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: '#f3f4f6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={16} color="#6b7280" />
            </button>
          </div>
        </div>

        {/* Invoice content */}
        <div
          style={{ flex: 1, overflowY: 'auto', padding: '0 20px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
          dangerouslySetInnerHTML={{ __html: invoiceHtml }}
        />
      </div>
    </div>,
    document.body
  );
}