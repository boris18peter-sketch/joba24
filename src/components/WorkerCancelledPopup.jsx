import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import BottomSheet from '@/components/BottomSheet';

export default function WorkerCancelledPopup({ task, onClose }) {
  const { t } = useLanguage();

  return (
    <BottomSheet onClose={onClose}>
      <div style={{ padding: '20px 20px 0', marginTop: 8 }}>
        {/* Icon + Title */}
        <div style={{ textAlign: 'center', marginBottom: 20, marginTop: 12 }}>
          <div style={{
            width: 68, height: 68, borderRadius: 22,
            background: 'var(--color-warning-bg)', border: `2px solid var(--color-warning-border)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <AlertTriangle size={32} color="var(--color-warning)" strokeWidth={2} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)', marginBottom: 8 }}>
            {t('popup_task_cancelled')}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>
            {t('popup_publisher_cancelled')}
          </div>
        </div>

        {/* Task */}
        {task && (
          <div style={{
            background: 'var(--color-warning-bg)', border: `1.5px solid var(--color-warning-border)`,
            borderRadius: 'var(--r-md)', padding: '14px 16px', marginBottom: 16,
          }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#7c2d12', marginBottom: 4 }}>
              {task.title}
            </div>
            {task.location_name && (
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>📍 {task.location_name}</div>
            )}
          </div>
        )}

        {/* Info */}
        <div style={{
          background: 'var(--brand-primary-light)', border: '1.5px solid #bfdbfe',
          borderRadius: 'var(--r-md)', padding: '12px 16px', marginBottom: 20,
        }}>
          <div style={{ fontSize: 12, color: 'var(--brand-primary)', lineHeight: 1.6, fontWeight: 600 }}>
            {t('popup_find_other_tasks')}
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', height: 54, borderRadius: 'var(--r-md)',
            background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
            border: 'none', color: 'white', fontWeight: 900, fontSize: 16,
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(26,111,212,0.35)',
            marginBottom: 4,
          }}
        >
          {t('popup_back_to_feed')}
        </button>
      </div>
    </BottomSheet>
  );
}