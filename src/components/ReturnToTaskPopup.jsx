import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { X, ArrowUp } from 'lucide-react';

/**
 * ReturnToTaskPopup — a minimal bottom footer that lets the user return to the
 * task sheet they navigated away from. Just a single "צפייה במשימה" button and
 * a close (X) button. Fixed footer, not a floating card.
 */
export default function ReturnToTaskPopup() {
  const { hiddenTaskId, clearHiddenTask, openTaskSheet } = useTaskSheet();
  const [visible, setVisible] = useState(false);

  const { data: task } = useQuery({
    queryKey: ['task', hiddenTaskId],
    queryFn: () => base44.entities.Task.filter({ id: hiddenTaskId }),
    select: d => d?.[0],
    enabled: !!hiddenTaskId,
    staleTime: 60000,
  });

  useEffect(() => {
    if (hiddenTaskId) setVisible(true);
    else setVisible(false);
  }, [hiddenTaskId]);

  // Auto-dismiss after 20 seconds
  useEffect(() => {
    if (!hiddenTaskId) return;
    const timer = setTimeout(() => dismiss(), 20000);
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

  return createPortal(
    <div
      dir="rtl"
      style={{
        position: 'fixed',
        bottom: 'calc(68px + env(safe-area-inset-bottom))',
        left: 0, right: 0,
        zIndex: 999998,
        padding: '0 12px',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.25s ease',
      }}
    >
      <style>{`
        @keyframes returnFooterSlide {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border-1)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 -2px 14px rgba(0,0,0,0.10)',
          animation: 'returnFooterSlide 0.28s cubic-bezier(0.34, 1.2, 0.64, 1)',
          maxWidth: 480,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Close */}
        <button
          onClick={dismiss}
          aria-label="סגור"
          className="j-icon-btn"
          style={{
            width: 44, height: 48, flexShrink: 0,
            background: 'transparent', border: 'none',
            borderLeft: '1px solid var(--border-1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={16} color="var(--text-3)" />
        </button>

        {/* Single return button */}
        <button
          onClick={handleReturn}
          style={{
            flex: 1, height: 48, border: 'none',
            background: 'transparent',
            color: 'var(--text-1)', fontWeight: 800, fontSize: 14,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <ArrowUp size={16} color="#1a6fd4" strokeWidth={2.2} />
          צפייה במשימה{task?.title ? ` · ${task.title}` : ''}
        </button>
      </div>
    </div>,
    document.body
  );
}