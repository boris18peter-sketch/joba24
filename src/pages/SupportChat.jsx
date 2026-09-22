import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';
import SupportHeader from '@/components/support/SupportHeader';
import SupportMessageBubble from '@/components/support/SupportMessageBubble';
import SupportComposer from '@/components/support/SupportComposer';

export default function SupportChat() {
  const { user: me, isAuthenticated } = useAuth();
  const { t, isRTL } = useLanguage();
  const [messages, setMessages] = useState([]);
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
      const msgs = await base44.entities.SupportMessage.filter({ user_id: me.id }, 'created_date', 200);
      setMessages(msgs);
      // Mark admin replies as read
      for (const m of msgs.filter(x => x.sender_role === 'admin' && !x.read)) {
        base44.entities.SupportMessage.update(m.id, { read: true }).catch(() => {});
      }
    } catch {
      // ignore — the empty state will show
    }
    setLoading(false);
  }, [me?.id]);

  useEffect(() => {
    if (isAuthenticated) loadMessages();
  }, [isAuthenticated, loadMessages]);

  // Realtime — new admin replies appear instantly
  useEffect(() => {
    if (!me?.id) return;
    const unsub = base44.entities.SupportMessage.subscribe((event) => {
      if (event.data?.user_id !== me.id) return;
      setMessages(prev => {
        if (prev.some(m => m.id === event.data.id)) {
          return prev.map(m => m.id === event.data.id ? { ...m, ...event.data } : m);
        }
        return [...prev, event.data];
      });
      if (event.data.sender_role === 'admin' && !event.data.read) {
        base44.entities.SupportMessage.update(event.data.id, { read: true }).catch(() => {});
      }
    });
    return unsub;
  }, [me?.id]);

  // Keep the newest message in view
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Release the mic if the user leaves mid-recording
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const persist = async (payload) => {
    const msg = await base44.entities.SupportMessage.create({
      user_id: me.id,
      user_name: me.full_name || me.email,
      sender_role: 'user',
      ...payload,
    });
    setMessages(prev => [...prev, msg]);
  };

  const handleSend = async (text) => {
    if (!text || !me?.id) return;
    setSending(true);
    try {
      await persist({ content: text });
    } catch {
      toast.error(t('support_send_error'));
    }
    setSending(false);
  };

  const handleFileUpload = async (files) => {
    if (!files?.length || !me?.id) return;
    setUploading(true);
    const urls = [];
    for (const file of Array.from(files)) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        urls.push(file_url);
      } catch {
        toast.error(t('support_upload_error'));
      }
    }
    setUploading(false);
    if (urls.length === 0) return;
    setSending(true);
    try {
      await persist({ content: '', media_urls: urls });
    } catch {
      toast.error(t('support_send_error'));
    }
    setSending(false);
  };

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
          await persist({ content: '', media_urls: [file_url] });
        } catch {
          toast.error(t('support_voice_error'));
        }
        setSending(false);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch {
      toast.error(t('support_mic_error'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    setRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
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

  if (!isAuthenticated) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-1)' }}>
        <Loader2 size={24} className="animate-spin" color="#1a6fd4" />
      </div>
    );
  }

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'var(--surface-1)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <SupportHeader />

      <div
        ref={scrollRef}
        style={{
          flex: 1, minHeight: 0, overflowY: 'auto',
          padding: '16px 14px',
          display: 'flex', flexDirection: 'column', gap: 10,
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Loader2 size={24} className="animate-spin" color="#1a6fd4" />
          </div>
        ) : messages.length === 0 ? (
          <div style={{
            margin: 'auto', textAlign: 'center', maxWidth: 300,
            background: 'var(--surface-2)', border: '1px solid var(--border-1)',
            borderRadius: 'var(--r-xl)', padding: '28px 22px',
            boxShadow: 'var(--shadow-xs)',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 14px',
              background: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
            }}>🎧</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>{t('support_empty_title')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.6 }}>{t('support_empty_body')}</div>
          </div>
        ) : (
          messages.map(msg => <SupportMessageBubble key={msg.id} msg={msg} />)
        )}
      </div>

      <SupportComposer
        onSend={handleSend}
        sending={sending}
        uploading={uploading}
        onPickFile={handleFileUpload}
        fileInputRef={fileInputRef}
        recording={recording}
        recordSeconds={recordSeconds}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onCancelRecording={cancelRecording}
      />
    </div>
  );
}