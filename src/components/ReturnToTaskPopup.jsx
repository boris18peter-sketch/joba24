import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { X, ArrowUp } from 'lucide-react';

/**
 * ReturnToTaskPopup — shows a bottom popup when the user navigates away from
 * the TaskDetail sheet (e.g., to view a profile). Lets them return to the task.
 */
export default function ReturnToTaskPopup() {
  const { hiddenTaskId, clearHiddenTask, openTaskSheet } = useTaskSheet();
  const [visible, setVisible] = useState(false);
  const [swipeY, setSwipeY] = useState(0);
  const touchStartY = useRef(null);

  const { data: task } = useQuery({
    queryKey: ['task', hiddenTaskId],
    queryFn: () => base44.entities.Task.filter({ id: hiddenTaskId }),
    select: d => d?.[0],
    enabled: !!hiddenTaskId,
    staleTime: 60000,
  });

  useEffect(() => {
    if (hiddenTaskId) {
      setVisible(true);
      setSwipeY(0);
    } else {
      setVisible(false);
    }
  }, [hiddenTaskId]);

  // Auto-dismiss after 20 seconds
  useEffect(() => {
    if (!hiddenTaskId) return;
    const timer = setTimeout(() => {
      dismiss();
    }, 20000);
    return () => clearTimeout(timer);
  }, [hiddenTaskId]);

  if (!hiddenTaskId || !visible) return null;

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => clearHiddenTask(), 300);
  };

  const handleReturn = () => {
    setVisible(false);
    openTaskSheet(hiddenTaskId);
    setTimeout(() => clearHiddenTask(), 300);
  };

  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchMove = (e) => {
    if (touchStartY.current === null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) setSwipeY(dy);
  };
  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (dy > 40) dismiss();
    else setSwipeY(0);
    touchStartY.current = null;
  };

  return createPortal(
    <div
      dir="rtl"
      style={{
        position: 'fixed',
        bottom: 'calc(72px + env(safe-area-inset-bottom))',
        left: 0, right: 0,
        zIndex: 999998,
        padding: '0 12px',
        transform: `translateY(${swipeY}px)`,
        transition: swipeY === 0 ? 'transform 0.22s ease, opacity 0.3s ease' : 'none',
        opacity: visible ? 1 : 0,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <style>{`
        @keyframes returnPopupSlide {
          from { opacity: 0; transform: translateY(24px) scale(0.93); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
      <div
        style={{
          background: 'var(--surface-2)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--border-1)',
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.14)',
          animation: 'returnPopupSlide 0.35s cubic-bezier(0.34, 1.4, 0.64, 1)',
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 13,
            background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <ArrowUp size={20} color="white" strokeWidth={2.2} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-1)', lineHeight: 1.25 }}>
              חזרה למשימה
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
              {task?.title || 'טוען...'}
            </div>
          </div>

          <button
            onClick={handleReturn}
            style={{
              height: 38, padding: '0 16px', borderRadius: 12,
              background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
              border: 'none', color: 'white', fontWeight: 800, fontSize: 13,
              cursor: 'pointer', flexShrink: 0,
              boxShadow: '0 3px 10px rgba(26,111,212,0.3)',
            }}
          >
            חזור
          </button>

          <button
            onClick={dismiss}
            className="j-icon-btn"
            style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-3)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <X size={14} color="var(--text-3)" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}