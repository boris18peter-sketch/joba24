import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Send, X, ArrowRight, Loader2 } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { moderateText } from '@/hooks/useModeration';
import GoldBadge from '@/components/GoldBadge';
import { isUserVerified, hasSocialVerified } from '@/lib/utils';

/**
 * QuickChatDrawer — full-screen chat popup.
 * Mirrors the Chat.jsx layout: fixed header (flexShrink 0) → scrollable messages (flex 1) → input bar (flexShrink 0).
 */
export default function QuickChatDrawer({ task, me, otherUser, onClose }) {
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const scrollRef = useRef(null);

  const otherPersonName = otherUser?.full_name || task.worker_name || task.client_name || 'משתמש';
  const otherUserData = otherUser || {
    is_verified: task.worker_id === me?.id ? task.client_verified : task.worker_verified,
  };

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['quickChat', task.id],
    queryFn: () => base44.entities.ChatMessage.filter({ task_id: task.id }, 'created_date', 200),
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

  // Auto scroll — scroll the container directly (avoids scrollIntoView scrolling parents)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
    try {
      await base44.entities.ChatMessage.create({
        task_id: task.id,
        sender_id: me.id,
        sender_name: me.full_name,
        content: msg.trim(),
      });
      setMsg('');
    } catch (e) {
      // let it bubble
    }
    setSending(false);
  };

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'var(--surface-1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      dir="rtl"
    >
      {/* Header — fixed, doesn't scroll */}
      <div style={{
        background: 'var(--surface-2)',
        borderBottom: '1px solid var(--border-1)',
        padding: '48px 12px 12px',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        flexShrink: 0, zIndex: 40,
      }}>
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 11, background: '#eff6ff', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}>
          <ArrowRight size={18} color="#1a6fd4" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontWeight: 800, color: 'var(--text-1)', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{otherPersonName}</span>
            {isUserVerified(otherUserData) && (hasSocialVerified(otherUserData) ? <GoldBadge size="sm" /> : <VerifiedBadge size="sm" />)}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.title}
          </div>
        </div>
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 11, background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <X size={20} />
        </button>
      </div>

      {/* Messages — scrollable */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch',
        minHeight: 0, padding: '16px', display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 80 }}>
            <Loader2 size={20} color="#1a6fd4" className="animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#cbd5e1', fontSize: 13, padding: '32px 0' }}>
            אין הודעות עדיין — התחל שיחה
          </div>
        ) : (
          <>
            {messages.map((m) => {
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
                    wordBreak: 'break-word',
                  }}>
                    {m.content}
                  </div>
                  <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 3, paddingRight: 4 }}>
                    {m.created_date ? format(new Date(m.created_date), 'HH:mm') : ''}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Input bar — fixed, doesn't scroll */}
      <div style={{
        background: 'var(--surface-2)',
        borderTop: '1px solid var(--border-1)',
        padding: '10px 12px',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        display: 'flex', alignItems: 'flex-end', gap: 8,
        flexShrink: 0,
      }}>
        {blocked && (
          <div style={{ width: '100%', marginBottom: 6, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
            🛡️ הודעה נחסמה — שמור על שיח מכבד
          </div>
        )}
        <input
          value={msg}
          onChange={e => { setMsg(e.target.value); setBlocked(false); }}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          onFocus={() => {
            setTimeout(() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
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
    </div>,
    document.body
  );
}