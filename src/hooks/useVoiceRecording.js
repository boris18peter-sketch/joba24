import { useState, useRef, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Shared voice recording hook for all chat interfaces.
 * Records audio, uploads it, and returns the file URL.
 *
 * Usage:
 *   const { recording, recordSeconds, uploading, start, stop, cancel, formatTime } = useVoiceRecording();
 *   const audioUrl = await stop(); // returns uploaded URL or null
 */
export function useVoiceRecording() {
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mr = new MediaRecorder(stream, { mimeType });
      mr._mimeType = mimeType;
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch {
      toast.error('לא ניתן להפעיל את המיקרופון');
    }
  }, []);

  // stop() returns a Promise that resolves with the uploaded audio URL (or null)
  const stop = useCallback(() => {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr || mr.state === 'inactive') { resolve(null); return; }
      mr.onstop = async () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        if (audioChunksRef.current.length === 0) { resolve(null); return; }
        setUploading(true);
        try {
          const blob = new Blob(audioChunksRef.current, { type: mr._mimeType });
          const ext = mr._mimeType.includes('webm') ? 'webm' : 'm4a';
          const file = new File([blob], `voice_message.${ext}`, { type: mr._mimeType });
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          resolve(file_url);
        } catch {
          toast.error('שגיאה בשליחת ההקלטה');
          resolve(null);
        }
        setUploading(false);
      };
      mr.stop();
      setRecording(false);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    });
  }, []);

  const cancel = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.onstop = null;
      mr.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
    }
    setRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const formatTime = useCallback((s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, []);

  return { recording, recordSeconds, uploading, start, stop, cancel, formatTime };
}