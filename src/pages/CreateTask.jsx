import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MapPin, Clock, Zap, CheckSquare, Loader2, Users, Sparkles, Info, AlertTriangle, Save, Mic, MicOff } from 'lucide-react';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { useVerifyGuard } from '@/hooks/useVerifyGuard';
import { useAuth } from '@/lib/AuthContext';
import BackButton from '@/components/BackButton';
import PageHeader from '@/components/PageHeader';
import { toast } from 'sonner';
import PriceSuggestion from '@/components/PriceSuggestion';
import ImageUploader from '@/components/ImageUploader';
import VideoUploader from '@/components/VideoUploader';
import { CATEGORIES } from '@/lib/categories';
import VerifyModal from '@/components/VerifyModal';
import LoginPromptModal from '@/components/LoginPromptModal';
import BuyCreditsModal from '@/components/BuyCreditsModal';
import { moderateText, moderateImage } from '@/hooks/useModeration';
import CategoryExtraFields from '@/components/CategoryExtraFields';
import LiveSearchOverlay from '@/components/LiveSearchOverlay';

const DRAFT_KEY = 'joba24_create_task_draft';
const timeOptions = ['15m', '30m', '1h', '2h', 'custom'];
const EXPIRY_OPTIONS = [
  { label: 'ללא תוקף', hours: null },
  { label: "30 דק'", hours: 0.5 },
  { label: 'שעה', hours: 1 },
  { label: '2 שעות', hours: 2 },
  { label: '4 שעות', hours: 4 },
  { label: '6 שעות', hours: 6 },
  { label: 'יום', hours: 24 },
  { label: '2 ימים', hours: 48 },
  { label: 'שבוע', hours: 168 },
  { label: '⌨️ מותאם', hours: 'custom' },
];

const URGENCY_TAGS = [
  { value: 'immediate', emoji: '🔥', label: 'צריך עובד מיידי', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  { value: 'few_hours', emoji: '⏰', label: 'עובד לשעות הקרובות', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { value: 'evening',   emoji: '🌅', label: 'עובד לקראת הערב', color: '#7c3aed', bg: '#faf5ff', border: '#c4b5fd' },
  { value: 'flexible',  emoji: '😌', label: 'לא לחוץ בזמן', color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
];

function SocialProofBar() {
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 100),
    staleTime: 60000,
  });
  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length || 238;
  return (
    <div style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <span>🤝</span>
      <span>הצטרף ל-<strong style={{ color: '#1a6fd4' }}>{completedCount}+</strong> משתמשים שכבר ביצעו משימות בהצלחה</span>
    </div>
  );
}

function SectionCard({ children }) {
  return (
    <div style={{ background: 'white', borderRadius: 20, padding: '18px 16px', border: '1px solid #dce8f5', boxShadow: '0 2px 12px rgba(26,111,212,0.06)' }}>
      {children}
    </div>
  );
}

const DEFAULT_FORM = {
  title: '',
  description: '',
  price: '',
  max_price: '',
  auto_bump_enabled: false,
  location_name: '',
  city: '',
  lat: null,
  lng: null,
  address_building: '',
  address_floor: '',
  address_apartment: '',
  address_notes: '',
  estimated_time: '1h',
  category: 'other',
  approval_mode: 'manual',
  expiry_hours: null,
  custom_time: '',
  is_story: false,
  images: [],
  video_url: '',
  requirements: { vehicle: false, two_people: false, experience: false },
  payment_method: '',
  urgency_tag: '',
  custom_expiry_hours: '',
};

const PAYMENT_METHODS = [
  { value: 'Cash', label: '💵 מזומן' },
  { value: 'Bit', label: '📱 Bit' },
  { value: 'PayBox', label: '📲 PayBox' },
  { value: 'Other', label: '💰 אחר' },
];

