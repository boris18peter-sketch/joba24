import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Loader2, Image, Check, CheckCheck, Info, ShieldAlert } from 'lucide-react';
import TaskDetailsRows from '@/components/TaskDetailsRows.jsx';
import { toast } from 'sonner';
import BackButton from '@/components/BackButton';
import { moderateText } from '@/hooks/useModeration';
import { format, isToday, isYesterday } from 'date-fns';
import VerifyModal from '@/components/VerifyModal';
import { useVerifyGuard } from '@/hooks/useVerifyGuard';
import VerifiedBadge from '@/components/VerifiedBadge';

// Online status: fetch + subscribe to real-time changes, check < 90s = online
function useOnlineStatus(userId) {
  const [isOnline, setIsOnline] = useState(false);
  useEffect(() => {
    if (!userId) return;
    const check = async () => {
      try {
        const results = await base44.entities.UserPresence.filter({ user_id: userId });
        const p = results[0];
        if (p?.last_seen) {
          const diff = Date.now() - new Date(p.last_seen).getTime();
          setIsOnline(diff < 90000);
        } else {
          setIsOnline(false);
        }
      } catch { setIsOnline(false); }
    };
    check();
    const interval = setInterval(check, 20000);
    // Also subscribe to real-time presence updates
    const unsub = base44.entities.UserPresence.subscribe(event => {
      if (event.data?.user_id === userId && event.data?.last_seen) {
        const diff = Date.now() - new Date(event.data.last_seen).getTime();
        setIsOnline(diff < 90000);
      }
    });
    return () => { clearInterval(interval); unsub(); };
  }, [userId]);
  return isOnline;
}

// Ping my own presence every 30s
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
    const interval = setInterval(ping, 30000);
    return () => clearInterval(interval);
  }, [userId]);
}

function DateSeparator({ date }) {
  const d = new Date(date);
  const label = isToday(d) ? 'היום' : isYesterday(d) ? 'אתמול' : format(d, 'dd/MM/yyyy');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border-1)' }} />
      <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border-1)' }} />
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: '18px 18px 4px 18px', padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', animation: `typingBounce 1.2s ease-in-out ${i*0.2}s infinite` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TaskInfoPopup({ task, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div dir="rtl" style={{ background: 'var(--surface-1)', borderRadius: '24px 24px 0 0', width: '100%', maxHeight: '85dvh', overflowY: 'auto', padding: '20px 16px', paddingBottom: 'max(24px,env(safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '0 auto 16px' }} />
        {/* Title + price */}
        <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)', marginBottom: 4 }}>{task.title}</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: '#1a6fd4', marginBottom: 16 }}>₪{task.price}</div>
        {/* Shared structured rows */}
        <TaskDetailsRows task={task} compact={false} />
        <button onClick={() => { onClose(); window.location.href = `/task/${task.id}`; }}
          style={{ marginTop: 16, width: '100%', height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: 'white', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer' }}>
          פתח דף המשימה המלא
        </button>
      </div>
    </div>
  );
}

