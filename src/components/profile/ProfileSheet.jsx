import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * ProfileSheet — one consistent bottom-sheet shell for every Profile detail
 * view (skills, activity areas, media, subscription, account settings).
 *
 * The Profile page itself stays short; anything detailed opens here, so the
 * page never has to stack full cards to stay complete.
 */
export default function ProfileSheet({ title, subtitle, onClose, children }) {
  const { isRTL } = useLanguage();

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100001,
        background: 'var(--overlay-bg)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'sheetFadeIn 0.2s ease both',
      }}
    >
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="mobile-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 480, background: 'var(--sheet-bg)' }}
      >
        <div className="j-sheet-handle" />

        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 12, padding: '16px 20px 14px',
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)' }}>{title}</div>
            {subtitle && (
              <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 3, lineHeight: 1.5 }}>{subtitle}</div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="close"
            style={{
              width: 34, height: 34, borderRadius: 12, flexShrink: 0,
              background: 'var(--surface-3)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} color="var(--text-2)" />
          </button>
        </div>

        <div style={{ padding: '0 20px' }}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}