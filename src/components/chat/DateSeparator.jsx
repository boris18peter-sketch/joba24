import { isToday, isYesterday } from 'date-fns';
import { useLanguage } from '@/lib/LanguageContext';

const LOCALES = {
  he: 'he-IL', ar: 'ar-IL', en: 'en-GB', es: 'es-ES',
  fr: 'fr-FR', ru: 'ru-RU', fil: 'en-PH', hi: 'hi-IN', zh: 'zh-CN',
};

/**
 * Subtle centred day separator — today, yesterday, then a localised date.
 * Never a full date next to every message.
 */
export default function DateSeparator({ date }) {
  const { t, lang } = useLanguage();
  const d = new Date(date);

  let label;
  if (isToday(d)) label = t('chat_today');
  else if (isYesterday(d)) label = t('chat_yesterday');
  else {
    label = new Intl.DateTimeFormat(LOCALES[lang] || 'en-GB', { day: 'numeric', month: 'long' }).format(d);
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0 10px' }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
        background: 'var(--surface-3)', padding: '3px 12px', borderRadius: 999,
        letterSpacing: 0.2,
      }}>{label}</span>
    </div>
  );
}