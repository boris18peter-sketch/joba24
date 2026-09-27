import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { MessageCircle, Loader2, LifeBuoy } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/lib/LanguageContext';
import { chatMessagePreview } from '@/lib/chatPreview';
import { threadCounterpart } from '@/lib/chatThread';

const ACTIVE_STATUSES = ['TAKEN', 'APPROVED_PENDING_DEPARTURE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'];

// Messages are read in chunks of tasks so every conversation gets its own
// headroom. A single flat limit could hide a conversation behind newer traffic
// elsewhere; a per-chunk limit scales with how many tasks the user has.
const CHUNK_SIZE = 8;
const PER_CHUNK = 150;

/**
 * One conversation per (task, other person) — never per task.
 * A task owner talking to two applicants gets two rows; each applicant gets
 * their own row with the owner and never shares a thread with the other.
 */
function buildConversations(messages, tasks, myId) {
  const taskById = Object.fromEntries(tasks.map((t) => [t.id, t]));
  const map = {};

  const touch = (taskId, otherId) => {
    const task = taskById[taskId];
    if (!task || !otherId || otherId === myId) return null;
    const key = `${taskId}::${otherId}`;
    if (!map[key]) map[key] = { key, task, otherId, lastMsg: null, unread: 0, otherName: '' };
    return map[key];
  };

  messages.forEach((m) => {
    const task = taskById[m.task_id];
    if (!task) return;
    const otherId = m.thread_key
      ? threadCounterpart(m.thread_key, myId)
      : (myId === task.client_id ? task.worker_id : task.client_id);
    const conv = touch(m.task_id, otherId);
    if (!conv) return;
    if (!conv.lastMsg || new Date(m.created_date) > new Date(conv.lastMsg.created_date)) conv.lastMsg = m;
    if (m.sender_id === conv.otherId && m.sender_name) conv.otherName = m.sender_name;
    if (m.sender_id !== myId && !m.read) conv.unread += 1;
  });

  // An approved pairing with no messages yet still belongs in the inbox.
  tasks.forEach((t) => {
    if (!ACTIVE_STATUSES.includes(t.status)) return;
    touch(t.id, myId === t.client_id ? t.worker_id : t.client_id);
  });

  // Most recent conversation first — by its real last message, falling back to
  // the task's own last update when nothing has been said yet.
  const stamp = (c) => new Date(c.lastMsg?.created_date || c.task.updated_date || 0).getTime();
  return Object.values(map).sort((a, b) => stamp(b) - stamp(a));
}

