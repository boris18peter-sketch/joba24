import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { requestNotificationPermission } from '@/lib/fcm';

export default function NotificationsPermissionPrompt() {
  const { t, isRTL } = useLanguage();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Show prompt only if Notifications are supported and not yet requested
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const alreadyAsked = localStorage.getItem('joba24_notif_prompt_shown');
    if (!alreadyAsked && Notification.permission === 'default') {
      setShow(true);
      localStorage.setItem('joba24_notif_prompt_shown', '1');
    }
  }, []);

  const handleAllow = async () => {
    const perm = await requestNotificationPermission();
    setShow(false);
    // Notify SideMenu to update toggle
    if (perm === 'granted') {
      window.dispatchEvent(new Event('notif_permission_changed'));
    }
  };

  const handleDeny = () => {
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(5,15,40,0.55)',
        backdropFilter: 'blur(6px)',
        animation: 'sheetFadeIn 0.22s ease both',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDeny();
      }}
    >
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: '28px 28px 0 0',
          background: 'var(--surface-2)',
          padding: '28px 20px',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
          boxShadow: '0 -16px 60px rgba(0,0,0,0.25)',
          animation: 'sheetSlideUp 0.32s cubic-bezier(0.34, 1.4, 0.64, 1) both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Bell size={24} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', marginBottom: 4 }}>
              {t('notif_permission_title')}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>
              {t('notif_permission_body')}
            </div>
          </div>
          <button
            onClick={handleDeny}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              color: 'var(--text-2)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={handleAllow}
            style={{
              width: '100%',
              height: 52,
              borderRadius: 16,
              background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
              border: 'none',
              color: 'white',
              fontWeight: 900,
              fontSize: 15,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(26,111,212,0.35)',
            }}
          >
            {t('notif_permission_allow')}
          </button>
          <button
            onClick={handleDeny}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 16,
              background: 'var(--surface-3)',
              border: '1px solid var(--border-1)',
              color: 'var(--text-1)',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {t('maybe_later')}
          </button>
        </div>
      </div>
    </div>
  );
}