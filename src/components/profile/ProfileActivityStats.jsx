import { CheckCircle2, Megaphone } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

// Joba24 Activity — two equally-visible stats: tasks completed vs tasks posted.
// Makes the distinction unambiguous (who did work for others vs who hired).
export default function ProfileActivityStats({ completedCount, postedCount }) {
  const { t } = useLanguage();
  return (
    <div dir="rtl" style={{
      background: 'var(--surface-2)',
      borderRadius: 18,
      border: '1px solid var(--border-1)',
      padding: '16px 16px 14px',
      boxShadow: 'var(--shadow-xs)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <span style={{ fontSize: 13 }}>📊</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.3 }}>{t('pr_activity')}</span>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, background: '#f0fdf4', borderRadius: 14, border: '1px solid #bbf7d0', padding: '14px 12px', textAlign: 'center' }}>
          <CheckCircle2 size={18} color="#16a34a" style={{ margin: '0 auto 6px' }} />
          <div style={{ fontSize: 30, fontWeight: 900, color: '#15803d', lineHeight: 1 }}>{completedCount}</div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#166534', marginTop: 4 }}>{t('pr_tasks_done_long')}</div>
          <div style={{ fontSize: 10, color: '#16a34a', marginTop: 3, lineHeight: 1.4 }}>{t('pr_tasks_done_expl')}</div>
        </div>
        <div style={{ flex: 1, background: '#eff6ff', borderRadius: 14, border: '1px solid #bfdbfe', padding: '14px 12px', textAlign: 'center' }}>
          <Megaphone size={18} color="#1a6fd4" style={{ margin: '0 auto 6px' }} />
          <div style={{ fontSize: 30, fontWeight: 900, color: '#1a6fd4', lineHeight: 1 }}>{postedCount}</div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#1e40af', marginTop: 4 }}>{t('pr_tasks_posted_long')}</div>
          <div style={{ fontSize: 10, color: '#1a6fd4', marginTop: 3, lineHeight: 1.4 }}>{t('pr_tasks_posted_expl')}</div>
        </div>
      </div>
    </div>
  );
}