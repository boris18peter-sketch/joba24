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

      // Ignore only if already in THIS conversation — same task AND same person
      if (location.pathname === `/chat/${msg.task_id}` && location.search.includes(`with=${msg.sender_id}`)) return;

      // Only conversations I am part of may reach me. `recipient_id` is exact;
      // older messages fall back to being one of the task's two parties. Without
      // this, an applicant gets notified about a conversation between the
      // publisher and a DIFFERENT applicant.
      const cached = taskCache.current[msg.task_id];
      if (cached) {
        if (msg.recipient_id) {
          if (msg.recipient_id !== me.id) return;
        } else if (cached.clientId !== me.id && cached.workerId !== me.id) {
          return;
        }
      } else {
        let task = null;
        try {
          const tasks = await base44.entities.Task.filter({ id: msg.task_id });
          task = tasks[0] || null;
        } catch {}
        taskCache.current[msg.task_id] = {
          title: task?.title || 'משימה',
          clientId: task?.client_id,
          workerId: task?.worker_id,
        };
        if (msg.recipient_id) {
          if (msg.recipient_id !== me.id) return;
        } else if (task?.client_id !== me.id && task?.worker_id !== me.id) {
          return;
        }
      }
      const taskTitle = taskCache.current[msg.task_id].title;

      const isImage = msg.content?.startsWith('[img]');
      const displayContent = isImage ? '📷 תמונה' : msg.content;
      const senderName = msg.sender_name || 'הודעה חדשה';

      toast(
        <div
          dir="rtl"
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          onClick={() => {
            toast.dismiss();
            navigate(`/chat/${msg.task_id}?with=${msg.sender_id}`);
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg,var(--brand-primary),#3b82f6)',
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