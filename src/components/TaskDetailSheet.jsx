import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { Loader2 } from 'lucide-react';
import { lazy, Suspense } from 'react';

const TaskDetail = lazy(() => import('@/pages/TaskDetail'));

const ENTER_SPRING = { type: 'spring', damping: 36, stiffness: 420, mass: 0.65 };

export default function TaskDetailSheet() {
  const { sheetTaskId, closeTaskSheet } = useTaskSheet();
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  const scrollRef = useRef(null);

  // Route change: close sheet immediately
  useEffect(() => {
    if (sheetTaskId && location.pathname !== prevPathRef.current) {
      closeTaskSheet();
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname, sheetTaskId, closeTaskSheet]);

  // Instant close event (from boost, repost, edit, etc.)
  useEffect(() => {
    const handler = () => closeTaskSheet();
    window.addEventListener('close_task_sheet', handler);
    return () => window.removeEventListener('close_task_sheet', handler);
  }, [closeTaskSheet]);

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

  // Reset scroll and expanded on open
  useEffect(() => {
    if (sheetTaskId) {
      setExpanded(false);
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
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(5,15,40,0.5)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={ENTER_SPRING}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          const { offset, velocity } = info;
          if (offset.y > 100 || velocity.y > 500) {
            closeTaskSheet();
          } else if (offset.y < -50 || velocity.y < -500) {
            setExpanded(true);
          } else if (offset.y > 30 && expanded) {
            setExpanded(false);
          }
        }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          height: expanded ? '92dvh' : '70dvh',
          background: 'var(--surface-1)',
          borderRadius: '28px 28px 0 0',
          boxShadow: '0 -12px 48px rgba(0,0,0,0.22), 0 -1px 0 rgba(255,255,255,0.06) inset',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          transition: 'height 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        dir="rtl"
      >
        {/* Drag handle */}
        <div
          onClick={() => setExpanded(v => !v)}
          style={{
            padding: '10px 0 6px',
            cursor: 'grab',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 3,
            flexShrink: 0,
            background: 'var(--surface-2)',
            borderRadius: '28px 28px 0 0',
            touchAction: 'none',
          }}
        >
          <div style={{
            width: 42, height: 5, borderRadius: 99,
            background: 'var(--border-2)',
          }} />
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'var(--text-3)',
            letterSpacing: 0.3, userSelect: 'none',
          }}>
            {expanded ? 'גרור למטה לסגירה' : 'גרור למעלה להרחבה'}
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
            touchAction: 'pan-y',
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
    </div>,
    document.body
  );
}