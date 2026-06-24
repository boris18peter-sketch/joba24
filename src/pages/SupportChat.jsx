import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Headphones, Send, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BackButton from '@/components/BackButton';

export default function SupportChat() {
  const { user: me, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const loadMessages = useCallback(async () => {
    if (!me?.id) return;
    setLoading(true);
    try {
      const msgs = await base44.entities.SupportMessage.filter(
        { user_id: me.id },
        'created_date',
        200,
      );
      setMessages(msgs);
      const unreadAdmin = msgs.filter(m => m.sender_role === 'admin' && !m.read);
      if (unreadAdmin.length > 0) {
        for (const m of unreadAdmin) {
          base44.entities.SupportMessage.update(m.id, { read: true }).catch(() => {});
        }
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [me?.id]);

  useEffect(() => {
    if (isAuthenticated) loadMessages();
  }, [isAuthenticated, loadMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!me?.id) return;
    const unsub = base44.entities.SupportMessage.subscribe((event) => {
      if (event.data?.user_id === me.id) {
        setMessages(prev => {
          if (prev.some(m => m.id === event.data.id)) {
            return prev.map(m => m.id === event.data.id ? { ...m, ...event.data } : m);
          }
          return [...prev, event.data];
        });
        if (event.data.sender_role === 'admin' && !event.data.read) {
          base44.entities.SupportMessage.update(event.data.id, { read: true }).catch(() => {});
        }
      }
    });
    return unsub;
  }, [me?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !me?.id) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    try {
      const msg = await base44.entities.SupportMessage.create({
        user_id: me.id,
        user_name: me.full_name || me.email,
        sender_role: 'user',
        content,
      });
      setMessages(prev => [...prev, msg]);
    } catch {
      setInput(content);
    }
    setSending(false);
  };

  if (!isAuthenticated) {
    navigate('/chats');
    return null;
  }

  return (
    <div dir="rtl" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--surface-1)' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--header-bg)',
        backdropFilter: 'blur(8px)',
        padding: '7px 12px 6px',
        borderBottom: '1px solid var(--border-1)',
        display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0,
      }}>
        <BackButton to="/chats" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Headphones size={16} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-1)' }}>תמיכת Joba24</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>צוות התמיכה</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: '12px 16px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Loader2 size={24} className="animate-spin" color="#1a6fd4" />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎧</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>איך נוכל לעזור?</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>כתבו לנו הודעה ונחזור אליכם בהקדם</div>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} style={{
              display: 'flex',
              justifyContent: msg.sender_role === 'user' ? 'flex-start' : 'flex-end',
            }}>
              <div style={{
                maxWidth: '80%',
                padding: '8px 12px',
                borderRadius: msg.sender_role === 'user'
                  ? '14px 14px 14px 4px'
                  : '14px 14px 4px 14px',
                background: msg.sender_role === 'user' ? 'var(--surface-3)' : 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
                color: msg.sender_role === 'user' ? 'var(--text-1)' : 'white',
                fontSize: 14,
                lineHeight: 1.5,
                wordBreak: 'break-word',
              }}>
                {msg.content}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 16px max(10px, env(safe-area-inset-bottom))',
        borderTop: '1px solid var(--border-1)',
        display: 'flex',
        gap: 8,
        flexShrink: 0,
        background: 'var(--surface-2)',
      }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          placeholder="כתוב הודעה..."
          dir="rtl"
          style={{
            flex: 1, height: 42, borderRadius: 12,
            border: '1.5px solid var(--border-1)',
            background: 'var(--input-bg)', color: 'var(--text-1)',
            padding: '0 14px', fontSize: 15, outline: 'none',
            boxSizing: 'border-box', fontFamily: 'inherit',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{
            width: 42, height: 42, borderRadius: 12,
            background: input.trim() ? 'linear-gradient(135deg, #1a6fd4, #0a52b0)' : 'var(--surface-3)',
            border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, minHeight: 'unset', minWidth: 'unset',
          }}
        >
          {sending ? <Loader2 size={18} className="animate-spin" color="white" /> : <Send size={18} color={input.trim() ? 'white' : 'var(--text-3)'} />}
        </button>
      </div>
    </div>
  );
}