import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { chatThreadKey } from '@/lib/chatThread';
import { useQuery } from '@tanstack/react-query';
import { Send, Loader2, Image, Info, ShieldAlert, Mic, X } from 'lucide-react';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { toast } from 'sonner';
import BackButton from '@/components/BackButton';
import { moderateText } from '@/hooks/useModeration';
import { format, isToday, isYesterday } from 'date-fns';
import VerifyModal from '@/components/VerifyModal';
import { useVerifyGuard } from '@/hooks/useVerifyGuard';
import UserVerificationBadge from '@/components/UserVerificationBadge';
import { useLanguage } from '@/lib/LanguageContext';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { useChatViewport } from '@/hooks/useViewportHeight';
import useChatThread from '@/hooks/useChatThread';
import ChatImageBubble from '@/components/chat/ChatImageBubble';
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

function DateSeparator({ date }) {
  const { t } = useLanguage();
  const d = new Date(date);
  const label = isToday(d) ? t('chat_today') : isYesterday(d) ? t('chat_yesterday') : format(d, 'dd/MM/yyyy');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border-1)' }} />
      <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border-1)' }} />
    </div>
  );
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

  // Group messages by date — memoized so it only recomputes when messages change.
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
      result.push({ type: 'msg', msg, isContinuation, key: msg.id });
    });
    return result;
  }, [messages]);

  // Prefer the counterpart's own profile name — an applicant is not yet the
  // task's `worker_name`, so the task snapshot would show the wrong person.
  const otherPersonName = otherUserData?.display_name || otherUserData?.full_name
    || (me?.id === task?.client_id ? (task?.worker_name || t('chat_worker_default')) : (task?.client_name || t('chat_client_default')));

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

      {/* ── Header — fixed ── */}
      <div style={{
        background: 'var(--surface-2)',
        borderBottom: '1px solid var(--border-1)',
        padding: 'max(12px, env(safe-area-inset-top)) 12px 12px',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        flexShrink: 0, zIndex: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <BackButton />
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#1a6fd4,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }}
            onClick={() => { if (otherPersonId) navigate(`/public-profile?id=${otherPersonId}`); }}>
            {otherUserData?.profile_photo
              ? <img src={otherUserData.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: 'white', fontWeight: 700 }}>{otherPersonName?.[0] || '?'}</span>}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0, textAlign: 'center', cursor: 'pointer' }} onClick={() => {
          if (otherPersonId) navigate(`/public-profile?id=${otherPersonId}`);
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <span style={{ fontWeight: 800, color: 'var(--text-1)', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{otherPersonName}</span>
            <UserVerificationBadge user={otherUserData} size="sm" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 2 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: otherIsOnline ? '#22c55e' : '#d1d5db', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{otherIsOnline ? t('chat_online') : t('chat_offline')}</span>
          </div>
        </div>

        <button
          onClick={() => task && openTaskSheet(task.id)}
          style={{ background: '#eff6ff', border: 'none', borderRadius: 12, padding: '7px 11px', color: '#1a6fd4', fontWeight: 700, fontSize: 12, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
        >
          <Info size={14} /> {t('chat_task_info')}
        </button>
      </div>

      {/* ── Messages — the only scrollable region ── */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <div
          ref={listRef}
          onScroll={handleScroll}
          style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: '16px', display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {loadingOlder && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 10px' }}>
              <Loader2 size={16} className="animate-spin" color="#94a3b8" />
            </div>
          )}

          {initialLoading && messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} style={{ alignSelf: i % 2 ? 'flex-end' : 'flex-start', width: `${42 + (i % 3) * 14}%`, height: 40, borderRadius: 18, background: 'var(--surface-3)', opacity: 1 - i * 0.12 }} />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 60 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
              <div style={{ fontWeight: 700, color: '#334155', fontSize: 15 }}>{t('chat_start_conv')}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{t('chat_send_msg_to').replace('{name}', otherPersonName)}</div>
            </div>
          ) : (
            grouped.map(item => {
              if (item.type === 'date') return <DateSeparator key={item.key} date={item.date} />;
              return (
                <ChatMessageRow
                  key={item.key}
                  msg={item.msg}
                  isMe={item.msg.sender_id === me?.id}
                  isContinuation={item.isContinuation}
                  otherUserData={otherUserData}
                  onRetry={retry}
                />
              );
            })
          )}

          {blockedMsg && (
            <div dir={isRTL ? 'rtl' : 'ltr'} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <div style={{ maxWidth: '80%', background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '18px 18px 4px 18px', padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <ShieldAlert size={14} color="#dc2626" />
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#dc2626' }}>{t('chat_blocked_title')}</span>
                </div>
                <div style={{ fontSize: 13, color: '#7f1d1d', wordBreak: 'break-word' }}>{blockedMsg.slice(0, 60)}{blockedMsg.length > 60 ? '...' : ''}</div>
                <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4, lineHeight: 1.5 }}>{t('chat_blocked_body')}</div>
              </div>
            </div>
          )}
        </div>

        {showNewPill && <NewMessagesPill onClick={jumpToBottom} />}
      </div>

      {/* ── Composer — fixed, sits directly above the keyboard ── */}
      <div style={{
        background: 'var(--surface-2)',
        borderTop: '1px solid var(--border-1)',
        padding: '10px 12px',
        paddingBottom: 'max(10px, var(--safe-bottom, env(safe-area-inset-bottom)))',
        display: 'flex', alignItems: 'flex-end', gap: 8,
        flexShrink: 0,
      }}>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading || recording || uploadingVoice}
          style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--surface-3)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          {uploading ? <Loader2 size={16} color="#1a6fd4" className="animate-spin" /> : <Image size={16} color="#64748b" />}
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/*,.pdf" style={{ display: 'none' }} onChange={handleFileUpload} />

        {recording ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 22, background: 'var(--color-danger-bg)', border: '1.5px solid #fca5a5', minHeight: 42 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', animation: 'pulse-app 1.5s infinite' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', fontFamily: 'monospace' }}>{formatTime(recordSeconds)}</span>
            <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{t('chat_recording')}</span>
            <button onClick={cancelRecording} style={{ marginRight: 'auto', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <X size={14} /> {t('chat_cancel')}
            </button>
          </div>
        ) : (
          <div style={{ flex: 1, background: 'var(--surface-3)', borderRadius: 22, border: '1.5px solid var(--border-1)', display: 'flex', alignItems: 'center', padding: '2px 6px 2px 12px', gap: 6, minHeight: 42 }}>
            <textarea
              ref={inputRef}
              placeholder={t('chat_type_msg')}
              value={input}
              rows={1}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input); }
              }}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 16, lineHeight: 1.5, resize: 'none', maxHeight: 120, overflowY: 'auto', padding: '6px 0', direction: isRTL ? 'rtl' : 'ltr' }}
            />
          </div>
        )}

        {uploadingVoice ? (
          <button disabled style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, background: 'var(--surface-3)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'not-allowed' }}>
            <Loader2 size={16} color="#1a6fd4" className="animate-spin" />
          </button>
        ) : recording ? (
          <button
            onClick={handleStopRecording}
            style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, background: '#dc2626', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(220,38,38,0.3)' }}
          >
            <Send size={16} color="white" />
          </button>
        ) : input.trim() ? (
          <button
            onClick={() => handleSend(input)}
            style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#1a6fd4,#3b82f6)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(26,111,212,0.3)' }}
          >
            <Send size={16} color="white" />
          </button>
        ) : (
          <button
            onClick={startRecording}
            disabled={uploading}
            style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, background: 'var(--surface-3)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Mic size={16} color="#64748b" />
          </button>
        )}
      </div>

      <style>{`
        @keyframes pillSlideIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
}