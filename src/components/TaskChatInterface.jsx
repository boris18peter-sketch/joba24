import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { 
  Mic, MicOff, Loader2, Sparkles, Zap, ArrowUp, Camera,
  MapPin, CreditCard, Clock, CheckCircle2, FileText, Target, TrendingUp
} from 'lucide-react';
import { getRequirementCategories } from '@/lib/requirements';
import { getSuggestedExtras } from '@/lib/taskFlowConfig';
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
    const updatedAddr = {
      location_name, city: city || '', lat: lat || null, lng: lng || null,
      address_building: building, address_floor: floor,
      address_apartment: apartment, address_notes: notes,
    };
    onChange(updatedAddr);
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
        margin: '8px 16px', padding: '12px 14px',
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
              const isSuggested = getSuggestedExtras(category).includes(key);
              return (
                <button key={key} onClick={() => onToggle(key)} style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px',
                  borderRadius: 10, cursor: 'pointer', position: 'relative',
                  background: active ? 'rgba(26,111,212,0.08)' : isSuggested ? '#fffbeb' : '#f8fafc',
                  border: `1px solid ${active ? '#bfdbfe' : isSuggested ? '#fde68a' : '#e5e7eb'}`,
                }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                    border: `2px solid ${active ? '#1a6fd4' : isSuggested ? '#f59e0b' : '#d1d5db'}`,
                    background: active ? '#1a6fd4' : isSuggested ? '#fffbeb' : 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {active && <span style={{ color: 'white', fontSize: 9 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: isSuggested ? 700 : 600, color: active ? '#1e40af' : isSuggested ? '#92400e' : '#6b7280' }}>{label}</span>
                  {isSuggested && !active && (
                    <span style={{ position: 'absolute', top: -6, left: -6, fontSize: 8, fontWeight: 800, color: 'white', background: '#f59e0b', borderRadius: 99, padding: '1px 5px', boxShadow: '0 1px 4px rgba(245,158,11,0.4)' }}>מומלץ</span>
                  )}
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
  
  // Task Draft — Single Source of Truth
  const [taskDraft, setTaskDraft] = useState({
    category: initialForm.category || null,
    title: initialForm.title || null,
    description: initialForm.description || null,
    price: initialForm.price || null,
    location_name: initialForm.location_name || null,
    city: initialForm.city || null,
    lat: initialForm.lat || null,
    lng: initialForm.lng || null,
    address_building: initialForm.address_building || null,
    address_floor: initialForm.address_floor || null,
    address_apartment: initialForm.address_apartment || null,
    address_notes: initialForm.address_notes || null,
    payment_method: initialForm.payment_method || null,
    estimated_time: initialForm.estimated_time || null,
    urgency_tag: initialForm.urgency_tag || null,
    requirements: initialForm.requirements || {},
    images: initialForm.images || [],
    video_url: initialForm.video_url || null,
    is_story: initialForm.is_story || false,
    auto_bump_enabled: initialForm.auto_bump_enabled || false,
    max_price: initialForm.max_price || null,
    requires_invoice: initialForm.requires_invoice || false,
    category_details: initialForm.category_details || {},
    to_address: initialForm.to_address || null,
    to_city: initialForm.to_city || null,
    to_lat: initialForm.to_lat || null,
    to_lng: initialForm.to_lng || null,
    to_building: initialForm.to_building || null,
    to_floor: initialForm.to_floor || null,
  });

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
  const [currentFieldState, setCurrentFieldState] = useState(null); // { field_name, state, validation_error }
  const [nextFieldState, setNextFieldState] = useState(null); // hint for UI
  const initializedRef = useRef(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const draftHistoryRef = useRef([]);
  const messagesContainerRef = useRef(null);
  const [visibleHeight, setVisibleHeight] = useState(null);

  // Scroll to bottom on new messages / loading
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Visual Viewport — handle mobile keyboard resizing
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      setVisibleHeight(vv.height);
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      });
    };
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  }, []);

  // Init
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const initMessages = [];
    if (isEditMode && initialForm.title) {
      // Build a summary of the current task for edit mode
      const parts = [];
      parts.push('📋 **' + initialForm.title + '**');
      if (initialForm.description) parts.push('📝 ' + initialForm.description.substring(0, 80) + (initialForm.description.length > 80 ? '...' : ''));
      if (initialForm.price) parts.push('💰 ₪' + initialForm.price);
      if (initialForm.location_name) parts.push('📍 ' + initialForm.location_name);
      if (initialForm.category) parts.push('🏷️ ' + initialForm.category);
      const summary = parts.join('\n');
      initMessages.push({ role: 'agent', content: 'אני רואה שאתה עורך את המשימה הזאת:\n\n' + summary + '\n\nתגיד לי מה לשנות ואני אדאג לזה 😊' });
      setPublishReady(true);
    } else if (initialForm.title) {
      initMessages.push({ role: 'agent', content: 'היי! 👋 ראיתי שיש לך טיוטה של **"' + initialForm.title + '"** — רוצה שנמשיך?' });
    } else {
      initMessages.push({ role: 'agent', content: 'מה צריך לעשות? 🚀\nתאר בכמה מילים ואני אדאג לכל השאר.' });
      setQuickReplies(['ניקיון דירה', 'אינסטלטור', 'הובלה', 'מזגן']);
    }
    setMessages(initMessages);
  }, []);

  // Send — STATE-DRIVEN approach
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
      
      // STEP 1: Send Task Draft + current field state (conversation state machine)
      const response = await base44.functions.invoke('taskChatAgent', {
        current_state: taskDraft, // Single source of truth
        current_field_state: currentFieldState, // Which field we're collecting
        user_message: text + (mediaUrls.length ? '\n[צירפתי ' + mediaUrls.length + ' קבצי מדיה]' : ''),
        conversation_history: conversationHistory.slice(0, -1),
      });

      const agentData = response.data;

      // STEP 2: Extract and update Task Draft
      if (agentData.extracted_data && Object.keys(agentData.extracted_data).length > 0) {
        const data = { ...agentData.extracted_data };
        // Normalize payment_method
        if (data.payment_method) {
          const pm = data.payment_method;
          if (/מזומן|מזומנים|cash/i.test(pm)) data.payment_method = 'Cash';
          else if (/ביט|bit/i.test(pm)) data.payment_method = 'Bit';
          else if (/פייבוקס|paybox/i.test(pm)) data.payment_method = 'PayBox';
        }
        // Merge category_details instead of replacing
        const categoryDetailsMerge = data.category_details
          ? { category_details: { ...(taskDraft.category_details || {}), ...data.category_details } }
          : {};
        // Update Task Draft atomically
        setTaskDraft(prev => {
          const updated = { ...prev, ...data, ...categoryDetailsMerge };
          draftHistoryRef.current.push({ timestamp: Date.now(), draft: updated });
          return updated;
        });
      }

      // STEP 3: Lock category if detected (never ask again)
      if (agentData.category_detected && !taskDraft.category) {
        setTaskDraft(prev => {
          const updated = { ...prev, category: agentData.category_detected };
          draftHistoryRef.current.push({ timestamp: Date.now(), draft: updated });
          return updated;
        });
      }

      // Update field state machine
      if (agentData.current_field_state) {
        setCurrentFieldState(agentData.current_field_state);
      }
      if (agentData.next_field_state) {
        setNextFieldState(agentData.next_field_state);
      }

      // Update UI states
      if (agentData.completeness_pct !== undefined) setCompletenessPct(agentData.completeness_pct);
      if (agentData.marketplace_insight) setMarketplaceInsight(agentData.marketplace_insight);
      if (agentData.summary) setTaskSummary(agentData.summary);

      setQuickReplies(agentData.quick_replies || []);
      
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

  const handleFeatureToggle = (key) => {
    setEnabledFeatures(prev => ({ ...prev, [key]: !prev[key] }));
    if (key === 'is_story') {
      setTaskDraft(prev => {
        const updated = { ...prev, is_story: !prev.is_story };
        draftHistoryRef.current.push({ timestamp: Date.now(), draft: updated });
        return updated;
      });
    } else if (key === 'auto_bump_enabled') {
      setTaskDraft(prev => {
        const updated = { ...prev, auto_bump_enabled: !prev.auto_bump_enabled };
        draftHistoryRef.current.push({ timestamp: Date.now(), draft: updated });
        return updated;
      });
    }
  };
  const handleFeatureConfig = (key, value) => {
    setFeatureConfig(prev => ({ ...prev, [key]: value }));
    if (key === 'max_price') {
      setTaskDraft(prev => {
        const updated = { ...prev, max_price: value ? Number(value) : null };
        draftHistoryRef.current.push({ timestamp: Date.now(), draft: updated });
        return updated;
      });
    }
  };
  const handleRequirementToggle = (key) => setTaskDraft(prev => {
    const updated = { ...prev, requirements: { ...(prev.requirements || {}), [key]: !(prev.requirements || {})[key] } };
    draftHistoryRef.current.push({ timestamp: Date.now(), draft: updated });
    return updated;
  });
  const handleInvoiceToggle = () => {
    setEnabledFeatures(prev => ({ ...prev, requires_invoice: !prev.requires_invoice }));
    setTaskDraft(prev => {
      const updated = { ...prev, requires_invoice: !prev.requires_invoice };
      draftHistoryRef.current.push({ timestamp: Date.now(), draft: updated });
      return updated;
    });
  };

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
    if (images.length > 0) setTaskDraft(prev => {
      const updated = { ...prev, images: [...(prev.images || []), ...images].slice(0, 4) };
      draftHistoryRef.current.push({ timestamp: Date.now(), draft: updated });
      return updated;
    });
    if (video) setTaskDraft(prev => {
      const updated = { ...prev, video_url: video.url };
      draftHistoryRef.current.push({ timestamp: Date.now(), draft: updated });
      return updated;
    });
    sendMessage('צירפתי מדיה 📎', urls.map(u => u.url));
  };

  // Publish
  const handlePublish = async () => {
    setPublishing(true);
    try {
      // Use Task Draft as source of truth when publishing
      await onPublish({ ...taskDraft, ...enabledFeatures, ...featureConfig });
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
    <div style={{ display: 'flex', flexDirection: 'column', height: visibleHeight ? `${visibleHeight}px` : '100%', background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)', position: 'relative', overflow: 'hidden' }} dir="rtl">
      
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

      {/* Live Draft Card — uses Task Draft, not taskState */}
      <LiveDraftCard taskState={taskDraft} completenessPct={completenessPct} enabledFeatures={enabledFeatures} />

      {/* Messages */}
      <div ref={messagesContainerRef} style={{ 
        flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 16px 0',
        display: 'flex', flexDirection: 'column', gap: 10,
        WebkitOverflowScrolling: 'touch',
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
                 setTaskDraft(prev => {
                   const updated = {
                     ...prev,
                     category_details: {
                       ...(prev.category_details || {}),
                       to_address: addrData.location_name,
                       to_city: addrData.city,
                       to_lat: addrData.lat,
                       to_lng: addrData.lng,
                       to_building: addrData.address_building,
                       to_floor: addrData.address_floor,
                     },
                   };
                   draftHistoryRef.current.push({ timestamp: Date.now(), draft: updated });
                   return updated;
                 });
                 sendMessage(`כתובת יעד: ${addrData.location_name}${addrData.address_building ? ' בנין ' + addrData.address_building : ''}${addrData.address_floor ? ' קומה ' + addrData.address_floor : ''}`);
               } else {
                 setTaskDraft(prev => {
                   const updated = {
                     ...prev,
                     location_name: addrData.location_name, city: addrData.city,
                     lat: addrData.lat, lng: addrData.lng,
                     address_building: addrData.address_building, address_floor: addrData.address_floor,
                     address_apartment: addrData.address_apartment, address_notes: addrData.address_notes,
                   };
                   draftHistoryRef.current.push({ timestamp: Date.now(), draft: updated });
                   return updated;
                 });
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
              category={taskDraft.category || 'other'}
              requirements={taskDraft.requirements || {}}
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
        padding: '8px 16px',
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