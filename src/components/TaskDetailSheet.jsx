import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { Loader2 } from 'lucide-react';
import { lazy, Suspense } from 'react';

const TaskDetail = lazy(() => import('@/pages/TaskDetail'));

const SPRING_CONFIG = { type: 'spring', damping: 38, stiffness: 400, mass: 0.7 };
const HEIGHT_TRANSITION = 'height 0.42s cubic-bezier(0.32, 0.72, 0, 1)';

export default function TaskDetailSheet() {
  const { sheetTaskId, closeTaskSheet } = useTaskSheet();
  const [expanded, setExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (sheetTaskId && location.pathname !== prevPathRef.current) {
      closeTaskSheet();
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname, sheetTaskId, closeTaskSheet]);

  useEffect(() => {
    if (sheetTaskId) {
      setExpanded(false);
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
      });
    }
  }, [sheetTaskId]);

  useEffect(() => {
    if (!sheetTaskId) return;
    const handler = (e) => { if (e.key === 'Escape') closeTaskSheet(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sheetTaskId, closeTaskSheet]);

  useEffect(() => {
    if (sheetTaskId) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [sheetTaskId]);

  return createPortal(
    <AnimatePresence>
      {sheetTaskId && (
        <motion.div
          key="task-sheet-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
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
            key={`task-sheet-${sheetTaskId}`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SPRING_CONFIG}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            dragMomentum={false}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={(_, info) => {
              setIsDragging(false);
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
              transition: isDragging ? 'none' : HEIGHT_TRANSITION,
              touchAction: 'none',
            }}
            dir="rtl"
          >
            {/* Drag handle */}
            <div
              onClick={() => { if (!isDragging) setExpanded(v => !v); }}
              style={{
                padding: '8px 0 4px',
                cursor: 'grab',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                flexShrink: 0,
                background: 'var(--surface-2)',
                borderRadius: '28px 28px 0 0',
                position: 'relative',
              }}
            >
              <div style={{
                width: 36, height: 4, borderRadius: 99,
                background: 'var(--border-2)',
              }} />
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
                position: 'relative',
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
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}