import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { 
  Mic, MicOff, Loader2, Sparkles, Zap, ArrowUp, Camera,
  MapPin, CreditCard, Clock, CheckCircle2, FileText, Target, TrendingUp
} from 'lucide-react';
import { getRequirementCategories } from '@/lib/requirements';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import ReactMarkdown from 'react-markdown';
import BackButton from '@/components/BackButton';
import { motion, AnimatePresence } from 'framer-motion';

// ── Typing dots ──
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '2px 0' }}>
      {[0, 0.15, 0.3].map((delay, i) => (
        <div key={i} style={{
          width: 5, height: 5, borderRadius: '50%', background: '#94a3b8',
          animation: `typingBounce 0.6s ${delay}s infinite ease-in-out`
        }} />
      ))}
    </div>
  );
}

// ── Inline address card ──
function AddressChatCard({ label, addressState, onChange, onConfirm }) {
  const [building, setBuilding] = useState(addressState.address_building || '');
  const [floor, setFloor] = useState(addressState.address_floor || '');
  const [apartment, setApartment] = useState(addressState.address_apartment || '');
  const [notes, setNotes] = useState(addressState.address_notes || '');
  const [confirmed, setConfirmed] = useState(!!(addressState.lat && addressState.lng));

  const handleAddressSelect = ({ location_name, city, lat, lng }) => {
    const hasCoords = !!(lat && lng);
    onChange({
      location_name, city: city || '', lat: lat || null, lng: lng || null,
      address_building: building, address_floor: floor,
      address_apartment: apartment, address_notes: notes,
    });
    setConfirmed(hasCoords);
  };

  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-4 flex flex-col gap-3"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)', animation: 'messageIn 0.35s ease' }}>
      <div className="text-sm font-extrabold text-[#0f2b6b]">{label}</div>
      <AddressAutocomplete value={addressState.location_name || ''} error={false} onSelect={handleAddressSelect} />
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'בניין / מספר', ph: '12', val: building, set: (v) => { setBuilding(v); onChange({ ...addressState, address_building: v }); } },
          { label: 'קומה', ph: '3', val: floor, set: (v) => { setFloor(v); onChange({ ...addressState, address_floor: v }); } },
          { label: 'דירה', ph: '5', val: apartment, set: (v) => { setApartment(v); onChange({ ...addressState, address_apartment: v }); } },
          { label: 'הערות', ph: 'כניסה צדדית', val: notes, set: (v) => { setNotes(v); onChange({ ...addressState, address_notes: v }); } },
        ].map((f, i) => (
          <div key={i}>
            <div className="text-[11px] text-gray-500 font-semibold mb-1">{f.label}</div>
            <input placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#dce8f5] bg-[#f8fafc] text-[13px] outline-none text-[#1f2937]" />
          </div>
        ))}
      </div>
      {confirmed && (
        <button onClick={onConfirm}
          className="w-full py-2.5 rounded-xl text-white font-extrabold text-[13px]"
          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
          ✓ אישור כתובת — המשך
        </button>
      )}
    </div>
  );
}

