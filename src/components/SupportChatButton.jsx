import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Headphones, X, Send, Loader2 } from 'lucide-react';

export default function SupportChatButton() {
  const { user: me, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
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
      // Mark admin replies as read
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
    if (open && me?.id) loadMessages();
  }, [open, me?.id, loadMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!me?.id) return;
    const unsub = base44.entities.SupportMessage.subscribe((event) => {
      if (event.data?.user_id === me.id) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === event.data.id)) {
            return prev.map(m => m.id === event.data.id ? { ...m, ...event.data } : m);
          }
          return [...prev, event.data];
        });
        // Mark admin replies as read
        if (event.data.sender_role === 'admin' && !event.data.read) {
          base44.entities.SupportMessage.update(event.data.id, { read: true }).catch(() => {});
        }
      }
    });
    return unsub;
  }, [me?.id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

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

  if (!isAuthenticated || !me || me.role === 'admin') return null;

  return createPortal(
    <>
      {/* Floating support button — fixed at top-left (RTL: visual left) */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'fixed',
          top: 54,
          left: 10,
          zIndex: 45,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '6px 12px',
          borderRadius: 99,
          background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
          color: 'white',
          fontSize: 12,
          fontWeight: 800,
          border: '2px solid white',
          boxShadow: '0 4px 16px rgba(26,111,212,0.4)',
          cursor: 'pointer',
          minHeight: 'unset',
          minWidth: 'unset',
        }}
      >
        <Headphones size={14} />
        תמיכה
      </button>

      {/* Chat overlay */}
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            background: 'rgba(5,15,40,0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            dir="rtl"
            style={{
              background: 'var(--sheet-bg)',
              borderRadius: '24px 24px 0 0',
              width: '100%',
              maxWidth: 480,
              height: '80dvh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -12px 48px rgba(0,0,0,0.3)',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '14px 16px 10px',
              borderBottom: '1px solid var(--border-1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Headphones size={16} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-1)' }}>תמיכה</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>צוות Joba24</div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: 30, height: 30, borderRadius: 10,
                  background: 'var(--surface-3)', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', minHeight: 'unset', minWidth: 'unset',
                }}
              >
                <X size={16} color="var(--text-2)" />
              </button>
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
                  <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>איך נוכל לעזור?</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>כתו�ו לנו הודעה ונחזור אליך בהקדם</div>
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
        </div>
      )}
    </>,
    document.body,
  );
}