import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Loader2, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import PageHeader from '@/components/PageHeader';

const TYPE_CONFIG = {
  task_taken:            { emoji: '🎉', label: 'עובד נמצא!',              sub: 'המשימה שלך נלקחה בהצלחה' },
  worker_on_the_way:     { emoji: '🚗', label: 'העובד בדרך אליך',         sub: 'מגיע בקרוב' },
  worker_arrived:        { emoji: '📍', label: 'העובד הגיע',              sub: 'נמצא בשטח' },
  worker_done:           { emoji: '✅', label: 'העבודה הושלמה',           sub: 'לחץ לאשר ולסגור משימה' },
  application_received:  { emoji: '✋', label: 'בקשה חדשה התקבלה',       sub: 'מישהו רוצה לבצע את המשימה' },
  application_approved:  { emoji: '🎯', label: 'הבקשה שלך אושרה!',       sub: 'לחץ לצאת לדרך עכשיו' },
  application_sent:      { emoji: '📤', label: 'בקשה נשלחה',             sub: 'ממתין לאישור המפרסם' },
  application_rejected:  { emoji: '❌', label: 'הבקשה נדחתה',            sub: 'הקרדיטים הוחזרו לחשבונך' },
  approval_revoked:      { emoji: '↩️', label: 'האישור בוטל',            sub: 'המשימה חזרה לסטטוס פתוח' },
  worker_left_task:      { emoji: '🚪', label: 'העובד עזב',              sub: 'המשימה פתוחה שוב לעובדים' },
  no_show_reported:      { emoji: '⚠️', label: 'דווח אי-הופעה',          sub: 'מדד האמינות שלך עודכן' },
  task_cancelled_worker: { emoji: '🚫', label: 'המשימה בוטלה',           sub: 'בוטלה על ידי המפרסם' },
  new_message:           { emoji: '💬', label: 'הודעה חדשה',             sub: 'לחץ לפתיחת השיחה' },
  new_review:            { emoji: '⭐', label: 'ביקורת חדשה',            sub: 'מישהו השאיר לך ביקורת' },
  boost_signal:          { emoji: '⚡', label: 'משימה מתאימה לך',        sub: 'לחץ לצפייה' },
};

function timeAgo(ts) {
  if (!ts) return '';
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true, locale: he }); }
  catch { return ''; }
}

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
        title="התראות"
        right={notifications.length > 0 && (
          <button onClick={clearAll} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 13, fontWeight: 700 }}>
            <Trash2 size={15} /> מחק הכל
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
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)', marginBottom: 8 }}>אין התראות</div>
            <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>כשמשהו יקרה — תראה את זה כאן</div>
          </div>
        ) : (
          notifications.map((notif, i) => {
            const cfg = TYPE_CONFIG[notif.type] || { emoji: '📢', label: 'עדכון', sub: '' };
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