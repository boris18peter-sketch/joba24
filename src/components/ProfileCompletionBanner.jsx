import { useNavigate } from 'react-router-dom';
import { UserCog, X } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '@/lib/LanguageContext';

const DISMISSED_KEY = 'joba24_profile_banner_dismissed';

export default function ProfileCompletionBanner({ me }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(DISMISSED_KEY));

  if (!me || dismissed) return null;

  // Show only if profile is incomplete (no preferred_categories or no bio/skills)
  const isIncomplete = !me.preferred_categories?.length && !me.skills?.length && !me.bio;
  if (!isIncomplete) return null;

  const handleDismiss = (e) => {
    e.stopPropagation();
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  return (
    <div
      dir="rtl"
      style={{
        background: 'linear-gradient(135deg, #1a6fd4 0%, #0a52b0 100%)',
        borderRadius: 16,
        padding: '14px 16px',
        marginBottom: 10,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(26,111,212,0.25)',
      }}
    >
      {/* Decorative circle */}
      <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        style={{ position: 'absolute', top: 10, left: 10, width: 26, height: 26, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
      >
        <X size={13} color="white" />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <UserCog size={22} color="white" strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: 'white', marginBottom: 2 }}>{t('profile_complete_title')}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.45 }}>
            {t('profile_complete_sub')}
          </div>
        </div>
      </div>

      <button
        onClick={() => navigate('/worker-profile')}
        style={{
          marginTop: 12,
          width: '100%',
          height: 40,
          borderRadius: 11,
          background: '#fbbf24',
          color: '#1a3a6b',
          fontWeight: 900,
          fontSize: 13,
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 3px 10px rgba(251,191,36,0.4)',
        }}
      >
        {t('profile_complete_btn')}
      </button>
    </div>
  );
}