import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { 
  Mic, MicOff, Loader2, Sparkles, Zap, FileText, ArrowUp, Camera,
  MapPin, CreditCard, Clock, CheckCircle2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import BackButton from '@/components/BackButton';

// Feature pills — shown as a polished card group when all mandatory fields are filled
const FEATURE_PILLS = [
  {
    key: 'is_story',
    icon: Sparkles,
    label: 'פרסם כ-Story',
    desc: 'חשיפה פי 3 למשימה שלך — תופיע למעלה בפיד ל-24 שעות',
    cost: '10 ג\'ובות',
    color: '#a855f7',
    bg: '#faf5ff',
    border: '#d8b4fe',
    glow: 'rgba(168,85,247,0.12)',
  },
  {
    key: 'auto_bump_enabled',
    icon: Zap,
    label: 'העלאת מחיר אוטומטית',
    desc: 'המחיר עולה אוטומטית כל 5 דקות — עד שמגיעה בקשה ראשונה',
    cost: null,
    color: '#f59e0b',
    bg: '#fffbeb',
    border: '#fcd34d',
    glow: 'rgba(245,158,11,0.10)',
  },
  {
    key: 'requires_invoice',
    icon: FileText,
    label: 'חשבונית מס',
    desc: 'דרוש מהעובד חשבונית מס — מתאים לעסקים ועצמאים',
    cost: null,
    color: '#3b82f6',
    bg: '#eff6ff',
    border: '#bfdbfe',
    glow: 'rgba(59,130,246,0.10)',
  },
];

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '4px 0' }}>
      {[0, 0.2, 0.4].map((delay, i) => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%', background: '#94a3b8',
          animation: `typingBounce 0.6s ${delay}s infinite ease-in-out`
        }} />
      ))}
    </div>
  );
}

