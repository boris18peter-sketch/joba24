import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * Floating "new messages" pill above the composer. Animates in and out subtly;
 * tapping it jumps to the newest message (scroll behaviour is unchanged).
 */
export default function NewMessagesPill({ onClick }) {
  const { t } = useLanguage();
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 10, scale: 0.94, x: '-50%' }}
      animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
      exit={{ opacity: 0, y: 8, scale: 0.96, x: '-50%' }}
      transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
      style={{
        position: 'absolute',
        bottom: 14,
        left: '50%',
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 14px', borderRadius: 999, border: 'none',
        background: 'linear-gradient(135deg,#1a6fd4,#3b82f6)',
        color: 'white', fontSize: 12.5, fontWeight: 700,
        cursor: 'pointer', zIndex: 5,
        boxShadow: '0 6px 20px rgba(26,111,212,0.38)',
      }}
    >
      <ArrowDown size={14} />
      {t('chat_new_messages')}
    </motion.button>
  );
}