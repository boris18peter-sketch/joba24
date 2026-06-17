import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

export default function SystemPermissionModal({ type, onConfirm, onCancel, isOpen }) {
  const { t, isRTL } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !type) return null;

  const config = {
    location: {
      title: t('location_permission_title') || 'Share Location?',
      body: t('location_permission_body') || 'We need your location to help workers find you',
      icon: '📍',
    },
    notifications: {
      title: t('notif_permission_title') || 'Enable Notifications?',
      body: t('notif_permission_body') || 'Get instant updates on tasks and messages',
      icon: '🔔',
    },
    updates: {
      title: t('updates_permission_title') || 'Allow Live Updates?',
      body: t('updates_permission_body') || 'Your location will be shared with clients in real-time',
      icon: '📡',
    },
  };

  const current = config[type];

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(5,15,40,0.65)',
        backdropFilter: 'blur(6px)',
        animation: 'sheetFadeIn 0.22s ease both',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          width: '100%',
          maxWidth: 340,
          borderRadius: '28px',
          background: 'var(--surface-2)',
          padding: '28px 24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.4, 0.64, 1) both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          style={{
            position: 'absolute',
            top: 16,
            right: isRTL ? 'auto' : 16,
            left: isRTL ? 16 : 'auto',
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

        {/* Icon */}
        <div style={{ fontSize: 48, marginBottom: 16, textAlign: 'center' }}>{current?.icon}</div>

        {/* Title */}
        <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', marginBottom: 8, textAlign: 'center' }}>
          {current?.title}
        </div>

        {/* Body */}
        <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 24, textAlign: 'center' }}>
          {current?.body}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            style={{
              width: '100%',
              height: 52,
              borderRadius: 16,
              background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
              border: 'none',
              color: 'white',
              fontWeight: 900,
              fontSize: 15,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              boxShadow: '0 4px 16px rgba(26,111,212,0.35)',
            }}
          >
            {isLoading ? '⏳' : '✓'} {t('allow_btn') || 'Allow'}
          </button>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 16,
              background: 'var(--surface-3)',
              border: '1px solid var(--border-1)',
              color: 'var(--text-1)',
              fontWeight: 700,
              fontSize: 14,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            {t('maybe_later') || 'Maybe later'}
          </button>
        </div>
      </div>
    </div>
  );
}