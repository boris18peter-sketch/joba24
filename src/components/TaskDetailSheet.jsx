import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { lazy, Suspense } from 'react';

const TaskDetail = lazy(() => import('@/pages/TaskDetail'));

// Task detail popup — a bottom sheet (non-floating), like previous versions.
// Rendered globally (in App.jsx) so it works on every page, including Chat
// (which lives outside the Layout). Opens via `openTaskSheet(taskId)`.
//
// The action buttons (kebab / Share / Close) live inside the task card header
// in TaskDetail so they sit together in one neat row. This wrapper only
// provides the sheet chrome (drag handle + scrollable content).
export default function TaskDetailSheet() {
  const { sheetTaskId, closeTaskSheet, hideTaskSheet, dismissTaskSheet } = useTaskSheet();
  const { isRTL } = useLanguage();
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  const scrollRef = useRef(null);

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

  // Silent dismissal — hides the popup and clears every trace of it, so the
  // screen that replaced it (the Boost overlay) can be closed without anything
  // else appearing underneath.
  useEffect(() => {
    const handler = () => dismissTaskSheet();
    window.addEventListener('dismiss_task_sheet', handler);
    return () => window.removeEventListener('dismiss_task_sheet', handler);
  }, [dismissTaskSheet]);

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

  if (!sheetTaskId) return null;

  return createPortal(
    <div
      onClick={closeTaskSheet}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000000,
        background: 'var(--overlay-bg)',
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
          background: 'var(--brand-modal-bg, var(--surface-1))',
          borderRadius: 'var(--brand-modal-radius, 24px) var(--brand-modal-radius, 24px) 0 0',
          border: '1px solid var(--brand-modal-border, var(--border-1))',
          '--brand-btn-primary-bg': 'var(--brand-modal-cta-bg)',
          '--brand-btn-primary-text': 'var(--brand-modal-cta-text)',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          position: 'relative',
        }}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Drag handle */}
        <div style={{ flexShrink: 0, paddingTop: 10, paddingBottom: 6, background: 'var(--brand-modal-bg, var(--surface-1))' }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '0 auto' }} />
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
          {/* ── A SKELETON, NOT A SPINNER ─────────────────────────────────────
              The sheet paints its own shape for the instant the module resolves
              (the chunk is warmed during idle and the task's own record is seeded
              by the tap, so this is a frame or two at most). A centred spinner in
              that gap read as "something is loading"; the sheet's own silhouette
              reads as the sheet arriving, which is what is actually happening. */}
          <Suspense fallback={
            <div style={{ padding: '8px 16px 24px' }} aria-hidden="true">
              <div style={{ height: 96, borderRadius: 18, background: 'var(--surface-3)' }} />
              <div style={{ height: 18, width: '62%', borderRadius: 8, background: 'var(--surface-3)', marginTop: 16 }} />
              <div style={{ height: 12, width: '38%', borderRadius: 8, background: 'var(--surface-3)', marginTop: 10 }} />
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ height: 44, borderRadius: 12, background: 'var(--surface-3)', marginTop: 12, opacity: 1 - i * 0.22 }} />
              ))}
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