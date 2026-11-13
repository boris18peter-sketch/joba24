import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mic, Camera, MapPin, BellRing, RefreshCw } from 'lucide-react';
import PopupClose from '@/components/ui/PopupClose';
import { useLanguage } from '@/lib/LanguageContext';
import {
  getPermissionPopup,
  hidePermissionPopup,
  subscribePermissionPopup,
} from '@/lib/permissionPopup';

/**
 * PermissionSheet — the answer a user gets when the device is blocking a
 * permission the screen needs.
 *
 * ── ONE SHAPE, LIKE EVERY OTHER POPUP IN THE APP ────────────────────────────
 * It is a bottom sheet in the exact pattern the rest of Joba24 uses (handle,
 * close button, a soft icon badge, title, body, an instruction box and one
 * primary action), sliding up from the bottom edge. The microphone version used
 * to be a centred card of its own invention, which is why it read as a message
 * from another app.
 *
 * ── THREE PERMISSIONS, ONE COMPONENT ────────────────────────────────────────
 * microphone, camera and location differ only in their copy, so they share the
 * sheet: the same rhythm for all three means a user who meets the second one
 * already knows what it is.
 *
 * Raised from anywhere through `showPermissionPopup` (see @/lib/permissionPopup),
 * mounted once in the app shell.
 */
const CONTENT = {
  microphone: {
    denied: {
      icon: Mic,
      title: 'המיקרופון חסום במכשיר',
      body: 'כדי להקליט תיאור במקום להקליד, Joba24 צריך גישה למיקרופון. המכשיר כבר סירב לבקשה, ולכן הוא לא פותח בקשה חדשה — צריך לאשר את הגישה פעם אחת בהגדרות.',
      hint: 'הגדרות המכשיר › Joba24 › מיקרופון (ב-Android: הרשאות אפליקציה). אחרי האישור חוזרים לכאן ולוחצים "נסה שוב".',
      retry: 'נסה שוב',
    },
    unsupported: {
      icon: Mic,
      title: 'הקלטה לא נתמכת במכשיר הזה',
      body: 'הדפדפן או הגרסה הזאת לא מאפשרים הקלטה. אפשר להמשיך כרגיל — פשוט כתבו את התיאור בשדה.',
      hint: '',
      retry: '',
    },
  },
  camera: {
    denied: {
      icon: Camera,
      title: 'המצלמה חסומה במכשיר',
      body: 'כדי לצרף תמונה או סרטון שצילמת עכשיו, Joba24 צריך גישה למצלמה. המכשיר כבר סירב לבקשה, ולכן הוא לא פותח בקשה חדשה — צריך לאשר את הגישה פעם אחת בהגדרות.',
      hint: 'הגדרות המכשיר › Joba24 › מצלמה (ב-Android: הרשאות אפליקציה). בינתיים אפשר לצרף תמונה או סרטון קיימים מהגלריה.',
      retry: 'נסה שוב',
    },
    unsupported: {
      icon: Camera,
      title: 'מצלמה לא זמינה במכשיר הזה',
      body: 'הדפדפן או הגרסה הזאת לא מאפשרים לפתוח המצלמה. אפשר לצרף תמונה או סרטון קיימים מהגלריה.',
      hint: '',
      retry: '',
    },
  },
  notifications: {
    denied: {
      icon: BellRing,
      title: 'ההתראות חסומות במכשיר',
      body: 'כדי לעדכן אתכם כשיתפרסמו משימות חדשות, Joba24 צריך הרשאת התראות. המכשיר כבר סירב לבקשה, ולכן הוא לא פותח בקשה חדשה — צריך לאשר אותה פעם אחת בהגדרות.',
      hint: 'הגדרות המכשיר › Joba24 › התראות. אחרי האישור חוזרים לכאן ולוחצים "נסה שוב".',
      retry: 'נסה שוב',
    },
  },
  location: {
    denied: {
      icon: MapPin,
      title: 'המיקום חסום במכשיר',
      body: 'המיקום משמש כדי להראות משימות קרובות ולחשב מרחק. המכשיר כבר סירב לבקשה, ולכן הוא לא פותח בקשה חדשה — צריך לאשר את הגישה פעם אחת בהגדרות.',
      hint: 'הגדרות המכשיר › Joba24 › מיקום (ב-Android: הרשאות אפליקציה). אחרי האישור חוזרים לכאן ולוחצים "נסה שוב".',
      retry: 'נסה שוב',
    },
    unsupported: {
      icon: MapPin,
      title: 'המיקום לא זמין במכשיר הזה',
      body: 'המכשיר או הדפדפן לא מוסרים מיקום. אפשר להמשיך בלי מרחקים — כל שאר המידע על המשימות מוצג כרגיל.',
      hint: '',
      retry: '',
    },
  },
};

const FALLBACK = CONTENT.microphone.denied;

export default function PermissionSheet() {
  const { isRTL } = useLanguage();
  const [popup, setPopup] = useState(getPermissionPopup());

  useEffect(() => subscribePermissionPopup(setPopup), []);

  if (!popup) return null;

  const c = CONTENT[popup.kind]?.[popup.mode] || FALLBACK;
  const Icon = c.icon;

  const close = () => hidePermissionPopup();

  const retry = () => {
    const fn = popup.onRetry;
    hidePermissionPopup();
    if (fn) fn();
  };

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000000,
        background: 'rgba(5,15,40,0.65)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        touchAction: 'none',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="j-modal-surface"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          borderRadius: '28px 28px 0 0',
          padding: '0 20px',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
          boxShadow: '0 -20px 80px rgba(0,0,0,0.25)',
          animation: 'sheetSlideUp 0.32s cubic-bezier(0.34,1.4,0.64,1) both',
          maxHeight: '90dvh', overflowY: 'auto',
          position: 'relative',
        }}
      >
        {/* Handle — the app's own bottom-sheet rhythm */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '14px auto 20px' }} />

        <PopupClose onClick={close} label="סגור" />

        <div style={{ textAlign: 'center', marginBottom: c.hint ? 18 : 24, marginTop: 8 }}>
          <div
            style={{
              width: 68, height: 68, borderRadius: 22,
              background: 'var(--brand-primary-light)',
              border: '2px solid var(--border-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Icon size={32} color="var(--brand-primary)" strokeWidth={1.8} />
          </div>
          <div style={{ fontSize: 21, fontWeight: 900, color: 'var(--text-1)', marginBottom: 10 }}>
            {c.title}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, fontWeight: 500 }}>
            {c.body}
          </div>
        </div>

        {c.hint && (
          <div
            style={{
              background: 'var(--surface-3)',
              border: '1px solid var(--border-1)',
              borderRadius: 14,
              padding: '12px 16px',
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.65, fontWeight: 600 }}>
              {c.hint}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {c.retry && popup.onRetry && (
            <button
              type="button"
              onClick={retry}
              style={{
                width: '100%', height: 54, borderRadius: 16, border: 'none',
                background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
                color: '#fff', fontWeight: 900, fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                boxShadow: '0 6px 20px rgba(26,111,212,0.3)',
              }}
            >
              <RefreshCw size={18} strokeWidth={2.4} />
              {c.retry}
            </button>
          )}
          <button
            type="button"
            onClick={close}
            style={{
              width: '100%', height: 50, borderRadius: 14,
              background: 'var(--surface-2)', border: '1.5px solid var(--border-1)',
              color: 'var(--text-1)', fontWeight: 700, fontSize: 15, cursor: 'pointer',
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