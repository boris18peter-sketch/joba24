import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { MessageCircle, Loader2 } from 'lucide-react';
import BackButton from '@/components/BackButton';
import PageHeader from '@/components/PageHeader';
import { formatDistanceToNow } from 'date-fns';

export default function ChatInbox() {
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const queryClient = useQueryClient();

  // Get all tasks where I'm involved (as worker or client) — all statuses with messages
  const { data: workerTasks = [] } = useQuery({
    queryKey: ['chatInboxWorker', me?.id],
    queryFn: () => base44.entities.Task.filter({ worker_id: me.id }, '-updated_date', 50),
    enabled: !!me?.id,
    staleTime: 0,
  });

  const { data: clientTasks = [] } = useQuery({
    queryKey: ['chatInboxClient', me?.id],
    queryFn: () => base44.entities.Task.filter({ client_id: me.id }, '-updated_date', 50),
    enabled: !!me?.id,
    staleTime: 0,
  });

  // Real-time task status sync for inbox
  useEffect(() => {
    if (!me?.id) return;
    const unsub = base44.entities.Task.subscribe((event) => {
      const t = event.data || {};
      const updateInbox = (key, matchFn) => {
        queryClient.setQueryData([key, me.id], (old = []) => {
          if (event.type === 'update') {
            if (matchFn(t) && !old.find(x => x.id === event.id)) return [t, ...old];
            return old.map(x => x.id === event.id ? { ...x, ...t } : x);
          }
          if (event.type === 'delete') return old.filter(x => x.id !== event.id);
          return old;
        });
      };
      updateInbox('chatInboxWorker', t => t.worker_id === me.id);
      updateInbox('chatInboxClient', t => t.client_id === me.id);
    });
    return unsub;
  }, [me?.id, queryClient]);

  // Merge and deduplicate — filter out tasks where I'm both client and worker (edge case)
  const allTasks = useMemo(() => {
    const map = {};
    [...workerTasks, ...clientTasks].forEach(t => { map[t.id] = t; });
    return Object.values(map).sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date));
  }, [workerTasks, clientTasks]);

  // Fetch last message per task — only show tasks that have messages
  const [lastMessages, setLastMessages] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [tasksWithMessages, setTasksWithMessages] = useState(new Set());

  // Only tasks with actual messages
  const visibleTasks = useMemo(() => {
    if (tasksWithMessages.size === 0 && allTasks.length > 0) return []; // still loading
    return allTasks.filter(t => tasksWithMessages.has(t.id));
  }, [allTasks, tasksWithMessages]);

  useEffect(() => {
    if (!allTasks.length || !me?.id) return;
    let cancelled = false;
    const run = async () => {
      const newLastMessages = {};
      const newUnreadCounts = {};
      const withMsgs = new Set();
      // Process in batches of 5 to avoid rate limiting
      const tasks = allTasks.slice(0, 20);
      for (let i = 0; i < tasks.length; i += 5) {
        if (cancelled) return;
        const batch = tasks.slice(i, i + 5);
        await Promise.all(batch.map(async (task) => {
          try {
            const msgs = await base44.entities.ChatMessage.filter({ task_id: task.id }, '-created_date', 20);
            if (msgs.length > 0) {
              withMsgs.add(task.id);
              newLastMessages[task.id] = msgs[0];
              newUnreadCounts[task.id] = msgs.filter(m => m.sender_id !== me.id && !m.read).length;
            }
          } catch {}
        }));
        if (i + 5 < tasks.length) await new Promise(r => setTimeout(r, 300));
      }
      if (!cancelled) {
        setLastMessages(newLastMessages);
        setUnreadCounts(newUnreadCounts);
        setTasksWithMessages(withMsgs);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [allTasks, me?.id]);

  // Real-time updates
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

  const isLoading = !me;

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-1)' }} dir="rtl">
      <PageHeader title="הודעות" right={<span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{visibleTasks.length} שיחות</span>} />

      <div style={{ padding: '16px 16px 100px' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={28} className="animate-spin text-primary mx-auto" /></div>
        ) : visibleTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <p style={{ fontWeight: 700, color: 'var(--text-1)', margin: 0, fontSize: 16 }}>אין שיחות פעילות</p>
            <p style={{ color: '#888', fontSize: 13, marginTop: 6 }}>שיחות יופיעו כאן כשמשימה תתחיל</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {visibleTasks.map(task => {
              const isMyTask = task.client_id === me?.id;
              const otherName = isMyTask ? (task.worker_name || 'פועל') : (task.client_name || 'מעסיק');
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
                      <div style={{ fontSize: 12, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ color: 'var(--text-3)', marginLeft: 4 }}>{task.title}</span>
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
            })}
          </div>
        )}
      </div>
    </div>
  );
}