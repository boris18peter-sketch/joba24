import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { Loader2, X } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { lazy, Suspense } from 'react';

const TaskDetail = lazy(() => import('@/pages/TaskDetail'));

// Task detail popup — a centered modal (replaces the old bottom sheet).
// Rendered globally (in App.jsx) so it works on every page, including Chat
// (which lives outside the Layout). Opens via `openTaskSheet(taskId)`.
export default function TaskDetailSheet() {
  const { sheetTaskId, closeTaskSheet, hideTaskSheet } = useTaskSheet();
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

  const closeBtnSide = isRTL ? 'left' : 'right';

  return createPortal(
    <div
      onClick={closeTaskSheet}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(5,15,40,0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        animation: 'tdPopupFade 0.2s ease',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320, mass: 0.7 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          maxHeight: '88dvh',
          background: 'var(--surface-1)',
          borderRadius: 24,
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          position: 'relative',
        }}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Close button */}
        <button
          onClick={closeTaskSheet}
          aria-label="Close"
          style={{
            position: 'absolute', top: 10, [closeBtnSide]: 10,
            width: 34, height: 34, borderRadius: 10,
            background: 'var(--surface-3)', border: '1px solid var(--border-1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10, flexShrink: 0,
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <X size={18} color="var(--text-2)" />
        </button>

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