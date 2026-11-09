import { Headphones } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { useLanguage } from '@/lib/LanguageContext';
import { useBrandText, useBrandIdentity } from '@/components/BrandIdentity';

export default function SupportHeader() {
  const { t } = useLanguage();
  const brandText = useBrandText();
  // Support IS the brand speaking, so its avatar is the official mark — the same
  // one the header, the loading screen and the emails use.
  const { logoUrl } = useBrandIdentity();

  return (
    <div style={{
      flexShrink: 0,
      background: 'var(--brand-header-bg, var(--surface-2))',
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
        background: '#ffffff', overflow: 'hidden',
        border: '1px solid var(--border-1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 3px 10px rgba(26,111,212,0.22)',
      }}>
        {logoUrl
          ? <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : <Headphones size={19} color="var(--brand-primary)" />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 800, color: 'var(--brand-header-text, var(--text-1))',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {brandText(t('support_title'))}
        </div>
        <div style={{ fontSize: 11.5, color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          {brandText(t('support_subtitle'))}
        </div>
      </div>
    </div>
  );
}