export default function ChatInbox() {
  const { t, isRTL } = useLanguage();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  // Reuse Layout's existing queries — avoids duplicate API calls
  const { data: workerTasks = [] } = useQuery({
    queryKey: ['workerTasksLayout', me?.id],
    queryFn: () => base44.entities.Task.filter({ worker_id: me.id }, '-updated_date', 50),
    enabled: !!me?.id,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: clientTasks = [] } = useQuery({
    queryKey: ['myPublishedTasks', me?.id],
    queryFn: () => base44.entities.Task.filter({ client_id: me.id }, '-updated_date', 50),
    enabled: !!me?.id,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Tasks the worker applied to (but isn't approved yet) — so conversations
  // started before approval still appear in the inbox.
  const { data: myApplications = [] } = useQuery({
    queryKey: ['myApplicationsFeed', me?.id],
    queryFn: () => base44.entities.TaskApplication.filter({ worker_id: me.id }, '-created_date', 50),
    enabled: !!me?.id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: appliedTasks = [] } = useQuery({
    queryKey: ['appliedTasks', me?.id],
    queryFn: async () => {
      if (!myApplications.length) return [];
      const taskIds = [...new Set(myApplications.map(a => a.task_id))];
      return base44.entities.Task.filter({ id: { $in: taskIds } });
    },
    enabled: !!me?.id && myApplications.length > 0,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: supportMsgs = [] } = useQuery({
    queryKey: ['supportMsgs', me?.id],
    queryFn: () => base44.entities.SupportMessage.filter({ user_id: me.id }, '-created_date', 50),
    enabled: !!me?.id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Merge and deduplicate — includes tasks the worker applied to (not yet approved)
  const allTasks = useMemo(() => {
    const map = {};
    [...workerTasks, ...clientTasks, ...appliedTasks].forEach(t => { map[t.id] = t; });
    return Object.values(map).sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date));
  }, [workerTasks, clientTasks, appliedTasks]);

  const taskIds = useMemo(() => allTasks.map(t => t.id), [allTasks]);
  const taskIdsKey = useMemo(() => [...taskIds].sort().join(','), [taskIds]);

  // One flat message store for the whole inbox; conversations are derived from
  // it. Realtime upserts into the store by id, so a read-receipt updates the
  // unread badge without any extra fetch.
  const [messages, setMessages] = useState([]);
  const storeRef = useRef(new Map());
  const taskIdsRef = useRef(taskIds);
  useEffect(() => { taskIdsRef.current = taskIds; }, [taskIds]);

  const mergeMessages = useCallback((incoming) => {
    if (!incoming?.length) return;
    for (const m of incoming) {
      if (!m?.id) continue;
      const prev = storeRef.current.get(m.id);
      storeRef.current.set(m.id, prev ? { ...prev, ...m } : m);
    }
    setMessages([...storeRef.current.values()]);
  }, []);

  const loadMessages = useCallback(async (ids) => {
    if (!ids.length) return;
    const chunks = [];
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) chunks.push(ids.slice(i, i + CHUNK_SIZE));
    const pages = await Promise.all(
      chunks.map(chunk =>
        base44.entities.ChatMessage
          .filter({ task_id: { $in: chunk } }, '-created_date', PER_CHUNK)
          .catch(() => [])
      )
    );
    mergeMessages(pages.flat());
  }, [mergeMessages]);

  useEffect(() => {
    if (!taskIdsKey) { setMessages([]); return; }
    loadMessages(taskIdsKey.split(','));
  }, [taskIdsKey, loadMessages]);

  // Realtime: creates AND updates (read receipts) — never deletes what we hold.
  useEffect(() => {
    if (!me?.id) return;
    const unsub = base44.entities.ChatMessage.subscribe(event => {
      if (event.type === 'delete') {
        if (storeRef.current.delete(event.id)) setMessages([...storeRef.current.values()]);
        return;
      }
      const m = event.data;
      if (!m?.id) return;
      if (!taskIdsRef.current.includes(m.task_id)) return;
      mergeMessages([m]);
    });
    return unsub;
  }, [me?.id, mergeMessages]);

  // Returning to the app re-reads the latest page so previews catch up.
  useEffect(() => {
    if (!me?.id) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible' && taskIdsRef.current.length) {
        loadMessages(taskIdsRef.current);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [me?.id, loadMessages]);

  const conversations = useMemo(
    () => (me?.id ? buildConversations(messages, allTasks, me.id) : []),
    [messages, allTasks, me?.id],
  );

  // Opening a conversation clears its badge immediately, without waiting for
  // the server round-trip.
  const markConversationRead = useCallback((conv) => {
    const touched = [];
    storeRef.current.forEach((m, id) => {
      if (m.task_id !== conv.task.id || m.read || m.sender_id === me?.id) return;
      const otherId = m.thread_key ? threadCounterpart(m.thread_key, me.id) : conv.otherId;
      if (otherId !== conv.otherId) return;
      storeRef.current.set(id, { ...m, read: true });
      touched.push(m.id);
      base44.entities.ChatMessage.update(m.id, { read: true }).catch(() => {});
    });
    if (touched.length) setMessages([...storeRef.current.values()]);
  }, [me?.id]);

  // Support chat preview
  const supportUnread = useMemo(() =>
    supportMsgs.filter(m => m.sender_role === 'admin' && !m.read).length,
  [supportMsgs]);
  const lastSupportMsg = supportMsgs[0];

  const isLoading = !me;
  const totalChats = conversations.length + 1; // +1 for support

  const nameFor = (conv) => {
    if (conv.otherName) return conv.otherName;
    const isMyTask = conv.task.client_id === me?.id;
    return isMyTask ? (conv.task.worker_name || t('worker')) : (conv.task.client_name || t('client'));
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-1)' }} dir={isRTL ? 'rtl' : 'ltr'}>
      <PageHeader title={t('messages')} right={<span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{totalChats} {t('chats')}</span>} />

      <div style={{ padding: '16px 16px 100px' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={28} className="animate-spin text-primary mx-auto" /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* ── Support chat — always at top ── */}
            <Link to="/support" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                borderRadius: 18, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
                border: '1.5px solid #bfdbfe',
                boxShadow: '0 2px 12px rgba(26,111,212,0.1)',
                marginBottom: 8,
              }}>
                <div style={{
                  width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}>
                  <LifeBuoy size={22} color="white" />
                  {supportUnread > 0 && (
                    <div style={{
                      position: 'absolute', top: -2, right: -2,
                      width: 18, height: 18, borderRadius: '50%',
                      background: '#dc2626', border: '2px solid white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 900, color: 'white',
                    }}>{supportUnread > 9 ? '9+' : supportUnread}</div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontWeight: 900, color: '#0f2b6b', fontSize: 14 }}>{t('ci_support')}</span>
                    {lastSupportMsg?.created_date && (
                      <span style={{ fontSize: 10, color: '#64748b', flexShrink: 0 }}>
                        {formatDistanceToNow(new Date(lastSupportMsg.created_date), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lastSupportMsg
                      ? (lastSupportMsg.sender_role === 'admin' ? '' : (isRTL ? '← ' : '→ ')) + lastSupportMsg.content
                      : t('ci_support_available')
                    }
                  </div>
                </div>
                <MessageCircle size={16} color="#1a6fd4" style={{ flexShrink: 0 }} />
              </div>
            </Link>

            {/* ── Task conversations — one row per person ── */}
            {conversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
                <p style={{ fontWeight: 700, color: 'var(--text-1)', margin: 0, fontSize: 15 }}>{t('no_active_conversations')}</p>
                <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 6 }}>{t('conversations_appear')}</p>
              </div>
            ) : (
              conversations.map(conv => {
                const otherName = nameFor(conv);
                const lastMsg = conv.lastMsg;
                const unread = conv.unread || 0;
                const isMyTask = conv.task.client_id === me?.id;

                return (
                  <Link
                    key={conv.key}
                    to={`/chat/${conv.task.id}?with=${conv.otherId}`}
                    style={{ textDecoration: 'none' }}
                    onClick={() => markConversationRead(conv)}
                  >
                    <div style={{
                      background: 'var(--card-bg)',
                      borderRadius: 18, padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: 14,
                      border: unread > 0 ? '1.5px solid #bfdbfe' : '1px solid var(--border-1)',
                      boxShadow: unread > 0 ? '0 2px 12px rgba(26,111,212,0.1)' : '0 1px 4px rgba(0,0,0,0.04)',
                      marginBottom: 8,
                    }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                        background: isMyTask ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, color: 'white', fontWeight: 900,
                        position: 'relative',
                      }}>
                        {otherName.charAt(0)}
                        {unread > 0 && (
                          <div style={{
                            position: 'absolute', top: -2, right: -2,
                            width: 18, height: 18, borderRadius: '50%',
                            background: '#dc2626', border: '2px solid white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, fontWeight: 900, color: 'white',
                          }}>{unread > 9 ? '9+' : unread}</div>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                          <span style={{ fontWeight: unread > 0 ? 900 : 700, color: 'var(--text-1)', fontSize: 14 }}>{otherName}</span>
                          {lastMsg?.created_date && (
                            <span style={{ fontSize: 10, color: '#aaa', flexShrink: 0 }}>
                              {formatDistanceToNow(new Date(lastMsg.created_date), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {conv.task.title}
                        </div>
                        {lastMsg && (
                          <div style={{ fontSize: 12, color: unread > 0 ? 'var(--text-1)' : 'var(--text-3)', fontWeight: unread > 0 ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                            {lastMsg.sender_id === me?.id ? (isRTL ? '← ' : '→ ') : ''}{chatMessagePreview(lastMsg.content, t)}
                          </div>
                        )}
                      </div>

                      <MessageCircle size={16} color={unread > 0 ? '#1a6fd4' : '#ccc'} style={{ flexShrink: 0 }} />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}