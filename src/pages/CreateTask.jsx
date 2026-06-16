import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Mic, MicOff, Zap, Sparkles, Send, ArrowUp, Check, MapPin, CreditCard } from 'lucide-react';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import BackButton from '@/components/BackButton';
import { toast } from 'sonner';
import { moderateText, moderateImage } from '@/hooks/useModeration';
import LoginPromptModal from '@/components/LoginPromptModal';
import BuyCreditsModal from '@/components/BuyCreditsModal';
import TaskPublishedCelebration from '@/components/celebration/TaskPublishedCelebration';

const DEFAULT_FORM = {
  title: '',
  description: '',
  price: '',
  location_name: '',
  city: '',
  lat: null,
  lng: null,
  payment_method: '',
  category: 'other',
  estimated_time: '1h',
  max_price: '',
  auto_bump_enabled: false,
  is_story: false,
  requires_invoice: false,
  images: [],
  video_url: '',
  requirements: { vehicle: false, two_people: false, experience: false },
  urgency_tag: '',
  expiry_hours: null,
  address_building: '',
  address_floor: '',
  address_apartment: '',
  address_notes: '',
  custom_time: '',
  custom_expiry_hours: '',
};

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'מזומן' },
  { value: 'Bit', label: 'Bit' },
  { value: 'PayBox', label: 'PayBox' },
  { value: 'Other', label: 'אחר' },
];

const MANDATORY_LABELS = {
  title: 'כותרת',
  description: 'תיאור',
  price: 'מחיר',
  location_name: 'כתובת',
  payment_method: 'אמצעי תשלום',
};

