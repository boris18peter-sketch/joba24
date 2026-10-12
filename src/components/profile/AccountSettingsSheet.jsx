import ProfileSheet from './ProfileSheet';
import SocialLinksSection from '@/components/SocialLinksSection';
import { LogOut, Trash2 } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

const actionRow = {
  display: 'flex', alignItems: 'center', gap: 14,
  width: '100%', minHeight: 54, padding: '0 2px',
  background: 'transparent', border: 'none',
  borderBottom: '1px solid var(--border-1)',
  cursor: 'pointer', fontSize: 15, fontWeight: 600,
  fontFamily: 'inherit', textAlign: 'start',
};

/**
 * AccountSettingsSheet — connected networks, sign out and account deletion,
 * grouped in one place instead of scattered across the page.
 */
export default function AccountSettingsSheet({ me, onClose, onLogout, onDelete }) {
  const { t } = useLanguage();

  return (
    <ProfileSheet title={t('pr_account_settings')} onClose={onClose}>
      <SocialLinksSection user={me} />

      <div style={{ marginTop: 18, borderTop: '1px solid var(--border-1)' }}>
        <button onClick={onLogout} style={{ ...actionRow, color: 'var(--text-1)' }}>
          <LogOut size={19} strokeWidth={1.9} color="var(--text-2)" />
          <span style={{ flex: 1 }}>{t('logout')}</span>
        </button>

        <button
          onClick={onDelete}
          style={{ ...actionRow, color: 'var(--color-danger)', borderBottom: 'none' }}
        >
          <Trash2 size={19} strokeWidth={1.9} color="var(--color-danger)" />
          <span style={{ flex: 1 }}>{t('delete_account')}</span>
        </button>
      </div>

      <div style={{ height: 8 }} />
    </ProfileSheet>
  );
}