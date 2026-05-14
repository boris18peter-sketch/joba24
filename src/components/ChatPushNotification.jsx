import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MessageCircle } from 'lucide-react';

/**
 * Global component — mount once inside Layout.
 * Listens for new ChatMessages and fires a toast push notification
 * when the message is NOT from the current user and the user is NOT
 * already in the relevant chat page.
 */
export default function ChatPushNotification() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  // Cache task titles to avoid extra fetches
  const taskCache = useRef({});

  useEffect(() => {
    if (!me?.id) return;

    const unsub = base44.entities.ChatMessage.subscribe(async (event) => {
      if (event.type !== 'create') return;
      const msg = event.data;
      if (!msg) return;

      // Ignore own messages
      if (msg.sender_id === me.id) return;

      // Ignore if already in this chat
      if (location.pathname === `/chat/${msg.task_id}`) return;

      // Get task title (cached)
      let taskTitle = taskCache.current[msg.task_id];
      if (!taskTitle) {
        try {
          const tasks = await base44.entities.Task.filter({ id: msg.task_id });
          taskTitle = tasks[0]?.title || 'משימה';
          taskCache.current[msg.task_id] = taskTitle;
        } catch {
          taskTitle = 'משימה';
        }
      }

      // Only notify if this user is part of this task's chat
      // (we don't have a membership check here, but the message was received = they're subscribed)
      const isImage = msg.content?.startsWith('[img]');
      const displayContent = isImage ? '📷 תמונה' : msg.content;
      const senderName = msg.sender_name || 'הודעה חדשה';

      toast(
        <div
          dir="rtl"
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          onClick={() => {
            toast.dismiss();
            navigate(`/chat/${msg.task_id}`);
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg,#1a6fd4,#3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <MessageCircle size={16} color="white" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#0f2b6b', marginBottom: 1 }}>
              {senderName}
            </div>
            <div style={{ fontSize: 12, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayContent}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
              {taskTitle} · לחץ לפתיחת הצ'אט
            </div>
          </div>
        </div>,
        {
          duration: 6000,
          style: { padding: '10px 14px', borderRadius: 16, border: '1px solid #dbeafe', background: 'white', boxShadow: '0 8px 24px rgba(26,111,212,0.15)' },
        }
      );
    });

    return unsub;
  }, [me?.id, location.pathname, navigate]);

  return null;
}