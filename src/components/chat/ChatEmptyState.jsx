import { useLanguage } from '@/lib/LanguageContext';

/**
 * Empty conversation — text only.
 *
 * The waving hand inside a large white circle used to sit in the middle of the
 * conversation: a bright disc on the chat background, competing with the two
 * lines of text that already say the same thing. Removed — the copy carries the
 * screen, which is all an empty thread needs.
 */
export default function ChatEmptyState({ name }) {
  const { t } = useLanguage();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 24px', margin: 'auto' }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>{t('chat_empty_title')}</div>
      <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.6, maxWidth: 260 }}>
        {name ? t('chat_send_msg_to', { name }) : t('chat_empty_body')}
      </div>
    </div>
  );
}