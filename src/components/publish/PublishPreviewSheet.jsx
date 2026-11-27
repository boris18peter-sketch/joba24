import { createPortal } from 'react-dom';
import { X, Zap } from 'lucide-react';
import TaskDetailsRows from '@/components/TaskDetailsRows';
import VideoThumb from '@/components/VideoThumb';

/**
 * PublishPreviewSheet — "this is how workers will see it", before publishing.
 *
 * ── IT SHOWS THE TASK, NOT A SECOND DESIGN ──────────────────────────────────
 * The body is the task itself rendered by the SAME components the feed and the
 * task sheet use: the app's card surface for the title, price, description and
 * media, and TaskDetailsRows for every detail row (location, when, requirements,
 * and the category's own answers). Nothing here invents a layout — the point of a
 * preview is that what the publisher sees is what a professional will see.
 *
 * It is deliberately optional and side-effect free: opening it creates no task,
 * sends no notification, and closing it returns to the form with every field,
 * photo and scroll position exactly where they were (the form is never unmounted
 * behind this sheet).
 */
export default function PublishPreviewSheet({ task, t, isRTL, publishing, onClose, onPublish }) {
  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000000,
        background: 'var(--overlay-bg)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          background: 'var(--sheet-bg)', borderRadius: '22px 22px 0 0',
          width: '100%', maxWidth: 480, maxHeight: '92dvh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -16px 60px rgba(0,0,0,0.25)',
          animation: 'sheetSlideUp 0.28s cubic-bezier(0.32,1.2,0.64,1) both',
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '12px auto 0', flexShrink: 0 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px 12px', flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)' }}>{t('preview_title')}</div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-2)', marginTop: 2 }}>{t('preview_subtitle')}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('preview_back_edit')}
            style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--surface-3)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <X size={15} color="var(--text-3)" />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: '0 16px' }}>
          <div className="j-card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 800, lineHeight: 1.3, color: 'var(--text-1)' }}>
                {task.title}
              </div>
              {task.price > 0 && (
                <div style={{ flexShrink: 0, fontSize: 17, fontWeight: 900, color: 'var(--brand-primary)' }}>₪{task.price}</div>
              )}
            </div>

            {task.description && (
              <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>
                {task.description}
              </p>
            )}

            {(task.images?.length > 0 || task.video_url) && (
              <div style={{ display: 'flex', gap: 6, marginTop: 10, overflowX: 'auto' }}>
                {(task.images || []).map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    style={{ width: 84, height: 84, borderRadius: 12, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border-1)' }}
                  />
                ))}
                {task.video_url && (
                  <div style={{ width: 84, height: 84, borderRadius: 12, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border-1)' }}>
                    <VideoThumb src={task.video_url} radius={0} />
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-1)' }}>
              <TaskDetailsRows task={task} showDescription={false} />
            </div>
          </div>
          <div style={{ height: 14 }} />
        </div>

        <div style={{ flexShrink: 0, borderTop: '1px solid var(--border-1)', padding: '10px 16px max(10px, env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            onClick={onPublish}
            disabled={publishing}
            style={{
              width: '100%', height: 52, borderRadius: 14, border: 'none',
              cursor: publishing ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg, var(--brand-btn-primary-bg, var(--brand-primary)), var(--brand-btn-primary-bg, var(--brand-primary-dark)))',
              color: 'var(--brand-btn-primary-text, white)',
              fontSize: 16, fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 6px 20px rgba(26,111,212,0.32)',
            }}
          >
            <Zap size={18} /> {t('preview_publish_cta')}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{ width: '100%', height: 38, marginTop: 2, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 13, fontWeight: 700 }}
          >
            {t('preview_back_edit')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}