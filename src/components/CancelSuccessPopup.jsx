import { CheckCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import BottomSheet from '@/components/BottomSheet';

export default function CancelSuccessPopup({ task, onClose }) {
  const { t } = useLanguage();

  useEffect(() => {
    const timer = setTimeout(() => onClose(), 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <BottomSheet onClose={onClose}>
      <div style={{ padding: '20px 20px 0', marginTop: 8 }}>
        {/* Icon + Title */}
        <div style={{ textAlign: 'center', marginBottom: 24, marginTop: 12 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'var(--color-success-bg)', border: `2px solid var(--color-success-border)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            animation: 'successPop 0.4s cubic-bezier(0.34,1.6,0.64,1)',
          }}>
            <CheckCircle size={36} color="var(--color-success)" strokeWidth={2} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)', marginBottom: 8 }}>
            {t('popup_cancel_success')}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>
            {t('popup_cancel_success_sub')}
          </div>
        </div>

        {/* Info - success */}
        <div style={{
          background: 'var(--color-success-bg)', border: `1.5px solid var(--color-success-border)`,
          borderRadius: 'var(--r-md)', padding: '14px 16px', marginBottom: 12,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-success)', marginBottom: 4 }}>
            {t('popup_cancel_success_check')}
          </div>
          <div style={{ fontSize: 12, color: '#15803d' }}>{t('popup_cancel_success_detail')}</div>
        </div>

        {/* Info - blue */}
        <div style={{
          background: 'var(--brand-primary-light)', border: '1.5px solid #bfdbfe',
          borderRadius: 'var(--r-md)', padding: '12px 16px', marginBottom: 24,
        }}>
          <div style={{ fontSize: 12, color: 'var(--brand-primary)', lineHeight: 1.6, fontWeight: 600 }}>
            <strong>{t('popup_back_to_search')}</strong><br />
            {t('popup_discover_more')}
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', height: 54, borderRadius: 'var(--r-md)',
            background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
            border: 'none', color: 'white', fontWeight: 900, fontSize: 16,
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(26,111,212,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 4,
          }}
        >
          {t('popup_back_to_feed')}
        </button>
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>
          {t('popup_returning_soon')}
        </div>
      </div>

      <style>{`@keyframes successPop{0%{transform:scale(0.5);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}`}</style>
    </BottomSheet>
  );
}