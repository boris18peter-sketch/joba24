import { useLanguage } from '@/lib/LanguageContext';

/**
 * Empty conversation — small, centred and friendly. Never a blank screen.
 */
export default function ChatEmptyState({ name }) {
  const { t } = useLanguage();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 24px', margin: 'auto' }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%', marginBottom: 14,
        background: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26,
      }}>👋</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>{t('chat_empty_title')}</div>
      <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.6, maxWidth: 260 }}>
        {name ? t('chat_send_msg_to', { name }) : t('chat_empty_body')}
      </div>
    </div>
  );
}