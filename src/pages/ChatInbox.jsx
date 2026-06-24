import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { MessageCircle, Loader2, LifeBuoy } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/lib/LanguageContext';

const ACTIVE_STATUSES = ['TAKEN', 'APPROVED_PENDING_DEPARTURE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'];

export default function ChatInbox() {
  const { t, isRTL } = useLanguage();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const queryClient = useQueryClient();

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

  const { data: supportMsgs = [] } = useQuery({
    queryKey: ['supportMsgs', me?.id],
    queryFn: () => base44.entities.SupportMessage.filter({ user_id: me.id }, '-created_date', 50),
    enabled: !!me?.id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Layout's useRealtimeSync already updates workerTasksLayout & myPublishedTasks caches via WebSocket.
  // No need for a duplicate subscription here.

  // Merge and deduplicate
  const allTasks = useMemo(() => {
    const map = {};
    [...workerTasks, ...clientTasks].forEach(t => { map[t.id] = t; });
    return Object.values(map).sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date));
  }, [workerTasks, clientTasks]);

  // Visible = tasks with active engagement (worker assigned)
  const visibleTasks = useMemo(() => {
    return allTasks.filter(t => ACTIVE_STATUSES.includes(t.status));
  }, [allTasks]);

  // Stable dependency string — only re-fetch when task set changes
  const taskIdString = useMemo(() => visibleTasks.map(t => t.id).sort().join(','), [visibleTasks]);

  // Fetch last messages + unread counts
  const [lastMessages, setLastMessages] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    if (!taskIdString || !me?.id) return;
    let cancelled = false;

    const run = async () => {
      const taskIds = taskIdString.split(',').filter(Boolean);
      if (!taskIds.length) {
        setLastMessages({});
        setUnreadCounts({});
        return;
      }

      const newLastMessages = {};
      const newUnreadCounts = {};

      try {
        const allMsgs = await base44.entities.ChatMessage.filter(
          { task_id: { $in: taskIds } },
          '-created_date',
          500
        );

        const byTask = {};
        allMsgs.forEach(m => {
          if (!byTask[m.task_id]) byTask[m.task_id] = [];
          byTask[m.task_id].push(m);
        });

        Object.entries(byTask).forEach(([taskId, msgs]) => {
          newLastMessages[taskId] = msgs[0];
          newUnreadCounts[taskId] = msgs.filter(m => m.sender_id !== me.id && !m.read).length;
        });
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
          results.forEach((msgs, j) => {
            if (msgs.length > 0) {
              const taskId = batch[j];
              newLastMessages[taskId] = msgs[0];
              newUnreadCounts[taskId] = msgs.filter(m => m.sender_id !== me.id && !m.read).length;
            }
          });
        }
      }

      if (!cancelled) {
        setLastMessages(newLastMessages);
        setUnreadCounts(newUnreadCounts);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [taskIdString, me?.id]);

  // Real-time message updates
  useEffect(() => {
    if (!me?.id) return;
    const unsub = base44.entities.ChatMessage.subscribe(event => {
      if (event.type === 'create' && event.data) {
        const msg = event.data;
        setLastMessages(prev => ({ ...prev, [msg.task_id]: msg }));
        if (msg.sender_id !== me.id) {
          setUnreadCounts(prev => ({ ...prev, [msg.task_id]: (prev[msg.task_id] || 0) + 1 }));
        }
      }
    });
    return unsub;
  }, [me?.id]);

  // Support chat preview
  const supportUnread = useMemo(() =>
    supportMsgs.filter(m => m.sender_role === 'admin' && !m.read).length,
  [supportMsgs]);
  const lastSupportMsg = supportMsgs[0];

  const isLoading = !me;
  const totalChats = visibleTasks.length + 1; // +1 for support

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
                    <span style={{ fontWeight: 900, color: 'var(--text-1)', fontSize: 14 }}>תמיכת Joba24</span>
                    {lastSupportMsg?.created_date && (
                      <span style={{ fontSize: 10, color: '#aaa', flexShrink: 0 }}>
                        {formatDistanceToNow(new Date(lastSupportMsg.created_date), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lastSupportMsg
                      ? (lastSupportMsg.sender_role === 'admin' ? '' : '← ') + lastSupportMsg.content
                      : 'צוות התמיכה של Joba24 זמין עבורך 🎧'
                    }
                  </div>
                </div>
                <MessageCircle size={16} color="#1a6fd4" style={{ flexShrink: 0 }} />
              </div>
            </Link>

            {/* ── Task chats ── */}
            {visibleTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
                <p style={{ fontWeight: 700, color: 'var(--text-1)', margin: 0, fontSize: 15 }}>אין צ'אטים פעילים כרגע</p>
                <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 6 }}>צ'אטים עם לקוחות/עובדים יופיעו כאן כשעבודה תתחיל</p>
              </div>
            ) : (
              visibleTasks.map(task => {
                const isMyTask = task.client_id === me?.id;
                const otherName = isMyTask ? (task.worker_name || t('worker')) : (task.client_name || t('client'));
                const lastMsg = lastMessages[task.id];
                const unread = unreadCounts[task.id] || 0;

                return (
                  <Link key={task.id} to={`/chat/${task.id}`} style={{ textDecoration: 'none' }}
                    onClick={() => setUnreadCounts(prev => ({ ...prev, [task.id]: 0 }))}
                  >
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
                          {task.title}
                        </div>
                        {lastMsg && (
                          <div style={{ fontSize: 12, color: unread > 0 ? 'var(--text-1)' : 'var(--text-3)', fontWeight: unread > 0 ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                            {lastMsg.sender_id === me?.id ? '← ' : ''}{lastMsg.content}
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