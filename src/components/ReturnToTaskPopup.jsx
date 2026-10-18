import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { selectTask } from '@/lib/taskCache';
import { useLanguage } from '@/lib/LanguageContext';
import { X, ClipboardList, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

/**
 * ReturnToTaskPopup — the bar that offers to take the user back to the task
 * they stepped away from.
 *
 * One card, one obvious action: the body of the card returns to the task, and a
 * separate X dismisses the offer. It carries the task's own identity (title,
 * price, place) so the user recognises WHICH task it is without having to
 * remember, and it is built entirely from theme tokens so it follows Light /
 * Dark mode and whatever Brand is running.
 */
export default function ReturnToTaskPopup() {
  const { hiddenTaskId, clearHiddenTask, openTaskSheet } = useTaskSheet();
  const { t, isRTL } = useLanguage();
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);

  const { data: task } = useQuery({
    queryKey: ['task', hiddenTaskId],
    queryFn: () => base44.entities.Task.filter({ id: hiddenTaskId }),
    select: selectTask,
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

  // Never over the first-run flow or the publish form — this bar floats in the
  // same bottom band their full-width action button occupies.
  if (pathname === '/welcome' || pathname === '/create-task') return null;
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

  const Chevron = isRTL ? ChevronLeft : ChevronRight;
  const price = task?.price ?? task?.base_price;
  const place = task?.city || task?.location_name;

  return createPortal(
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed',
        bottom: 'calc(68px + env(safe-area-inset-bottom))',
        left: 0, right: 0,
        zIndex: 999998,
        padding: '0 12px',
        pointerEvents: 'none',
      }}
    >
      <style>{`
        @keyframes returnCardIn {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes returnSheen {
          0%        { transform: translateX(-120%); }
          55%, 100% { transform: translateX(320%); }
        }
      `}</style>

      <div
        style={{
          position: 'relative',
          maxWidth: 480,
          margin: '0 auto',
          pointerEvents: 'auto',
          borderRadius: 18,
          overflow: 'hidden',
          background: 'var(--brand-modal-bg, var(--surface-2))',
          border: '1px solid var(--brand-modal-border, var(--border-1))',
          boxShadow: 'var(--shadow-lg)',
          animation: 'returnCardIn 0.32s cubic-bezier(0.34, 1.2, 0.64, 1)',
        }}
      >
        {/* Brand accent — a thin gradient edge, so the bar reads as the app's own */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, var(--brand-primary), var(--brand-primary-dark), var(--brand-accent))',
        }} />

        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          {/* ── The return action: the whole body of the card ── */}
          <button
            onClick={handleReturn}
            style={{
              flex: 1, minWidth: 0, minHeight: 'unset',
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              textAlign: 'start', position: 'relative', overflow: 'hidden',
            }}
          >
            {/* Sheen sweeping across once on appear — draws the eye without moving layout */}
            <span style={{
              position: 'absolute', top: 0, bottom: 0, left: 0, width: '34%',
              background: 'linear-gradient(100deg, transparent, var(--brand-primary-light), transparent)',
              animation: 'returnSheen 2.6s ease-in-out 0.35s 1',
              pointerEvents: 'none',
            }} />

            <span style={{
              width: 40, height: 40, borderRadius: 13, flexShrink: 0,
              background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(26,111,212,0.3)',
            }}>
              <ClipboardList size={19} color="var(--brand-btn-primary-text, #ffffff)" />
            </span>

            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{
                display: 'block', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.4,
                color: 'var(--brand-primary)', textTransform: 'uppercase', marginBottom: 2,
              }}>
                {t('view_task')}
              </span>
              {task?.title ? (
                <span style={{
                  display: 'block', fontSize: 14, fontWeight: 800, color: 'var(--text-1)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {task.title}
                </span>
              ) : null}
              {(price || place) ? (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginTop: 3,
                  fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)',
                  overflow: 'hidden', whiteSpace: 'nowrap',
                }}>
                  {price ? <span style={{ color: 'var(--brand-primary)' }}>₪{price}</span> : null}
                  {place ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <MapPin size={10} /> {place}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </span>

            <span style={{
              width: 30, height: 30, borderRadius: 10, flexShrink: 0,
              background: 'var(--brand-primary-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Chevron size={16} color="var(--brand-primary)" strokeWidth={2.6} />
            </span>
          </button>

          {/* ── Dismiss — deliberately separate from the return action ── */}
          <button
            onClick={dismiss}
            aria-label={t('close')}
            className="j-icon-btn"
            style={{
              width: 42, flexShrink: 0,
              background: 'transparent', border: 'none',
              borderInlineStart: '1px solid var(--border-1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={15} color="var(--text-3)" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}