import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, X, ExternalLink, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

export default function QuickChatDrawer({ task, me, onClose }) {
   const navigate = useNavigate();
   const queryClient = useQueryClient();
   const [msg, setMsg] = useState('');
   const [sending, setSending] = useState(false);
   const [keyboardHeight, setKeyboardHeight] = useState(0);
   const bottomRef = useRef(null);
   const inputRef = useRef(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['quickChat', task.id],
    queryFn: () => base44.entities.ChatMessage.filter({ task_id: task.id }, 'created_date', 100),
    refetchInterval: 3000,
  });

  // Real-time subscription
  useEffect(() => {
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.data?.task_id !== task.id) return;
      queryClient.invalidateQueries({ queryKey: ['quickChat', task.id] });
    });
    return unsub;
  }, [task.id, queryClient]);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Keyboard avoid logic for mobile
  useEffect(() => {
    const handleResize = () => {
      if (inputRef.current) {
        inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const send = async () => {
    if (!msg.trim() || sending) return;
    setSending(true);
    await base44.entities.ChatMessage.create({
      task_id: task.id,
      sender_id: me.id,
      sender_name: me.full_name,
      content: msg.trim(),
    });
    setMsg('');
    setSending(false);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
         style={{ width: '100%', height: '70vh', maxHeight: '90vh', background: 'white', display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 48px rgba(0,0,0,0.2)', borderRadius: '20px 20px 0 0' }}
         dir="rtl"
       >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #f0f4fb', flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1a2540', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              צ'אט · {task.title}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              {task.worker_name || task.client_name || ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => { onClose(); navigate(`/chat/${task.id}`); }}
              style={{ width: 34, height: 34, borderRadius: 10, background: '#eff6ff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              title="פתח צ'אט מלא"
            >
              <ExternalLink size={15} color="#1a6fd4" />
            </button>
            <button
              onClick={onClose}
              style={{ width: 34, height: 34, borderRadius: 10, background: '#f1f5f9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={15} color="#64748b" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 80 }}>
              <Loader2 size={20} color="#1a6fd4" className="animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#cbd5e1', fontSize: 13, padding: '32px 0' }}>
              אין הודעות עדיין — התחל שיחה
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.sender_id === me?.id;
              return (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                  {!isMine && (
                    <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3, paddingRight: 4 }}>{m.sender_name}</div>
                  )}
                  <div style={{
                    maxWidth: '78%',
                    padding: '9px 13px',
                    borderRadius: isMine ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
                    background: isMine ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : '#f1f5f9',
                    color: isMine ? 'white' : '#1a2540',
                    fontSize: 13,
                    lineHeight: 1.45,
                    fontWeight: 400,
                  }}>
                    {m.content}
                  </div>
                  <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 3, paddingRight: 4 }}>
                    {m.created_date ? format(new Date(m.created_date), 'HH:mm') : ''}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '10px 16px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))', borderTop: '1px solid #f0f4fb', display: 'flex', gap: 8, flexShrink: 0 }} ref={inputRef}>
          <input
            autoFocus
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            onFocus={() => {
              setTimeout(() => {
                inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }, 300);
            }}
            placeholder="כתוב הודעה..."
            style={{ flex: 1, height: 44, borderRadius: 14, border: '1.5px solid #e2e8f0', padding: '0 14px', fontSize: 16, fontFamily: 'inherit', outline: 'none', background: '#f8fafc', color: '#1a2540', WebkitAppearance: 'none', minHeight: 44 }}
          />
          <button
            onClick={send}
            disabled={!msg.trim() || sending}
            style={{ width: 44, height: 44, borderRadius: 14, background: msg.trim() ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : '#e2e8f0', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: msg.trim() ? 'pointer' : 'not-allowed', transition: 'background 0.2s', flexShrink: 0 }}
          >
            {sending ? <Loader2 size={16} color="white" className="animate-spin" /> : <Send size={16} color={msg.trim() ? 'white' : '#94a3b8'} />}
          </button>
        </div>
      </div>
    </div>
  );
}