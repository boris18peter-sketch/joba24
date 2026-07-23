import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Headphones, Send, Loader2, Image as ImageIcon, Mic, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BackButton from '@/components/BackButton';
import { toast } from 'sonner';

export default function SupportChat() {
  const { user: me, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const recordingStreamRef = useRef(null);

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

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;
    if (!me?.id) return;
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Media upload
  const handleFileUpload = async (files) => {
    if (!files?.length || !me?.id) return;
    setUploading(true);
    const urls = [];
    for (const file of Array.from(files)) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        urls.push(file_url);
      } catch {
        toast.error('שגיאה בהעלאת קובץ');
      }
    }
    setUploading(false);
    if (urls.length > 0) {
      setSending(true);
      try {
        const msg = await base44.entities.SupportMessage.create({
          user_id: me.id,
          user_name: me.full_name || me.email,
          sender_role: 'user',
          content: '',
          media_urls: urls,
        });
        setMessages(prev => [...prev, msg]);
      } catch {
        toast.error('שגיאה בשליחה');
      }
      setSending(false);
    }
  };

  // Voice recording — sends audio message (not transcription)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mr = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (audioChunksRef.current.length === 0) return;
        setSending(true);
        try {
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          const ext = mimeType.includes('webm') ? 'webm' : 'm4a';
          const file = new File([blob], `voice_message.${ext}`, { type: mimeType });
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          const msg = await base44.entities.SupportMessage.create({
            user_id: me.id,
            user_name: me.full_name || me.email,
            sender_role: 'user',
            content: '',
            media_urls: [file_url],
          });
          setMessages(prev => [...prev, msg]);
        } catch {
          toast.error('שגיאה בשליחת ההקלטה');
        }
        setSending(false);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordSeconds(s => s + 1);
      }, 1000);
    } catch {
      toast.error('לא ניתן להפעיל את המיקרופון');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      recordingStreamRef.current?.getTracks().forEach(t => t.stop());
    }
    setRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  // Render media (image / video / audio)
  const renderMedia = (url) => {
    const isAudio = url.includes('voice_message') || url.match(/\.(webm|mp3|wav|m4a|ogg|oga)$/i);
    const isVideo = url.match(/\.(mp4|mov|avi|mkv)$/i);
    if (isAudio) {
      return <audio src={url} controls style={{ maxWidth: 220, height: 36, outline: 'none' }} />;
    }
    if (isVideo) {
      return <video src={url} controls style={{ maxWidth: 180, borderRadius: 10 }} />;
    }
    return <img src={url} alt="" style={{ maxWidth: 180, borderRadius: 10, cursor: 'pointer' }} onClick={() => window.open(url, '_blank')} />;
  };

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--surface-1)' }}>
        <Loader2 size={24} className="animate-spin" color="#1a6fd4" />
      </div>
    );
  }

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div dir="rtl" style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--surface-1)', zIndex: 9999, position: 'relative',
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--surface-2)',
        borderBottom: '1px solid var(--border-1)',
        padding: '48px 12px 12px',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        flexShrink: 0,
      }}>
        <BackButton />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1a6fd4, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Headphones size={18} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>תמיכת Joba24</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>צוות התמיכה</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        display: 'flex', flexDirection: 'column', gap: 8,
        WebkitOverflowScrolling: 'touch',
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
              justifyContent: msg.sender_role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '80%',
                padding: '8px 12px',
                borderRadius: msg.sender_role === 'user'
                  ? '18px 18px 18px 4px'
                  : '18px 18px 4px 18px',
                background: msg.sender_role === 'user' ? '#1e293b' : 'var(--surface-2)',
                color: msg.sender_role === 'user' ? 'white' : 'var(--text-1)',
                fontSize: 14,
                lineHeight: 1.5,
                wordBreak: 'break-word',
                border: msg.sender_role === 'user' ? 'none' : '1px solid var(--border-1)',
                boxShadow: msg.sender_role === 'user' ? 'none' : '0 1px 4px rgba(0,0,0,0.07)',
              }}>
                {msg.content && <p style={{ margin: 0 }}>{msg.content}</p>}
                {msg.media_urls?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: msg.content ? 8 : 0 }}>
                    {msg.media_urls.map((url, i) => (
                      <div key={i}>{renderMedia(url)}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input bar — matching Chat.jsx */}
      <div style={{
        background: 'var(--surface-2)',
        borderTop: '1px solid var(--border-1)',
        padding: '10px 12px',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        display: 'flex', alignItems: 'flex-end', gap: 8,
        flexShrink: 0,
      }}>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={e => handleFileUpload(e.target.files)} />

        {/* File upload — Image icon matching Chat.jsx */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || sending || recording}
          style={{ width: 40, height: 40, borderRadius: 12, background: '#f1f5f9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          {uploading ? <Loader2 size={16} color="#1a6fd4" className="animate-spin" /> : <ImageIcon size={16} color="#64748b" />}
        </button>

        {/* Text input or recording indicator */}
        {recording ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 22,
            background: '#fef2f2', border: '1.5px solid #fca5a5',
            minHeight: 42,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', animation: 'pulse-app 1.5s infinite' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', fontFamily: 'monospace' }}>
              {formatTime(recordSeconds)}
            </span>
            <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>מקליט...</span>
            <button onClick={cancelRecording} style={{ marginRight: 'auto', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <X size={14} /> ביטול
            </button>
          </div>
        ) : (
          <div style={{
            flex: 1, background: 'var(--surface-3)', borderRadius: 22,
            border: '1.5px solid var(--border-1)', display: 'flex', alignItems: 'center',
            padding: '2px 6px 2px 12px', gap: 6, minHeight: 42,
          }}>
            <textarea
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder="הקלד הודעה..."
              rows={1}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 16, lineHeight: 1.5, resize: 'none', maxHeight: 120,
                overflowY: 'auto', padding: '6px 0', direction: 'rtl',
              }}
            />
          </div>
        )}

        {/* Mic / Send / Stop & send recording */}
        {recording ? (
          <button
            onClick={stopRecording}
            style={{
              width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
              background: '#dc2626', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(220,38,38,0.3)',
            }}
          >
            <Send size={16} color="white" />
          </button>
        ) : input.trim() ? (
          <button
            onClick={handleSend}
            disabled={sending}
            style={{
              width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#1a6fd4,#3b82f6)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(26,111,212,0.3)',
            }}
          >
            {sending ? <Loader2 size={16} className="animate-spin" color="white" /> : <Send size={16} color="white" />}
          </button>
        ) : (
          <button
            onClick={startRecording}
            disabled={sending || uploading}
            style={{
              width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
              background: '#f1f5f9', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Mic size={16} color="#64748b" />
          </button>
        )}
      </div>
    </div>
  );
}