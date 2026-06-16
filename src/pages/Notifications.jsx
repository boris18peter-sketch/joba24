import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trash2, Loader2, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import PageHeader from '@/components/PageHeader';

const TYPE_CONFIG = {
  task_taken:            { emoji: '🎉', color: '#16a34a', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '#86efac', label: 'עובד נמצא!',        sub: 'המשימה שלך נלקחה בהצלחה' },
  worker_on_the_way:     { emoji: '🚗', color: '#1a6fd4', bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '#93c5fd', label: 'העובד בדרך אליך',  sub: 'מגיע בקרוב' },
  worker_arrived:        { emoji: '📍', color: '#7c3aed', bg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', border: '#c4b5fd', label: 'העובד הגיע',         sub: 'נמצא בשטח' },
  worker_done:           { emoji: '✅', color: '#059669', bg: 'linear-gradient(135deg,#ecfdf5,#d1fae5)', border: '#6ee7b7', label: 'העבודה הושלמה',     sub: 'לחץ לאשר ולסגור משימה' },
  application_received:  { emoji: '✋', color: '#d97706', bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: '#fcd34d', label: 'בקשה חדשה התקבלה', sub: 'מישהו רוצה לבצע את המשימה' },
  application_approved:  { emoji: '🎯', color: '#16a34a', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '#86efac', label: 'בקשתך אושרה!',       sub: 'לחץ לצאת לדרך עכשיו' },
  application_sent:      { emoji: '📤', color: '#1a6fd4', bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '#93c5fd', label: 'בקשה נשלחה',        sub: 'ממתין לאישור המפרסם' },
  application_rejected:  { emoji: '↩️', color: '#dc2626', bg: 'linear-gradient(135deg,#fef2f2,#fee2e2)', border: '#fca5a5', label: 'הבקשה נדחתה',       sub: 'הקרדיטים הוחזרו לחשבונך' },
  approval_revoked:      { emoji: '🚫', color: '#dc2626', bg: 'linear-gradient(135deg,#fef2f2,#fee2e2)', border: '#fca5a5', label: 'האישור בוטל',        sub: 'המשימה חזרה לסטטוס פתוח' },
  worker_left_task:      { emoji: '🚪', color: '#ea580c', bg: 'linear-gradient(135deg,#fff7ed,#ffedd5)', border: '#fdba74', label: 'העובד עזב',          sub: 'המשימה פתוחה שוב לעובדים' },
  no_show_reported:      { emoji: '⚠️', color: '#dc2626', bg: 'linear-gradient(135deg,#fef2f2,#fee2e2)', border: '#fca5a5', label: 'דווח אי-הופעה',      sub: 'מדד האמינות שלך עודכן' },
  task_cancelled_worker: { emoji: '❌', color: '#dc2626', bg: 'linear-gradient(135deg,#fef2f2,#fee2e2)', border: '#fca5a5', label: 'המשימה בוטלה',       sub: 'בוטלה על ידי המפרסם' },
  new_message:           { emoji: '💬', color: '#1a6fd4', bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '#93c5fd', label: 'הודעה חדשה',         sub: 'לחץ לפתיחת השיחה' },
  new_review:            { emoji: '⭐', color: '#d97706', bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: '#fcd34d', label: 'ביקורת חדשה',        sub: 'מישהו השאיר לך ביקורת' },
  boost_signal:          { emoji: '⚡', color: '#7c3aed', bg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', border: '#c4b5fd', label: 'משימה מתאימה לך',   sub: 'לחץ לצפייה' },
};

function timeAgo(ts) {
  if (!ts) return '';
  try {
    return formatDistanceToNow(new Date(ts), { addSuffix: true, locale: he });
  } catch {
    return '';
  }
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

  // Mark all read on open
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
          <button
            onClick={clearAll}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 13, fontWeight: 700 }}
          >
            <Trash2 size={15} /> מחק הכל
          </button>
        )}
      />

      <div style={{ padding: '12px 14px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
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
            const cfg = TYPE_CONFIG[notif.type] || { emoji: '📢', color: '#64748b', bg: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', border: '#e2e8f0', label: 'עדכון', sub: '' };
            const isUnread = !notif.read;
            const subText = notif.preview || cfg.sub;

            return (
              <div
                key={i}
                onClick={() => notif.taskId && navigate(`/task/${notif.taskId}`)}
                style={{
                  background: cfg.bg,
                  border: `1.5px solid ${cfg.border}`,
                  borderRadius: 20,
                  padding: '16px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  cursor: notif.taskId ? 'pointer' : 'default',
                  position: 'relative',
                  boxShadow: isUnread ? `0 4px 20px ${cfg.border}55` : '0 2px 8px rgba(0,0,0,0.05)',
                  transition: 'transform 0.15s',
                }}
                onPointerDown={e => notif.taskId && (e.currentTarget.style.transform = 'scale(0.985)')}
                onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                onPointerLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {/* Unread dot */}
                {isUnread && (
                  <div style={{ position: 'absolute', top: 14, left: 14, width: 8, height: 8, borderRadius: '50%', background: cfg.color, boxShadow: `0 0 0 3px ${cfg.border}` }} />
                )}

                {/* Emoji Icon */}
                <div style={{
                  width: 54, height: 54, borderRadius: 18,
                  background: 'rgba(255,255,255,0.7)',
                  border: `1.5px solid ${cfg.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}>
                  {cfg.emoji}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: cfg.color, marginBottom: 3, lineHeight: 1.3 }}>
                    {cfg.label}
                  </div>
                  {(notif.taskTitle || notif.workerName || notif.senderName) && (
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {notif.taskTitle || notif.workerName || notif.senderName}
                    </div>
                  )}
                  {subText && (
                    <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500, lineHeight: 1.4 }}>
                      {subText}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 5, fontWeight: 600 }}>
                    {timeAgo(notif.timestamp)}
                  </div>
                </div>

                {/* Arrow if clickable */}
                {notif.taskId && (
                  <ChevronLeft size={18} color={cfg.color} style={{ flexShrink: 0, opacity: 0.7 }} />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}