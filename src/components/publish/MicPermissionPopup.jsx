import { createPortal } from 'react-dom';
import { Mic, X, RefreshCw, Settings } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * MicPermissionPopup — the answer a publisher gets when dictation cannot start.
 *
 * The record button in the description used to fail in total silence: the browser
 * refused the microphone (permission not granted, or the WebView has no capture
 * support at all), the promise rejected with nobody listening, and the button
 * simply did nothing. From the publisher's side that is a broken field, and there
 * was nothing on screen to explain it or to fix it.
 *
 * So every failure now arrives here, and the popup says which of the two it is:
 *
 *   • denied    — the phone is blocking the microphone. The retry asks again, so a
 *                 prompt that was dismissed by accident is one press away, and the
 *                 settings line says where to unblock it if it was refused for
 *                 good (iOS/Android never show that prompt twice).
 *   • unsupported — this build has no microphone capture at all. Nothing the user
 *                 can press helps, so only the explanation and a close are shown.
 *
 * The wording is deliberately practical: what happened, and what to press.
 */
const CONTENT = {
  denied: {
    icon: Settings,
    title: 'המיקרופון חסום במכשיר',
    body: 'כדי להקליט תיאור במקום להקליד, Joba24 צריך גישה למיקרופון. המכשיר כבר סירב לבקשה, ולכן הוא לא פותח בקשה חדשה — צריך לאשר את הגישה פעם אחת בהגדרות.',
    hint: 'הגדרות המכשיר › Joba24 › מיקרופון (ב-Android: הרשאות אפליקציה). אחרי האישור חוזרים לכאן ולוחצים "נסה שוב".',
    action: 'נסה שוב',
  },
  unsupported: {
    icon: Mic,
    title: 'הקלטה לא נתמכת במכשיר הזה',
    body: 'הדפדפן או הגרסה הזאת לא מאפשרים הקלטה. אפשר להמשיך כרגיל — פשוט כתבו את התיאור בשדה.',
    hint: '',
    action: '',
  },
};

export default function MicPermissionPopup({ kind, onRetry, onClose }) {
  const { isRTL } = useLanguage();
  if (!kind) return null;
  const c = CONTENT[kind] || CONTENT.unsupported;
  const Icon = c.icon;

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100002,
        background: 'var(--overlay-bg)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        animation: 'sheetFadeIn 0.2s ease both',
      }}
    >
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          width: '100%', maxWidth: 380,
          background: 'var(--sheet-bg)',
          border: '1px solid var(--border-1)',
          borderRadius: 22,
          padding: '20px 18px 16px',
          boxShadow: 'var(--shadow-xl)',
          animation: 'successPop 0.24s cubic-bezier(0.34,1.4,0.64,1) both',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{
            width: 42, height: 42, borderRadius: 14, flexShrink: 0,
            background: 'var(--brand-primary-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={20} color="var(--brand-primary)" />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.35 }}>
              {c.title}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, fontWeight: 600 }}>
              {c.body}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            style={{
              width: 30, height: 30, borderRadius: 10, flexShrink: 0,
              background: 'var(--surface-3)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 'unset', minWidth: 'unset',
            }}
          >
            <X size={14} color="var(--text-3)" />
          </button>
        </div>

        {c.hint && (
          <div style={{
            marginTop: 12, padding: '9px 12px', borderRadius: 12,
            background: 'var(--surface-3)', border: '1px solid var(--border-1)',
            fontSize: 11.5, color: 'var(--text-2)', fontWeight: 600, lineHeight: 1.55,
          }}>
            {c.hint}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          {c.action && (
            <button
              type="button"
              onClick={onRetry}
              style={{
                flex: 2, height: 46, borderRadius: 14, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
                color: '#fff', fontSize: 14.5, fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                boxShadow: '0 6px 18px rgba(26,111,212,0.28)',
              }}
            >
              <RefreshCw size={15} />
              {c.action}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, height: 46, borderRadius: 14, cursor: 'pointer',
              background: 'var(--surface-3)', border: '1px solid var(--border-1)',
              color: 'var(--text-2)', fontSize: 14, fontWeight: 800,
            }}
          >
            סגור
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}