export default function CreateTask() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { isAuthenticated, login } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [publishing, setPublishing] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [suggestedFeatures, setSuggestedFeatures] = useState([]);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const submittingRef = useRef(false);
  const hasSentInitialRef = useRef(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [publishedTask, setPublishedTask] = useState(null);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send initial assistant greeting
  useEffect(() => {
    if (hasSentInitialRef.current) return;
    hasSentInitialRef.current = true;
    setMessages([{
      role: 'assistant',
      content: '👋 היי! אני אעזור לך לפרסם משימה בקלות.\n\nפשוט תאר לי מה אתה צריך — ואני אדאג לכל השאר.\n\nאפשר לכתוב או להקליט 🎙️',
    }]);
  }, []);

  const callAssistant = useCallback(async (newMessages, currentData) => {
    try {
      const response = await base44.functions.invoke('taskAssistant', {
        messages: newMessages,
        currentData,
      });
      const data = response.data;
      return data;
    } catch (err) {
      return { assistantMessage: 'מצטער, קרתה שגיאה. אפשר לנסות שוב?', extractedData: {}, missingMandatoryFields: [], suggestedFeatures: [], isReadyToPublish: false };
    }
  }, []);

  const handleSend = async (text) => {
    if (!text?.trim() || loading) return;
    const userMsg = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const result = await callAssistant(newMessages, form);

    // Merge extracted data into form
    if (result.extractedData && Object.keys(result.extractedData).length > 0) {
      setForm(prev => {
        const next = { ...prev };
        for (const [key, val] of Object.entries(result.extractedData)) {
          if (val !== undefined && val !== null && val !== '') {
            next[key] = val;
          }
        }
        return next;
      });
    }

    setSuggestedFeatures(result.suggestedFeatures || []);
    setIsReady(result.isReadyToPublish || false);

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: result.assistantMessage || 'הבנתי, ממשיך...',
      missingFields: result.missingMandatoryFields || [],
      suggestedFeatures: result.suggestedFeatures || [],
      isReady: result.isReadyToPublish || false,
    }]);
    setLoading(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' });
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
        if (text) handleSend(text);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (e) {
      toast.error('לא ניתן לגשת למיקרופון');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const handlePublish = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }
    doPublish();
  };

  const doPublish = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPublishing(true);

    // Validate mandatory fields
    if (!form.title || !form.description || !form.price || !form.location_name || !form.payment_method) {
      toast.error('חסרים שדות חובה — אנא ודא שמילאת כותרת, תיאור, מחיר, כתובת ואמצעי תשלום');
      setPublishing(false);
      submittingRef.current = false;
      return;
    }

    // Moderation checks
    const [titleCheck, descCheck] = await Promise.all([
      form.title ? moderateText(form.title) : Promise.resolve({ flagged: false }),
      form.description ? moderateText(form.description) : Promise.resolve({ flagged: false }),
    ]);

    if (titleCheck.flagged || descCheck.flagged) {
      toast.error('התוכן אינו עומד בכללי הקהילה. אנא תקן.');
      setPublishing(false);
      submittingRef.current = false;
      return;
    }

    for (const imgUrl of (form.images || [])) {
      const imgCheck = await moderateImage(imgUrl);
      if (imgCheck.flagged) {
        toast.error('אחת התמונות נחסמה עקב תוכן לא הולם.');
        setPublishing(false);
        submittingRef.current = false;
        return;
      }
    }

    // Story credit deduction
    if (form.is_story) {
      const currentCredits = me?.worker_credits ?? 0;
      if (currentCredits < 10) {
        setShowNoCreditsModal(true);
        setPublishing(false);
        submittingRef.current = false;
        return;
      }
      const newBalance = currentCredits - 10;
      await base44.auth.updateMe({ worker_credits: newBalance });
      await base44.entities.CreditTransaction.create({
        user_id: me.id,
        amount: -10,
        type: 'Application_Fee',
        note: `עלות סטורי פרסום: ${form.title || 'משימה'}`,
        task_title: form.title || 'משימה',
        balance_after: newBalance,
      });
    }

    const expiryHours = form.expiry_hours === 'custom' ? (parseFloat(form.custom_expiry_hours) || null) : form.expiry_hours;
    const expires = expiryHours ? new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString() : null;
    const storyExpires = form.is_story ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined;
    const estimatedTime = form.estimated_time === 'custom' ? (form.custom_time || 'custom') : form.estimated_time;

    const created = await base44.entities.Task.create({
      title: form.title,
      description: form.description,
      price: Number(form.price),
      base_price: Number(form.price),
      max_price: form.auto_bump_enabled && form.max_price ? Number(form.max_price) : undefined,
      auto_bump_enabled: form.auto_bump_enabled,
      location_name: form.location_name,
      city: form.city,
      lat: form.lat || undefined,
      lng: form.lng || undefined,
      address_building: form.address_building || undefined,
      address_floor: form.address_floor || undefined,
      address_apartment: form.address_apartment || undefined,
      address_notes: form.address_notes || undefined,
      estimated_time: estimatedTime,
      category: form.category,
      approval_mode: 'manual',
      expiry_duration_hours: expiryHours || null,
      expires_at: expires,
      is_story: form.is_story,
      story_expires_at: storyExpires,
      images: form.images,
      video_url: form.video_url || undefined,
      requirements: form.requirements,
      payment_method: form.payment_method,
      status: 'OPEN',
      requires_invoice: form.requires_invoice || false,
      urgency_tag: form.urgency_tag || undefined,
      client_id: me?.id,
      client_name: me?.full_name,
      client_rating: me?.rating || 0,
      client_verified: me?.is_verified || false,
    });

    setPublishing(false);
    submittingRef.current = false;
    if (created?.id) {
      setPublishedTask({ id: created.id, title: form.title, price: form.price, location_name: form.location_name });
      setShowCelebration(true);
    } else {
      navigate('/');
    }
  };

  const handleAddressSelect = ({ location_name, city, lat, lng }) => {
    if (location_name) {
      setForm(prev => ({ ...prev, location_name, city: city || '', lat, lng }));
      setShowAddressPicker(false);
    }
  };

  const handlePaymentSelect = (method) => {
    setForm(prev => ({ ...prev, payment_method: method }));
    setShowPaymentPicker(false);
  };

  const handleFeatureToggle = (feature) => {
    if (feature.includes('סטורי')) {
      const currentCredits = me?.worker_credits ?? 0;
      if (!form.is_story && currentCredits < 10) {
        setShowNoCreditsModal(true);
        return;
      }
      setForm(prev => ({ ...prev, is_story: !prev.is_story }));
    } else if (feature.includes('העלאת מחיר') || feature.includes('אוטומטית')) {
      setForm(prev => ({ ...prev, auto_bump_enabled: !prev.auto_bump_enabled }));
    } else if (feature.includes('חשבונית')) {
      setForm(prev => ({ ...prev, requires_invoice: !prev.requires_invoice }));
    }
  };

  const activeFeatureStyles = (active) => ({
    background: active ? '#eff6ff' : 'var(--surface-3)',
    border: `1.5px solid ${active ? '#93c5fd' : 'var(--border-1)'}`,
    color: active ? '#1e40af' : 'var(--text-2)',
    fontWeight: 700,
  });

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--surface-1)' }} dir="rtl">
      {showLoginPrompt && (
        <LoginPromptModal
          onLogin={() => { setShowLoginPrompt(false); login('/create-task'); }}
          onClose={() => setShowLoginPrompt(false)}
          type="publish"
        />
      )}
      {showNoCreditsModal && (
        <BuyCreditsModal creditsNeeded={10} onClose={() => setShowNoCreditsModal(false)} />
      )}

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)',
        padding: '7px 12px 6px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <BackButton style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)', boxShadow: 'none' }} iconColor="white" />
        <span style={{ fontWeight: 800, fontSize: 17, color: 'white', flex: 1 }}>פרסום משימה</span>
        {isReady && (
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="btn-tap"
            style={{
              background: 'linear-gradient(135deg, #059669, #047857)',
              color: 'white', border: 'none', borderRadius: 14,
              padding: '8px 20px', fontSize: 14, fontWeight: 800,
              cursor: publishing ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 4px 16px rgba(5,150,105,0.4)',
            }}
          >
            {publishing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            {publishing ? 'מפרסם...' : 'פרסם עכשיו'}
          </button>
        )}
      </div>

      {/* Progress indicator */}
      {(() => {
        const filled = [form.title, form.description, form.price, form.location_name, form.payment_method].filter(Boolean).length;
        const pct = Math.round((filled / 5) * 100);
        return (
          <div style={{ padding: '8px 16px', background: 'rgba(26,111,212,0.06)', borderBottom: '1px solid var(--border-1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 600 }}>התקדמות</span>
              <span style={{ fontSize: 10, color: pct === 100 ? '#059669' : 'var(--text-2)', fontWeight: 800 }}>
                {pct}% ({filled}/5)
              </span>
            </div>
            <div style={{ height: 3, background: 'var(--border-1)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#059669' : '#1a6fd4', borderRadius: 99, transition: 'width 0.4s ease' }} />
            </div>
          </div>
        );
      })()}

      {/* Extracted data summary */}
      {Object.values(form).some(v => v) && (
        <div style={{ padding: '8px 16px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {form.title && (
            <span style={{ fontSize: 11, fontWeight: 600, background: '#eff6ff', color: '#1e40af', borderRadius: 12, padding: '3px 10px', border: '1px solid #bfdbfe' }}>
              📝 {form.title.slice(0, 25)}{form.title.length > 25 ? '...' : ''}
            </span>
          )}
          {form.price && (
            <span style={{ fontSize: 11, fontWeight: 600, background: '#f0fdf4', color: '#166534', borderRadius: 12, padding: '3px 10px', border: '1px solid #bbf7d0' }}>
              💰 ₪{form.price}
            </span>
          )}
          {form.location_name && (
            <span style={{ fontSize: 11, fontWeight: 600, background: '#fef3c7', color: '#92400e', borderRadius: 12, padding: '3px 10px', border: '1px solid #fcd34d' }}>
              📍 {form.location_name.slice(0, 25)}{form.location_name.length > 25 ? '...' : ''}
            </span>
          )}
          {form.payment_method && (
            <span style={{ fontSize: 11, fontWeight: 600, background: '#faf5ff', color: '#7c3aed', borderRadius: 12, padding: '3px 10px', border: '1px solid #d8b4fe' }}>
              💳 {PAYMENT_METHODS.find(p => p.value === form.payment_method)?.label || form.payment_method}
            </span>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3" style={{ paddingBottom: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 ${msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}>
            <div style={{
              maxWidth: '85%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #1a6fd4, #0a52b0)'
                : 'var(--card-bg)',
              color: msg.role === 'user' ? 'white' : 'var(--text-1)',
              border: msg.role === 'user' ? 'none' : '1px solid var(--border-1)',
              fontSize: 14,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Suggested features */}
        {suggestedFeatures.length > 0 && (
          <div className="mb-4 flex justify-start">
            <div style={{ maxWidth: '85%' }}>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, fontWeight: 600 }}>💡 פיצ'רים מומלצים:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {suggestedFeatures.map((feat, idx) => {
                  let active = false;
                  if (feat.includes('סטורי')) active = form.is_story;
                  else if (feat.includes('העלאת מחיר') || feat.includes('אוטומטית')) active = form.auto_bump_enabled;
                  else if (feat.includes('חשבונית')) active = form.requires_invoice;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleFeatureToggle(feat)}
                      style={{
                        padding: '8px 14px', borderRadius: 14, fontSize: 12, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                        ...activeFeatureStyles(active),
                      }}
                    >
                      {active && <Check size={12} />}
                      {feat.includes('סטורי') ? <Sparkles size={12} /> : <Zap size={12} />}
                      {feat}
                    </button>
                  );
                })}
              </div>
              {form.auto_bump_enabled && (
                <div style={{ marginTop: 8 }}>
                  <input
                    type="text" inputMode="numeric" pattern="[0-9]*"
                    placeholder="מחיר מקסימלי (₪)"
                    value={form.max_price}
                    onChange={e => setForm(prev => ({ ...prev, max_price: e.target.value.replace(/[^0-9]/g, '') }))}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 12,
                      background: 'var(--input-bg)', border: '1.5px solid var(--border-1)',
                      fontSize: 14, outline: 'none', boxSizing: 'border-box',
                      color: 'var(--text-1)',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="mb-4 flex justify-start">
            <div style={{
              background: 'var(--card-bg)', border: '1px solid var(--border-1)',
              borderRadius: '20px 20px 20px 4px', padding: '12px 20px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Loader2 size={16} className="animate-spin" color="#1a6fd4" />
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>חושב...</span>
            </div>
          </div>
        )}

        {/* Transcribing indicator */}
        {transcribing && (
          <div className="mb-4 flex justify-start" style={{ marginTop: 8 }}>
            <div style={{
              background: '#eff6ff', border: '1px solid #bfdbfe',
              borderRadius: '20px 20px 20px 4px', padding: '12px 20px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Loader2 size={16} className="animate-spin" color="#1a6fd4" />
              <span style={{ fontSize: 13, color: '#1a6fd4', fontWeight: 600 }}>מתמלל הקלטה...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Address picker */}
      {showAddressPicker && (
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-1)', background: 'var(--surface-2)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>📍 בחר כתובת מהרשימה:</div>
          <AddressAutocomplete
            value={form.location_name || ''}
            onSelect={handleAddressSelect}
          />
        </div>
      )}

      {/* Payment picker */}
      {showPaymentPicker && (
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-1)', background: 'var(--surface-2)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>💳 בחר אמצעי תשלום:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {PAYMENT_METHODS.map(pm => (
              <button key={pm.value} onClick={() => handlePaymentSelect(pm.value)}
                style={{
                  padding: '8px 4px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', border: 'none',
                  background: form.payment_method === pm.value ? '#2563EB' : 'var(--surface-3)',
                  color: form.payment_method === pm.value ? 'white' : 'var(--text-2)',
                }}
              >{pm.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div style={{
        padding: '10px 12px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        background: 'var(--surface-2)',
        borderTop: '1px solid var(--border-1)',
      }}>
        {/* Quick action buttons */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          {(!form.location_name || !form.lat) && (
            <button onClick={() => setShowAddressPicker(!showAddressPicker)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 16, fontSize: 11, fontWeight: 600,
                background: showAddressPicker ? '#eff6ff' : 'var(--surface-3)',
                border: `1px solid ${showAddressPicker ? '#bfdbfe' : 'var(--border-1)'}`,
                color: showAddressPicker ? '#1e40af' : 'var(--text-2)',
                cursor: 'pointer',
              }}
            >
              <MapPin size={12} /> כתובת {form.location_name ? '✅' : ''}
            </button>
          )}
          {!form.payment_method && (
            <button onClick={() => setShowPaymentPicker(!showPaymentPicker)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 16, fontSize: 11, fontWeight: 600,
                background: showPaymentPicker ? '#faf5ff' : 'var(--surface-3)',
                border: `1px solid ${showPaymentPicker ? '#d8b4fe' : 'var(--border-1)'}`,
                color: showPaymentPicker ? '#7c3aed' : 'var(--text-2)',
                cursor: 'pointer',
              }}
            >
              <CreditCard size={12} /> תשלום {form.payment_method ? '✅' : ''}
            </button>
          )}
          {isReady && (
            <button onClick={handlePublish} disabled={publishing}
              className="btn-tap"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 16, fontSize: 11, fontWeight: 800,
                background: 'linear-gradient(135deg, #059669, #047857)',
                color: 'white', border: 'none', cursor: publishing ? 'not-allowed' : 'pointer',
              }}
            >
              {publishing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
              {publishing ? '...' : 'פרסם'}
            </button>
          )}
        </div>

        {/* Text input + mic */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={transcribing}
            style={{
              width: 44, height: 44, borderRadius: 14, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: recording ? '#fee2e2' : '#eff6ff',
              border: `1.5px solid ${recording ? '#fca5a5' : '#bfdbfe'}`,
              cursor: 'pointer',
            }}
          >
            {transcribing ? <Loader2 size={18} className="animate-spin" color="#1a6fd4" /> :
              recording ? <MicOff size={18} color="#dc2626" /> : <Mic size={18} color="#1a6fd4" />}
          </button>

          <div style={{
            flex: 1, display: 'flex', alignItems: 'flex-end',
            background: 'var(--input-bg)', borderRadius: 16,
            border: '1.5px solid var(--border-1)', padding: '4px',
          }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={recording ? 'מקליט...' : 'תאר את המשימה שאתה צריך...'}
              disabled={loading || recording}
              rows={1}
              style={{
                flex: 1, background: 'transparent', border: 'none',
                outline: 'none', resize: 'none', fontSize: 15,
                color: 'var(--text-1)', fontFamily: 'inherit',
                padding: '8px 10px', maxHeight: 100,
                lineHeight: 1.4,
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
              }}
            />
            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim() || loading}
              style={{
                width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: input.trim() && !loading ? '#1a6fd4' : 'var(--border-1)',
                border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default',
                transition: 'all 0.15s',
              }}
            >
              <ArrowUp size={16} color="white" />
            </button>
          </div>
        </div>
      </div>
      {/* Celebration */}
      {showCelebration && publishedTask && (
        <TaskPublishedCelebration
          visible={showCelebration}
          taskTitle={publishedTask.title}
          taskPrice={publishedTask.price}
          taskLocation={publishedTask.location_name}
          onNavigate={() => {
            setShowCelebration(false);
            navigate(`/task/${publishedTask.id}`);
          }}
        />
      )}
    </div>
  );
}