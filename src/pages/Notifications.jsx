import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import BackButton from '@/components/BackButton';
import PageHeader from '@/components/PageHeader';

const TYPE_CONFIG = {
  task_taken:            { emoji: '🎉', color: '#16a34a', bg: '#f0fdf4',  label: 'עובד נמצא!' },
  worker_on_the_way:     { emoji: '🚗', color: '#1a6fd4', bg: '#eff6ff',  label: 'עובד בדרך' },
  worker_arrived:        { emoji: '📍', color: '#7c3aed', bg: '#f5f3ff',  label: 'עובד הגיע' },
  worker_done:           { emoji: '✅', color: '#059669', bg: '#ecfdf5',  label: 'עבודה הושלמה' },
  application_received:  { emoji: '✋', color: '#d97706', bg: '#fffbeb',  label: 'בקשה חדשה' },
  application_approved:  { emoji: '✅', color: '#16a34a', bg: '#f0fdf4',  label: 'בקשה אושרה' },
  application_sent:      { emoji: '📤', color: '#16a34a', bg: '#f0fdf4',  label: 'בקשה נשלחה' },
  application_rejected:  { emoji: '❌', color: '#dc2626', bg: '#fef2f2',  label: 'בקשה נדחתה' },
  approval_revoked:      { emoji: '↩️', color: '#dc2626', bg: '#fef2f2',  label: 'אישור בוטל' },
  worker_left_task:      { emoji: '🚪', color: '#ea580c', bg: '#fff7ed',  label: 'עובד עזב' },
  no_show_reported:      { emoji: '⚠️', color: '#dc2626', bg: '#fef2f2',  label: 'אי-הופעה' },
  task_cancelled_worker: { emoji: '🚫', color: '#dc2626', bg: '#fef2f2',  label: 'משימה בוטלה' },
  new_message:           { emoji: '💬', color: '#1a6fd4', bg: '#eff6ff',  label: 'הודעה חדשה' },
  new_review:            { emoji: '⭐', color: '#d97706', bg: '#fffbeb',  label: 'ביקורת חדשה' },
  boost_signal:          { emoji: '⚡', color: '#7c3aed', bg: '#f5f3ff',  label: 'משימה מתאימה' },
};

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notificationsPage'],
    queryFn: async () => {
      const stored = JSON.parse(localStorage.getItem('joba24_notifications') || '[]');
      return stored;
    },
    staleTime: 0,
  });

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    localStorage.setItem('joba24_notifications', JSON.stringify(updated));
    queryClient.setQueryData(['notificationsPage'], updated);
    queryClient.invalidateQueries({ queryKey: ['notifUnread'] });
  };

  const clearAll = () => {
    localStorage.setItem('joba24_notifications', JSON.stringify([]));
    queryClient.setQueryData(['notificationsPage'], []);
    queryClient.invalidateQueries({ queryKey: ['notifUnread'] });
  };

  // Mark all as read when page opens
  useEffect(() => {
    if (notifications.length > 0) {
      const hasUnread = notifications.some(n => !n.read);
      if (hasUnread) markAllRead();
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-1)' }} dir="rtl">
      <PageHeader
        title="התראות"
        right={notifications.length > 0 && (
          <button onClick={clearAll} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 12, fontWeight: 600 }}>
            <Trash2 size={14} /> מחק הכל
          </button>
        )}
      />

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Loader2 size={24} className="animate-spin" color="#1a6fd4" />
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>אין התראות</div>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>כשמשהו יקרה — תראה את זה כאן</div>
          </div>
        ) : (
          notifications.map((notif, i) => {
            const cfg = TYPE_CONFIG[notif.type] || { emoji: '📢', color: '#64748b', bg: '#f8fafc', label: 'עדכון' };
            const date = notif.timestamp ? new Date(notif.timestamp) : null;
            return (
              <div
                key={i}
                onClick={() => notif.taskId && navigate(`/task/${notif.taskId}`)}
                style={{
                  background: notif.read ? 'var(--surface-2)' : cfg.bg,
                  border: `1px solid ${notif.read ? '#e8eef8' : cfg.color + '30'}`,
                  borderRadius: 16,
                  padding: '14px 16px',
                  display: 'flex',
                  gap: 12,
                  cursor: notif.taskId ? 'pointer' : 'default',
                  position: 'relative',
                  transition: 'all 0.15s',
                }}
              >
                {/* Unread dot */}
                {!notif.read && (
                  <div style={{ position: 'absolute', top: 14, left: 16, width: 7, height: 7, borderRadius: '50%', background: cfg.color }} />
                )}

                {/* Icon */}
                <div style={{ width: 44, height: 44, borderRadius: 14, background: cfg.bg, border: `1px solid ${cfg.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {cfg.emoji}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: cfg.color }}>{cfg.label}</span>
                    {date && (
                      <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {format(date, 'dd/MM HH:mm')}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 600, marginBottom: 2 }}>
                    {notif.taskTitle || notif.workerName || notif.senderName || ''}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {notif.preview || (
                      notif.type === 'application_approved' ? 'לחץ לצאת לדרך' :
                      notif.type === 'application_rejected' ? 'הקרדיטים הוחזרו לחשבונך' :
                      notif.type === 'approval_revoked'     ? 'המשימה חזרה לסטטוס פתוח' :
                      notif.type === 'worker_left_task'     ? 'המשימה פתוחה שוב לעובדים' :
                      notif.type === 'no_show_reported'     ? 'מדד האמינות שלך עודכן' :
                      notif.type === 'task_cancelled_worker'? 'בוטלה על ידי המפרסם' :
                      notif.type === 'application_sent'     ? 'ממתין לאישור המפרסם' :
                      notif.type === 'worker_done'          ? 'לחץ לאשר ולשחרר תשלום' :
                      null
                    )}
                  </div>
                  {date && (
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                      {formatDistanceToNow(date, { addSuffix: true, locale: he })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}