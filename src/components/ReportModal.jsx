import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Flag, Loader2, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';

const REASONS = [
  { value: 'spam', key: 'spam_duplicate' },
  { value: 'fake', key: 'false_info' },
  { value: 'inappropriate', key: 'inappropriate_content' },
  { value: 'scam', key: 'scam_fraud' },
  { value: 'other', key: 'other' },
];

export default function ReportModal({ task, me, onClose }) {
  const { t, isRTL } = useLanguage();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!reason) { toast.error(t('rm_select_reason')); return; }
    setLoading(true);
    await base44.entities.Report.create({
      task_id: task.id,
      task_title: task.title,
      reporter_id: me?.id || 'anonymous',
      reporter_name: me?.full_name || t('anonymous'),
      reason,
      description: description.trim(),
      status: 'pending',
    });
    setLoading(false);
    setDone(true);
  };

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(5,15,40,0.65)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(8px)', touchAction: 'none' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div dir={isRTL ? 'rtl' : 'ltr'} style={{ background: 'white', borderRadius: '28px 28px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 40px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#e5e7eb', margin: '0 auto 20px' }} />

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle2 size={32} color="#16a34a" />
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#0f1e40', marginBottom: 8 }}>{t('report_sent')}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>{t('report_thanks')}</div>
            <button onClick={onClose} style={{ width: '100%', height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', border: 'none', color: 'white', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
              {t('close')}
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Flag size={20} color="#dc2626" />
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 17, color: '#0f1e40' }}>{t('report_task')}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{task.title}</div>
                </div>
              </div>
              <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: '#f3f4f6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={16} color="#6b7280" />
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>{t('reason_for_report')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {REASONS.map(r => (
                  <button key={r.value} onClick={() => setReason(r.value)}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 12, textAlign: 'right',
                      background: reason === r.value ? '#eff6ff' : '#f9fafb',
                      border: `1.5px solid ${reason === r.value ? '#1a6fd4' : '#e5e7eb'}`,
                      color: reason === r.value ? '#1a6fd4' : '#374151',
                      fontWeight: reason === r.value ? 700 : 500,
                      fontSize: 14, cursor: 'pointer',
                    }}>
                    {t(r.key)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>{t('additional_details')}</div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t('describe_problem')}
                rows={3}
                style={{ width: '100%', borderRadius: 12, border: '1.5px solid #e5e7eb', padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <button onClick={handleSubmit} disabled={loading || !reason}
              style={{
                width: '100%', height: 52, borderRadius: 14,
                background: reason ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : '#e5e7eb',
                border: 'none', color: 'white', fontWeight: 800, fontSize: 15,
                cursor: reason ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: reason ? '0 4px 16px rgba(220,38,38,0.3)' : 'none',
              }}>
              {loading ? <Loader2 size={20} className="animate-spin" /> : <><Flag size={16} /> {t('send_report')}</>}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}