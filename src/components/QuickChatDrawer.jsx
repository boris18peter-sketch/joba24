import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, X, ExternalLink, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { moderateText } from '@/hooks/useModeration';

export default function QuickChatDrawer({ task, me, onClose }) {
   const navigate = useNavigate();
   const queryClient = useQueryClient();
   const [msg, setMsg] = useState('');
   const [sending, setSending] = useState(false);
   const [blocked, setBlocked] = useState(false);
   const [keyboardHeight, setKeyboardHeight] = useState(0);
   const bottomRef = useRef(null);
   const inputRef = useRef(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['quickChat', task.id],
    queryFn: () => base44.entities.ChatMessage.filter({ task_id: task.id }, 'created_date', 100),
    staleTime: 30000,
    refetchOnWindowFocus: false,
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
    if (msg.trim().length > 3) {
      const mod = await moderateText(msg.trim());
      if (mod.flagged) {
        setBlocked(true);
        setTimeout(() => setBlocked(false), 4000);
        return;
      }
    }
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
       style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backgroundColor: 'rgba(10,20,50,0.55)', backdropFilter: 'blur(4px)' }}
       onClick={e => e.target === e.currentTarget && onClose()}
     >
       <div
          style={{ width: '100%', height: '75vh', maxHeight: '90vh', background: 'white', display: 'flex', flexDirection: 'column', boxShadow: '0 -12px 48px rgba(0,0,0,0.25)', borderRadius: '24px 24px 0 0', position: 'relative', maxWidth: 480 }}
          dir="rtl"
          onClick={e => e.stopPropagation()}
        >
         {/* Drag handle + Close button */}
         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #f0f4fb', flexShrink: 0 }}>
           <div style={{ width: 48, height: 4, background: '#d1d5db', borderRadius: 2, marginBottom: 12, marginTop: 6 }} />
           <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', paddingRight: 8 }}>
             <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20, padding: 0, width: 28, height: 28 }}>✕</button>
           </div>
         </div>

         {/* Header */}
         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f0f4fb', flexShrink: 0 }}>
           <div style={{ flex: 1, minWidth: 0 }}>
             <div style={{ fontWeight: 700, fontSize: 15, color: '#1a2540', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
               צ'אט · {task.title}
             </div>
             <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
               {task.worker_name || task.client_name || ''}
             </div>
           </div>
           <button
             onClick={() => { onClose(); navigate(`/chat/${task.id}`); }}
             style={{ width: 40, height: 40, borderRadius: 12, background: '#eff6ff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
             title="פתח צ'אט מלא"
           >
             <ExternalLink size={16} color="#1a6fd4" />
           </button>
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
         <div style={{ padding: '10px 16px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))', borderTop: '1px solid #f0f4fb', display: 'flex', gap: 8, flexShrink: 0, position: 'sticky', bottom: 0, background: 'white', zIndex: 10 }} ref={inputRef}>
          {blocked && (
            <div style={{ width: '100%', marginBottom: 6, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              🛡️ הודעה נחסמה — שמור על שיח מכבד
            </div>
          )}
          <input
           autoFocus
           value={msg}
           onChange={e => { setMsg(e.target.value); setBlocked(false); }}
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