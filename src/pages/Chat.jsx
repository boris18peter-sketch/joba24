import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { chatThreadKey } from '@/lib/chatThread';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ShieldAlert } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { toast } from 'sonner';
import { moderateText } from '@/hooks/useModeration';
import VerifyModal from '@/components/VerifyModal';
import { useVerifyGuard } from '@/hooks/useVerifyGuard';
import { useLanguage } from '@/lib/LanguageContext';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { useChatViewport } from '@/hooks/useViewportHeight';
import useChatThread from '@/hooks/useChatThread';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatComposer from '@/components/chat/ChatComposer';
import ChatSkeleton from '@/components/chat/ChatSkeleton';
import ChatEmptyState from '@/components/chat/ChatEmptyState';
import TaskContextCard from '@/components/chat/TaskContextCard';
import DateSeparator from '@/components/chat/DateSeparator';
import ChatMessageRow from '@/components/chat/ChatMessageRow';
import NewMessagesPill from '@/components/chat/NewMessagesPill';

const NEAR_BOTTOM_PX = 80;   // "close enough to the bottom" to keep following
const LOAD_OLDER_PX = 140;   // scroll distance from the top that pulls older pages

// Online status: fetch + subscribe to real-time changes, check < 90s = online
function useOnlineStatus(userId) {
  const [isOnline, setIsOnline] = useState(false);
  useEffect(() => {
    if (!userId) return;
    const check = async () => {
      try {
        const results = await base44.entities.UserPresence.filter({ user_id: userId });
        const p = results[0];
        setIsOnline(p?.last_seen ? Date.now() - new Date(p.last_seen).getTime() < 180000 : false);
      } catch { setIsOnline(false); }
    };
    check();
    const interval = setInterval(check, 60000);
    const unsub = base44.entities.UserPresence.subscribe(event => {
      if (event.data?.user_id === userId && event.data?.last_seen) {
        setIsOnline(Date.now() - new Date(event.data.last_seen).getTime() < 90000);
      }
    });
    return () => { clearInterval(interval); unsub(); };
  }, [userId]);
  return isOnline;
}

// Ping my own presence every 2 minutes
function usePingPresence(userId) {
  useEffect(() => {
    if (!userId) return;
    const ping = async () => {
      try {
        const existing = await base44.entities.UserPresence.filter({ user_id: userId });
        if (existing[0]) {
          await base44.entities.UserPresence.update(existing[0].id, { last_seen: new Date().toISOString(), is_online: true });
        } else {
          await base44.entities.UserPresence.create({ user_id: userId, last_seen: new Date().toISOString(), is_online: true });
        }
      } catch {}
    };
    ping();
    const interval = setInterval(ping, 120000);
    return () => clearInterval(interval);
  }, [userId]);
}

