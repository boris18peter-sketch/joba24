import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Send, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function Chat() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: task } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => base44.entities.Task.filter({ id: taskId }),
    select: d => d[0],
  });

  // Load initial messages
  useEffect(() => {
    base44.entities.ChatMessage.filter({ task_id: taskId }, 'created_date', 100)
      .then(setMessages);
  }, [taskId]);

  // Real-time subscription
  useEffect(() => {
    const unsub = base44.entities.ChatMessage.subscribe(event => {
      if (event.data?.task_id !== taskId) return;
      if (event.type === 'create') {
        setMessages(prev => [...prev, event.data]);
      }
    });
    return unsub;
  }, [taskId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !me) return;
    setSending(true);
    setInput('');
    await base44.entities.ChatMessage.create({
      task_id: taskId,
      sender_id: me.id,
      sender_name: me.full_name,
      content: input.trim(),
    });
    setSending(false);
  };

  return (
    <div className="flex flex-col h-screen" dir="rtl" style={{ background: '#f4f7fb' }}>
      {/* Header */}
       <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(244,247,251,0.97)', borderBottom: '1px solid #dce8f5', backdropFilter: 'blur(8px)', padding: '44px 16px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
         <button onClick={() => navigate(-1)} style={{ width: 38, height: 38, borderRadius: 12, background: 'white', border: '1px solid #dce8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
           <ArrowRight size={18} color="#1a6fd4" />
         </button>
         <div style={{ flex: 1, minWidth: 0 }}>
           <h1 style={{ fontWeight: 800, color: '#0f2b6b', fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{task?.title || 'צ\'אט'}</h1>
           <p style={{ fontSize: 12, color: '#1a6fd4', margin: '2px 0 0 0', cursor: 'pointer' }} onClick={() => {
             const otherPersonId = me?.id === task?.client_id ? task?.worker_id : task?.client_id;
             if (otherPersonId) navigate(`/worker-profile?id=${otherPersonId}`);
           }} title="לחץ לצפייה בפרופיל">
             👤 {me?.id === task?.client_id ? task?.worker_name || 'ממתין למבצע' : task?.client_name}
           </p>
         </div>
       </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-20" style={{ background: '#f4f7fb' }}>
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-muted-foreground text-sm">עדיין אין הודעות</p>
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_id === me?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[75%] ${isMe ? 'items-start' : 'items-end'} flex flex-col gap-1`}>
                {!isMe && (
                  <span className="text-xs text-muted-foreground px-1">{msg.sender_name}</span>
                )}
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isMe
                    ? 'bg-black text-white rounded-tr-sm'
                    : 'bg-white border border-gray-100 text-black rounded-tl-sm shadow-sm'
                }`}>
                  {msg.content}
                </div>
                {msg.created_date && (
                  <span className="text-xs text-muted-foreground px-1">
                    {format(new Date(msg.created_date), 'HH:mm')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderTop: '1px solid #dce8f5', padding: '12px 16px', display: 'flex', gap: 8, maxWidth: '512px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <Input
          placeholder="כתוב הודעה..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          style={{ flex: 1, background: '#f1f5f9', border: 'none', borderRadius: 12, fontSize: 14, padding: '10px 14px' }}
        />
        <button
          onClick={sendMessage}
          disabled={sending || !input.trim()}
          style={{ width: 40, height: 40, borderRadius: 12, background: input.trim() ? '#1a6fd4' : '#ddd', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() ? 'pointer' : 'not-allowed', fontSize: 18, fontWeight: 700 }}
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : '↩️'}
        </button>
      </div>
    </div>
  );
}