export default function CreateTask() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, login } = useAuth();
  const editId = searchParams.get('editId');
  const isEditMode = !!editId;
  const isRepostMode = isEditMode && searchParams.get('repost') === '1';
  const isRepost = !isEditMode && searchParams.get('repost') === '1';
  const [loading, setLoading] = useState(false);
  const [searchingTaskId, setSearchingTaskId] = useState(null);
  const [searchingTaskTitle, setSearchingTaskTitle] = useState('');
  const [searchingTaskPrice, setSearchingTaskPrice] = useState(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const submittingRef = useRef(false);

  const startRecording = async () => {
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
      set('description', form.description ? form.description + '\n' + text : text);
      setTranscribing(false);
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [extraFieldsText, setExtraFieldsText] = useState('');
  const draftTimerRef = useRef(null);

  // Initialize form: repost params > saved draft > defaults (edit mode initializes via useEffect)
  const [form, setForm] = useState(() => {
    if (isRepost) {
      return {
        ...DEFAULT_FORM,
        title: searchParams.get('title') || '',
        description: searchParams.get('description') || '',
        price: searchParams.get('price') || '',
        location_name: searchParams.get('location_name') || '',
        city: searchParams.get('city') || '',
        estimated_time: searchParams.get('estimated_time') || '1h',
        category: searchParams.get('category') || 'other',
        approval_mode: searchParams.get('approval_mode') || 'instant',
      };
    }
    // Try to load saved draft
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return { ...DEFAULT_FORM, ...JSON.parse(saved) };
    } catch (_) {}
    return DEFAULT_FORM;
  });

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  // Edit mode: load existing task
  const { data: editTask } = useQuery({
    queryKey: ['task', editId],
    queryFn: () => base44.entities.Task.filter({ id: editId }).then(d => d[0]),
    enabled: isEditMode,
  });
  const { data: editApplications = [] } = useQuery({
    queryKey: ['applications', editId],
    queryFn: () => base44.entities.TaskApplication.filter({ task_id: editId }),
    enabled: isEditMode,
  });
  const hasActiveApplications = isEditMode && editApplications.some(a => a.status === 'pending' || a.status === 'approved');

  // Populate form when editTask loads
  useEffect(() => {
    if (!editTask || !isEditMode) return;
    const isCustomTime = editTask.estimated_time && !['15m', '30m', '1h', '2h'].includes(editTask.estimated_time);
    setForm({
      ...DEFAULT_FORM,
      title: editTask.title || '',
      description: editTask.description || '',
      price: String(editTask.price || ''),
      max_price: String(editTask.max_price || ''),
      auto_bump_enabled: editTask.auto_bump_enabled || false,
      location_name: editTask.location_name || '',
      city: editTask.city || '',
      lat: editTask.lat || null,
      lng: editTask.lng || null,
      address_building: editTask.address_building || '',
      address_floor: editTask.address_floor || '',
      address_apartment: editTask.address_apartment || '',
      address_notes: editTask.address_notes || '',
      estimated_time: isCustomTime ? 'custom' : (editTask.estimated_time || '1h'),
      custom_time: isCustomTime ? editTask.estimated_time : '',
      category: editTask.category || 'other',
      approval_mode: 'manual',
      expiry_hours: editTask.expiry_duration_hours || null,
      images: editTask.images || [],
      video_url: editTask.video_url || '',
      requirements: editTask.requirements || { vehicle: false, two_people: false, experience: false },
      payment_method: editTask.payment_method || '',
      urgency_tag: editTask.urgency_tag || '',
      custom_expiry_hours: '',
    });
    setAddressConfirmed(!!(editTask.lat && editTask.lng));
  }, [editTask?.id]);
  const { gate, showVerify, onSuccess: onVerifySuccess, onClose: onVerifyClose } = useVerifyGuard(me);
  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const setReq = (key, val) => setForm(p => ({ ...p, requirements: { ...p.requirements, [key]: val } }));
  const [errors, setErrors] = useState({});
  const [showErrorBanner, setShowErrorBanner] = useState(false);
  const [moderationErrors, setModerationErrors] = useState({});
  const [checkingModeration, setCheckingModeration] = useState('');
  // Track whether address was selected from autocomplete (not free text)
  const [addressConfirmed, setAddressConfirmed] = useState(!!(form.lat && form.lng));

  const fieldRefs = {
    title: useRef(null),
    description: useRef(null),
    price: useRef(null),
    location_name: useRef(null),
    city: useRef(null),
  };

  // Auto-save draft on form change (debounced 1s)
  useEffect(() => {
    if (isRepost || isEditMode) return;
    clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      const draftFields = { title: form.title, description: form.description, price: form.price, location_name: form.location_name, city: form.city, category: form.category, estimated_time: form.estimated_time, approval_mode: form.approval_mode };
      // Only save if user has typed something meaningful
      if (form.title || form.description || form.price) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draftFields));
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2000);
      }
    }, 1000);
    return () => clearTimeout(draftTimerRef.current);
  }, [form.title, form.description, form.price, form.location_name, form.city, form.category, form.estimated_time, form.approval_mode, isRepost]);

  const checkFieldModeration = async (field, text) => {
    if (!text || text.trim().length < 4) {
      setModerationErrors(p => ({ ...p, [field]: null }));
      return;
    }
    setCheckingModeration(field);
    const result = await moderateText(text);
    setCheckingModeration('');
    if (result.flagged) {
      setModerationErrors(p => ({ ...p, [field]: 'תוכן זה אינו עומד בכללי הקהילה. אנא תקן כדי לפרסם.' }));
    } else {
      setModerationErrors(p => ({ ...p, [field]: null }));
    }
  };

  const handleSubmit = () => {
    if (!isAuthenticated) {
      // Save current form to draft before showing login
      const draftFields = { title: form.title, description: form.description, price: form.price, location_name: form.location_name, city: form.city, category: form.category, estimated_time: form.estimated_time, approval_mode: form.approval_mode, requirements: form.requirements, images: form.images, expiry_hours: form.expiry_hours, auto_bump_enabled: form.auto_bump_enabled, max_price: form.max_price, is_story: form.is_story };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftFields));
      setShowLoginPrompt(true);
      return;
    }
    doSubmit();
  };

  const doSubmit = async () => {
    if (submittingRef.current) return;
    const newErrors = {};
    if (!form.title) newErrors.title = true;
    if (!form.description) newErrors.description = true;
    if (!form.price) newErrors.price = true;
    if (!form.location_name || !addressConfirmed) newErrors.location_name = true;
    if (!form.payment_method) newErrors.payment_method = true;

    // Edit mode: save & navigate
    if (isEditMode) {
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setShowErrorBanner(true);
        return;
      }
      setLoading(true);
      const estimatedTime = form.estimated_time === 'custom' ? (form.custom_time || 'custom') : form.estimated_time;
      const expiryHoursEdit = form.expiry_hours === 'custom' ? (parseFloat(form.custom_expiry_hours) || null) : form.expiry_hours;
      const expires = expiryHoursEdit ? new Date(Date.now() + expiryHoursEdit * 60 * 60 * 1000).toISOString() : null;
      await base44.entities.Task.update(editId, {
        title: form.title,
        description: form.description,
        price: hasActiveApplications ? editTask.price : Number(form.price),
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
        expiry_duration_hours: expiryHoursEdit,
        expires_at: expires,
        images: form.images,
        video_url: form.video_url || undefined,
        requirements: form.requirements,
        payment_method: form.payment_method || undefined,
        urgency_tag: form.urgency_tag || undefined,
        ...(isRepostMode ? { status: 'OPEN', worker_id: null, worker_name: null, worker_status: null, expires_at: expires } : {}),
      });
      setLoading(false);
      toast.success(isRepostMode ? "הג'ובה פורסמה מחדש! ✅" : 'המשימה עודכנה! ✅');
      navigate(`/task/${editId}`);
      return;
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShowErrorBanner(true);
      const order = ['title', 'description', 'price', 'location_name'];
      const firstError = order.find(k => newErrors[k]);
      if (firstError && fieldRefs[firstError]?.current) {
        fieldRefs[firstError].current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        fieldRefs[firstError].current.focus?.();
      }
      return;
    }
    setShowErrorBanner(false);
    setErrors({});
    setModerationErrors({});
    setLoading(true); // disable button immediately to prevent double-clicks

    // Final moderation checks
    setCheckingModeration('submit');
    const [titleCheck, descCheck] = await Promise.all([
      form.title ? moderateText(form.title) : Promise.resolve({ flagged: false }),
      form.description ? moderateText(form.description) : Promise.resolve({ flagged: false }),
    ]);
    setCheckingModeration('');
    if (titleCheck.flagged || descCheck.flagged) {
      const newModerationErrors = {};
      if (titleCheck.flagged) newModerationErrors.title = 'הכותרת מכילה תוכן שאינו עומד בכללי הקהילה. אנא תקן כדי לפרסם.';
      if (descCheck.flagged) newModerationErrors.description = 'התיאור מכיל תוכן שאינו עומד בכללי הקהילה. אנא תקן כדי לפרסם.';
      setModerationErrors(newModerationErrors);
      setShowErrorBanner(true);
      setLoading(false);
      return;
    }
    for (const imgUrl of (form.images || [])) {
      setCheckingModeration('images');
      const imgCheck = await moderateImage(imgUrl);
      setCheckingModeration('');
      if (imgCheck.flagged) {
        setModerationErrors({ images: 'אחת התמונות שהעלית נחסמה עקב תוכן לא הולם.' });
        setShowErrorBanner(true);
        setLoading(false);
        return;
      }
    }

    // Deduct 10 credits for story
    if (form.is_story) {
      const currentCredits = me?.worker_credits ?? 0;
      if (currentCredits < 10) {
        setShowNoCreditsModal(true);
        setLoading(false);
        return;
      }
      const newBalance = currentCredits - 10;
      await base44.auth.updateMe({ worker_credits: newBalance });
      // Record the transaction
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
      payment_method: form.payment_method,
      title: form.title,
      description: extraFieldsText
        ? (form.description ? form.description + '\n\n' + extraFieldsText : extraFieldsText)
        : form.description,
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
      approval_mode: form.approval_mode,
      expiry_duration_hours: expiryHours || null,
      expires_at: expires,
      is_story: form.is_story,
      story_expires_at: storyExpires,
      images: form.images,
      video_url: form.video_url || undefined,
      requirements: form.requirements,
      status: 'OPEN',
      urgency_tag: form.urgency_tag || undefined,
      client_id: me?.id,
      client_name: me?.full_name,
      client_rating: me?.rating || 0,
      client_verified: me?.is_verified || false,
    });

    setLoading(false);
    submittingRef.current = false;
    localStorage.removeItem(DRAFT_KEY);
    toast.success('המשימה פורסמה! ⚡');
    if (created?.id) {
      setSearchingTaskId(created.id);
      setSearchingTaskTitle(form.title);
      setSearchingTaskPrice(Number(form.price));
    } else {
      navigate('/');
    }
  };

  const activeBtn = { background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: 'white', border: '1px solid #1a6fd4' };
  const inactiveBtn = { background: 'white', color: '#555', border: '1px solid #dce8f5' };

  if (searchingTaskId) {
    return (
      <LiveSearchOverlay
        taskId={searchingTaskId}
        taskTitle={searchingTaskTitle}
        taskPrice={searchingTaskPrice}
        onDismiss={() => setSearchingTaskId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#f4f7fb' }} dir="rtl">
      {showVerify && (
        <VerifyModal onClose={onVerifyClose} onSuccess={onVerifySuccess} />
      )}
      {showNoCreditsModal && (
        <BuyCreditsModal creditsNeeded={10} onClose={() => setShowNoCreditsModal(false)} />
      )}
      {showLoginPrompt && (
        <LoginPromptModal
          onLogin={() => {
            setShowLoginPrompt(false);
            login('/create-task');
          }}
          onClose={() => setShowLoginPrompt(false)}
          type="publish"
        />
      )}
      {/* Sticky header + progress bar combined */}
      {(() => {
        const filled = [form.title, form.description, form.price, form.location_name && addressConfirmed, form.payment_method].filter(Boolean).length;
        const pct = Math.round((filled / 5) * 100);
        return (
          <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)' }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px 12px' }}>
              <BackButton style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)', boxShadow: 'none' }} iconColor="white" />
              <span style={{ fontWeight: 800, fontSize: 17, color: 'white', flex: 1 }}>
        {isRepostMode ? '🔄 פרסם שוב' : isEditMode ? '✏️ עריכת משימה' : isRepost ? '🔄 פרסם שוב' : 'פרסום משימה חדשה'}
      </span>
              {draftSaved && <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '4px 8px', fontSize: 11, color: 'white', fontWeight: 700 }}><Save size={11} /> נשמר</div>}
            </div>
            {/* Progress bar */}
            <div style={{ padding: '0 16px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>השלמת הטופס</span>
                <span style={{ fontSize: 10, color: pct === 100 ? '#4ade80' : 'rgba(255,255,255,0.7)', fontWeight: 800 }}>{pct}%{pct === 100 ? ' ✓ מוכן לפרסום!' : ''}</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#4ade80' : 'rgba(255,255,255,0.75)', borderRadius: 99, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          </div>
        );
      })()}

      <div className="px-4 py-4 space-y-4 pb-12">
        {/* Draft restore indicator */}
        {!isRepost && !isEditMode && form.title && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#166534', fontWeight: 700 }}>
              <Save size={14} /> טיוטה שמורה — המשך מהיכן שעצרת
            </div>
            <button onClick={() => { setForm(DEFAULT_FORM); localStorage.removeItem(DRAFT_KEY); }} style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>מחק</button>
          </div>
        )}

        {/* Error banner */}
        {showErrorBanner && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 16, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: '#dc2626', margin: 0, lineHeight: 1.6, fontWeight: 700 }}>
              ⚠️ חסרים פרטים כדי לפרסם את המשימה — בדוק את השדות המסומנים באדום
            </p>
          </div>
        )}

        {/* Moderation image error */}
        {moderationErrors.images && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 16, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: '#dc2626', margin: 0, lineHeight: 1.6, fontWeight: 700 }}>🛡️ {moderationErrors.images}</p>
          </div>
        )}

        {/* Info banner */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 16, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Info size={16} color="#1a6fd4" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: '#1e40af', margin: 0, lineHeight: 1.6 }}>
            <strong>חשוב!</strong> ככל שהמשימה מפורטת יותר — כך תקבל match מדויק יותר עם עובד מתאים.
          </p>
        </div>

        {/* Category */}
        <SectionCard>
          <Label className="text-sm font-bold mb-3 block" style={{ color: '#0f2b6b' }}>קטגוריה</Label>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(c => (
              <button key={c.value} onClick={() => set('category', c.value)}
                style={{ padding: '7px 14px', borderRadius: 24, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', ...(form.category === c.value ? activeBtn : inactiveBtn) }}
              >{c.label}</button>
            ))}
          </div>
        </SectionCard>

        {/* Smart Category Extra Fields — right below category picker */}
        <CategoryExtraFields
          key={form.category}
          category={form.category}
          originLat={form.lat}
          originLng={form.lng}
          onChange={(_data, text) => setExtraFieldsText(text)}
        />

        {/* Title + Description */}
        <SectionCard>
          <Label className="text-sm font-bold mb-2 block" style={{ color: '#0f2b6b' }}>מה צריך לעשות? *</Label>
          <Input ref={fieldRefs.title} placeholder="לדוגמה: להרים מקרר לקומה שלישית"
            value={form.title}
            onChange={e => { set('title', e.target.value); setErrors(p => ({...p, title: false})); setModerationErrors(p => ({...p, title: null})); if (showErrorBanner && e.target.value) setShowErrorBanner(false); }}
            onBlur={() => checkFieldModeration('title', form.title)}
            style={{ background: '#f4f7fb', border: `1.5px solid ${errors.title || moderationErrors.title ? '#ef4444' : '#dce8f5'}`, borderRadius: 12, height: 48, fontSize: 15, marginBottom: (errors.title || moderationErrors.title) ? 4 : 14 }}
          />
          {checkingModeration === 'title' && <p style={{ fontSize: 11, color: '#1a6fd4', marginBottom: 8 }}>🔍 בודק תוכן...</p>}
          {errors.title && <p style={{ fontSize: 11, color: '#ef4444', marginBottom: 10 }}>⚠️ שדה חובה</p>}
          {moderationErrors.title && <p style={{ fontSize: 11, color: '#ef4444', marginBottom: 10 }}>🛡️ {moderationErrors.title}</p>}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Label className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>תיאור מפורט *</Label>
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={transcribing}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', background: recording ? '#fee2e2' : '#eff6ff', color: recording ? '#dc2626' : '#1a6fd4' }}
            >
              {transcribing ? <Loader2 size={13} className="animate-spin" /> : recording ? <MicOff size={13} /> : <Mic size={13} />}
              {transcribing ? 'מעבד...' : recording ? 'עצור הקלטה' : 'הקלט תיאור'}
            </button>
          </div>
          {recording && (
            <div style={{ background: '#fee2e2', borderRadius: 10, padding: '8px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#dc2626', fontWeight: 700 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
              מקליט... לחץ עצור כשסיימת
            </div>
          )}
          <Textarea ref={fieldRefs.description} placeholder="תאר את המשימה בפירוט: מה בדיוק צריך לעשות, מה הציפיות, מה יש במקום..."
            value={form.description}
            onChange={e => { set('description', e.target.value); setErrors(p => ({...p, description: false})); setModerationErrors(p => ({...p, description: null})); }}
            onBlur={() => checkFieldModeration('description', form.description)}
            style={{ background: '#f4f7fb', border: `1.5px solid ${errors.description || moderationErrors.description ? '#ef4444' : '#dce8f5'}`, borderRadius: 12, resize: 'none' }} rows={4}
          />
          {checkingModeration === 'description' && <p style={{ fontSize: 11, color: '#1a6fd4', marginTop: 4 }}>🔍 בודק תוכן...</p>}
          {errors.description && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>⚠️ שדה חובה</p>}
          {moderationErrors.description && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>🛡️ {moderationErrors.description}</p>}
        </SectionCard>



        {/* Images + Video */}
        <SectionCard>
          <Label className="text-sm font-bold mb-2 block" style={{ color: '#0f2b6b' }}>תמונות (עד 4)</Label>
          <ImageUploader images={form.images} onChange={imgs => set('images', imgs)} />
          <div style={{ marginTop: 14 }}>
            <Label className="text-sm font-bold mb-2 block" style={{ color: '#0f2b6b' }}>סרטון (אופציונלי)</Label>
            <VideoUploader videoUrl={form.video_url} onChange={url => set('video_url', url)} />
          </div>
        </SectionCard>

        {/* Price */}
        <SectionCard>
          <Label className="text-sm font-bold mb-2 block" style={{ color: '#0f2b6b' }}>מחיר (₪) *</Label>
          <Input ref={fieldRefs.price} type="number" placeholder="100"
            value={form.price}
            onChange={e => { if (hasActiveApplications) return; set('price', e.target.value); setErrors(p => ({...p, price: false})); }}
            disabled={hasActiveApplications}
            style={{ background: '#f4f7fb', border: `1.5px solid ${errors.price ? '#ef4444' : '#dce8f5'}`, borderRadius: 12, height: 48, fontSize: 18, fontWeight: 800, marginBottom: 8, opacity: hasActiveApplications ? 0.5 : 1 }}
          />
          {hasActiveApplications && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 6 }}>⛔ לא ניתן לשנות מחיר — קיימות בקשות פעילות</p>}
          {errors.price && <p style={{ fontSize: 11, color: '#ef4444', marginBottom: 6 }}>⚠️ שדה חובה</p>}
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '10px 12px', marginBottom: 8, fontSize: 12, color: '#92400e', fontWeight: 600, lineHeight: 1.5 }}>
            💳 <strong>המחיר שפורסם הוא הסכום הסופי שישולם לעובד — לא פחות ולא יותר.</strong> שני הצדדים מחויבים לכבד מחיר זה.
          </div>
          <PriceSuggestion category={form.category} estimatedTime={form.estimated_time} description={form.description} location={form.city || form.location_name} onAccept={p => set('price', String(p))} />

          {/* Auto bump */}
          <button type="button" onClick={() => set('auto_bump_enabled', !form.auto_bump_enabled)}
            style={{ marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, textAlign: 'right', cursor: 'pointer', background: form.auto_bump_enabled ? '#fffbeb' : '#f4f7fb', border: `1px solid ${form.auto_bump_enabled ? '#fcd34d' : '#dce8f5'}` }}
          >
            <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${form.auto_bump_enabled ? '#f59e0b' : '#cbd5e1'}`, background: form.auto_bump_enabled ? '#f59e0b' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {form.auto_bump_enabled && <span style={{ color: 'white', fontSize: 11 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>⚡ העלאת מחיר אוטומטית</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>המחיר יעלה כל 5 דקות עד המקסימום</div>
            </div>
          </button>
          {form.auto_bump_enabled && (
            <div style={{ marginTop: 10, padding: '12px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 14 }}>
              <Label className="text-sm font-semibold block" style={{ color: '#92400e', marginBottom: 8 }}>מחיר מקסימלי (₪)</Label>
              <Input type="number" placeholder="250"
                value={form.max_price} onChange={e => set('max_price', e.target.value)}
                style={{ background: 'white', border: '1px solid #fcd34d', borderRadius: 12, height: 44, fontSize: 16, fontWeight: 700 }}
              />
            </div>
          )}
        </SectionCard>

        {/* Expiry + Urgency */}
        <SectionCard>
          <Label className="text-sm font-bold mb-3 flex items-center gap-1" style={{ color: '#0f2b6b' }}>
            <Clock size={14} /> תוקף המשימה
          </Label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {EXPIRY_OPTIONS.map(opt => (
              <button key={String(opt.hours)} onClick={() => set('expiry_hours', opt.hours)}
                style={{ padding: '7px 14px', borderRadius: 24, fontSize: 13, fontWeight: 600, cursor: 'pointer', ...(form.expiry_hours === opt.hours ? activeBtn : inactiveBtn) }}
              >{opt.label}</button>
            ))}
          </div>
          {form.expiry_hours === 'custom' && (
            <input
              type="number" min="0.5" step="0.5"
              placeholder="מספר שעות (לדוגמה: 3)"
              value={form.custom_expiry_hours}
              onChange={e => set('custom_expiry_hours', e.target.value)}
              style={{ width: '100%', marginTop: 10, padding: '10px 14px', borderRadius: 12, background: '#f4f7fb', border: '1px solid #dce8f5', fontSize: 16, outline: 'none', boxSizing: 'border-box' }}
            />
          )}
          {form.expiry_hours && form.expiry_hours !== 'custom' && (
            <p style={{ fontSize: 12, color: '#999', marginTop: 8 }}>המשימה תסומן כפגת תוקף אחרי {EXPIRY_OPTIONS.find(o => o.hours === form.expiry_hours)?.label}</p>
          )}

          {/* Urgency tag */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #f0f4fb' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f2b6b', marginBottom: 10 }}>⏱️ מתי דרוש עובד?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {URGENCY_TAGS.map(tag => {
                const isActive = form.urgency_tag === tag.value;
                return (
                  <button key={tag.value}
                    onClick={() => set('urgency_tag', isActive ? '' : tag.value)}
                    style={{
                      padding: '10px 14px', borderRadius: 14, fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', textAlign: 'center',
                      background: isActive ? tag.bg : 'white',
                      color: isActive ? tag.color : '#555',
                      border: isActive ? `1.5px solid ${tag.border}` : '1px solid #dce8f5',
                      transition: 'all 0.15s',
                    }}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>
        </SectionCard>

        {/* Story — only when creating new task */}
        {!isEditMode && <div
          onClick={() => {
            if (!form.is_story) {
              // Trying to enable — check credits
              const currentCredits = me?.worker_credits ?? 0;
              if (currentCredits < 10) {
                setShowNoCreditsModal(true);
                return;
              }
            }
            set('is_story', !form.is_story);
          }}
          style={{
            background: form.is_story ? 'linear-gradient(135deg,#fdf4ff,#f3e8ff)' : 'white',
            border: `2px solid ${form.is_story ? '#a855f7' : '#dce8f5'}`,
            borderRadius: 20, padding: '16px', cursor: 'pointer',
            boxShadow: form.is_story ? '0 4px 20px rgba(168,85,247,0.2)' : '0 2px 12px rgba(26,111,212,0.06)',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${form.is_story ? '#a855f7' : '#cbd5e1'}`, background: form.is_story ? '#a855f7' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {form.is_story && <span style={{ color: 'white', fontSize: 11 }}>✓</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: form.is_story ? '#7e22ce' : '#111', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={15} color="#a855f7" /> הצג כ-Story
                <span style={{ fontSize: 10, fontWeight: 800, background: '#f59e0b', color: 'white', padding: '2px 7px', borderRadius: 20, marginRight: 4 }}>מומלץ</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: form.is_story ? 'rgba(168,85,247,0.08)' : '#f4f7fb', borderRadius: 12, padding: '10px 12px' }}>
            <span style={{ fontSize: 22 }}>🚀</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: form.is_story ? '#7e22ce' : '#0f2b6b' }}>חשיפה גבוהה פי 3 בשורת ה-Stories</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>המשימה תופיע למעלה בפיד למשך 24 שעות · עלות: <strong style={{color:'#7e22ce'}}>10 ג'ובות</strong></div>
            </div>
          </div>
        </div>}

        {/* Location */}
        <SectionCard>
          <Label className="text-sm font-bold mb-2 flex items-center gap-1" style={{ color: '#0f2b6b' }}>
            <MapPin size={14} /> מיקום *
          </Label>
          <div ref={fieldRefs.location_name}>
            <AddressAutocomplete
              value={form.location_name}
              error={!!errors.location_name}
              onBlur={() => {
                if (form.location_name && !addressConfirmed) {
                  setErrors(p => ({ ...p, location_name: true }));
                }
              }}
              onSelect={({ location_name, city, lat, lng }) => {
                if (location_name) {
                  set('location_name', location_name);
                  set('city', city);
                  set('lat', lat);
                  set('lng', lng);
                  setAddressConfirmed(true);
                  setErrors(p => ({ ...p, location_name: false }));
                } else {
                  setAddressConfirmed(false);
                }
              }}
            />
          </div>
          {errors.location_name && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>⚠️ יש לבחור כתובת מהרשימה</p>}
          {/* Extra address details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            <div>
              <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>בניין / מספר בית</p>
              <Input placeholder="לדוגמה: 12"
                value={form.address_building || ''}
                onChange={e => set('address_building', e.target.value)}
                style={{ background: '#f4f7fb', border: '1.5px solid #dce8f5', borderRadius: 12, height: 42 }}
              />
            </div>
            <div>
              <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>קומה</p>
              <Input placeholder="לדוגמה: 3"
                value={form.address_floor || ''}
                onChange={e => set('address_floor', e.target.value)}
                style={{ background: '#f4f7fb', border: '1.5px solid #dce8f5', borderRadius: 12, height: 42 }}
              />
            </div>
            <div>
              <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>דירה</p>
              <Input placeholder="לדוגמה: 5"
                value={form.address_apartment || ''}
                onChange={e => set('address_apartment', e.target.value)}
                style={{ background: '#f4f7fb', border: '1.5px solid #dce8f5', borderRadius: 12, height: 42 }}
              />
            </div>
            <div>
              <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>הערות ניווט</p>
              <Input placeholder="לדוגמה: כניסה אחורית"
                value={form.address_notes || ''}
                onChange={e => set('address_notes', e.target.value)}
                style={{ background: '#f4f7fb', border: '1.5px solid #dce8f5', borderRadius: 12, height: 42 }}
              />
            </div>
          </div>
        </SectionCard>

        {/* Time */}
        <SectionCard>
          <Label className="text-sm font-bold mb-3 flex items-center gap-1" style={{ color: '#0f2b6b' }}>
            <Clock size={14} /> זמן ביצוע משוער
          </Label>
          <div className="flex gap-2 flex-wrap">
            {timeOptions.map(t => (
              <button key={t} onClick={() => set('estimated_time', t)}
                style={{ padding: '8px 16px', borderRadius: 24, fontSize: 13, fontWeight: 600, cursor: 'pointer', ...(form.estimated_time === t ? activeBtn : inactiveBtn) }}
              >{t === 'custom' ? '⌨️ מותאם' : t}</button>
            ))}
          </div>
          {form.estimated_time === 'custom' && (
            <input type="text" placeholder="לדוגמה: 3 שעות, יום שלם, שבוע..."
              value={form.custom_time} onChange={e => set('custom_time', e.target.value)}
              style={{ marginTop: 10, width: '100%', padding: '12px 14px', borderRadius: 12, background: '#f4f7fb', border: '1px solid #dce8f5', fontSize: 14, outline: 'none' }}
            />
          )}
        </SectionCard>

        {/* Requirements */}
        <SectionCard>
          <Label className="text-sm font-bold mb-3 flex items-center gap-1" style={{ color: '#0f2b6b' }}>
            <CheckSquare size={14} /> דרישות
          </Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { key: 'vehicle', label: '🚗 דרוש רכב' },
              { key: 'two_people', label: '👥 שני אנשים' },
              { key: 'experience', label: '🛠️ ניסיון' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setReq(key, !form.requirements[key])}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, textAlign: 'right', cursor: 'pointer', background: form.requirements[key] ? '#eff6ff' : '#f4f7fb', border: `1px solid ${form.requirements[key] ? '#bfdbfe' : '#dce8f5'}` }}
              >
                <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${form.requirements[key] ? '#1a6fd4' : '#cbd5e1'}`, background: form.requirements[key] ? '#1a6fd4' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {form.requirements[key] && <span style={{ color: 'white', fontSize: 11 }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: form.requirements[key] ? '#1e40af' : '#555' }}>{label}</span>
              </button>
            ))}
            <input type="text" placeholder="דרישה נוספת... (לדוגמה: ניסיון עם מוצרי חשמל)"
              value={form.requirements.custom || ''} onChange={e => setReq('custom', e.target.value)}
              style={{ padding: '12px 14px', borderRadius: 12, background: '#f4f7fb', border: '1px solid #dce8f5', fontSize: 13, outline: 'none' }}
            />
          </div>
        </SectionCard>

        {/* Payment Method */}
        <SectionCard>
          <Label className="text-sm font-bold mb-3 block" style={{ color: '#0f2b6b' }}>
            💳 אמצעי תשלום *
          </Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {PAYMENT_METHODS.map(pm => (
              <button key={pm.value} onClick={() => { set('payment_method', pm.value); setErrors(p => ({...p, payment_method: false})); }}
                style={{ flex: 1, padding: '12px 8px', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', ...(form.payment_method === pm.value ? activeBtn : { ...inactiveBtn, border: errors.payment_method ? '1.5px solid #ef4444' : '1px solid #dce8f5' }) }}
              >{pm.label}</button>
            ))}
          </div>
          {errors.payment_method && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>⚠️ יש לבחור אמצעי תשלום</p>}
        </SectionCard>

        {/* Submit */}
        {(() => {
          const isReady = !!(form.title && form.description && form.price && form.location_name && addressConfirmed && form.payment_method);
          return (
            <div style={{ marginTop: 8, paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}>
              <button
                onClick={handleSubmit}
                disabled={loading || !!checkingModeration}
                className="btn-tap"
                style={{
                  width: '100%', height: 60, borderRadius: 18, fontSize: 17, fontWeight: 900,
                  color: 'white', border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  background: isReady
                    ? 'linear-gradient(135deg, #059669, #047857)'
                    : 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
                  boxShadow: isReady
                    ? '0 8px 28px rgba(5,150,105,0.4)'
                    : '0 8px 28px rgba(26,111,212,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  marginBottom: 10, transition: 'background 0.35s ease, box-shadow 0.35s ease',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {loading
                  ? <><Loader2 size={22} className="animate-spin" /> מפרסם...</>
                  : isReady
                    ? (isEditMode ? <><Save size={20} />{isRepostMode ? 'שמור ופרסם שוב' : 'שמור שינויים'}</> : <><Zap size={20} />פרסם משימה עכשיו ✓</>)
                    : (isEditMode ? <><Save size={20} />{isRepostMode ? 'שמור ופרסם שוב' : 'שמור שינויים'}</> : <><Zap size={20} />פרסם משימה חדשה</>)
                }
              </button>
              {!isEditMode && <SocialProofBar />}
            </div>
          );
        })()}
      </div>
    </div>
  );
}