import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

const TYPES = {
  new_message: {
    emoji: '💬',
    bg: '#eff6ff',
    border: '#93c5fd',
    accent: '#1a6fd4',
    title: (n) => `הודעה חדשה מ-${n.senderName || 'משתמש'}`,
    body: (n) => n.preview || '...',
    link: (n) => n.taskId ? `/chat/${n.taskId}` : null,
  },
  task_taken: {
    emoji: '🎉',
    bg: '#f0fdf4',
    border: '#86efac',
    accent: '#16a34a',
    title: (n) => 'עובד לקח את המשימה',
    body: (n) => `"${n.taskTitle}"`,
    link: (n) => n.taskId ? `/task/${n.taskId}` : null,
  },
  application_received: {
    emoji: '📩',
    bg: '#faf5ff',
    border: '#c4b5fd',
    accent: '#7c3aed',
    title: (n) => 'בקשה חדשה',
    body: (n) => `"${n.taskTitle}"`,
    link: (n) => n.taskId ? `/task/${n.taskId}` : null,
  },
  application_approved: {
    emoji: '✅',
    bg: '#eff6ff',
    border: '#93c5fd',
    accent: '#1a6fd4',
    title: () => 'הבקשה שלך אושרה!',
    body: (n) => `"${n.taskTitle}" מוכן לביצוע`,
    link: (n) => n.taskId ? `/task/${n.taskId}` : null,
  },
  application_sent: {
    emoji: '📤',
    bg: '#f0fdf4',
    border: '#86efac',
    accent: '#16a34a',
    title: () => 'הבקשה שלך נשלחה!',
    body: () => 'אנחנו מחכים לאישור המפרסם',
    link: (n) => n.taskId ? `/task/${n.taskId}` : null,
  },
  application_rejected: {
    emoji: '❌',
    bg: '#fef2f2',
    border: '#fca5a5',
    accent: '#dc2626',
    title: () => 'הבקשה לא התקבלה',
    body: (n) => `"${n.taskTitle}"`,
    link: (n) => n.taskId ? `/task/${n.taskId}` : null,
  },
  worker_on_the_way: {
    emoji: '🛵',
    bg: '#eff6ff',
    border: '#93c5fd',
    accent: '#1a6fd4',
    title: (n) => 'עובד בדרך',
    body: (n) => `"${n.taskTitle}"`,
    link: (n) => n.taskId ? `/task/${n.taskId}` : null,
  },
  worker_arrived: {
    emoji: '📍',
    bg: '#fefce8',
    border: '#fde047',
    accent: '#ca8a04',
    title: (n) => 'עובד הגיע',
    body: (n) => `"${n.taskTitle}"`,
    link: (n) => n.taskId ? `/task/${n.taskId}` : null,
  },
  worker_done: {
    emoji: '✅',
    bg: '#f0fdf4',
    border: '#86efac',
    accent: '#16a34a',
    title: (n) => 'עובד סיים',
    body: (n) => `"${n.taskTitle}"`,
    link: (n) => n.taskId ? `/task/${n.taskId}` : null,
  },
  new_review: {
    emoji: '⭐',
    bg: '#fefce8',
    border: '#fde047',
    accent: '#ca8a04',
    title: (n) => `ביקורת חדשה מ-${n.reviewerName || 'משתמש'}`,
    body: (n) => n.preview || `דירוג: ${n.rating} כוכבים`,
  },
  task_cancelled_worker: {
    emoji: '🚫',
    bg: '#fef2f2',
    border: '#fca5a5',
    accent: '#dc2626',
    title: () => 'המשימה שיצאת אליה בוטלה',
    body: (n) => `"${n.taskTitle || ''}" — בוטלה על ידי המפרסם`,
    link: () => null,
  },
  approval_revoked: {
    emoji: '↩️',
    bg: '#fef2f2',
    border: '#fca5a5',
    accent: '#dc2626',
    title: () => 'האישור שלך בוטל על ידי המפרסם',
    body: (n) => `"${n.taskTitle}" — המשימה חזרה לפתוחה`,
    link: (n) => n.taskId ? `/task/${n.taskId}` : null,
  },
  worker_left_task: {
    emoji: '🚪',
    bg: '#fff7ed',
    border: '#fdba74',
    accent: '#ea580c',
    title: (n) => `${n.workerName || 'העובד'} יצא מהמשימה`,
    body: (n) => `"${n.taskTitle}" — תוכל לאשר מועמד אחר`,
    link: (n) => n.taskId ? `/task/${n.taskId}` : null,
  },
  no_show_reported: {
    emoji: '⚠️',
    bg: '#fef2f2',
    border: '#fca5a5',
    accent: '#dc2626',
    title: () => 'דווחת על אי-הופעה',
    body: (n) => `מפרסם "${n.taskTitle}" דיווח. מדד האמינות שלך עודכן.`,
    link: () => null,
  },
};

export default function LiveNotificationPopup({ notification, onClose }) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const navigate = useNavigate();
  const DURATION = 7500;

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.max(0, 100 - (elapsed / DURATION) * 100));
    }, 50);

    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, DURATION);

    return () => { clearTimeout(timer); clearInterval(interval); };
  }, []);

  if (!visible) return null;

  const cfg = TYPES[notification.type] || TYPES.application_received;

  return (
    <div style={{ padding: '8px 12px' }} dir="rtl">
      <style>{`
        @keyframes notifSlide {
          from { opacity: 0; transform: translateY(-16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div style={{
        background: cfg.bg,
        border: `1.5px solid ${cfg.border}`,
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        animation: 'notifSlide 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        cursor: cfg.link?.(notification) ? 'pointer' : 'default',
      }}
      onClick={() => {
        const link = cfg.link?.(notification);
        if (link) { setVisible(false); onClose?.(); navigate(link); }
      }}>
        {/* Progress bar */}
        <div style={{ height: 3, background: 'rgba(0,0,0,0.06)' }}>
          <div style={{ height: '100%', background: cfg.accent, width: `${progress}%`, transition: 'width 0.05s linear', borderRadius: 2 }} />
        </div>

        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {/* Emoji icon */}
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'white', border: `1px solid ${cfg.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0,
          }}>
            {cfg.emoji}
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#1e293b', marginBottom: 2 }}>
              {cfg.title(notification)}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {cfg.body(notification)}
            </div>
          </div>

          {/* Close */}
          <button
            onClick={() => { setVisible(false); onClose?.(); }}
            style={{ width: 24, height: 24, borderRadius: 8, background: 'rgba(0,0,0,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <X size={12} color="#94a3b8" />
          </button>
        </div>
      </div>
    </div>
  );
}