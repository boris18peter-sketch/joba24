import { Headphones } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { useLanguage } from '@/lib/LanguageContext';

export default function SupportHeader() {
  const { t } = useLanguage();

  return (
    <div style={{
      flexShrink: 0,
      background: 'var(--surface-2)',
      borderBottom: '1px solid var(--border-1)',
      paddingTop: 'max(12px, env(safe-area-inset-top))',
      paddingBottom: 12,
      paddingLeft: 12,
      paddingRight: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      boxShadow: '0 1px 10px rgba(15,40,107,0.06)',
      zIndex: 2,
    }}>
      <BackButton style={{ background: 'var(--surface-3)', border: 'none', boxShadow: 'none' }} />

      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #1a6fd4, #3b82f6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 3px 10px rgba(26,111,212,0.28)',
      }}>
        <Headphones size={19} color="white" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 800, color: 'var(--text-1)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {t('support_title')}
        </div>
        <div style={{ fontSize: 11.5, color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          {t('support_subtitle')}
        </div>
      </div>
    </div>
  );
}