function FeatureCard({ pill, active, onToggle, extraConfig, onExtraChange }) {
  const Icon = pill.icon;
  const isActive = active;

  return (
    <div>
      <button
        onClick={() => onToggle(pill.key)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', borderRadius: 16, cursor: 'pointer',
          border: `1.5px solid ${isActive ? pill.border : '#e5e7eb'}`,
          background: isActive ? pill.bg : 'white',
          transition: 'all 0.2s',
          boxShadow: isActive ? `0 4px 20px ${pill.glow}` : '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 14, flexShrink: 0,
          background: isActive ? pill.color + '18' : '#f8fafc',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1.5px solid ${isActive ? pill.border : '#e5e7eb'}`,
        }}>
          <Icon size={20} color={isActive ? pill.color : '#9ca3af'} />
        </div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: isActive ? pill.color : '#1f2937', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
            {isActive && <CheckCircle2 size={14} color={pill.color} />}
            {pill.label}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3, lineHeight: 1.5 }}>{pill.desc}</div>
          {pill.cost && (
            <span style={{
              fontSize: 10, fontWeight: 800, color: pill.color,
              background: pill.bg, borderRadius: 6, padding: '2px 8px',
              display: 'inline-block', marginTop: 4,
            }}>
              {pill.cost}
            </span>
          )}
        </div>
      </button>

      {pill.key === 'auto_bump_enabled' && isActive && (
        <div style={{ marginTop: 8, padding: '14px 16px', background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>מחיר מקסימלי (₪)</div>
          <div style={{ fontSize: 11, color: '#b45309', marginBottom: 8, lineHeight: 1.5 }}>
            המחיר יעלה בהדרגה עד לסכום זה. ברגע שעובד מגיש בקשה — המחיר נעצר אוטומטית.
          </div>
          <input
            type="number"
            inputMode="numeric"
            placeholder="250"
            value={extraConfig?.max_price || ''}
            onChange={e => onExtraChange?.('max_price', e.target.value.replace(/[^0-9]/g, ''))}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 12,
              border: '1.5px solid #fcd34d', background: 'white',
              fontSize: 18, fontWeight: 800, outline: 'none',
              color: '#92400e', boxSizing: 'border-box',
            }}
          />
        </div>
      )}
    </div>
  );
}

// Summary card of filled fields
function FilledFieldsSummary({ taskState }) {
  const fields = [
    { key: 'description', label: 'תיאור', icon: '📄' },
    { key: 'price', label: 'מחיר', icon: '💰', fmt: v => '₪' + v },
    { key: 'location_name', label: 'מיקום', icon: '📍' },
    { key: 'payment_method', label: 'תשלום', icon: '💳' },
    { key: 'category', label: 'קטגוריה', icon: '🏷️' },
  ];
  const filled = fields.filter(f => taskState[f.key]);
  if (!filled.length) return null;
  return (
    <div style={{
      background: 'white', borderRadius: 18, border: '1px solid #e5e7eb',
      padding: '14px 16px', marginTop: 4,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#16a34a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <CheckCircle2 size={14} color="#16a34a" /> מה שמילאת עד כה
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {filled.map(f => (
          <div key={f.key} style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: 10, padding: '5px 10px', fontSize: 12, fontWeight: 600,
            color: '#166534', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span>{f.icon}</span>
            <span>{f.label}{f.fmt ? ': ' + f.fmt(taskState[f.key]) : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TaskChatInterface({ 
  initialForm = {}, 
  isEditMode = false,
  editId = null,
  onPublish,
  onSwitchToForm,
}) {
  const { t } = useLanguage();
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [taskState, setTaskState] = useState(initialForm);
  const [enabledFeatures, setEnabledFeatures] = useState({});
  const [featureConfig, setFeatureConfig] = useState({});
  const [publishReady, setPublishReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const featureStartedRef = useRef(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const initializedRef = useRef(false);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Initialize chat
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initMessages = [];
    
    if (isEditMode && initialForm.title) {
      initMessages.push({
        role: 'agent',
        content: 'אני רואה שאתה עורך משימה קיימת: **"' + initialForm.title + '"**.\n\nאפשר לתקן, לעדכן מחיר, לשנות מיקום, או להוסיף פיצ\'רים — פשוט תגיד לי מה לשנות 😊',
      });
      setPublishReady(true);
    } else if (initialForm.title) {
      initMessages.push({
        role: 'agent',
        content: 'היי! 👋 אני העוזר האישי של Joba24. אני רואה שיש לך טיוטה של **"' + initialForm.title + '"** — רוצה שנמשיך למלא את הפרטים כדי לפרסם?',
      });
    } else {
      initMessages.push({
        role: 'agent',
        content: 'היי! 👋 אני העוזר האישי של Joba24.\n\nאני אעזור לך לפרסם משימה ולמצוא את העובד המושלם — פשוט תגיד לי מה צריך לעשות, ואני כבר אדאג לכל הפרטים 🚀\n\nאז... **מה המשימה?** ספר לי בכמה מילים מה צריך.',
      });
    }

    setMessages(initMessages);
  }, []);

  // Send message to agent
  const sendMessage = async (text, mediaUrls = []) => {
    if (!text?.trim() && !mediaUrls.length) return;
    
    const userMsg = {
      role: 'user',
      content: text || '',
      media: mediaUrls.length > 0 ? mediaUrls : undefined,
    };
    
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = updatedMessages
        .filter(m => m.role !== 'system')
        .slice(-10)
        .map(m => ({ role: m.role === 'agent' ? 'agent' : 'user', content: m.content }));

      const fullState = { ...taskState, ...enabledFeatures, ...featureConfig };

      const response = await base44.functions.invoke('taskChatAgent', {
        current_state: fullState,
        user_message: text + (mediaUrls.length ? '\n[צירפתי ' + mediaUrls.length + ' קבצי מדיה]' : ''),
        conversation_history: conversationHistory.slice(0, -1),
      });

      const agentData = response.data;

      // Update task state
      if (agentData.extracted_data && Object.keys(agentData.extracted_data).length > 0) {
        setTaskState(prev => ({ ...prev, ...agentData.extracted_data }));
      }

      // Detect category
      if (agentData.category_detected && !taskState.category) {
        setTaskState(prev => ({ ...prev, category: agentData.category_detected }));
      }

      const isReady = agentData.publish_ready || agentData.all_mandatory_filled;
      setPublishReady(isReady);

      setMessages(prev => [...prev, {
        role: 'agent',
        content: agentData.response || 'קיבלתי, ממשיך...',
      }]);

      // Start feature sequence when all mandatory fields are filled
      if (isReady && !featureStartedRef.current) {
        startFeatureSequence();
      }
    } catch (err) {
      console.error('Chat agent error:', err);
      setMessages(prev => [...prev, {
        role: 'agent',
        content: 'אופס, משהו התפקשש לי. אפשר לנסות שוב? 😅',
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Handle feature toggle
  const handleFeatureToggle = (key) => {
    setEnabledFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFeatureConfig = (key, value) => {
    setFeatureConfig(prev => ({ ...prev, [key]: value }));
  };

  // Start feature card display
  const startFeatureSequence = () => {
    if (featureStartedRef.current) return;
    featureStartedRef.current = true;
    
    setMessages(prev => [...prev, {
      role: 'agent',
      content: '👍 **כל הפרטים מולאו!**\n\nהמשימה מוכנה לפרסום. לפני שאנחנו מפרסמים — יש כמה פיצ\'רים שיכולים לעזור לך לקבל עובד מהר יותר:',
      isFeatureIntro: true,
    }]);

    // Show features after a short delay
    setTimeout(() => setShowFeatures(true), 600);
  };

  // Recording
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream, { 
      mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' 
    });
    audioChunksRef.current = [];
    mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
    mr.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      setTranscribing(true);
      const blob = new Blob(audioChunksRef.current, { type: mr.mimeType });
      const file = new File([blob], 'recording.webm', { type: mr.mimeType });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const text = await base44.integrations.Core.TranscribeAudio({ audio_url: file_url });
      setTranscribing(false);
      if (text) sendMessage(text);
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  // File upload
  const handleFileUpload = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    const urls = [];
    for (const file of Array.from(files)) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push({ url: file_url, type: file.type });
    }
    setUploading(false);
    
    const images = urls.filter(u => u.type.startsWith('image/')).map(u => u.url);
    const video = urls.find(u => u.type.startsWith('video/'));
    
    if (images.length > 0) {
      setTaskState(prev => ({ 
        ...prev, 
        images: [...(prev.images || []), ...images].slice(0, 4) 
      }));
    }
    if (video) {
      setTaskState(prev => ({ ...prev, video_url: video.url }));
    }

    sendMessage('צירפתי מדיה למשימה 📎', urls.map(u => u.url));
  };

  // Publish
  const handlePublish = async () => {
    setPublishing(true);
    try {
      await onPublish({ ...taskState, ...enabledFeatures, ...featureConfig });
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'agent',
        content: 'הייתה תקלה בפרסום המשימה. נסה שוב בבקשה.',
      }]);
    } finally {
      setPublishing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const filledCount = [
    taskState.description, taskState.price, 
    taskState.location_name, taskState.payment_method
  ].filter(Boolean).length;
  const progressPct = Math.round((filledCount / 4) * 100);

  const isFormMode = !!onSwitchToForm;

  // Inject typing animation CSS
  useEffect(() => {
    if (document.getElementById('chat-typing-style')) return;
    const style = document.createElement('style');
    style.id = 'chat-typing-style';
    style.textContent = `
      @keyframes typingBounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-6px); opacity: 1; }
      }
      @keyframes messageIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', height: '100%', 
      background: '#f8fafc', position: 'relative' 
    }} dir="rtl">
      
      {/* Header — matches form's gradient header exactly */}
      <div style={{ 
        background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px 12px' }}>
          <BackButton style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)', boxShadow: 'none' }} iconColor="white" />
          <span style={{ fontWeight: 800, fontSize: 17, color: 'white', flex: 1 }}>
            {isEditMode ? 'עריכת משימה' : 'פרסום משימה'}
          </span>
          {isFormMode && (
            <button
              onClick={onSwitchToForm}
              style={{
                fontSize: 11, fontWeight: 700, color: 'white',
                background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)',
                borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              📋 טופס
            </button>
          )}
        </div>
        {/* Progress bar — same as form */}
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>התקדמות</span>
            <span style={{ fontSize: 10, color: progressPct === 100 ? '#4ade80' : 'rgba(255,255,255,0.7)', fontWeight: 800 }}>
              {progressPct}%{progressPct === 100 ? ' ✓ מוכן לפרסום' : ''}
            </span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', width: `${progressPct}%`, 
              background: progressPct === 100 ? '#4ade80' : 'rgba(255,255,255,0.75)', 
              borderRadius: 99, transition: 'width 0.4s ease' 
            }} />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ 
        flex: 1, overflowY: 'auto', padding: '16px', 
        display: 'flex', flexDirection: 'column', gap: 14,
        paddingBottom: 8,
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex', 
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            animation: 'messageIn 0.3s ease',
          }}>
            {msg.role === 'agent' && (
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                marginLeft: 8, marginTop: 2,
                background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid #bfdbfe',
              }}>
                <Sparkles size={13} color="#1a6fd4" />
              </div>
            )}
            
            <div style={{ maxWidth: '85%' }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: msg.role === 'user' ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                background: msg.role === 'user' 
                  ? 'linear-gradient(135deg, #1a6fd4, #0a52b0)' 
                  : 'white',
                color: msg.role === 'user' ? 'white' : '#1f2937',
                boxShadow: msg.role === 'user' 
                  ? 'none' 
                  : '0 1px 3px rgba(0,0,0,0.06)',
                border: msg.role === 'agent' ? '1px solid #e5e7eb' : 'none',
                fontSize: 14, lineHeight: 1.6,
              }}>
                <div className="prose prose-sm max-w-none" style={{ 
                  color: msg.role === 'user' ? 'white' : '#1f2937',
                }}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                
                {/* Media preview */}
                {msg.media?.map((url, j) => (
                  <div key={j} style={{ marginTop: 8 }}>
                    {url.match(/\.(mp4|webm|mov)/) ? (
                      <video src={url} controls style={{ maxWidth: 200, borderRadius: 10 }} />
                    ) : (
                      <img src={url} alt="" style={{ maxWidth: 200, borderRadius: 10 }} />
                    )}
                  </div>
                ))}
              </div>

              {/* Filled fields summary — shown after feature intro */}
              {msg.isFeatureIntro && (
                <div style={{ marginTop: 8 }}>
                  <FilledFieldsSummary taskState={taskState} />
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Feature cards — shown together as a nice group */}
        {showFeatures && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'messageIn 0.3s ease' }}>
            {FEATURE_PILLS.map(pill => (
              <FeatureCard
                key={pill.key}
                pill={pill}
                active={!!enabledFeatures[pill.key]}
                onToggle={handleFeatureToggle}
                extraConfig={featureConfig}
                onExtraChange={handleFeatureConfig}
              />
            ))}
          </div>
        )}
        
        {/* Typing indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1.5px solid #bfdbfe',
            }}>
              <Sparkles size={13} color="#1a6fd4" />
            </div>
            <div style={{
              padding: '12px 16px', borderRadius: '4px 18px 18px 18px',
              background: 'white', border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={{
        background: 'white', borderTop: '1px solid #e5e7eb',
        padding: '10px 16px', paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
      }}>
        {/* Publish button when ready */}
        {publishReady && (
          <div style={{ marginBottom: 10 }}>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="btn-tap"
              style={{
                width: '100%', padding: '14px 0', borderRadius: 16,
                background: publishing ? '#9ca3af' : 'linear-gradient(135deg, #059669, #047857)',
                color: 'white', border: 'none', fontSize: 16, fontWeight: 900,
                cursor: publishing ? 'not-allowed' : 'pointer',
                boxShadow: '0 6px 24px rgba(5,150,105,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
            >
              {publishing ? (
                <><Loader2 size={20} className="animate-spin" /> מפרסם...</>
              ) : (
                <><Zap size={20} /> פרסם את המשימה! ✓</>
              )}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          {/* Media upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              width: 40, height: 40, borderRadius: 20, flexShrink: 0,
              background: '#f1f5f9', border: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {uploading ? (
              <Loader2 size={18} className="animate-spin" color="#94a3b8" />
            ) : (
              <Camera size={18} color="#64748b" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => handleFileUpload(e.target.files)}
          />

          {/* Text input */}
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={transcribing ? 'מתמלל הקלטה...' : 'תאר מה צריך לעשות...'}
              disabled={loading || transcribing}
              rows={1}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 20,
                background: '#f8fafc', border: '1.5px solid #e2e8f0',
                fontSize: 14, outline: 'none', resize: 'none',
                fontFamily: 'inherit', minHeight: 40, maxHeight: 120,
                boxSizing: 'border-box', color: '#1f2937',
              }}
            />
          </div>

          {/* Record or Send button */}
          {input.trim() ? (
            <button
              onClick={() => sendMessage(input)}
              disabled={loading}
              style={{
                width: 40, height: 40, borderRadius: 20, flexShrink: 0,
                background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
                border: 'none', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <ArrowUp size={18} color="white" />
            </button>
          ) : (
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={transcribing}
              style={{
                width: 40, height: 40, borderRadius: 20, flexShrink: 0,
                background: recording ? '#fee2e2' : '#f1f5f9',
                border: recording ? '1.5px solid #fca5a5' : '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {transcribing ? (
                <Loader2 size={18} className="animate-spin" color="#94a3b8" />
              ) : recording ? (
                <MicOff size={18} color="#dc2626" />
              ) : (
                <Mic size={18} color="#64748b" />
              )}
            </button>
          )}
        </div>

        {/* Recording indicator */}
        {recording && (
          <div style={{
            marginTop: 8, padding: '6px 12px', background: '#fee2e2',
            borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: '#dc2626', fontWeight: 700,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: '#dc2626',
              display: 'inline-block', animation: 'typingBounce 0.8s infinite',
            }} />
            מקליט... לחץ לעצירה
          </div>
        )}

        {/* Transcribing indicator */}
        {transcribing && (
          <div style={{
            marginTop: 8, padding: '6px 12px', background: '#eff6ff',
            borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: '#1a6fd4', fontWeight: 700,
          }}>
            <Loader2 size={12} className="animate-spin" />
            מתמלל את ההקלטה...
          </div>
        )}
      </div>
    </div>
  );
}