export default function Chat() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [blockedMsg, setBlockedMsg] = useState(null);
  const [showTaskInfo, setShowTaskInfo] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const typingTimerRef = useRef(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { gate, showVerify, onSuccess: onVerifySuccess, onClose: onVerifyClose } = useVerifyGuard(me);
  usePingPresence(me?.id);

  const { data: task } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => base44.entities.Task.filter({ id: taskId }),
    select: d => d[0],
  });

  // Fetch other user's profile for avatar + verified status
  const otherPersonIdCalc = me?.id === (task?.client_id) ? task?.worker_id : task?.client_id;
  const otherIsOnline = useOnlineStatus(otherPersonIdCalc);
  const { data: otherUserData } = useQuery({
    queryKey: ['userProfile', otherPersonIdCalc],
    queryFn: () => base44.entities.User.filter({ id: otherPersonIdCalc }),
    select: d => d?.[0],
    enabled: !!otherPersonIdCalc,
  });

  // Load message history — use sessionStorage cache to avoid empty screen on re-enter
  const CACHE_KEY = `chat_msgs_${taskId}`;
  const { data: fetchedMessages = [] } = useQuery({
    queryKey: ['chatMessages', taskId],
    queryFn: () => base44.entities.ChatMessage.filter({ task_id: taskId }, 'created_date', 500),
    staleTime: 0,
    refetchInterval: 3000,
    initialData: () => {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : undefined;
      } catch { return undefined; }
    },
  });

  // Sync fetched messages into local state + persist to sessionStorage
  useEffect(() => {
    if (!fetchedMessages.length) return;
    setMessages(prev => {
      const fetchedIds = new Set(fetchedMessages.map(m => m.id));
      const extraRealtime = prev.filter(m => m._optimistic || !fetchedIds.has(m.id));
      const merged = [...fetchedMessages, ...extraRealtime].sort((a, b) =>
        new Date(a.created_date || 0) - new Date(b.created_date || 0)
      );
      // Persist to session for instant restore on re-entry
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(fetchedMessages)); } catch {}
      return merged;
    });
  }, [fetchedMessages]);

  // Mark incoming messages as read
  useEffect(() => {
    if (!me?.id || !messages.length) return;
    const unread = messages.filter(m => m.sender_id !== me.id && !m.read);
    unread.forEach(m => {
      base44.entities.ChatMessage.update(m.id, { read: true }).catch(() => {});
    });
  }, [messages, me?.id]);

  // Real-time subscription for instant updates
  useEffect(() => {
    const unsub = base44.entities.ChatMessage.subscribe(event => {
      if (event.data?.task_id !== taskId) return;
      if (event.type === 'create') {
        setMessages(prev => prev.some(m => m.id === event.data.id) ? prev : [...prev, event.data]);
        // Also invalidate query so polling stays in sync
        queryClient.invalidateQueries({ queryKey: ['chatMessages', taskId] });
        if (event.data.sender_id !== me?.id && event.data.id) {
          base44.entities.ChatMessage.update(event.data.id, { read: true }).catch(() => {});
        }
        if (event.data.sender_id !== me?.id) setOtherTyping(false);
      }
      if (event.type === 'update' && event.data?.read) {
        setMessages(prev => prev.map(m => m.id === event.data.id ? { ...m, read: true } : m));
      }
    });
    return unsub;
  }, [taskId, me?.id]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherTyping]);

  // Auto-focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleSend = (content, imageUrl = null) => {
    gate(() => sendMessage(content, imageUrl));
  };

  const sendMessage = async (content, imageUrl = null) => {
    if ((!content?.trim() && !imageUrl) || !me) return;
    const msgContent = imageUrl ? `[img]${imageUrl}` : content.trim();

    // Optimistic: add message to UI immediately
    const optimisticId = `opt-${Date.now()}`;
    const optimisticMsg = {
      id: optimisticId,
      task_id: taskId,
      sender_id: me.id,
      sender_name: me.full_name,
      content: msgContent,
      created_date: new Date().toISOString(),
      read: false,
      _optimistic: true,
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setInput('');
    setSending(true);

    // Moderation check in parallel — remove optimistic msg if flagged
    if (!imageUrl && content.trim().length > 1) {
      moderateText(content.trim()).then(modResult => {
        if (modResult.flagged) {
          setMessages(prev => prev.filter(m => m.id !== optimisticId));
          setBlockedMsg(content.trim());
          setTimeout(() => setBlockedMsg(null), 5000);
        }
      });
    }

    try {
      const created = await base44.entities.ChatMessage.create({
        task_id: taskId,
        sender_id: me.id,
        sender_name: me.full_name,
        content: msgContent,
      });
      // Replace optimistic with real message
      setMessages(prev => prev.map(m => m.id === optimisticId ? (created || { ...optimisticMsg, _optimistic: false }) : m));
    } catch {
      // Remove optimistic on error
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      toast.error('שגיאה בשליחה');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    gate(async () => {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await sendMessage('', file_url);
      setUploading(false);
      e.target.value = '';
    });
  };

  // Group messages by date
  const grouped = [];
  let lastDate = null;
  messages.forEach((msg, idx) => {
    const msgDate = msg.created_date ? new Date(msg.created_date).toDateString() : null;
    if (msgDate && msgDate !== lastDate) {
      grouped.push({ type: 'date', date: msg.created_date, key: `sep-${idx}` });
      lastDate = msgDate;
    }
    // Group consecutive messages from same sender
    const prev = grouped[grouped.length - 1];
    const isContinuation = prev?.type === 'msg' && prev.msg.sender_id === msg.sender_id;
    grouped.push({ type: 'msg', msg, isContinuation, key: msg.id });
  });

  const otherPersonName = me?.id === task?.client_id ? (task?.worker_name || 'הפועל') : (task?.client_name || 'המעסיק');
  const otherPersonId = me?.id === task?.client_id ? task?.worker_id : task?.client_id;
  const roleLabel = me?.id === task?.client_id ? '👷 פועל' : '👤 מעסיק';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--surface-1)', zIndex: 9999, position: 'relative' }} dir="rtl">
      {showVerify && <VerifyModal onClose={onVerifyClose} onSuccess={onVerifySuccess} />}
      {/* Header */}
      <div style={{
        background: 'var(--surface-2)',
        borderBottom: '1px solid var(--border-1)',
        padding: '48px 16px 12px',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <BackButton />
        {/* Avatar */}
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#1a6fd4,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
          {otherUserData?.profile_photo
            ? <img src={otherUserData.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: 'white', fontWeight: 700 }}>{otherPersonName?.[0] || '?'}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => {
          if (otherPersonId) navigate(`/public-profile?id=${otherPersonId}`);
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontWeight: 800, color: 'var(--text-1)', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{otherPersonName}</div>
            {otherUserData?.is_verified && <VerifiedBadge size="sm" />}
            <span style={{ fontSize: 10, color: '#64748b', background: '#f1f5f9', borderRadius: 6, padding: '1px 6px', fontWeight: 600, flexShrink: 0 }}>{roleLabel}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#94a3b8' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: otherIsOnline ? '#22c55e' : '#d1d5db', display: 'inline-block', flexShrink: 0 }} />
            <span>{otherIsOnline ? 'מחובר עכשיו' : 'לא מחובר'}</span>
            {task?.title && <span>· {task.title}</span>}
          </div>
        </div>
        {/* Task info button */}
        <button
          onClick={() => setShowTaskInfo(true)}
          style={{ background: '#eff6ff', border: 'none', borderRadius: 10, padding: '6px 10px', color: '#1a6fd4', fontWeight: 700, fontSize: 12, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Info size={14} /> פרטי משימה
        </button>
      </div>
      {showTaskInfo && task && <TaskInfoPopup task={task} onClose={() => setShowTaskInfo(false)} />}

      {/* Messages */}
      <div ref={containerRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
            <div style={{ fontWeight: 700, color: '#334155', fontSize: 15 }}>התחל שיחה</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>שלח הודעה ל{otherPersonName}</div>
          </div>
        )}

        {grouped.map(item => {
          if (item.type === 'date') return <DateSeparator key={item.key} date={item.date} />;
          const { msg, isContinuation } = item;
          const isMe = msg.sender_id === me?.id;
          const isImage = msg.content?.startsWith('[img]');
          const imgUrl = isImage ? msg.content.replace('[img]', '') : null;

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: isMe ? 'flex-end' : 'flex-start',
                marginBottom: isContinuation ? 2 : 8,
                alignItems: 'flex-end', gap: 6,
              }}
            >
              {/* Avatar for other person (only on last in group) */}
              {!isMe && !isContinuation && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#1a6fd4,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0, marginBottom: 2, color: 'white', fontWeight: 700, overflow: 'hidden' }}>
                  {otherUserData?.profile_photo
                    ? <img src={otherUserData.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : msg.sender_name?.[0] || '?'}
                </div>
              )}
              {!isMe && isContinuation && <div style={{ width: 28, flexShrink: 0 }} />}

              <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                {/* Sender name (first in group, not me) */}
                {!isMe && !isContinuation && (
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 3, paddingRight: 4 }}>{msg.sender_name}</div>
                )}

                {isImage ? (
                  <img
                    src={imgUrl}
                    alt="תמונה"
                    style={{ maxWidth: 220, maxHeight: 200, borderRadius: 14, objectFit: 'cover', cursor: 'pointer', border: isMe ? 'none' : '1px solid #e2e8f0' }}
                    onClick={() => window.open(imgUrl, '_blank')}
                  />
                ) : (
                  <div style={{
                    padding: '9px 13px',
                    borderRadius: isMe
                      ? (isContinuation ? '14px 14px 14px 4px' : '18px 18px 18px 4px')
                      : (isContinuation ? '14px 14px 4px 14px' : '18px 18px 4px 18px'),
                    background: isMe ? '#1e293b' : 'var(--surface-2)',
                    color: isMe ? 'white' : 'var(--text-1)',
                    fontSize: 14,
                    lineHeight: 1.5,
                    boxShadow: isMe ? 'none' : '0 1px 4px rgba(0,0,0,0.07)',
                    border: isMe ? 'none' : '1px solid var(--border-1)',
                    wordBreak: 'break-word',
                  }}>
                    {msg.content}
                  </div>
                )}

                {/* Timestamp + read */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 3, paddingRight: 4 }}>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>
                    {msg.created_date ? format(new Date(msg.created_date), 'HH:mm') : ''}
                  </span>
                  {isMe && (
                    msg.read
                      ? <CheckCheck size={12} color="#3b82f6" />
                      : <Check size={12} color="#94a3b8" />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {otherTyping && <TypingIndicator />}
        {blockedMsg && (
          <div dir="rtl" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <div style={{ maxWidth: '80%', background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '18px 18px 4px 18px', padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <ShieldAlert size={14} color="#dc2626" />
                <span style={{ fontSize: 12, fontWeight: 800, color: '#dc2626' }}>הודעה נחסמה</span>
              </div>
              <div style={{ fontSize: 13, color: '#7f1d1d', wordBreak: 'break-word' }}>{blockedMsg.slice(0, 60)}{blockedMsg.length > 60 ? '...' : ''}</div>
              <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4, lineHeight: 1.5 }}>הודעה זו נחסמה כיוון שהיא מפרה את תנאי השימוש — שמרו על שיח מכבד 🤝</div>
            </div>
          </div>
        )}
        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      {/* Input bar */}
      <div style={{
        background: 'var(--surface-2)',
        borderTop: '1px solid var(--border-1)',
        padding: '10px 12px',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        display: 'flex', alignItems: 'flex-end', gap: 8,
      }}>
        {/* File upload */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{ width: 40, height: 40, borderRadius: 12, background: '#f1f5f9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          {uploading ? <Loader2 size={16} color="#1a6fd4" className="animate-spin" /> : <Image size={16} color="#64748b" />}
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/*,.pdf" style={{ display: 'none' }} onChange={handleFileUpload} />

        {/* Text input */}
         <div style={{ flex: 1, background: 'var(--surface-3)', borderRadius: 22, border: '1.5px solid var(--border-1)', display: 'flex', alignItems: 'center', padding: '2px 6px 2px 12px', gap: 6, transition: 'border-color 0.2s', minHeight: 42 }}>
           <textarea
             ref={inputRef}
             placeholder="הקלד הודעה..."
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
             style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 16, lineHeight: 1.5, resize: 'none', maxHeight: 120, overflowY: 'auto', padding: '6px 0', direction: 'rtl' }}
           />
         </div>

        {/* Send */}
        <button
          onClick={() => handleSend(input)}
          disabled={sending || (!input.trim())}
          style={{
            width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
            background: input.trim() ? 'linear-gradient(135deg,#1a6fd4,#3b82f6)' : '#e2e8f0',
            border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            boxShadow: input.trim() ? '0 4px 12px rgba(26,111,212,0.3)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} color={input.trim() ? 'white' : '#94a3b8'} />}
        </button>
      </div>

      <style>{`
        @keyframes typingBounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}