import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

const TYPES = {
  new_message:           { emoji: '💬', title: (n) => `הודעה חדשה מ-${n.senderName || 'משתמש'}`,       body: (n) => n.preview || 'לחץ לפתיחת השיחה',                         link: (n) => n.taskId ? `/chat/${n.taskId}` : null },
  task_taken:            { emoji: '🎉', title: ()  => 'עובד זמין וממתין לאישורך',                        body: (n) => n.taskTitle ? `"${n.taskTitle}" — לחץ לאישור` : 'לחץ לאישור', link: (n) => n.taskId ? `/task/${n.taskId}` : null },
  application_received:  { emoji: '✋', title: ()  => 'בקשה חדשה התקבלה',                               body: (n) => n.taskTitle ? `"${n.taskTitle}" — לחץ לבדוק` : 'לחץ לבדוק',  link: (n) => n.taskId ? `/task/${n.taskId}` : null },
  application_approved:  { emoji: '🎯', title: ()  => 'הבקשה שלך אושרה!',                              body: (n) => n.taskTitle ? `"${n.taskTitle}" — לחץ לצאת לדרך` : 'לחץ לצאת לדרך', link: (n) => n.taskId ? `/task/${n.taskId}` : null },
  application_sent:      { emoji: '📤', title: ()  => 'בקשתך נשלחה בהצלחה',                            body: ()  => 'ממתין לאישור המפרסם',                                           link: (n) => n.taskId ? `/task/${n.taskId}` : null },
  application_rejected:  { emoji: '❌', title: ()  => 'הבקשה נדחתה',                                   body: (n) => n.taskTitle ? `"${n.taskTitle}"` : 'הקרדיטים הוחזרו',            link: (n) => n.taskId ? `/task/${n.taskId}` : null },
  worker_on_the_way:     { emoji: '🚗', title: ()  => 'העובד יצא לדרך אליך',                           body: (n) => n.taskTitle ? `"${n.taskTitle}"` : 'מגיע אליך עכשיו',             link: (n) => n.taskId ? `/task/${n.taskId}` : null },
  worker_arrived:        { emoji: '📍', title: ()  => 'העובד הגיע למיקום',                             body: (n) => n.taskTitle ? `"${n.taskTitle}"` : 'עומד לפתחך',                  link: (n) => n.taskId ? `/task/${n.taskId}` : null },
  worker_done:           { emoji: '✅', title: ()  => 'העובד סיים את המשימה',                          body: (n) => n.taskTitle ? `"${n.taskTitle}" — אשר ושחרר תשלום` : 'אשר ושחרר תשלום', link: (n) => n.taskId ? `/task/${n.taskId}` : null },
  new_review:            { emoji: '⭐', title: (n) => `ביקורת חדשה התקבלה`,                            body: (n) => n.preview || 'לחץ לצפייה בפרופיל',                               link: () => null },
  task_cancelled_worker: { emoji: '🚫', title: ()  => 'המשימה בוטלה על ידי המפרסם',                   body: (n) => n.taskTitle ? `"${n.taskTitle}"` : '',                            link: () => null },
  approval_revoked:      { emoji: '↩️', title: ()  => 'האישור שלך בוטל',                              body: (n) => n.taskTitle ? `"${n.taskTitle}" — המשימה חזרה לפתוחה` : '',       link: (n) => n.taskId ? `/task/${n.taskId}` : null },
  worker_left_task:      { emoji: '🚪', title: (n) => `${n.workerName || 'העובד'} עזב את המשימה`,     body: (n) => n.taskTitle ? `"${n.taskTitle}" — פתוחה שוב` : '',               link: (n) => n.taskId ? `/task/${n.taskId}` : null },
  no_show_reported:      { emoji: '⚠️', title: ()  => 'דווחת על אי-הופעה',                            body: (n) => n.taskTitle ? `"${n.taskTitle}"` : 'מדד האמינות עודכן',            link: () => null },
  boost_available:       { emoji: '⚡', title: ()  => 'הגיע הזמן לבוסט!',                              body: (n) => n.taskTitle ? `"${n.taskTitle}" — שגר איתות לעובדים` : 'הגדל חשיפה וקבל עוד בקשות', link: (n) => n.taskId ? `/task/${n.taskId}` : null },
};

export default function LiveNotificationPopup({ notification, onClose }) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const [swipeY, setSwipeY] = useState(0);
  const navigate = useNavigate();
  const DURATION = 7500;
  const touchStartY = useRef(null);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setProgress(Math.max(0, 100 - ((Date.now() - start) / DURATION) * 100));
    }, 50);
    const timer = setTimeout(() => { setVisible(false); onClose?.(); }, DURATION);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, []);

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
      dir="rtl"
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
        {/* Progress bar */}
        <div style={{ height: 3, background: 'rgba(0,0,0,0.06)' }}>
          <div style={{ height: '100%', background: '#1a6fd4', width: `${progress}%`, transition: 'width 0.05s linear' }} />
        </div>

        <div style={{ padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Emoji */}
          <div style={{
            width: 46, height: 46, borderRadius: 14,
            background: '#f4f7fb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, flexShrink: 0,
          }}>
            {cfg.emoji}
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 15, color: '#0f1e40', marginBottom: 3, lineHeight: 1.25 }}>
              {cfg.title(notification)}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>
              {cfg.body(notification)}
            </div>
          </div>

          {/* Close */}
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