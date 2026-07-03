import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Headphones, Send, Loader2, Camera, Mic, MicOff, X } from 'lucide-react';
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
  const [transcribing, setTranscribing] = useState(false);
  const [vpBottom, setVpBottom] = useState(0);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

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

  // iOS visualViewport handling — keep input visible above keyboard
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const bottom = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setVpBottom(Math.floor(bottom));
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (mediaUrls = []) => {
    const content = input.trim();
    if (!content && mediaUrls.length === 0) return;
    if (!me?.id) return;
    setInput('');
    setSending(true);
    try {
      const msg = await base44.entities.SupportMessage.create({
        user_id: me.id,
        user_name: me.full_name || me.email,
        sender_role: 'user',
        content: content || '',
        media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
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

  // ── Media upload ──
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
      const content = input.trim();
      setInput('');
      setSending(true);
      try {
        const msg = await base44.entities.SupportMessage.create({
          user_id: me.id,
          user_name: me.full_name || me.email,
          sender_role: 'user',
          content: content || '',
          media_urls: urls,
        });
        setMessages(prev => [...prev, msg]);
      } catch {
        setInput(content);
      }
      setSending(false);
    }
  };

  // ── Voice recording ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' });
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setTranscribing(true);
        try {
          const blob = new Blob(audioChunksRef.current, { type: mr.mimeType });
          const file = new File([blob], 'recording.webm', { type: mr.mimeType });
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          const text = await base44.integrations.Core.TranscribeAudio({ audio_url: file_url });
          if (text && typeof text === 'string' && text.trim()) {
            setInput(prev => (prev ? prev + ' ' : '') + text.trim());
          }
        } catch (e) {
          console.error('Transcription error:', e);
          toast.error('שגיאה בתמלול ההקלטה');
        } finally {
          setTranscribing(false);
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (e) {
      console.error('Recording error:', e);
      toast.error('לא ניתן להפעיל את המיקרופון');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  if (!isAuthenticated) {
    navigate('/chats');
    return null;
  }

  return (
    <div dir="rtl" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--surface-1)', position: 'fixed', top: 0, left: 0, right: 0, bottom: vpBottom, overflow: 'hidden' }}>
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
                {msg.content && <p style={{ margin: 0 }}>{msg.content}</p>}
                {msg.media_urls?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: msg.content ? 8 : 0 }}>
                    {msg.media_urls.map((url, i) => {
                      const isVideo = url.match(/\.(mp4|webm|mov)/i);
                      return isVideo ? (
                        <video key={i} src={url} controls style={{ maxWidth: 180, borderRadius: 10 }} />
                      ) : (
                        <img key={i} src={url} alt="" style={{ maxWidth: 180, borderRadius: 10 }} />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input area */}
      <div style={{
        padding: '8px 16px max(8px, env(safe-area-inset-bottom))',
        borderTop: '1px solid var(--border-1)',
        display: 'flex', gap: 6, alignItems: 'flex-end',
        flexShrink: 0,
        background: 'var(--surface-2)',
      }}>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={e => handleFileUpload(e.target.files)} />

        {/* Camera / media upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || sending}
          style={{
            width: 38, height: 38, borderRadius: 19, flexShrink: 0,
            background: 'var(--surface-3)', border: '1px solid var(--border-1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', minHeight: 'unset', minWidth: 'unset',
          }}
        >
          {uploading ? <Loader2 size={16} className="animate-spin" color="var(--text-3)" /> : <Camera size={16} color="var(--text-2)" />}
        </button>

        {/* Text input */}
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={transcribing ? 'מתמלל...' : 'כתוב הודעה...'}
          disabled={transcribing}
          rows={1}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 20,
            border: '1.5px solid var(--border-1)',
            background: 'var(--input-bg)', color: 'var(--text-1)',
            fontSize: 16, outline: 'none', resize: 'none',
            fontFamily: 'inherit', minHeight: 40, maxHeight: 120,
            boxSizing: 'border-box', WebkitOverflowScrolling: 'touch',
          }}
        />

        {/* Mic / Send */}
        {input.trim() ? (
          <button
            onClick={() => handleSend()}
            disabled={sending}
            style={{
              width: 38, height: 38, borderRadius: 19, flexShrink: 0,
              background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', minHeight: 'unset', minWidth: 'unset',
            }}
          >
            {sending ? <Loader2 size={16} className="animate-spin" color="white" /> : <Send size={16} color="white" />}
          </button>
        ) : (
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={transcribing || uploading}
            style={{
              width: 38, height: 38, borderRadius: 19, flexShrink: 0,
              background: recording ? '#fee2e2' : 'var(--surface-3)',
              border: recording ? '1.5px solid #fca5a5' : '1px solid var(--border-1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', minHeight: 'unset', minWidth: 'unset',
            }}
          >
            {transcribing ? <Loader2 size={16} className="animate-spin" color="var(--text-3)" />
              : recording ? <MicOff size={16} color="#dc2626" /> : <Mic size={16} color="var(--text-2)" />}
          </button>
        )}
      </div>

      {/* Recording / transcribing indicators */}
      {(recording || transcribing) && (
        <div style={{
          padding: '4px 16px max(4px, env(safe-area-inset-bottom))',
          background: 'var(--surface-2)',
          flexShrink: 0,
        }}>
          {recording && (
            <div style={{ padding: '6px 10px', background: '#fee2e2', borderRadius: 8,
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#dc2626', fontWeight: 700 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#dc2626', animation: 'pulse-app 1.5s infinite' }} />
              מקליט... לחץ לעצירה
            </div>
          )}
          {transcribing && (
            <div style={{ padding: '6px 10px', background: 'var(--surface-3)', borderRadius: 8,
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-2)', fontWeight: 700 }}>
              <Loader2 size={10} className="animate-spin" /> מתמלל הקלטה...
            </div>
          )}
        </div>
      )}
    </div>
  );
}