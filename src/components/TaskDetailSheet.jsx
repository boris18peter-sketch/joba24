import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { Loader2, X, Share, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';
import { lazy, Suspense } from 'react';

const TaskDetail = lazy(() => import('@/pages/TaskDetail'));

// Task detail popup — a bottom sheet (non-floating), like previous versions.
// Rendered globally (in App.jsx) so it works on every page, including Chat
// (which lives outside the Layout). Opens via `openTaskSheet(taskId)`.
//
// The header holds three small, neat action buttons together: the owner kebab
// (3-dots), Share, and Close (X). The kebab only appears when the embedded
// TaskDetail signals it is an owner task that can be managed — it taps back
// into TaskDetail via a window event so all menu logic stays there.
export default function TaskDetailSheet() {
  const { sheetTaskId, closeTaskSheet, hideTaskSheet } = useTaskSheet();
  const { isRTL, t } = useLanguage();
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  const scrollRef = useRef(null);
  const [showKebab, setShowKebab] = useState(false);

  // Route change: hide the popup when the user navigates away (e.g. taps a
  // profile link inside it). The {taskSheet} history entry stays so pressing
  // Back restores the popup via the popstate handler in TaskSheetContext.
  useEffect(() => {
    if (sheetTaskId && location.pathname !== prevPathRef.current) {
      if (!window.history.state?.taskSheet) {
        hideTaskSheet();
      }
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname, sheetTaskId, hideTaskSheet]);

  // Instant close event (from boost, repost, edit, etc.)
  useEffect(() => {
    const handler = () => closeTaskSheet();
    window.addEventListener('close_task_sheet', handler);
    return () => window.removeEventListener('close_task_sheet', handler);
  }, [closeTaskSheet]);

  // Hide event — hides the popup WITHOUT history manipulation
  useEffect(() => {
    const handler = () => hideTaskSheet();
    window.addEventListener('hide_task_sheet', handler);
    return () => window.removeEventListener('hide_task_sheet', handler);
  }, [hideTaskSheet]);

  // Escape key
  useEffect(() => {
    if (!sheetTaskId) return;
    const handler = (e) => { if (e.key === 'Escape') closeTaskSheet(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sheetTaskId, closeTaskSheet]);

  // Lock body scroll
  useEffect(() => {
    if (sheetTaskId) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [sheetTaskId]);

  // Reset scroll on open
  useEffect(() => {
    if (sheetTaskId) {
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
      });
    }
  }, [sheetTaskId]);

  // Owner kebab visibility is driven by the embedded TaskDetail
  useEffect(() => {
    const handler = (e) => setShowKebab(!!e.detail?.canManage);
    window.addEventListener('task_sheet_menu_state', handler);
    return () => window.removeEventListener('task_sheet_menu_state', handler);
  }, []);

  if (!sheetTaskId) return null;

  // Native share sheet (Apple on iOS, Android/Google on Android). Falls back to
  // copying the link when the Web Share API is unavailable (desktop browsers).
  // The link opens the task popup in the app (PWA deep link / installed app) or
  // on the website for recipients who don't have the app installed.
  const handleShare = async () => {
    const url = `${window.location.origin}/?open_task=${sheetTaskId}`;
    const shareData = { title: 'Joba24', url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(t('share_link_copied'));
      }
    } catch (e) {
      if (e?.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(url);
          toast.success(t('share_link_copied'));
        } catch {}
      }
    }
  };

  const btnStyle = {
    width: 30, height: 30, borderRadius: 9,
    background: 'var(--surface-3)', border: '1px solid var(--border-1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0, boxShadow: 'var(--shadow-xs)',
  };

  return createPortal(
    <div
      onClick={closeTaskSheet}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(5,15,40,0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'tdPopupFade 0.2s ease',
      }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 34, stiffness: 300, mass: 0.8 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          maxHeight: '92dvh',
          background: 'var(--surface-1)',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          position: 'relative',
        }}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Sheet header — drag handle + neat row of kebab / Share / Close */}
        <div style={{
          flexShrink: 0,
          paddingTop: 10, paddingBottom: 8,
          background: 'var(--surface-1)',
          borderBottom: '1px solid var(--border-1)',
          zIndex: 5,
        }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '0 auto 8px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px 2px' }}>
            {showKebab && (
              <button
                className="j-icon-btn"
                onClick={() => window.dispatchEvent(new CustomEvent('toggle_owner_menu'))}
                aria-label="More"
                style={btnStyle}
              >
                <MoreVertical size={15} color="var(--text-2)" />
              </button>
            )}
            <button
              className="j-icon-btn"
              onClick={handleShare}
              aria-label={t('share_task')}
              style={btnStyle}
            >
              <Share size={15} color="var(--text-2)" />
            </button>
            <button
              className="j-icon-btn"
              onClick={closeTaskSheet}
              aria-label="Close"
              style={btnStyle}
            >
              <X size={15} color="var(--text-2)" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          }}
        >
          <Suspense fallback={
            <div style={{ padding: '40px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
              <Loader2 size={28} className="animate-spin" color="#1a6fd4" />
            </div>
          }>
            <TaskDetail taskId={sheetTaskId} sheetMode onSheetClose={closeTaskSheet} />
          </Suspense>
        </div>
      </motion.div>
      <style>{`@keyframes tdPopupFade { from{opacity:0} to{opacity:1} }`}</style>
    </div>,
    document.body
  );
}