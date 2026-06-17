import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

export default function LiveNotificationPopup({ notification, onClose }) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const [swipeY, setSwipeY] = useState(0);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const DURATION = 7500;
  const touchStartY = useRef(null);

  const TYPES = {
    new_message:           { emoji: '💬', title: (n) => `${t('notif_new_message')}${n.senderName || ''}`,   body: (n) => n.preview || t('notif_preview'),                link: (n) => n.taskId ? `/chat/${n.taskId}` : null },
    task_taken:            { emoji: '🎉', title: ()  => t('notif_task_taken'),                               body: (n) => n.taskTitle ? `"${n.taskTitle}" — ${t('notif_click_approve')}` : t('notif_click_approve'), link: (n) => n.taskId ? `/task/${n.taskId}` : null },
    application_received:  { emoji: '✋', title: ()  => t('notif_app_received'),                             body: (n) => n.taskTitle ? `"${n.taskTitle}" — ${t('notif_check')}` : t('notif_check'),  link: (n) => n.taskId ? `/task/${n.taskId}` : null },
    application_approved:  { emoji: '🎯', title: ()  => t('notif_app_approved'),                            body: (n) => n.taskTitle ? `"${n.taskTitle}" — ${t('notif_start')}` : t('notif_start'), link: (n) => n.taskId ? `/task/${n.taskId}` : null },
    application_sent:      { emoji: '📤', title: ()  => t('notif_app_sent'),                                body: ()  => t('notif_waiting_publisher'),                     link: (n) => n.taskId ? `/task/${n.taskId}` : null },
    application_rejected:  { emoji: '❌', title: ()  => t('notif_app_rejected'),                            body: (n) => n.taskTitle ? `"${n.taskTitle}"` : t('notif_credits_returned'), link: (n) => n.taskId ? `/task/${n.taskId}` : null },
    worker_on_the_way:     { emoji: '🚗', title: ()  => t('notif_on_the_way'),                              body: (n) => n.taskTitle ? `"${n.taskTitle}"` : t('notif_worker_coming'),  link: (n) => n.taskId ? `/task/${n.taskId}` : null },
    worker_arrived:        { emoji: '📍', title: ()  => t('notif_arrived'),                                 body: (n) => n.taskTitle ? `"${n.taskTitle}"` : t('notif_at_door'),           link: (n) => n.taskId ? `/task/${n.taskId}` : null },
    worker_done:           { emoji: '✅', title: ()  => t('notif_done'),                                    body: (n) => n.taskTitle ? `"${n.taskTitle}" — ${t('notif_confirm_payment')}` : t('notif_confirm_payment'), link: (n) => n.taskId ? `/task/${n.taskId}` : null },
    new_review:            { emoji: '⭐', title: ()  => t('notif_new_review'),                              body: (n) => n.preview || t('notif_view_profile'),             link: () => null },
    task_cancelled_worker: { emoji: '🚫', title: ()  => t('notif_task_cancelled'),                          body: (n) => n.taskTitle ? `"${n.taskTitle}"` : '',            link: () => null },
    approval_revoked:      { emoji: '↩️', title: ()  => t('notif_approval_revoked'),                       body: (n) => n.taskTitle ? `"${n.taskTitle}" — ${t('notif_back_to_open')}` : '', link: (n) => n.taskId ? `/task/${n.taskId}` : null },
    worker_left_task:      { emoji: '🚪', title: (n) => `${n.workerName || ''} ${t('notif_worker_left')}`, body: (n) => n.taskTitle ? `"${n.taskTitle}"` : '',            link: (n) => n.taskId ? `/task/${n.taskId}` : null },
    no_show_reported:      { emoji: '⚠️', title: ()  => t('notif_no_show'),                                body: (n) => n.taskTitle ? `"${n.taskTitle}"` : t('notif_trust_updated'), link: () => null },
    boost_available:       { emoji: '⚡', title: ()  => t('notif_boost_available'),                        body: (n) => n.taskTitle ? `"${n.taskTitle}" — ${t('notif_boost_sub')}` : t('notif_boost_amplify'), link: (n) => n.taskId ? `/task/${n.taskId}` : null },
  };

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setProgress(Math.max(0, 100 - ((Date.now() - start) / DURATION) * 100));
    }, 50);
    const timer = setTimeout(() => { setVisible(false); onClose?.(); }, DURATION);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [onClose]);

  if (!visible) return null;

  const cfg = TYPES[notification.type] || TYPES.application_received;
  const link = cfg.link?.(notification);

  const dismiss = () => { setVisible(false); onClose?.(); };
  const handleClick = () => { if (link) { dismiss(); navigate(link); } };

  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchMove = (e) => {
    if (touchStartY.current === null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy < 0) setSwipeY(dy);
  };
  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (dy < -40) dismiss();
    else setSwipeY(0);
    touchStartY.current = null;
  };

  return (
    <div
      dir="auto"
      style={{ padding: '8px 12px', transform: `translateY(${swipeY}px)`, transition: swipeY === 0 ? 'transform 0.22s ease' : 'none' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <style>{`
        @keyframes notifSlide {
          from { opacity: 0; transform: translateY(-20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
      <div
        onClick={handleClick}
        style={{
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(0,0,0,0.09)',
          borderRadius: 22,
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.16)',
          animation: 'notifSlide 0.38s cubic-bezier(0.34, 1.4, 0.64, 1)',
          cursor: link ? 'pointer' : 'default',
        }}
      >
        <div style={{ height: 3, background: 'rgba(0,0,0,0.06)' }}>
          <div style={{ height: '100%', background: '#1a6fd4', width: `${progress}%`, transition: 'width 0.05s linear' }} />
        </div>

        <div style={{ padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14,
            background: '#f4f7fb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, flexShrink: 0,
          }}>
            {cfg.emoji}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 15, color: '#0f1e40', marginBottom: 3, lineHeight: 1.25 }}>
              {cfg.title(notification)}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>
              {cfg.body(notification)}
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); dismiss(); }}
            style={{ width: 26, height: 26, borderRadius: 9, background: '#f1f5f9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <X size={13} color="#94a3b8" />
          </button>
        </div>
      </div>
    </div>
  );
}