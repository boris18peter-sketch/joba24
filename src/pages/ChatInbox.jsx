import React, { useState, useEffect, useMemo, useRef } from 'react';
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

  return Object.values(map).sort(
    (a, b) => new Date(b.lastMsg?.created_date || 0) - new Date(a.lastMsg?.created_date || 0)
  );
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
      const tasks = await base44.entities.Task.filter({ id: { $in: taskIds } });
      return tasks;
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

  const taskIdString = useMemo(() => allTasks.map(t => t.id).sort().join(','), [allTasks]);

  const [conversations, setConversations] = useState([]);

  // Live tasks for the realtime handler (avoids re-subscribing on every render)
  const tasksRef = useRef(allTasks);
  useEffect(() => { tasksRef.current = allTasks; }, [allTasks]);

  useEffect(() => {
    if (!me?.id || !allTasks.length) {
      setConversations([]);
      return;
    }
    let cancelled = false;

    const run = async () => {
      const taskIds = allTasks.map(t => t.id);
      let allMsgs = [];

      try {
        allMsgs = await base44.entities.ChatMessage.filter(
          { task_id: { $in: taskIds } },
          '-created_date',
          500
        );
      } catch {
        // If $in not supported, fetch messages in small sequential batches (max 3 at a time)
        const batchSize = 3;
        for (let i = 0; i < taskIds.length && i < 15; i += batchSize) {
          const batch = taskIds.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map(id =>
              base44.entities.ChatMessage.filter({ task_id: id }, '-created_date', 50)
                .catch(() => [])
            )
          );
          results.forEach(msgs => { allMsgs = allMsgs.concat(msgs); });
        }
      }

      if (!cancelled) setConversations(buildConversations(allMsgs, allTasks, me.id));
    };

    run();
    return () => { cancelled = true; };
  }, [taskIdString, me?.id]);

  // Real-time message updates
  useEffect(() => {
    if (!me?.id) return;
    const unsub = base44.entities.ChatMessage.subscribe(event => {
      if (event.type !== 'create' || !event.data) return;
      const m = event.data;
      const task = tasksRef.current.find(t => t.id === m.task_id);
      if (!task) return;
      const otherId = m.thread_key
        ? threadCounterpart(m.thread_key, me.id)
        : (me.id === task.client_id ? task.worker_id : task.client_id);
      if (!otherId || otherId === me.id) return;
      const key = `${m.task_id}::${otherId}`;
      const isMine = m.sender_id === me.id;

      setConversations(prev => {
        const idx = prev.findIndex(c => c.key === key);
        if (idx === -1) {
          return [{
            key, task, otherId, lastMsg: m,
            unread: isMine ? 0 : 1,
            otherName: m.sender_id === otherId ? (m.sender_name || '') : '',
          }, ...prev];
        }
        const next = [...prev];
        const cur = next[idx];
        next[idx] = {
          ...cur,
          lastMsg: (!cur.lastMsg || new Date(m.created_date) >= new Date(cur.lastMsg.created_date)) ? m : cur.lastMsg,
          unread: isMine ? cur.unread : cur.unread + 1,
          otherName: m.sender_id === otherId ? (m.sender_name || cur.otherName) : cur.otherName,
        };
        return next;
      });
    });
    return unsub;
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
                borderRadius: 18,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
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
                    <span style={{ fontWeight: 900, color: 'var(--text-1)', fontSize: 14 }}>{t('ci_support')}</span>
                    {lastSupportMsg?.created_date && (
                      <span style={{ fontSize: 10, color: '#aaa', flexShrink: 0 }}>
                        {formatDistanceToNow(new Date(lastSupportMsg.created_date), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                  <Link key={conv.key} to={`/chat/${conv.task.id}?with=${conv.otherId}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      background: 'var(--card-bg)',
                      borderRadius: 18,
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      border: unread > 0 ? '1.5px solid #bfdbfe' : `1px solid var(--border-1)`,
                      boxShadow: unread > 0 ? '0 2px 12px rgba(26,111,212,0.1)' : '0 1px 4px rgba(0,0,0,0.04)',
                      marginBottom: 8,
                    }}>
                      {/* Avatar */}
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

                      {/* Content */}
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