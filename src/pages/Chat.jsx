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
    <div className="flex flex-col h-screen" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border px-4 pt-12 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowRight className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold truncate">{task?.title || 'צ\'אט'}</h1>
          <p className="text-xs text-muted-foreground">
            {task?.client_name} ↔ {task?.worker_name || 'ממתין למבצע'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-20">
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
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-card border border-border text-foreground rounded-tl-sm'
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
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-card border-t border-border px-4 py-3 flex gap-2">
        <Input
          placeholder="כתוב הודעה..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          className="flex-1 bg-secondary border-0 rounded-xl"
        />
        <Button
          onClick={sendMessage}
          disabled={sending || !input.trim()}
          size="icon"
          className="rounded-xl w-10 h-10 shrink-0"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}