// ── Live Draft Card ──
function LiveDraftCard({ taskState, completenessPct, enabledFeatures }) {
  const { category, description, price, location_name, payment_method, estimated_time, urgency_tag, is_story, auto_bump_enabled } = taskState;
  if (!description && !category) return null;

  const fields = [
    { show: !!category, icon: '🏷️', label: 'קטגוריה', value: category, color: '#3b82f6' },
    { show: !!description, icon: '📝', label: 'תיאור', value: description?.substring(0, 60) + (description?.length > 60 ? '...' : ''), color: '#8b5cf6' },
    { show: !!price, icon: '💰', label: 'תקציב', value: '₪' + price, color: '#16a34a' },
    { show: !!location_name, icon: '📍', label: 'מיקום', value: location_name, color: '#f97316' },
    { show: !!payment_method, icon: '💳', label: 'תשלום', value: payment_method, color: '#2563eb' },
    { show: !!estimated_time, icon: '⏱️', label: 'זמן', value: estimated_time, color: '#0891b2' },
    { show: !!urgency_tag, icon: '⚡', label: 'דחיפות', value: urgency_tag === 'immediate' ? 'דחוף 🔥' : urgency_tag === 'few_hours' ? 'שעות הקרובות' : urgency_tag === 'evening' ? 'ערב' : 'גמיש', color: '#ef4444' },
  ].filter(f => f.show);

  const featuresActive = [];
  if (is_story) featuresActive.push('📢 Story');
  if (auto_bump_enabled) featuresActive.push('📈 העלאה אוטו\'');

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{
        margin: '8px 12px', padding: '12px 14px',
        background: 'white', border: '1px solid #e8edf5',
        borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: fields.length > 0 ? 10 : 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#0f2b6b', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={13} color="#6366f1" />
          טיוטת משימה
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {featuresActive.length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#faf5ff', borderRadius: 8, padding: '2px 8px' }}>
              {featuresActive.join(' · ')}
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 44, height: 6, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden',
            }}>
              <div style={{
                width: `${completenessPct || 0}%`, height: '100%',
                background: (completenessPct || 0) >= 100 ? '#16a34a' : (completenessPct || 0) >= 50 ? '#2563eb' : '#f59e0b',
                borderRadius: 99, transition: 'width 0.5s ease',
              }} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', minWidth: 28 }}>{completenessPct || 0}%</span>
          </div>
        </div>
      </div>
      {fields.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {fields.map((f, i) => (
            <span key={i} style={{
              fontSize: 11, fontWeight: 600, color: f.color,
              background: f.color + '10', border: '1px solid ' + f.color + '30',
              borderRadius: 8, padding: '3px 8px',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span>{f.icon}</span>
              {f.label}: {f.value}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Feature card ──
function FeatureCard({ pill, active, onToggle, extraConfig, onExtraChange }) {
  const Icon = pill.icon;
  return (
    <div>
      <button onClick={() => onToggle(pill.key)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', borderRadius: 16, cursor: 'pointer',
          border: `1.5px solid ${active ? pill.border : '#e5e7eb'}`,
          background: active ? pill.bg : 'white',
          boxShadow: active ? `0 4px 20px ${pill.glow}` : '0 1px 3px rgba(0,0,0,0.04)',
        }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14, flexShrink: 0,
          background: active ? pill.color + '18' : '#f8fafc',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1.5px solid ${active ? pill.border : '#e5e7eb'}`,
        }}><Icon size={20} color={active ? pill.color : '#9ca3af'} /></div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: active ? pill.color : '#1f2937', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
            {active && <CheckCircle2 size={14} color={pill.color} />}{pill.label}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3, lineHeight: 1.5 }}>{pill.desc}</div>
          {pill.cost && <span style={{ fontSize: 10, fontWeight: 800, color: pill.color, background: pill.bg, borderRadius: 6, padding: '2px 8px', display: 'inline-block', marginTop: 4 }}>{pill.cost}</span>}
        </div>
      </button>
      {pill.key === 'auto_bump_enabled' && active && (
        <div style={{ marginTop: 8, padding: '14px 16px', background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>מחיר מקסימלי (₪)</div>
          <div style={{ fontSize: 11, color: '#b45309', marginBottom: 8, lineHeight: 1.5 }}>
            המחיר יעלה בהדרגה עד לסכום זה. ברגע שעובד מגיש בקשה — המחיר נעצר אוטומטית.
          </div>
          <input type="number" inputMode="numeric" placeholder="250"
            value={extraConfig?.max_price || ''}
            onChange={e => onExtraChange?.('max_price', e.target.value.replace(/[^0-9]/g, ''))}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #fcd34d', background: 'white', fontSize: 18, fontWeight: 800, outline: 'none', color: '#92400e', boxSizing: 'border-box' }} />
        </div>
      )}
    </div>
  );
}

// ── Requirements group ──
function RequirementsCardGroup({ category, requirements, onToggle, onInvoiceToggle, invoiceEnabled }) {
  const cats = getRequirementCategories(category);
  if (!cats.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button onClick={onInvoiceToggle} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 16, cursor: 'pointer',
        border: `1.5px solid ${invoiceEnabled ? '#d8b4fe' : '#e5e7eb'}`,
        background: invoiceEnabled ? '#faf5ff' : 'white',
        boxShadow: invoiceEnabled ? '0 4px 20px rgba(168,85,247,0.10)' : '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: invoiceEnabled ? '#7c3aed18' : '#f8fafc',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1.5px solid ${invoiceEnabled ? '#d8b4fe' : '#e5e7eb'}` }}>
          <FileText size={18} color={invoiceEnabled ? '#7c3aed' : '#9ca3af'} />
        </div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: invoiceEnabled ? '#7c3aed' : '#1f2937', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
            {invoiceEnabled && <CheckCircle2 size={14} color="#7c3aed" />}חשבונית מס
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>דרוש מהעובד חשבונית מס — מתאים לעסקים ועצמאים</div>
        </div>
      </button>
      {cats.map(cat => (
        <div key={cat.label}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', marginBottom: 6 }}>{cat.label}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {cat.items.map(({ key, label }) => {
              const active = !!requirements[key];
              return (
                <button key={key} onClick={() => onToggle(key)} style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px',
                  borderRadius: 10, cursor: 'pointer',
                  background: active ? 'rgba(26,111,212,0.08)' : '#f8fafc',
                  border: `1px solid ${active ? '#bfdbfe' : '#e5e7eb'}`,
                }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                    border: `2px solid ${active ? '#1a6fd4' : '#d1d5db'}`,
                    background: active ? '#1a6fd4' : 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {active && <span style={{ color: 'white', fontSize: 9 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: active ? '#1e40af' : '#6b7280' }}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Feature definitions ──
const FEATURE_PILLS = [
  { key: 'is_story', icon: Sparkles, label: 'פרסם כ-Story', desc: 'חשיפה פי 3 — תופיע למעלה בפיד ל-24 שעות', cost: '10 ג\'ובות', color: '#a855f7', bg: '#faf5ff', border: '#d8b4fe', glow: 'rgba(168,85,247,0.12)' },
  { key: 'auto_bump_enabled', icon: Zap, label: 'העלאת מחיר אוטומטית', desc: 'המחיר עולה אוטומטית כל 5 דקות — עד שמגיעה בקשה', cost: null, color: '#f59e0b', bg: '#fffbeb', border: '#fcd34d', glow: 'rgba(245,158,11,0.10)' },
];

// ── MAIN COMPONENT ──
export default function TaskChatInterface({ 
  initialForm = {}, isEditMode = false, editId = null, onPublish, onSwitchToForm,
}) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [taskState, setTaskState] = useState(initialForm);
  const [enabledFeatures, setEnabledFeatures] = useState({});
  const [featureConfig, setFeatureConfig] = useState({});
  const [publishReady, setPublishReady] = useState(false);
  const [completenessPct, setCompletenessPct] = useState(0);
  const [marketplaceInsight, setMarketplaceInsight] = useState(null);
  const [taskSummary, setTaskSummary] = useState(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showAddressInput, setShowAddressInput] = useState(null);
  const [addressOrigin, setAddressOrigin] = useState({});
  const [addressDest, setAddressDest] = useState({});
  const [quickReplies, setQuickReplies] = useState([]);
  const initializedRef = useRef(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);

  // Scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  // Init
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const initMessages = [];
    if (isEditMode && initialForm.title) {
      initMessages.push({ role: 'agent', content: 'אני רואה שאתה עורך את **"' + initialForm.title + '"**.\n\nתגיד לי מה לשנות ואני אדאג לזה 😊' });
      setPublishReady(true);
    } else if (initialForm.title) {
      initMessages.push({ role: 'agent', content: 'היי! 👋 ראיתי שיש לך טיוטה של **"' + initialForm.title + '"** — רוצה שנמשיך?' });
    } else {
      initMessages.push({ role: 'agent', content: 'מה צריך לעשות? 🚀\nתאר בכמה מילים ואני אדאג לכל השאר.' });
      setQuickReplies(['ניקיון דירה', 'אינסטלטור', 'הובלה', 'מזגן']);
    }
    setMessages(initMessages);
  }, []);

  // Send
  const sendMessage = async (text, mediaUrls = []) => {
    if (!text?.trim() && !mediaUrls.length) return;
    const userMsg = { role: 'user', content: text || '', media: mediaUrls.length > 0 ? mediaUrls : undefined };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = updatedMessages.filter(m => m.role !== 'system').slice(-12)
        .map(m => ({ role: m.role === 'agent' ? 'agent' : 'user', content: m.content }));
      const fullState = { ...taskState, ...enabledFeatures, ...featureConfig };
      
      const response = await base44.functions.invoke('taskChatAgent', {
        current_state: fullState,
        user_message: text + (mediaUrls.length ? '\n[צירפתי ' + mediaUrls.length + ' קבצי מדיה]' : ''),
        conversation_history: conversationHistory.slice(0, -1),
      });

      const agentData = response.data;

      // Update quick replies
      setQuickReplies(agentData.quick_replies || []);

      if (agentData.extracted_data && Object.keys(agentData.extracted_data).length > 0) {
        const data = { ...agentData.extracted_data };
        // Normalize payment_method to English enum values
        if (data.payment_method) {
          const pm = data.payment_method;
          if (/מזומן|מזומנים|cash/i.test(pm)) data.payment_method = 'Cash';
          else if (/ביט|bit/i.test(pm)) data.payment_method = 'Bit';
          else if (/פייבוקס|paybox/i.test(pm)) data.payment_method = 'PayBox';
        }
        setTaskState(prev => ({ ...prev, ...data }));
      }
      if (agentData.category_detected && !taskState.category) {
        setTaskState(prev => ({ ...prev, category: agentData.category_detected }));
      }
      if (agentData.completeness_pct !== undefined) setCompletenessPct(agentData.completeness_pct);
      if (agentData.marketplace_insight) setMarketplaceInsight(agentData.marketplace_insight);
      if (agentData.summary) setTaskSummary(agentData.summary);

      const isReady = agentData.publish_ready || agentData.all_mandatory_filled;
      setPublishReady(isReady);

      setMessages(prev => [...prev, { 
        role: 'agent', 
        content: agentData.response || 'קיבלתי, ממשיך...',
        marketplaceInsight: agentData.marketplace_insight,
        summary: agentData.summary,
      }]);

      if (agentData.show_address_input?.type) setShowAddressInput(agentData.show_address_input);
      else setShowAddressInput(null);

      if (agentData.show_requirements && !showRequirements) setShowRequirements(true);
      if (agentData.show_features && !showFeatures) setShowFeatures(true);
      
      // Auto-dismiss requirements if agent moved past them
      if (!agentData.show_requirements && showRequirements && agentData.show_features) {
        setShowRequirements(false);
      }

    } catch (err) {
      console.error('Chat agent error:', err);
      setMessages(prev => [...prev, { role: 'agent', content: 'אופס, משהו התפקשש. אפשר לנסות שוב? 😅' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureToggle = (key) => setEnabledFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  const handleFeatureConfig = (key, value) => setFeatureConfig(prev => ({ ...prev, [key]: value }));
  const handleRequirementToggle = (key) => setTaskState(prev => ({
    ...prev, requirements: { ...(prev.requirements || {}), [key]: !(prev.requirements || {})[key] }
  }));
  const handleInvoiceToggle = () => setEnabledFeatures(prev => ({ ...prev, requires_invoice: !prev.requires_invoice }));

  const handleSkipRequirements = () => {
    setShowRequirements(false);
    sendMessage('אין צורך בדרישות נוספות, המשך לפרסום');
  };

  const handleQuickReply = (reply) => {
    setQuickReplies([]);
    sendMessage(reply);
  };

  // Recording
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
        if (text && typeof text === 'string' && text.trim()) sendMessage(text.trim());
      } catch (e) {
        console.error('Transcription error:', e);
      } finally {
        setTranscribing(false);
      }
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setRecording(true);
    } catch (e) {
      console.error('Recording error:', e);
    }
  };
  const stopRecording = () => { mediaRecorderRef.current?.stop(); setRecording(false); };

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
    if (images.length > 0) setTaskState(prev => ({ ...prev, images: [...(prev.images || []), ...images].slice(0, 4) }));
    if (video) setTaskState(prev => ({ ...prev, video_url: video.url }));
    sendMessage('צירפתי מדיה 📎', urls.map(u => u.url));
  };

  // Publish
  const handlePublish = async () => {
    setPublishing(true);
    try {
      await onPublish({ ...taskState, ...enabledFeatures, ...featureConfig });
    } catch (err) {
      setMessages(prev => [...prev, { role: 'agent', content: 'הייתה תקלה בפרסום. נסה שוב.' }]);
    } finally { setPublishing(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const isFormMode = !!onSwitchToForm;

  // Inject CSS
  useEffect(() => {
    if (document.getElementById('chat-typing-style-v2')) return;
    const style = document.createElement('style');
    style.id = 'chat-typing-style-v2';
    style.textContent = `
      @keyframes typingBounce { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-6px);opacity:1} }
      @keyframes messageIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    `;
    document.head.appendChild(style);
  }, []);

  const progressPct = completenessPct || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)', position: 'relative' }} dir="rtl">
      
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #0f2b6b 0%, #1a6fd4 100%)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
          <BackButton style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.20)', boxShadow: 'none' }} iconColor="white" />
          <span style={{ fontWeight: 800, fontSize: 16, color: 'white', flex: 1 }}>
            {isEditMode ? 'עריכת משימה' : 'יצירת משימה'}
          </span>
          {isFormMode && (
            <button onClick={onSwitchToForm} style={{
              fontSize: 11, fontWeight: 700, color: 'white',
              background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.20)',
              borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
            }}>📋 טופס</button>
          )}
        </div>
        {/* Thin progress bar */}
        <div style={{ padding: '0 16px 8px' }}>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.12)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`,
              background: progressPct >= 100 ? '#4ade80' : 'rgba(255,255,255,0.8)',
              borderRadius: 99, transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
          </div>
        </div>
      </div>

      {/* Live Draft Card */}
      <LiveDraftCard taskState={taskState} completenessPct={completenessPct} enabledFeatures={enabledFeatures} />

      {/* Messages */}
      <div style={{ 
        flex: 1, overflowY: 'auto', padding: '8px 12px 0',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              style={{
                display: 'flex', 
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              {msg.role === 'agent' && (
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  marginLeft: 8, marginTop: 2,
                  background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1.5px solid #c7d2fe',
                }}><Sparkles size={12} color="#6366f1" /></div>
              )}
              
              <div style={{ maxWidth: '88%' }}>
                <div style={{
                  padding: msg.role === 'user' ? '10px 14px' : '12px 16px',
                  borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  background: msg.role === 'user' 
                    ? 'linear-gradient(135deg, #1e40af, #1a6fd4)' 
                    : 'white',
                  color: msg.role === 'user' ? 'white' : '#1f2937',
                  boxShadow: msg.role === 'user' 
                    ? '0 2px 8px rgba(26,111,212,0.25)' 
                    : '0 1px 3px rgba(0,0,0,0.05)',
                  border: msg.role === 'agent' ? '1px solid #e8edf5' : 'none',
                  fontSize: 14, lineHeight: 1.65,
                }}>
                  <div style={{ 
                    color: msg.role === 'user' ? 'white' : '#1f2937',
                  }}>
                    <ReactMarkdown components={{
                      p: ({node, ...props}) => <p style={{ margin: '0 0 4px 0' }} {...props} />,
                      strong: ({node, ...props}) => <strong style={{ color: msg.role === 'user' ? 'white' : '#0f2b6b' }} {...props} />,
                    }}>{msg.content}</ReactMarkdown>
                  </div>
                  
                  {msg.media?.map((url, j) => (
                    <div key={j} style={{ marginTop: 8 }}>
                      {typeof url === 'string' && url.match(/\.(mp4|webm|mov)/) ? (
                        <video src={url} controls style={{ maxWidth: 180, borderRadius: 10 }} />
                      ) : (
                        <img src={url} alt="" style={{ maxWidth: 180, borderRadius: 10 }} />
                      )}
                    </div>
                  ))}

                  {/* Marketplace insight */}
                  {msg.marketplaceInsight && (
                    <div style={{
                      marginTop: 8, padding: '8px 12px',
                      background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
                      border: '1px solid #bbf7d0', borderRadius: 12,
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontSize: 12, color: '#166534', fontWeight: 600,
                    }}>
                      <TrendingUp size={14} color="#16a34a" />
                      {msg.marketplaceInsight}
                    </div>
                  )}

                  {/* Summary card */}
                  {msg.summary && (
                    <div style={{
                      marginTop: 8, padding: '12px 14px',
                      background: 'linear-gradient(135deg, #eff6ff, #f0f7ff)',
                      border: '1px solid #bfdbfe', borderRadius: 14,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#1a6fd4', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Target size={12} /> סיכום המשימה
                      </div>
                      <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.6, fontWeight: 500, whiteSpace: 'pre-line' }}>
                        {msg.summary}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Address input */}
        {showAddressInput && (
          <div style={{ animation: 'messageIn 0.35s ease' }}>
            <AddressChatCard
              label={showAddressInput.label || '📍 כתובת'}
              addressState={showAddressInput.type === 'destination' ? addressDest : addressOrigin}
              onChange={(data) => {
                if (showAddressInput.type === 'destination') setAddressDest(prev => ({ ...prev, ...data }));
                else setAddressOrigin(prev => ({ ...prev, ...data }));
              }}
              onConfirm={() => {
                const addrData = showAddressInput.type === 'destination' ? addressDest : addressOrigin;
                if (showAddressInput.type === 'destination') {
                  setTaskState(prev => ({
                    ...prev,
                    to_address: addrData.location_name, to_city: addrData.city,
                    to_lat: addrData.lat, to_lng: addrData.lng,
                    to_building: addrData.address_building, to_floor: addrData.address_floor,
                  }));
                  sendMessage(`כתובת יעד: ${addrData.location_name}${addrData.address_building ? ' בנין ' + addrData.address_building : ''}${addrData.address_floor ? ' קומה ' + addrData.address_floor : ''}`);
                } else {
                  setTaskState(prev => ({
                    ...prev,
                    location_name: addrData.location_name, city: addrData.city,
                    lat: addrData.lat, lng: addrData.lng,
                    address_building: addrData.address_building, address_floor: addrData.address_floor,
                    address_apartment: addrData.address_apartment, address_notes: addrData.address_notes,
                  }));
                  sendMessage(`כתובת: ${addrData.location_name}${addrData.address_building ? ' בנין ' + addrData.address_building : ''}${addrData.address_floor ? ' קומה ' + addrData.address_floor : ''}`);
                }
                setShowAddressInput(null);
              }}
            />
          </div>
        )}

        {/* Requirements */}
        {showRequirements && !showFeatures && (
          <div style={{ animation: 'messageIn 0.35s ease', padding: '12px 16px', borderRadius: '4px 16px 16px 16px',
            background: 'white', border: '1px solid #e8edf5', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontWeight: 800, marginBottom: 10, color: '#0f2b6b', fontSize: 14 }}>
              📋 דרישות מהעובד
              <span style={{ fontSize: 11, color: '#f97316', fontWeight: 600, display: 'block', marginTop: 2 }}>
                ככל שתוסיף יותר — פחות עובדים יוכלו להגיש בקשה
              </span>
            </div>
            <RequirementsCardGroup
              category={taskState.category || 'other'}
              requirements={taskState.requirements || {}}
              onToggle={handleRequirementToggle}
              onInvoiceToggle={handleInvoiceToggle}
              invoiceEnabled={!!enabledFeatures.requires_invoice}
            />
            <button onClick={handleSkipRequirements} style={{
              width: '100%', marginTop: 14, padding: '11px 0', borderRadius: 14,
              background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
              color: 'white', border: 'none', fontSize: 13, fontWeight: 800,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6,
              boxShadow: '0 4px 14px rgba(26,111,212,0.25)',
            }}><ArrowUp size={15} />אין צורך — המשך ✓</button>
          </div>
        )}

        {/* Features */}
        {showFeatures && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'messageIn 0.35s ease' }}>
            {FEATURE_PILLS.map(pill => (
              <FeatureCard key={pill.key} pill={pill}
                active={!!enabledFeatures[pill.key]}
                onToggle={handleFeatureToggle}
                extraConfig={featureConfig}
                onExtraChange={handleFeatureConfig} />
            ))}
          </div>
        )}

        {/* Typing */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #c7d2fe' }}>
              <Sparkles size={12} color="#6366f1" />
            </div>
            <div style={{ padding: '12px 16px', borderRadius: '4px 16px 16px 16px', background: 'white', border: '1px solid #e8edf5', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area — fixed at bottom, no whitespace */}
      <div style={{
        flexShrink: 0, background: 'white',
        borderTop: '1px solid #e8edf5',
        padding: '8px 12px',
        paddingBottom: 'max(4px, env(safe-area-inset-bottom))',
      }}>
        {/* Quick Replies */}
        {quickReplies.length > 0 && !loading && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 8, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: 2 }}>
            {quickReplies.map((reply, i) => {
              const replyStr = typeof reply === 'string' ? reply : String(reply ?? '');
              if (!replyStr) return null;
              const isConfirm = replyStr.startsWith('✅');
              return (
                <button key={i} onClick={() => handleQuickReply(replyStr)}
                  style={{
                    flexShrink: 0, padding: '7px 14px', borderRadius: 20,
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    background: isConfirm ? 'linear-gradient(135deg,#059669,#047857)' : '#eff6ff',
                    color: isConfirm ? 'white' : '#1a6fd4',
                    border: isConfirm ? 'none' : '1.5px solid #bfdbfe',
                    boxShadow: isConfirm ? '0 4px 14px rgba(5,150,105,0.3)' : '0 1px 4px rgba(26,111,212,0.1)',
                    whiteSpace: 'nowrap',
                  }}>
                  {replyStr}
                </button>
              );
            })}
          </div>
        )}

        {/* Publish button */}
        {showFeatures && (
          <div style={{ marginBottom: 8 }}>
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
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
              }}
            >
              {publishing ? <><Loader2 size={20} className="animate-spin" /> מפרסם...</> : <><Zap size={20} /> פרסם משימה ✓</>}
            </motion.button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
          {/* Camera */}
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            style={{ width: 38, height: 38, borderRadius: 19, flexShrink: 0,
              background: '#f8fafc', border: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {uploading ? <Loader2 size={16} className="animate-spin" color="#94a3b8" /> : <Camera size={16} color="#64748b" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={e => handleFileUpload(e.target.files)} />

          {/* Input */}
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea ref={inputRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={transcribing ? 'מתמלל...' : 'תאר מה צריך...'}
              disabled={loading || transcribing}
              rows={1}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 20,
                background: '#f8fafc', border: '1.5px solid #e2e8f0',
                fontSize: 15, outline: 'none', resize: 'none',
                fontFamily: 'inherit', minHeight: 38, maxHeight: 110,
                boxSizing: 'border-box', color: '#1f2937',
              }}
            />
          </div>

          {/* Mic / Send */}
          {input.trim() ? (
            <button onClick={() => sendMessage(input)} disabled={loading}
              style={{ width: 38, height: 38, borderRadius: 19, flexShrink: 0,
                background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ArrowUp size={16} color="white" />
            </button>
          ) : (
            <button onClick={recording ? stopRecording : startRecording} disabled={transcribing}
              style={{ width: 38, height: 38, borderRadius: 19, flexShrink: 0,
                background: recording ? '#fee2e2' : '#f8fafc',
                border: recording ? '1.5px solid #fca5a5' : '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              {transcribing ? <Loader2 size={16} className="animate-spin" color="#94a3b8" />
                : recording ? <MicOff size={16} color="#dc2626" /> : <Mic size={16} color="#64748b" />}
            </button>
          )}
        </div>

        {/* Recording / transcribing indicators */}
        {recording && (
          <div style={{ marginTop: 6, padding: '4px 10px', background: '#fee2e2', borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#dc2626', fontWeight: 700 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#dc2626', animation: 'typingBounce 0.8s infinite' }} />
            מקליט... לחץ לעצירה
          </div>
        )}
        {transcribing && (
          <div style={{ marginTop: 6, padding: '4px 10px', background: '#eff6ff', borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#1a6fd4', fontWeight: 700 }}>
            <Loader2 size={10} className="animate-spin" /> מתמלל...
          </div>
        )}
      </div>
    </div>
  );
}