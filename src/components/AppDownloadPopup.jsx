import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

import StoreDownloadButtons from '@/components/StoreDownloadButtons';
import { isNativeLike } from '@/lib/nativeEnv';
import { useJobaSettings } from '@/hooks/useJobaSettings';
import { useLanguage } from '@/lib/LanguageContext';

const OFFER_KEY = 'joba24_offer_app';

// The offer is a FOLLOW-UP, never the moment of success. The publisher's own task
// is highlighted on the feed first (that glow is the reward for publishing), and
// this waits for that moment to land before it slides in — so the popup never
// covers the very thing the visitor just earned.
const DELAY_MS = 7000;

/**
 * AppDownloadPopup — the small "get the app" nudge shown to a WEB visitor right
 * after they publish their first task.
 *
 * It exists because publishing from the browser leaves the publisher blind: the
 * moment an applicant wants the task, the only channel that reaches them is a
 * push notification, and push needs the installed app. So the offer is made at
 * the exact point where its value is obvious, and only once.
 *
 * Store buttons are the shared StoreDownloadButtons component, so the URLs stay
 * server-driven and the badges stay hidden inside the installed app.
 */
export default function AppDownloadPopup() {
  const { t, isRTL } = useLanguage();
  const { settings } = useJobaSettings();
  const [open, setOpen] = useState(false);

  const clearOffer = () => {
    try { localStorage.removeItem(OFFER_KEY); } catch { /* storage blocked */ }
  };

  const hasStoreLink = !!(settings?.app_store_url || settings?.google_play_url);

  useEffect(() => {
    // Nothing to offer inside the installed app — and no point keeping the flag.
    if (isNativeLike()) { clearOffer(); return; }

    let timer = null;
    const schedule = () => {
      if (timer) return;
      timer = setTimeout(() => setOpen(true), DELAY_MS);
    };

    // TWO entry points, because this component is mounted once for the whole
    // session while the offer is raised much later, at the end of a publish:
    //   • the flag is already set — a reload straight after publishing;
    //   • it is set moments from now — the publish flow announces it by event,
    //     which is the normal path.
    // Reading the flag only on mount would miss every normal publish.
    let pending = null;
    try { pending = localStorage.getItem(OFFER_KEY); } catch { /* storage blocked */ }
    if (pending) schedule();

    window.addEventListener('joba24:offer-app', schedule);
    return () => {
      window.removeEventListener('joba24:offer-app', schedule);
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => { clearOffer(); setOpen(false); };

  // No destination configured means no popup: an offer with nothing to tap would
  // be worse than no offer at all.
  if (!open || !hasStoreLink) return null;

  return createPortal(
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(5,15,40,0.6)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <motion.div
        dir={isRTL ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        style={{
          background: 'var(--sheet-bg, var(--surface-2))',
          borderRadius: '28px 28px 0 0',
          border: '1px solid var(--border-1)',
          borderBottom: 'none',
          width: '100%', maxWidth: 460,
          padding: '22px 22px max(22px, env(safe-area-inset-bottom))',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.22)',
        }}
      >
        {/* Title, one clear explanation, the buttons, and the way out. Nothing
            else competes for the eye — this is the moment the publisher has the
            most reason to install, so the screen says one thing only. */}
        <div style={{ fontSize: 21, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.3, marginBottom: 10 }}>
          {t('app_dl_title')}
        </div>

        <p style={{ margin: '0 0 20px', fontSize: 14.5, lineHeight: 1.65, color: 'var(--text-2)' }}>
          {t('app_dl_body')}
        </p>

        <StoreDownloadButtons size="md" align="center" />

        <button
          onClick={close}
          style={{
            width: '100%', height: 44, marginTop: 12, borderRadius: 12,
            background: 'transparent', border: 'none',
            color: 'var(--text-3)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {t('app_dl_later')}
        </button>
      </motion.div>
    </div>,
    document.body
  );
}