export default function Chat() {
  const { taskId } = useParams();
  const [searchParams] = useSearchParams();
  // A chat is a conversation between exactly TWO people. `with` identifies the
  // other participant, so two applicants on the same task never share a thread.
  const withId = searchParams.get('with');
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const { openTaskSheet } = useTaskSheet();

  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [blockedMsg, setBlockedMsg] = useState(null);
  const [showNewPill, setShowNewPill] = useState(false);

  const shellRef = useRef(null);
  const listRef = useRef(null);
  const fileRef = useRef(null);
  const inputRef = useRef(null);
  const markedReadRef = useRef(new Set());

  // Follow-the-bottom state, kept in refs so scrolling never re-renders.
  const stickRef = useRef(true);
  const preserveRef = useRef(false);
  const prevLenRef = useRef(0);
  const didScrollRef = useRef(false);
  const scrollRafRef = useRef(0);

  const { recording, recordSeconds, uploading: uploadingVoice, start: startRecording, stop: stopRecording, cancel: cancelRecording, formatTime } = useVoiceRecording();

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { gate, showVerify, onSuccess: onVerifySuccess, onClose: onVerifyClose } = useVerifyGuard(me);
  usePingPresence(me?.id);

  const { data: task } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => base44.entities.Task.filter({ id: taskId }),
    select: d => d[0],
  });

  const otherPersonId = withId || (me?.id === task?.client_id ? task?.worker_id : task?.client_id);
  const threadKey = useMemo(() => chatThreadKey(me?.id, otherPersonId), [me?.id, otherPersonId]);
  const pairIds = useMemo(() => [me?.id, otherPersonId].filter(Boolean), [me?.id, otherPersonId]);

  const otherIsOnline = useOnlineStatus(otherPersonId);
  const { data: otherUserData } = useQuery({
    queryKey: ['userProfile', otherPersonId],
    queryFn: () => base44.entities.User.filter({ id: otherPersonId }),
    select: d => d?.[0],
    enabled: !!otherPersonId,
  });

  // Single source of truth for this thread — fetch, realtime, pagination and
  // optimistic sends all merge through it (see useChatThread).
  const { messages, initialLoading, hasMore, loadingOlder, loadOlder, send, retry, dropLocal } = useChatThread({
    taskId, threadKey, meId: me?.id, meName: me?.full_name, otherId: otherPersonId, pairIds,
  });

  // Pin the shell to the visible viewport (keyboard-aware, no re-renders).
  useChatViewport(shellRef);

  // ── Scroll management ────────────────────────────────────────────────────
  // Opening a conversation shows the newest messages.
  useEffect(() => {
    if (initialLoading || didScrollRef.current) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    stickRef.current = true;
    didScrollRef.current = true;
    prevLenRef.current = messages.length;
  }, [initialLoading, messages.length]);

  // Switching to another person is the same route — reset the scroll state.
  useEffect(() => {
    didScrollRef.current = false;
    stickRef.current = true;
    preserveRef.current = false;
    prevLenRef.current = 0;
    setShowNewPill(false);
  }, [threadKey]);

  // New messages: follow only when the user is already at the bottom (or sent
  // the message themselves); otherwise surface the "new messages" pill.
  useEffect(() => {
    const el = listRef.current;
    if (!el || initialLoading) return;
    if (preserveRef.current) { preserveRef.current = false; prevLenRef.current = messages.length; return; }
    const grew = messages.length > prevLenRef.current;
    prevLenRef.current = messages.length;
    if (!grew) return;

    const last = messages[messages.length - 1];
    if (stickRef.current || last?.sender_id === me?.id) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      setShowNewPill(false);
    } else {
      setShowNewPill(true);
    }
  }, [messages, initialLoading, me?.id]);

  // Mark incoming messages read — once per message id.
  useEffect(() => {
    if (!me?.id || !messages.length) return;
    messages.forEach(m => {
      if (m._status || m.sender_id === me.id || m.read) return;
      if (markedReadRef.current.has(m.id)) return;
      markedReadRef.current.add(m.id);
      base44.entities.ChatMessage.update(m.id, { read: true }).catch(() => {});
    });
  }, [messages, me?.id]);

  // Pull the previous page while keeping the exact scroll position.
  const loadOlderKeepPosition = async () => {
    const el = listRef.current;
    if (!el || !hasMore || loadingOlder) return;
    const prevHeight = el.scrollHeight;
    const prevTop = el.scrollTop;
    preserveRef.current = true;
    await loadOlder();
    requestAnimationFrame(() => {
      preserveRef.current = false;
      const node = listRef.current;
      if (!node) return;
      node.scrollTop = node.scrollHeight - prevHeight + prevTop;
    });
  };

  const handleScroll = () => {
    if (scrollRafRef.current) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = 0;
      const el = listRef.current;
      if (!el) return;
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      const nearBottom = distance < NEAR_BOTTOM_PX;
      stickRef.current = nearBottom;
      if (nearBottom) setShowNewPill(false);
      if (el.scrollTop < LOAD_OLDER_PX) loadOlderKeepPosition();
    });
  };

  const jumpToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    stickRef.current = true;
    setShowNewPill(false);
  };

  // ── Sending ──────────────────────────────────────────────────────────────
  const handleSend = (content, mediaUrl = null, mediaType = 'img') => {
    gate(async () => {
      const localId = await send(content, mediaUrl, mediaType);
      if (!localId) return;
      setInput('');
      if (inputRef.current) inputRef.current.style.height = 'auto';
      stickRef.current = true;

      // Moderation runs alongside the send; a flagged message is pulled back out.
      if (!mediaUrl && content.trim().length > 1) {
        moderateText(content.trim()).then(res => {
          if (res?.flagged) {
            dropLocal(localId);
            setBlockedMsg(content.trim());
            setTimeout(() => setBlockedMsg(null), 5000);
          }
        });
      }
    });
  };

  const handleStopRecording = async () => {
    const audioUrl = await stopRecording();
    if (audioUrl) handleSend('', audioUrl, 'audio');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    gate(async () => {
      setUploading(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        await send('', file_url, 'img');
      } catch {
        toast.error(t('chat_send_error'));
      } finally {
        setUploading(false);
        e.target.value = '';
      }
    });
  };

  // Group messages by date and by sender run — memoized so it only recomputes
  // when messages change. `isLastInGroup` carries the avatar, name and meta row.
  const grouped = useMemo(() => {
    const result = [];
    let lastDate = null;
    messages.forEach((msg, idx) => {
      const msgDate = msg.created_date ? new Date(msg.created_date).toDateString() : null;
      if (msgDate && msgDate !== lastDate) {
        result.push({ type: 'date', date: msg.created_date, key: `sep-${idx}` });
        lastDate = msgDate;
      }
      const prev = result[result.length - 1];
      const isContinuation = prev?.type === 'msg' && prev.msg.sender_id === msg.sender_id;
      const next = messages[idx + 1];
      const isLastInGroup = !next || next.sender_id !== msg.sender_id;
      result.push({ type: 'msg', msg, isContinuation, isLastInGroup, key: msg.id });
    });
    return result;
  }, [messages]);

  // Prefer the counterpart's own profile name — an applicant is not yet the
  // task's `worker_name`, so the task snapshot would show the wrong person.
  const otherPersonName = otherUserData?.display_name || otherUserData?.full_name
    || (me?.id === task?.client_id ? (task?.worker_name || t('chat_worker_default')) : (task?.client_name || t('chat_client_default')));

  const openProfile = () => { if (otherPersonId) navigate(`/public-profile?id=${otherPersonId}`); };
  const openTask = () => { if (task) openTaskSheet(task.id); };

  return createPortal(
    <div
      ref={shellRef}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: '100dvh',
        display: 'flex', flexDirection: 'column',
        background: 'var(--surface-1)',
        zIndex: 999999, overflow: 'hidden',
      }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {showVerify && <VerifyModal onClose={onVerifyClose} onSuccess={onVerifySuccess} />}

      <ChatHeader
        name={otherPersonName}
        photo={otherUserData?.profile_photo}
        user={otherUserData}
        isOnline={otherIsOnline}
        task={task}
        isRTL={isRTL}
        t={t}
        onOpenProfile={openProfile}
        onOpenTask={openTask}
      />

      {/* ── Messages — the only scrollable region ── */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <div
          ref={listRef}
          onScroll={handleScroll}
          style={{
            flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
            overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch',
            padding: '12px 14px 16px',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {loadingOlder && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 12px', flexShrink: 0 }}>
              <Loader2 size={16} className="animate-spin" color="var(--text-3)" />
            </div>
          )}

          {task && <TaskContextCard task={task} isRTL={isRTL} t={t} onOpen={openTask} />}

          {initialLoading && messages.length === 0 ? (
            <ChatSkeleton />
          ) : messages.length === 0 ? (
            <ChatEmptyState name={otherPersonName} />
          ) : (
            grouped.map(item => {
              if (item.type === 'date') return <DateSeparator key={item.key} date={item.date} />;
              return (
                <ChatMessageRow
                  key={item.key}
                  msg={item.msg}
                  isMe={item.msg.sender_id === me?.id}
                  isContinuation={item.isContinuation}
                  isLastInGroup={item.isLastInGroup}
                  otherUserData={otherUserData}
                  onRetry={retry}
                />
              );
            })
          )}

          {blockedMsg && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <div style={{ maxWidth: '80%', background: 'var(--color-danger-bg)', border: '1.5px solid var(--color-danger-border)', borderRadius: '18px 18px 6px 18px', padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <ShieldAlert size={14} color="var(--color-danger)" />
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-danger)' }}>{t('chat_blocked_title')}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-1)', wordBreak: 'break-word' }}>{blockedMsg.slice(0, 60)}{blockedMsg.length > 60 ? '...' : ''}</div>
                <div style={{ fontSize: 11, color: 'var(--color-danger)', marginTop: 4, lineHeight: 1.5 }}>{t('chat_blocked_body')}</div>
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showNewPill && <NewMessagesPill key="new-pill" onClick={jumpToBottom} />}
        </AnimatePresence>
      </div>

      <ChatComposer
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
        }}
        onSend={handleSend}
        onFileChange={handleFileUpload}
        inputRef={inputRef}
        fileRef={fileRef}
        recording={recording}
        recordSeconds={recordSeconds}
        uploading={uploading}
        uploadingVoice={uploadingVoice}
        onStartRecording={startRecording}
        onStopRecording={handleStopRecording}
        onCancelRecording={cancelRecording}
        formatTime={formatTime}
        isRTL={isRTL}
        t={t}
      />
    </div>,
    document.body
  );
}