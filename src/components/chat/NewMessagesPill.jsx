import { ArrowDown } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * Floating "new messages" affordance. Shown only when a message arrives while
 * the user is reading history — tapping it jumps to the newest message.
 */
export default function NewMessagesPill({ onClick }) {
  const { t } = useLanguage();
  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute',
        bottom: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        borderRadius: 999,
        border: 'none',
        background: 'linear-gradient(135deg,#1a6fd4,#3b82f6)',
        color: 'white',
        fontSize: 12.5,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 6px 20px rgba(26,111,212,0.4)',
        zIndex: 5,
        animation: 'pillSlideIn 0.22s cubic-bezier(0.32,1.2,0.64,1) both',
      }}
    >
      <ArrowDown size={14} />
      {t('chat_new_messages')}
    </button>
  );
}