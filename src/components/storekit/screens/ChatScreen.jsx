import { Plus, Send, Camera } from 'lucide-react';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatMessageRow from '@/components/chat/ChatMessageRow';
import TaskContextCard from '@/components/chat/TaskContextCard';
import { useLanguage } from '@/lib/LanguageContext';
import { DEMO_MESSAGES, DEMO_TASKS } from '@/lib/storekit/demoData';

const task = DEMO_TASKS[0];

const stamp = (i) => new Date(Date.now() - (DEMO_MESSAGES.length - i) * 90000).toISOString();

/**
 * FRAME 06 — "סוגרים את הפרטים בצ׳אט"
 * The real conversation surface: the real ChatHeader, the real task-context row
 * and the real message bubbles, in a task-scoped thread.
 */
export default function ChatScreen() {
  const { t, isRTL } = useLanguage();

  return (
    <>
      <ChatHeader
        name="דנה כ׳"
        photo={null}
        user={{ kyc_status: 'approved' }}
        isOnline
        task={task}
        isRTL={isRTL}
        t={t}
        onOpenProfile={() => {}}
        onOpenTask={() => {}}
      />

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: 'var(--surface-1)', padding: '12px 14px 0' }}>
        <TaskContextCard task={task} isRTL={isRTL} t={t} onOpen={() => {}} />

        {DEMO_MESSAGES.map((m, i) => (
          <ChatMessageRow
            key={m.id}
            msg={{
              ...m,
              created_date: stamp(i),
              read: true,
            }}
            isMe={m.me}
            isContinuation={i > 0 && DEMO_MESSAGES[i - 1].me === m.me}
            isLastInGroup={i === DEMO_MESSAGES.length - 1 || DEMO_MESSAGES[i + 1].me !== m.me}
            otherUserData={{ profile_photo: null }}
          />
        ))}
      </div>

      {/* Composer */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px 14px',
          background: 'var(--surface-2)',
          borderTop: '1px solid var(--border-1)',
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: 'var(--surface-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Plus size={19} color="var(--text-2)" />
        </div>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: 'var(--surface-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Camera size={18} color="var(--text-2)" />
        </div>
        <div
          style={{
            flex: 1,
            height: 40,
            borderRadius: 999,
            background: 'var(--surface-3)',
            border: '1px solid var(--border-1)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            fontSize: 13.5,
            color: 'var(--text-3)',
            fontWeight: 500,
          }}
        >
          כתיבת הודעה…
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 3px 12px rgba(26,111,212,0.32)',
          }}
        >
          <Send size={17} color="#ffffff" />
        </div>
      </div>
    </>
  );
}