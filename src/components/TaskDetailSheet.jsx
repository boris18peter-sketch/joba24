import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { Loader2 } from 'lucide-react';
import { lazy, Suspense } from 'react';

const TaskDetail = lazy(() => import('@/pages/TaskDetail'));

export default function TaskDetailSheet() {
  const { sheetTaskId, closeTaskSheet } = useTaskSheet();
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  // Close sheet on route change (navigating from within TaskDetail)
  useEffect(() => {
    if (sheetTaskId && location.pathname !== prevPathRef.current) {
      closeTaskSheet();
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname, sheetTaskId, closeTaskSheet]);

  // Reset expanded state when task changes
  useEffect(() => {
    if (sheetTaskId) setExpanded(false);
  }, [sheetTaskId]);

  // Close on Escape
  useEffect(() => {
    if (!sheetTaskId) return;
    const handler = (e) => { if (e.key === 'Escape') closeTaskSheet(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sheetTaskId, closeTaskSheet]);

  return createPortal(
    <AnimatePresence>
      {sheetTaskId && (
        <motion.div
          key="task-sheet-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={closeTaskSheet}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(5,15,40,0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <motion.div
            key={`task-sheet-${sheetTaskId}`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.01, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) {
                closeTaskSheet();
              } else if (info.offset.y < -80) {
                setExpanded(true);
              } else if (info.offset.y > 40 && expanded) {
                setExpanded(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480,
              height: expanded ? '95dvh' : '68dvh',
              background: 'var(--surface-1)',
              borderRadius: '24px 24px 0 0',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}
            dir="rtl"
          >
            {/* Drag handle */}
            <div
              onClick={() => setExpanded(e => !e)}
              style={{
                padding: '10px 0 6px', cursor: 'pointer',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                flexShrink: 0,
                background: 'var(--surface-2)',
                borderRadius: '24px 24px 0 0',
                borderBottom: '1px solid var(--border-1)',
              }}
            >
              <div style={{
                width: 40, height: 4, borderRadius: 99,
                background: 'var(--border-1)',
              }} />
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
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