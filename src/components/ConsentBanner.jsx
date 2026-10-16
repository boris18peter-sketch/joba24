import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { applyConsent, hasConsentChoice, CONSENT_GRANTED, CONSENT_DENIED } from '@/lib/consent';
import { isNativeLike } from '@/lib/nativeEnv';

/**
 * Minimal advertising-consent notice.
 *
 * Purpose: give the visitor a real, informed choice before Google advertising
 * and analytics measurement runs, and push that choice to Google Consent Mode
 * v2 (see src/lib/consent.js). It is deliberately small — one decision per
 * device, stored locally, no dark patterns, and declining is as easy as
 * accepting.
 *
 * Shown only until a choice exists. Rendered through a portal so no transformed
 * ancestor can trap it, and at z-index 9000 so it sits above the bottom nav but
 * below the app's sheets and modals.
 */
export default function ConsentBanner() {
  const { lang, isRTL } = useLanguage();
  const [decided, setDecided] = useState(() => hasConsentChoice());

  // Inside the native app there is no web advertising cookie to consent to —
  // the notice belongs to the browser experience only and must never appear
  // over the app's own screens.
  if (isNativeLike()) return null;

  if (decided) return null;

  const he = lang === 'he';
  const copy = he
    ? {
        title: 'אנחנו משתמשים בקובצי Cookie',
        body: 'אנחנו משתמשים ב-Cookie כדי למדוד את השימוש באתר ולהציג פרסום רלוונטי. אפשר לאשר או להמשיך בלי אישור — השימוש באתר זהה בשני המקרים.',
        accept: 'אישור הכל',
        decline: 'המשך בלי אישור',
        policy: 'מדיניות הפרטיות',
      }
    : {
        title: 'We use cookies',
        body: 'We use cookies to measure how the site is used and to show relevant advertising. You can accept or continue without accepting — the site works the same either way.',
        accept: 'Accept all',
        decline: 'Continue without accepting',
        policy: 'Privacy policy',
      };

  const choose = (choice) => {
    applyConsent(choice);
    setDecided(true);
  };

  return createPortal(
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      role="dialog"
      aria-modal="false"
      aria-label={copy.title}
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9000,
        padding: 12,
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        className="j-modal-surface"
        style={{
          pointerEvents: 'auto',
          width: '100%',
          maxWidth: 560,
          borderRadius: 18,
          boxShadow: 'var(--shadow-xl)',
          padding: '16px 18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Cookie size={17} color="var(--brand-primary)" />
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>{copy.title}</span>
        </div>

        <p style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-2)', margin: '0 0 12px' }}>
          {copy.body}{' '}
          <Link to="/privacy" style={{ color: 'var(--brand-primary)', fontWeight: 700, textDecoration: 'underline' }}>
            {copy.policy}
          </Link>
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => choose(CONSENT_GRANTED)}
            className="j-btn j-btn-primary"
            style={{ flex: '1 1 140px', height: 44, fontSize: 13.5 }}
          >
            {copy.accept}
          </button>
          <button
            onClick={() => choose(CONSENT_DENIED)}
            className="j-btn j-btn-ghost"
            style={{ flex: '1 1 140px', height: 44, fontSize: 13.5 }}
          >
            {copy.decline}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}