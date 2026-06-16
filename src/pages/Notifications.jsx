import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Loader2, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import PageHeader from '@/components/PageHeader';
import { useLanguage } from '@/lib/LanguageContext';

function getTypeConfig(t) {
  return {
    task_taken:            { emoji: '🎉', label: t('notif_worker_found') || 'Worker found!', sub: t('notif_worker_found_sub') || 'Your task was taken successfully' },
    worker_on_the_way:     { emoji: '🚗', label: t('on_the_way') || 'Worker on the way', sub: t('notif_on_the_way_sub') || 'Arriving soon' },
    worker_arrived:        { emoji: '📍', label: t('arrived') || 'Worker arrived', sub: t('notif_arrived_sub') || 'On the job' },
    worker_done:           { emoji: '✅', label: t('done') || 'Work completed', sub: t('notif_done_sub') || 'Approve and close the task' },
    application_received:  { emoji: '✋', label: t('notif_app_received') || 'New application', sub: t('notif_app_received_sub') || 'Someone wants to do your task' },
    application_approved:  { emoji: '🎯', label: t('notif_app_approved') || 'Your application approved!', sub: t('notif_app_approved_sub') || 'Go now' },
    application_sent:      { emoji: '📤', label: t('notif_app_sent') || 'Application sent', sub: t('notif_app_sent_sub') || 'Waiting for publisher approval' },
    application_rejected:  { emoji: '❌', label: t('notif_app_rejected') || 'Application rejected', sub: t('notif_app_rejected_sub') || 'Credits returned to your account' },
    approval_revoked:      { emoji: '↩️', label: t('notif_approval_revoked') || 'Approval cancelled', sub: t('notif_approval_revoked_sub') || 'Task is back to open status' },
    worker_left_task:      { emoji: '🚪', label: t('notif_worker_left') || 'Worker left', sub: t('notif_worker_left_sub') || 'Task is open to workers again' },
    no_show_reported:      { emoji: '⚠️', label: t('notif_no_show') || 'No-show reported', sub: t('notif_no_show_sub') || 'Your trust score updated' },
    task_cancelled_worker: { emoji: '🚫', label: t('notif_task_cancelled') || 'Task cancelled', sub: t('notif_task_cancelled_sub') || 'Cancelled by publisher' },
    new_message:           { emoji: '💬', label: t('notif_new_message') || 'New message', sub: t('notif_new_message_sub') || 'Click to open chat' },
    new_review:            { emoji: '⭐', label: t('notif_new_review') || 'New review', sub: t('notif_new_review_sub') || 'Someone left you a review' },
    boost_signal:          { emoji: '⚡', label: t('notif_boost_signal') || 'Task for you', sub: t('notif_boost_signal_sub') || 'Click to view' },
  };
}

function timeAgo(ts) {
  if (!ts) return '';
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true, locale: he }); }
  catch { return ''; }
}

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notificationsPage'],
    queryFn: async () => JSON.parse(localStorage.getItem('joba24_notifications') || '[]'),
    staleTime: 0,
  });

  const clearAll = () => {
    localStorage.setItem('joba24_notifications', JSON.stringify([]));
    queryClient.setQueryData(['notificationsPage'], []);
    queryClient.invalidateQueries({ queryKey: ['notifUnread'] });
  };

  useEffect(() => {
    if (notifications.some(n => !n.read)) {
      const updated = notifications.map(n => ({ ...n, read: true }));
      localStorage.setItem('joba24_notifications', JSON.stringify(updated));
      queryClient.setQueryData(['notificationsPage'], updated);
      queryClient.invalidateQueries({ queryKey: ['notifUnread'] });
    }
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-1)' }} dir="rtl">
      <PageHeader
        title={t('nav_notifications')}
        right={notifications.length > 0 && (
          <button onClick={clearAll} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 13, fontWeight: 700 }}>
            <Trash2 size={15} /> {t('clear_all') || 'Clear All'}
          </button>
        )}
      />

      <div style={{ padding: '10px 14px 32px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Loader2 size={28} className="animate-spin" color="#1a6fd4" />
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 56, marginBottom: 14 }}>🔔</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)', marginBottom: 8 }}>{t('no_notifications') || 'No notifications'}</div>
            <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>{t('no_notifications_sub') || "When something happens, you'll see it here"}</div>
          </div>
        ) : (
          notifications.map((notif, i) => {
            const cfg = getTypeConfig(t)[notif.type] || { emoji: '📢', label: t('notif_check')?.replace('לחץ לבדוק', 'Update') || 'Update', sub: '' };
            const isUnread = !notif.read;
            const subText = notif.preview || cfg.sub;
            const isLast = i === notifications.length - 1;

            return (
              <div
                key={i}
                onClick={() => notif.taskId && navigate(`/task/${notif.taskId}`)}
                style={{
                  background: 'var(--surface-2)',
                  borderBottom: isLast ? 'none' : '1px solid var(--border-1)',
                  padding: '16px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  cursor: notif.taskId ? 'pointer' : 'default',
                  position: 'relative',
                }}
                onPointerDown={e => notif.taskId && (e.currentTarget.style.opacity = '0.7')}
                onPointerUp={e => (e.currentTarget.style.opacity = '1')}
                onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                {/* Unread indicator */}
                {isUnread && (
                  <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: 7, height: 7, borderRadius: '50%', background: '#1a6fd4' }} />
                )}

                {/* Emoji */}
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: '#f4f7fb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, flexShrink: 0,
                }}>
                  {cfg.emoji}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.25 }}>
                      {cfg.label}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0, fontWeight: 500 }}>
                      {timeAgo(notif.timestamp)}
                    </div>
                  </div>
                  {(notif.taskTitle || notif.workerName || notif.senderName) && (
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {notif.taskTitle || notif.workerName || notif.senderName}
                    </div>
                  )}
                  {subText && (
                    <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>
                      {subText}
                    </div>
                  )}
                </div>

                {notif.taskId && (
                  <ChevronLeft size={18} color="#c8d3e0" style={{ flexShrink: 0 }} />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}