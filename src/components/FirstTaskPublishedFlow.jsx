import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

import StoreDownloadButtons from '@/components/StoreDownloadButtons';
import ApplicantsGoldButton from '@/components/ApplicantsGoldButton';
import { isNativeLike } from '@/lib/nativeEnv';
import { useJobaSettings } from '@/hooks/useJobaSettings';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { onFirstTaskFlow } from '@/lib/firstTaskFlow';
import { clearAppOffer } from '@/lib/appOffer';

/**
 * FirstTaskPublishedFlow — ONE window, two steps, no close-and-reopen.
 *
 *   step 1  your task is live + what the applicants button will look like
 *   step 2  the app download (web only, when a store link is configured)
 *
 * The frame and the backdrop never move between the steps: only the content
 * cross-fades, so it reads as two screens of one flow rather than two popups
 * arriving one after the other.
 *
 * In the installed app there is nothing to download, so the flow is step 1 only
 * and "הבנתי" simply closes it.
 */
export default function FirstTaskPublishedFlow() {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const { settings } = useJobaSettings();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);

  // Step 2 exists only where it can lead somewhere: the browser, with the store
  // buttons enabled AND a real link to send them to.
  const canOfferApp = !isNativeLike()
    && settings?.store_buttons_enabled !== false
    && !!(settings?.app_store_url || settings?.google_play_url);

  useEffect(() => onFirstTaskFlow(() => {
    // Once per USER, for good — the flag is on the User record, so it holds
    // across every device they sign in on.
    if (user?.first_task_intro_seen) return;
    setStep(1);
    setOpen(true);
  }), [user?.first_task_intro_seen]);

  // Persisted on the user, never in localStorage — this is the "once per person"
  // half of the flow, and it is deliberately independent of the download step.
  const markIntroSeen = () => {
    base44.auth.updateMe({ first_task_intro_seen: true }).catch(() => {});
  };

  const finish = () => {
    clearAppOffer('publish');
    markIntroSeen();
    setOpen(false);
  };

  const onGotIt = () => {
    markIntroSeen();
    if (canOfferApp) { setStep(2); return; }
    setOpen(false);
  };

  if (!open) return null;

  return createPortal(
    <div
      onClick={finish}
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
        // `layout` animates the card's own height between the two steps, so the
        // window never jumps when the content changes.
        layout
        style={{
          position: 'relative',
          background: 'var(--sheet-bg, var(--surface-2))',
          borderRadius: '28px 28px 0 0',
          border: '1px solid var(--border-1)',
          borderBottom: 'none',
          width: '100%', maxWidth: 460,
          padding: '22px 22px max(22px, env(safe-area-inset-bottom))',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.22)',
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {step === 1 ? (
              <>
                <div style={{ fontSize: 21, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.3, marginBottom: 10 }}>
                  {t('ftp_title')}
                </div>

                <p style={{ margin: '0 0 16px', fontSize: 14.5, lineHeight: 1.65, color: 'var(--text-2)' }}>
                  {t('ftp_body')}
                </p>

                {/* The REAL gold control — same component the task card renders —
                    so the publisher recognises it the moment it turns gold. */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9,
                  padding: '16px 14px',
                  borderRadius: 'var(--r-md)',
                  background: 'var(--surface-3)',
                  border: '1px solid var(--border-1)',
                  marginBottom: 18,
                }}>
                  <ApplicantsGoldButton count={3} label={t('view_applicants')} inert />
                  <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-3)', fontWeight: 600, textAlign: 'center' }}>
                    {t('ftp_hint')}
                  </span>
                </div>

                <button
                  onClick={onGotIt}
                  style={{
                    width: '100%', height: 52, border: 'none', cursor: 'pointer',
                    borderRadius: 15,
                    background: 'linear-gradient(135deg, var(--brand-btn-primary-bg, var(--brand-primary)), var(--brand-btn-primary-bg, var(--brand-primary-dark)))',
                    color: 'var(--brand-btn-primary-text, #ffffff)',
                    fontSize: 16.5, fontWeight: 900,
                    boxShadow: '0 8px 22px rgba(26,111,212,0.28)',
                  }}
                >
                  {t('ftp_got_it')}
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 21, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.3, marginBottom: 10 }}>
                  {t('ftp_dl_title')}
                </div>

                <p style={{ margin: '0 0 20px', fontSize: 14.5, lineHeight: 1.65, color: 'var(--text-2)' }}>
                  {t('app_dl_body')}
                </p>

                <StoreDownloadButtons size="md" align="center" />

                <button
                  onClick={finish}
                  style={{
                    width: '100%', height: 44, marginTop: 12, borderRadius: 12,
                    background: 'transparent', border: 'none',
                    color: 'var(--text-3)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {t('app_dl_later')}
                </button>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>,
    document.body
  );
}