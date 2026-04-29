import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { MessageCircle, Loader2 } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { formatDistanceToNow } from 'date-fns';

export default function ChatInbox() {
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  // Get all tasks where I'm involved (as worker or client) and are TAKEN
  const { data: workerTasks = [] } = useQuery({
    queryKey: ['chatInboxWorker', me?.id],
    queryFn: () => base44.entities.Task.filter({ worker_id: me.id, status: 'TAKEN' }, '-updated_date', 50),
    enabled: !!me?.id,
    refetchInterval: 10000,
  });

  const { data: clientTasks = [] } = useQuery({
    queryKey: ['chatInboxClient', me?.id],
    queryFn: () => base44.entities.Task.filter({ client_id: me.id, status: 'TAKEN' }, '-updated_date', 50),
    enabled: !!me?.id,
    refetchInterval: 10000,
  });

  // Merge and deduplicate
  const allTasks = useMemo(() => {
    const map = {};
    [...workerTasks, ...clientTasks].forEach(t => { map[t.id] = t; });
    return Object.values(map).sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date));
  }, [workerTasks, clientTasks]);

  // Fetch last message per task
  const [lastMessages, setLastMessages] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    if (!allTasks.length || !me?.id) return;
    allTasks.forEach(async (task) => {
      const msgs = await base44.entities.ChatMessage.filter({ task_id: task.id }, '-created_date', 1);
      if (msgs[0]) setLastMessages(prev => ({ ...prev, [task.id]: msgs[0] }));
      // Count unread (not sent by me)
      const all = await base44.entities.ChatMessage.filter({ task_id: task.id }, 'created_date', 100);
      const unread = all.filter(m => m.sender_id !== me.id && !m.read).length;
      setUnreadCounts(prev => ({ ...prev, [task.id]: unread }));
    });
  }, [allTasks.length, me?.id]);

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
    <div className="min-h-screen" style={{ background: '#f4f7fb' }} dir="rtl">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', padding: '52px 16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton style={{ background: 'rgba(255,255,255,0.15)', border: 'none', boxShadow: 'none' }} iconColor="white" />
        <div>
          <h1 style={{ color: 'white', fontSize: 20, fontWeight: 900, margin: 0 }}>הודעות</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '2px 0 0' }}>{allTasks.length} שיחות פעילות</p>
        </div>
      </div>

      <div style={{ padding: '16px 16px 100px' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={28} className="animate-spin text-primary mx-auto" /></div>
        ) : allTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <p style={{ fontWeight: 700, color: '#0f2b6b', margin: 0, fontSize: 16 }}>אין שיחות פעילות</p>
            <p style={{ color: '#888', fontSize: 13, marginTop: 6 }}>שיחות יופיעו כאן כשמשימה תתחיל</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {allTasks.map(task => {
              const isMyTask = task.client_id === me?.id;
              const otherName = isMyTask ? (task.worker_name || 'פועל') : (task.client_name || 'מעסיק');
              const lastMsg = lastMessages[task.id];
              const unread = unreadCounts[task.id] || 0;

              return (
                <Link key={task.id} to={`/chat/${task.id}`} style={{ textDecoration: 'none' }}
                  onClick={() => setUnreadCounts(prev => ({ ...prev, [task.id]: 0 }))}
                >
                  <div style={{
                    background: 'white',
                    borderRadius: 18,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    border: unread > 0 ? '1.5px solid #bfdbfe' : '1px solid #dce8f5',
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
                        <span style={{ fontWeight: unread > 0 ? 900 : 700, color: '#0f2b6b', fontSize: 14 }}>{otherName}</span>
                        {lastMsg?.created_date && (
                          <span style={{ fontSize: 10, color: '#aaa', flexShrink: 0 }}>
                            {formatDistanceToNow(new Date(lastMsg.created_date), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#bbb', marginLeft: 4 }}>{task.title}</span>
                      </div>
                      {lastMsg && (
                        <div style={{ fontSize: 12, color: unread > 0 ? '#0f2b6b' : '#999', fontWeight: unread > 0 ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
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