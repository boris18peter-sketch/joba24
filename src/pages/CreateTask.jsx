import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MapPin, Clock, Zap, CheckSquare, Loader2, Sparkles, Info, AlertTriangle, Save, Mic, MicOff, ChevronDown, ChevronUp, Plus, X, Play, CreditCard, Car, Wrench, Building2, Users, FileText } from 'lucide-react';
import SelectionSheet from '@/components/SelectionSheet';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { getRequirementCategories } from '@/lib/requirements';
import { useVerifyGuard } from '@/hooks/useVerifyGuard';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import BackButton from '@/components/BackButton';
import PageHeader from '@/components/PageHeader';
import { toast } from 'sonner';
import PriceSuggestion from '@/components/PriceSuggestion';

import { CATEGORIES, getCategoryLabel } from '@/lib/categories';
import { autoDetectCategory as configAutoDetect, matchesCategory, getCategoryKeywords, formatCategoryDetails, getSuggestedExtras } from '@/lib/taskFlowConfig';
import VerifyModal from '@/components/VerifyModal';
import LoginPromptModal from '@/components/LoginPromptModal';
import BuyCreditsModal from '@/components/BuyCreditsModal';
import { moderateText, moderateImage } from '@/hooks/useModeration';
import CategoryExtraFields from '@/components/CategoryExtraFields';
import LiveSearchOverlay from '@/components/LiveSearchOverlay';
import { WorkerPoolBanner, CategoryWorkerHint } from '@/components/WorkerPoolScanner';
import TaskChatInterface from '@/components/TaskChatInterface';

const DRAFT_KEY = 'joba24_create_task_draft';
const timeOptions = ['15m', '30m', '1h', '2h', 'custom'];
const EXPIRY_OPTIONS = [
   { label: 'ללא תוקף', hours: null, i18n_key: 'expiry_never' },
   { label: "30 דק'", hours: 0.5, i18n_key: 'expiry_30min' },
   { label: 'שעה', hours: 1, i18n_key: 'expiry_1hour' },
   { label: '2 שעות', hours: 2, i18n_key: 'expiry_2hours' },
   { label: '4 שעות', hours: 4, i18n_key: 'expiry_4hours' },
   { label: '6 שעות', hours: 6, i18n_key: 'expiry_6hours' },
   { label: 'יום', hours: 24, i18n_key: 'expiry_day' },
   { label: '2 ימים', hours: 48, i18n_key: 'expiry_2days' },
   { label: 'שבוע', hours: 168, i18n_key: 'expiry_week' },
   { label: 'מותאם', hours: 'custom', i18n_key: 'expiry_custom' },
];

const URGENCY_TAGS = [
  { value: 'immediate', emoji: '🔥', label: 'צריך עובד דחוף', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
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
      <span>הצטרף ל-<strong style={{ color: '#2563EB' }}>{completedCount}+</strong> משתמשים שכבר ביצעו משימות בהצלחה</span>
    </div>
  );
}

function MediaUploader({ images = [], videoUrl = '', onImagesChange, onVideoChange, t }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    const newImages = [...images];
    let newVideo = videoUrl;
    for (const file of Array.from(files)) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (file.type.startsWith('video/')) {
        newVideo = file_url;
        onVideoChange(file_url);
      } else {
        if (newImages.length < 4) newImages.push(file_url);
      }
    }
    onImagesChange(newImages);
    onVideoChange(newVideo);
    setUploading(false);
  };

  const removeImage = (idx) => onImagesChange(images.filter((_, i) => i !== idx));
  const hasMedia = images.length > 0 || videoUrl;

  return (
    <div>
      {hasMedia && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
          {images.map((url, i) => (
            <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', border: '1.5px solid #dce8f5' }}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={() => removeImage(i)} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={12} color="white" />
              </button>
            </div>
          ))}
          {videoUrl && (
            <div style={{ position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', background: '#000', border: '1.5px solid #dce8f5' }}>
              <video src={videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}><Play size={18} color="white" fill="white" /></div>
              <button onClick={() => onVideoChange('')} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={12} color="white" />
              </button>
            </div>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        style={{ width: '100%', borderRadius: 16, border: '2px dashed #bfdbfe', background: '#f0f7ff', cursor: uploading ? 'not-allowed' : 'pointer', padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        {uploading
          ? <Loader2 size={22} className="animate-spin" color="#1a6fd4" />
          : <Plus size={22} color="#1a6fd4" strokeWidth={2.5} />}
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1a6fd4' }}>{t('add_photos_video')}</span>
      </button>
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
    </div>
  );
}

function SectionCard({ children }) {
  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: 20, padding: '18px 16px', border: '1px solid var(--border-1)', boxShadow: '0 2px 12px rgba(26,111,212,0.06)' }}>
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
  requires_invoice: false,
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
  category_details: {},
};

const PAYMENT_METHODS = [
   { value: 'Cash', label: 'מזומן', i18n_key: 'cash' },
   { value: 'Bit', label: 'Bit', i18n_key: 'bit' },
   { value: 'PayBox', label: 'PayBox', i18n_key: 'paybox' },
   { value: 'Other', label: 'אחר', i18n_key: 'other' },
];

const TIME_OPTIONS = [
   { value: '15m', label: '15 דקות', i18n_key: 'time_15m' },
   { value: '30m', label: '30 דקות', i18n_key: 'time_30m' },
   { value: '1h', label: 'שעה', i18n_key: 'time_1h' },
   { value: '2h', label: 'שעתיים', i18n_key: 'time_2h' },
   { value: '3h', label: '3 שעות', i18n_key: 'time_3h' },
   { value: '4h', label: '4 שעות', i18n_key: 'time_4h' },
   { value: '6h', label: '6 שעות', i18n_key: 'time_6h' },
   { value: 'day', label: 'יום שלם', i18n_key: 'time_day' },
   { value: 'week', label: 'שבוע', i18n_key: 'time_week' },
   { value: 'custom', label: 'מותאם אישית', i18n_key: 'time_custom' },
];

export default function CreateTask() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { isAuthenticated, login } = useAuth();
  const editId = searchParams.get('editId');
  const isEditMode = !!editId;
  const isRepostMode = isEditMode && searchParams.get('repost') === '1';
  const isRepost = !isEditMode && searchParams.get('repost') === '1';
  const [loading, setLoading] = useState(false);
  const [searchingTaskId, setSearchingTaskId] = useState(null);
  const [searchingTaskTitle, setSearchingTaskTitle] = useState('');
  const [searchingTaskPrice, setSearchingTaskPrice] = useState(null);
  const [searchingTaskCategory, setSearchingTaskCategory] = useState('');
  const [searchingTaskLocation, setSearchingTaskLocation] = useState('');
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
  const [showRequirements, setShowRequirements] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [extraFieldsText, setExtraFieldsText] = useState('');
  const [categoryDetails, setCategoryDetails] = useState({});
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
        lat: searchParams.get('lat') ? parseFloat(searchParams.get('lat')) : null,
        lng: searchParams.get('lng') ? parseFloat(searchParams.get('lng')) : null,
        address_building: searchParams.get('address_building') || '',
        address_floor: searchParams.get('address_floor') || '',
        address_apartment: searchParams.get('address_apartment') || '',
        address_notes: searchParams.get('address_notes') || '',
        estimated_time: searchParams.get('estimated_time') || '1h',
        category: searchParams.get('category') || 'other',
        approval_mode: searchParams.get('approval_mode') || 'manual',
        payment_method: searchParams.get('payment_method') || '',
        urgency_tag: searchParams.get('urgency_tag') || '',
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
      requires_invoice: editTask.requires_invoice || false,
      custom_expiry_hours: '',
      category_details: editTask.category_details || {},
    });
    setCategoryDetails(editTask.category_details || {});
    setAddressConfirmed(!!(editTask.lat && editTask.lng));
  }, [editTask?.id]);
  const { gate, showVerify, onSuccess: onVerifySuccess, onClose: onVerifyClose } = useVerifyGuard(me);
  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const setReq = (key, val) => setForm(p => ({ ...p, requirements: { ...p.requirements, [key]: val } }));
  const [errors, setErrors] = useState({});
  const [showErrorBanner, setShowErrorBanner] = useState(false);
  const [moderationErrors, setModerationErrors] = useState({});
  const [checkingModeration, setCheckingModeration] = useState('');
  // Address is confirmed if we have a location (repost/edit pre-fills it, free text also accepted)
  const [addressConfirmed, setAddressConfirmed] = useState(!!form.location_name);

  const fieldRefs = {
    title: useRef(null),
    description: useRef(null),
    price: useRef(null),
    location_name: useRef(null),
    payment_method: useRef(null),
  };

  // Auto-save draft on form change (debounced 1s)
  useEffect(() => {
    if (isRepost || isEditMode) return;
    clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      const draftFields = { title: form.title, description: form.description, location_name: form.location_name, city: form.city, category: form.category, estimated_time: form.estimated_time, approval_mode: form.approval_mode };
      // Never persist price/bump settings — these must always be entered fresh
      // Only save if user has typed something meaningful
      if (form.title || form.description) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draftFields));
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2000);
      }
    }, 1000);
    return () => clearTimeout(draftTimerRef.current);
  }, [form.title, form.description, form.price, form.location_name, form.city, form.category, form.estimated_time, form.approval_mode, isRepost]);

  // Category keywords now live in taskFlowConfig.js — single source of truth
  const CATEGORY_KEYWORDS = Object.fromEntries(
    CATEGORIES.filter(c => c.value !== 'other').map(c => [c.value, getCategoryKeywords(c.value)])
  );

  // Check if text looks like gibberish (random key mashing)
  // Returns error string if looks like gibberish, null if ok
  const checkGibberish = (text, fieldLabel = 'הטקסט') => {
    if (!text || text.trim().length < 4) return null;
    const t = text.trim();
    // Too short overall
    if (t.length < 5) return null;
    // Check for very long runs of consonants with no spaces or vowels (Hebrew gibberish)
    const hebrewConsonants = /[בגדהוזחטיכלמנסעפצקרשתךםןף]/g;
    const matches = t.match(hebrewConsonants);
    const hebrewLetters = t.replace(/[^א-ת]/g, '');
    // Detect if the string is mostly random short sequences with no recognizable words
    const words = t.split(/\s+/).filter(w => w.length > 0);
    if (words.length > 0) {
      const avgLen = words.reduce((s, w) => s + w.length, 0) / words.length;
      // Hebrew words are usually 2-8 chars, gibberish is often 1-2 random chars
      const tinyWords = words.filter(w => w.replace(/[^א-ת]/g,'').length > 0 && w.replace(/[^א-ת]/g,'').length <= 1).length;
      const tinyRatio = words.length > 0 ? tinyWords / words.length : 0;
      if (tinyRatio > 0.65 && words.length >= 3) {
        return `${fieldLabel} נראה כמו קלט לא תקין. אנא תאר את הנדרש בצורה ברורה.`;
      }
    }
    // Check for runs of 5+ consecutive same/similar chars (lbgbmtz style)
    if (/(.)\1{4,}/.test(t)) {
      return `${fieldLabel} מכיל תווים חוזרים — אנא כתוב תיאור ברור.`;
    }
    // Check for all-consonant Hebrew with no vowel helpers (e.g. לבגבמצ)
    if (hebrewLetters.length >= 4) {
      const hebrewVowelLike = /[אויהא]/g;
      const vowelCount = (hebrewLetters.match(hebrewVowelLike) || []).length;
      const ratio = vowelCount / hebrewLetters.length;
      if (ratio < 0.05 && hebrewLetters.length > 6) {
        return `${fieldLabel} נראה כמו אותיות אקראיות. אנא כתוב תיאור שמובן לאחרים.`;
      }
    }
    return null;
  };

  // Auto-detect category from description text
  const autoDetectCategory = (description) => {
    if (!description || description.trim().length < 5) return null;
    const combined = description.toLowerCase();
    let bestCategory = null;
    let bestScore = 0;
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      const score = keywords.filter(kw => combined.includes(kw.toLowerCase())).length;
      if (score > bestScore) {
        bestScore = score;
        bestCategory = cat;
      }
    }
    return bestScore >= 1 ? bestCategory : null;
  };

  // Auto-generate title from description (first sentence or ~60 chars)
  const autoGenerateTitle = (description) => {
    if (!description) return '';
    const clean = description.trim();
    // Take first sentence (up to .!?\n or first 60 chars)
    const firstSentence = clean.split(/[.!?\n]/)[0].trim();
    if (firstSentence.length <= 60) return firstSentence;
    // Truncate at word boundary
    const truncated = firstSentence.substring(0, 60);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...';
  };

  // Check if the combined title+description matches the selected category
  // Returns error string if mismatch, null if ok
  const checkCategoryDescriptionMatch = (category, description, title = '') => {
    if (!category || category === 'other') return null;
    const keywords = CATEGORY_KEYWORDS[category];
    if (!keywords) return null;

    const combined = `${title} ${description}`.toLowerCase();
    // Must have some meaningful content
    if (combined.trim().length < 15) return null;

    // 1. Check if the combined text has ANY keyword from the chosen category
    const hasMatch = keywords.some(kw => combined.includes(kw.toLowerCase()));

    // 2. Check if the combined text strongly matches a DIFFERENT category (cross-category pollution)
    let detectedOtherCategory = null;
    if (!hasMatch) {
      for (const [otherCat, otherKws] of Object.entries(CATEGORY_KEYWORDS)) {
        if (otherCat === category) continue;
        const otherMatchCount = otherKws.filter(kw => combined.includes(kw.toLowerCase())).length;
        if (otherMatchCount >= 1) {
          detectedOtherCategory = otherCat;
          break;
        }
      }
    }

    if (!hasMatch) {
      const catLabel = CATEGORIES.find(c => c.value === category)?.label || category;
      if (detectedOtherCategory) {
        const detectedLabel = CATEGORIES.find(c => c.value === detectedOtherCategory)?.label || detectedOtherCategory;
        return `הכותרת והתיאור נראים כמו "${detectedLabel}", אבל הקטגוריה שנבחרה היא "${catLabel}". שנה את הקטגוריה לקטגוריה המתאימה, או עדכן את הכותרת והתיאור.`;
      }
      return `הכותרת והתיאור לא תואמים לקטגוריה "${catLabel}". כדי שנמצא לך עובד מתאים, אנא תאר את המשימה בהתאם לקטגוריה שבחרת.`;
    }
    return null;
  };

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
      const draftFields = { title: form.title, description: form.description, location_name: form.location_name, city: form.city, category: form.category, estimated_time: form.estimated_time, approval_mode: form.approval_mode, requirements: form.requirements, images: form.images, expiry_hours: form.expiry_hours, is_story: form.is_story };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftFields));
      setShowLoginPrompt(true);
      return;
    }
    doSubmit();
  };

  const doSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    let submitted = false;
    const newErrors = {};
    if (!form.description) newErrors.description = true;
    if (!form.price) newErrors.price = true;
    if (!form.location_name || !addressConfirmed) newErrors.location_name = true;
    if (!form.payment_method) newErrors.payment_method = true;

    // Edit mode: save & navigate
    if (isEditMode) {
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setShowErrorBanner(true);
        submittingRef.current = false;
        return;
      }
      // Gibberish check for edit mode too
      const tg = checkGibberish(form.title, 'הכותרת');
      const dg = checkGibberish(form.description, 'התיאור');
      if (tg || dg) {
        setModerationErrors({ title: tg || undefined, description: dg || undefined });
        setShowErrorBanner(true);
        submittingRef.current = false;
        return;
      }
      setLoading(true);
      const estimatedTime = form.estimated_time === 'custom' ? (form.custom_time || 'custom') : form.estimated_time;
      const expiryHoursEdit = form.expiry_hours === 'custom' ? (parseFloat(form.custom_expiry_hours) || null) : form.expiry_hours;
      const expires = expiryHoursEdit ? new Date(Date.now() + expiryHoursEdit * 60 * 60 * 1000).toISOString() : null;
      submittingRef.current = false;
      try {
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
        category_details: Object.keys(categoryDetails).length > 0 ? categoryDetails : undefined,
        expiry_duration_hours: expiryHoursEdit,
        expires_at: expires,
        images: form.images,
        video_url: form.video_url || undefined,
        requirements: form.requirements,
        payment_method: form.payment_method || undefined,
        urgency_tag: form.urgency_tag || undefined,
        requires_invoice: form.requires_invoice || false,
        ...(isRepostMode ? { status: 'OPEN', worker_id: null, worker_name: null, worker_status: null, expires_at: expires } : {}),
      });
      setLoading(false);
      submittingRef.current = false;
      toast.success(isRepostMode ? "הג'ובה פורסמה מחדש! ✅" : 'המשימה עודכנה! ✅');
      navigate(`/task/${editId}`);
      } catch (err) {
        setLoading(false);
        submittingRef.current = false;
        toast.error('תקלה בשמירה, נסה שוב');
      }
      return;
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShowErrorBanner(true);
      submittingRef.current = false;
      const order = ['description', 'price', 'location_name', 'payment_method'];
      const firstError = order.find(k => newErrors[k]);
      if (firstError && fieldRefs[firstError]?.current) {
        fieldRefs[firstError].current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const input = fieldRefs[firstError].current.querySelector?.('input,textarea');
        input?.focus();
      }
      return;
    }
    setShowErrorBanner(false);
    setErrors({});
    setModerationErrors({});
    setLoading(true);

    // Gibberish / meaningless content check (fast, no API) — description only
    const descGibberish = checkGibberish(form.description, 'התיאור');
    if (descGibberish) {
      setModerationErrors({ description: descGibberish });
      setShowErrorBanner(true);
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    // Final moderation checks — description only
    setCheckingModeration('submit');
    const descCheck = form.description ? await moderateText(form.description) : { flagged: false };
    setCheckingModeration('');
    
    if (descCheck.flagged) {
      setModerationErrors({ description: 'התיאור מכיל תוכן שאינו עומד בכללי הקהילה. אנא תקן כדי לפרסם.' });
      setShowErrorBanner(true);
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    // Auto-generated fields
    const autoTitle = autoGenerateTitle(form.description);
    // Auto-detect category if still "other"
    const detectedCat = form.category === 'other' ? autoDetectCategory(form.description) : null;
    const finalCategory = detectedCat || form.category || 'other';

    // Check category-description mismatch
    const mismatch = checkCategoryDescriptionMatch(finalCategory, form.description);
    if (mismatch) {
      setModerationErrors({ categoryMismatch: mismatch });
      setShowErrorBanner(true);
      setLoading(false);
      submittingRef.current = false;
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
        submittingRef.current = false;
        return;
      }
    }

    // Story credit check — client-side guard only (server creates task; story deduction is post-creation)
    if (form.is_story) {
      const currentCredits = me?.worker_credits ?? 0;
      if (currentCredits < 10) {
        setShowNoCreditsModal(true);
        setLoading(false);
        submittingRef.current = false;
        return;
      }
    }

    const expiryHours = form.expiry_hours === 'custom' ? (parseFloat(form.custom_expiry_hours) || null) : form.expiry_hours;
    const expires = expiryHours ? new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString() : null;
    const storyExpires = form.is_story ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined;
    const estimatedTime = form.estimated_time === 'custom' ? (form.custom_time || 'custom') : form.estimated_time;

    const created = await base44.entities.Task.create({
      payment_method: form.payment_method,
      title: autoTitle,
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
      category: finalCategory,
      category_details: Object.keys(categoryDetails).length > 0 ? categoryDetails : undefined,
      approval_mode: form.approval_mode,
      expiry_duration_hours: expiryHours || null,
      expires_at: expires,
      is_story: form.is_story,
      story_expires_at: storyExpires,
      images: form.images,
      video_url: form.video_url || undefined,
      requirements: form.requirements,
      status: 'OPEN',
      requires_invoice: form.requires_invoice || false,
      urgency_tag: form.urgency_tag || undefined,
      client_id: me?.id,
      client_name: me?.full_name,
      client_rating: me?.rating || 0,
      client_verified: me?.is_verified || false,
    });

    // Deduct story credits via backend (idempotent — safe to fire-and-forget)
    if (form.is_story && created?.id) {
      base44.functions.invoke('deductStoryCredits', { taskId: created.id, taskTitle: autoTitle }).catch(() => {});
    }
    submitted = true;
    setLoading(false);
    submittingRef.current = false;
    localStorage.removeItem(DRAFT_KEY);
    toast.success('המשימה פורסמה! ⚡');
    if (created?.id) {
      setSearchingTaskId(created.id);
      setSearchingTaskTitle(autoTitle);
      setSearchingTaskPrice(Number(form.price));
      setSearchingTaskCategory(finalCategory);
      setSearchingTaskLocation(form.location_name);
    } else {
      navigate('/');
    }
    if (!submitted) {
      // Ensure ref is reset if we returned early due to validation/moderation errors
      submittingRef.current = false;
    }
  };

  const activeBtn = { background: '#2563EB', color: 'white', border: 'none', boxShadow: '0 2px 8px rgba(37,99,235,0.25)' };
  const inactiveBtn = { background: 'var(--surface-3)', color: 'var(--text-2)', border: 'none' };

  // Publish from chat mode
  const handleChatPublish = async (chatFormData) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);

    try {
      if (isEditMode) {
        const estimatedTime = chatFormData.estimated_time === 'custom' 
          ? (chatFormData.custom_time || 'custom') 
          : (chatFormData.estimated_time || '1h');
        const expiryHoursEdit = chatFormData.expiry_hours === 'custom' 
          ? (parseFloat(chatFormData.custom_expiry_hours) || null) 
          : chatFormData.expiry_hours;
        const expires = expiryHoursEdit 
          ? new Date(Date.now() + expiryHoursEdit * 60 * 60 * 1000).toISOString() 
          : null;

        await base44.entities.Task.update(editId, {
          title: chatFormData.title,
          description: extraFieldsText
            ? (chatFormData.description ? chatFormData.description + '\n\n' + extraFieldsText : extraFieldsText)
            : chatFormData.description,
          price: hasActiveApplications ? editTask.price : Number(chatFormData.price),
          max_price: chatFormData.auto_bump_enabled && chatFormData.max_price ? Number(chatFormData.max_price) : undefined,
          auto_bump_enabled: chatFormData.auto_bump_enabled,
          location_name: chatFormData.location_name,
          city: chatFormData.city,
          lat: chatFormData.lat || undefined,
          lng: chatFormData.lng || undefined,
          address_building: chatFormData.address_building || undefined,
          address_floor: chatFormData.address_floor || undefined,
          address_apartment: chatFormData.address_apartment || undefined,
          address_notes: chatFormData.address_notes || undefined,
          estimated_time: estimatedTime,
          category: chatFormData.category || 'other',
          category_details: Object.keys(categoryDetails).length > 0 ? categoryDetails : (chatFormData.category_details || undefined),
          expiry_duration_hours: expiryHoursEdit,
          expires_at: expires,
          images: chatFormData.images,
          video_url: chatFormData.video_url || undefined,
          requirements: chatFormData.requirements || {},
          payment_method: chatFormData.payment_method || undefined,
          urgency_tag: chatFormData.urgency_tag || undefined,
          requires_invoice: chatFormData.requires_invoice || false,
          ...(isRepostMode ? { status: 'OPEN', worker_id: null, worker_name: null, worker_status: null, expires_at: expires } : {}),
        });
        setLoading(false);
        submittingRef.current = false;
        toast.success(isRepostMode ? "הג'ובה פורסמה מחדש! ✅" : 'המשימה עודכנה! ✅');
        navigate('/task/' + editId);
        return;
      }

      // Story credit check — guard only (actual deduction via backend after creation)
      if (chatFormData.is_story) {
        const currentCredits = me?.worker_credits ?? 0;
        if (currentCredits < 10) {
          setShowNoCreditsModal(true);
          setLoading(false);
          submittingRef.current = false;
          return;
        }
      }

      const expiryHours = chatFormData.expiry_hours === 'custom' 
        ? (parseFloat(chatFormData.custom_expiry_hours) || null) 
        : chatFormData.expiry_hours;
      const expires = expiryHours 
        ? new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString() 
        : null;
      const storyExpires = chatFormData.is_story 
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() 
        : undefined;
      const estimatedTime = chatFormData.estimated_time === 'custom' 
        ? (chatFormData.custom_time || 'custom') 
        : (chatFormData.estimated_time || '1h');

      const created = await base44.entities.Task.create({
        payment_method: chatFormData.payment_method || 'Cash',
        title: chatFormData.title,
        description: extraFieldsText
          ? (chatFormData.description ? chatFormData.description + '\n\n' + extraFieldsText : extraFieldsText)
          : chatFormData.description,
        price: Number(chatFormData.price),
        base_price: Number(chatFormData.price),
        max_price: chatFormData.auto_bump_enabled && chatFormData.max_price ? Number(chatFormData.max_price) : undefined,
        auto_bump_enabled: chatFormData.auto_bump_enabled,
        location_name: chatFormData.location_name,
        city: chatFormData.city,
        lat: chatFormData.lat || undefined,
        lng: chatFormData.lng || undefined,
        address_building: chatFormData.address_building || undefined,
        address_floor: chatFormData.address_floor || undefined,
        address_apartment: chatFormData.address_apartment || undefined,
        address_notes: chatFormData.address_notes || undefined,
        estimated_time: estimatedTime,
        category: chatFormData.category || 'other',
        category_details: Object.keys(categoryDetails).length > 0 ? categoryDetails : (chatFormData.category_details || undefined),
        approval_mode: 'manual',
        expiry_duration_hours: expiryHours || null,
        expires_at: expires,
        is_story: chatFormData.is_story,
        story_expires_at: storyExpires,
        images: chatFormData.images || [],
        video_url: chatFormData.video_url || undefined,
        requirements: chatFormData.requirements || {},
        status: 'OPEN',
        requires_invoice: chatFormData.requires_invoice || false,
        urgency_tag: chatFormData.urgency_tag || undefined,
        client_id: me?.id,
        client_name: me?.full_name,
        client_rating: me?.rating || 0,
        client_verified: me?.is_verified || false,
      });

      // Deduct story credits via backend
      if (chatFormData.is_story && created?.id) {
        base44.functions.invoke('deductStoryCredits', { taskId: created.id, taskTitle: chatFormData.title }).catch(() => {});
      }
      setLoading(false);
      submittingRef.current = false;
      localStorage.removeItem(DRAFT_KEY);
      toast.success('המשימה פורסמה! ⚡');

      if (created?.id) {
        setSearchingTaskId(created.id);
        setSearchingTaskTitle(chatFormData.title);
        setSearchingTaskPrice(Number(chatFormData.price));
        setSearchingTaskCategory(chatFormData.category || 'other');
        setSearchingTaskLocation(chatFormData.location_name);
      } else {
        navigate('/');
      }
    } catch (err) {
      setLoading(false);
      submittingRef.current = false;
      toast.error('תקלה בפרסום, נסה שוב');
    }
  };

  // Chat mode rendering — available in all modes (create, edit, repost)
  if (chatMode) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#f8fafc' }} dir="rtl">
        {showVerify && <VerifyModal onClose={onVerifyClose} onSuccess={onVerifySuccess} />}
        {showNoCreditsModal && <BuyCreditsModal creditsNeeded={10} onClose={() => setShowNoCreditsModal(false)} />}
        {showLoginPrompt && (
          <LoginPromptModal
            onLogin={() => { setShowLoginPrompt(false); login('/create-task'); }}
            onClose={() => setShowLoginPrompt(false)}
            type="publish"
          />
        )}
        {searchingTaskId ? (
          <LiveSearchOverlay
            taskId={searchingTaskId}
            taskTitle={searchingTaskTitle}
            taskPrice={searchingTaskPrice}
            taskCategory={searchingTaskCategory}
            taskLocation={searchingTaskLocation}
            onDismiss={() => setSearchingTaskId(null)}
          />
        ) : (
          <TaskChatInterface
            initialForm={form}
            isEditMode={isEditMode}
            editId={editId}
            onPublish={handleChatPublish}
            onSwitchToForm={() => setChatMode(false)}
          />
        )}
      </div>
    );
  }

  if (searchingTaskId) {
    return (
      <LiveSearchOverlay
        taskId={searchingTaskId}
        taskTitle={searchingTaskTitle}
        taskPrice={searchingTaskPrice}
        taskCategory={searchingTaskCategory}
        taskLocation={searchingTaskLocation}
        onDismiss={() => setSearchingTaskId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-1)' }} dir="rtl">
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
        const filled = [form.description, form.price, form.location_name && addressConfirmed, form.payment_method].filter(Boolean).length;
        const pct = Math.round((filled / 4) * 100);
        return (
          <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)' }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px 12px' }}>
              <BackButton style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)', boxShadow: 'none' }} iconColor="white" />
              <span style={{ fontWeight: 800, fontSize: 17, color: 'white', flex: 1 }}>
        {isRepostMode ? t('repost') : isEditMode ? t('edit_task_title') : isRepost ? t('repost') : t('publish_task_onboard_title')}
      </span>
              <button
                onClick={() => setChatMode(m => !m)}
                style={{
                  fontSize: 11, fontWeight: 700, color: 'white',
                  background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)',
                  borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                  whiteSpace: 'nowrap', boxShadow: 'none',
                }}
              >
                {chatMode ? '📋 טופס' : '💬 צ\'אט'}
              </button>
              {draftSaved && <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '4px 8px', fontSize: 11, color: 'white', fontWeight: 700 }}><Save size={11} /> {t('draft_saved')}</div>}
            </div>
            {/* Progress bar */}
            <div style={{ padding: '0 16px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{t('form_progress')}</span>
                <span style={{ fontSize: 10, color: pct === 100 ? '#4ade80' : 'rgba(255,255,255,0.7)', fontWeight: 800 }}>{pct}%{pct === 100 ? ' ✓ ' + t('ready_to_publish') : ''}</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#4ade80' : 'rgba(255,255,255,0.75)', borderRadius: 99, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          </div>
        );
      })()}

      <div className="px-4 py-4 space-y-4" style={{ paddingBottom: 'max(48px, env(safe-area-inset-bottom))' }}>
        {/* Draft restore indicator */}
        {!isRepost && !isEditMode && form.title && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#166534', fontWeight: 700 }}>
              <Save size={14} /> {t('draft_restored')}
            </div>
            <button onClick={() => { setForm(DEFAULT_FORM); localStorage.removeItem(DRAFT_KEY); }} style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>{t('delete_task')}</button>
          </div>
        )}

        {/* Error banner */}
        {showErrorBanner && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 16, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: '#dc2626', margin: 0, lineHeight: 1.6, fontWeight: 700 }}>
              {t('missing_fields_warning')}
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
            <strong>{t('important_note_title')}</strong> {t('important_note_body')}
          </p>
        </div>

        {/* Category */}
        <SectionCard>
          <Label className="text-sm font-bold mb-2 block" style={{ color: 'var(--text-1)' }}>קטגוריה</Label>
          <SelectionSheet
            value={form.category}
            options={CATEGORIES.map(c => ({ value: c.value, label: c.label }))}
            onChange={val => {
              set('category', val);
              // Re-validate mismatch immediately when category changes
              if (form.title || form.description) {
                const mismatch = checkCategoryDescriptionMatch(val, form.description, form.title);
                setModerationErrors(p => ({ ...p, categoryMismatch: mismatch }));
              }
            }}
          />
        </SectionCard>

        {/* Category mismatch warning — shown right below category picker */}
        {moderationErrors.categoryMismatch && (
          <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 14, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertTriangle size={15} color="#f97316" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: '#c2410c', margin: 0, lineHeight: 1.6, fontWeight: 600 }}>{moderationErrors.categoryMismatch}</p>
          </div>
        )}

        {/* Worker count hint — removed per design decision */}

        {/* Smart Category Extra Fields — right below category picker */}
        <CategoryExtraFields
          key={form.category}
          category={form.category}
          originLat={form.lat}
          originLng={form.lng}
          initialValues={isEditMode ? form.category_details : undefined}
          onChange={(data, text) => { setCategoryDetails(data); setExtraFieldsText(text); }}
        />

        {/* Description — the main input. Title and category are auto-generated from this. */}
        <div ref={fieldRefs.description}>
        <SectionCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Label className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>📝 תאר את המשימה *</Label>
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={transcribing}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', background: recording ? '#fee2e2' : '#eff6ff', color: recording ? '#dc2626' : '#1a6fd4' }}
            >
              {transcribing ? <Loader2 size={13} className="animate-spin" /> : recording ? <MicOff size={13} /> : <Mic size={13} />}
              {transcribing ? t('processing') : recording ? t('stop_recording') : t('record_description')}
            </button>
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, lineHeight: 1.5 }}>
            תאר מה צריך לעשות במילים שלך — הכותרת והקטגוריה ייווצרו אוטומטית. כלול: <strong>מה צריך, איפה, מתי, וכמה</strong>
          </div>
          {recording && (
            <div style={{ background: '#fee2e2', borderRadius: 10, padding: '8px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#dc2626', fontWeight: 700 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
              {t('recording_press_stop')}
            </div>
          )}
          <Textarea placeholder="לדוגמה: צריך צבעי לצבוע את הסלון ושני חדרי שינה בדירה ברחוב הרצל 15 תל אביב, הקירות לבנים ויש כבר צבע בבית. מוכן לשלם 800 ש״ח במזומן."
            value={form.description}
            onChange={e => { set('description', e.target.value); setErrors(p => ({...p, description: false})); setModerationErrors(p => ({...p, description: null, categoryMismatch: null})); }}
            onBlur={() => {
              checkFieldModeration('description', form.description);
              // Auto-detect category from description
              const detected = autoDetectCategory(form.description);
              if (detected && detected !== form.category && form.category === 'other') {
                set('category', detected);
              }
              const mismatch = checkCategoryDescriptionMatch(form.category, form.description, form.title);
              setModerationErrors(p => ({ ...p, categoryMismatch: mismatch }));
            }}
            style={{ background: 'var(--input-bg)', border: `1.5px solid ${errors.description || moderationErrors.description || moderationErrors.categoryMismatch ? '#ef4444' : 'var(--border-1)'}`, borderRadius: 12, resize: 'none' }} rows={5}
          />
          {checkingModeration === 'description' && <p style={{ fontSize: 11, color: '#1a6fd4', marginTop: 4 }}>🔍 בודק תוכן...</p>}
          {errors.description && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>⚠️ שדה חובה</p>}
          {moderationErrors.description && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>🛡️ {moderationErrors.description}</p>}

          {/* Auto-detected category chip */}
          {form.description && form.category && form.category !== 'other' && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>קטגוריה שזוהתה:</span>
              <span style={{
                background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1px solid #bfdbfe',
                borderRadius: 10, padding: '3px 10px', fontSize: 12, fontWeight: 700, color: '#1a6fd4',
              }}>
                🏷️ {CATEGORIES.find(c => c.value === form.category)?.label || form.category}
              </span>
            </div>
          )}
        </SectionCard>



        </div>
        {/* Images + Video */}
        <SectionCard>
          <Label className="text-sm font-bold mb-3 block" style={{ color: 'var(--text-1)' }}>{t('media')}</Label>
          <MediaUploader images={form.images} videoUrl={form.video_url} onImagesChange={imgs => set('images', imgs)} onVideoChange={url => set('video_url', url)} t={t} />
        </SectionCard>

        {/* Price */}
        <div ref={fieldRefs.price}>
        <SectionCard>
          <Label className="text-sm font-bold mb-2 block" style={{ color: 'var(--text-1)' }}>{t('price_label')} (₪) *</Label>
          <Input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="100"
            value={form.price}
            onChange={e => { if (hasActiveApplications) return; const v = e.target.value.replace(/[^0-9]/g, ''); set('price', v); setErrors(p => ({...p, price: false})); }}
            disabled={hasActiveApplications}
            style={{ background: 'var(--input-bg)', border: `1.5px solid ${errors.price ? '#ef4444' : 'var(--border-1)'}`, borderRadius: 12, height: 48, fontSize: 18, fontWeight: 800, marginBottom: 8, opacity: hasActiveApplications ? 0.5 : 1 }}
          />
          {hasActiveApplications && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 6 }}>⛔ לא ניתן לשנות מחיר — קיימות בקשות פעילות</p>}
          {errors.price && <p style={{ fontSize: 11, color: '#ef4444', marginBottom: 6 }}>⚠️ שדה חובה</p>}
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '10px 12px', marginBottom: 8, fontSize: 12, color: '#92400e', fontWeight: 600, lineHeight: 1.5 }}>
            <strong>המחיר שפורסם הוא הסכום הסופי שישולם לעובד — לא פחות ולא יותר.</strong> שני הצדדים מחויבים לכבד מחיר זה.
          </div>
          <PriceSuggestion category={form.category} estimatedTime={form.estimated_time} description={form.description} location={form.city || form.location_name} onAccept={p => set('price', String(p))} />

          {/* Auto bump */}
          <button type="button" onClick={() => set('auto_bump_enabled', !form.auto_bump_enabled)}
            style={{ marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, textAlign: 'right', cursor: 'pointer', background: form.auto_bump_enabled ? '#fffbeb' : 'var(--surface-3)', border: `1px solid ${form.auto_bump_enabled ? '#fcd34d' : 'var(--border-1)'}` }}
          >
            <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${form.auto_bump_enabled ? '#f59e0b' : '#cbd5e1'}`, background: form.auto_bump_enabled ? '#f59e0b' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {form.auto_bump_enabled && <span style={{ color: 'white', fontSize: 11 }}>✓</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>📈 העלאת מחיר אוטומטית</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2, lineHeight: 1.4 }}>המחיר יעלה מהמחיר שהגדרת לעיל עד למחיר המקסימלי, כל 5 דקות — כדי שהמשימה תהיה אטרקטיבית יותר ותמשוך בקשות. העלאת המחיר נעצרת אוטומטית ברגע שמגיעה בקשה ראשונה.</div>
            </div>
          </button>
          {form.auto_bump_enabled && (
            <div style={{ marginTop: 10, padding: '12px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 14 }}>
              <Label className="text-sm font-semibold block" style={{ color: '#92400e', marginBottom: 4 }}>מחיר מקסימלי (₪)</Label>
              <div style={{ fontSize: 11, color: '#b45309', marginBottom: 8, lineHeight: 1.4 }}>המחיר יעלה בהדרגה מ-₪{form.price || '?'} עד לסכום זה. ברגע שיגיע עובד שמוכן לבצע — המחיר יוקפא.</div>
              <Input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="250"
                value={form.max_price} onChange={e => set('max_price', e.target.value.replace(/[^0-9]/g, ''))}
                style={{ background: 'white', border: '1px solid #fcd34d', borderRadius: 12, height: 44, fontSize: 16, fontWeight: 700 }}
              />
            </div>
          )}
        </SectionCard>

        </div>
        {/* Expiry + Urgency */}
        <SectionCard>
          <Label className="text-sm font-bold mb-2 flex items-center gap-1" style={{ color: 'var(--text-1)' }}>
            <Clock size={14} /> תוקף המשימה
          </Label>
          <div style={{ marginBottom: 4 }}>
            <SelectionSheet
              value={form.expiry_hours === null ? 'null' : String(form.expiry_hours)}
              options={EXPIRY_OPTIONS.map(opt => ({ value: opt.hours === null ? 'null' : String(opt.hours), label: opt.label }))}
              onChange={v => set('expiry_hours', v === 'null' ? null : v === 'custom' ? 'custom' : parseFloat(v))}
            />
          </div>
          {form.expiry_hours === 'custom' && (
            <input type="number" min="0.5" step="0.5" placeholder="מספר שעות (לדוגמא: 3)"
              value={form.custom_expiry_hours} onChange={e => set('custom_expiry_hours', e.target.value)}
              style={{ width: '100%', marginTop: 8, padding: '10px 14px', borderRadius: 12, background: 'var(--input-bg)', border: '1px solid var(--border-1)', fontSize: 16, outline: 'none', boxSizing: 'border-box' }}
            />
          )}

          {/* Urgency tag */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border-1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <Zap size={14} color="#94a3b8" strokeWidth={1.8} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>מתי דרוש עובד?</span>
          </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {URGENCY_TAGS.map(tag => {
                const isActive = form.urgency_tag === tag.value;
                return (
                  <button key={tag.value}
                    onClick={() => set('urgency_tag', isActive ? '' : tag.value)}
                    style={{
                      padding: '10px 14px', borderRadius: 14, fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', textAlign: 'center',
                      background: isActive ? tag.bg : 'var(--surface-3)',
                      color: isActive ? tag.color : 'var(--text-2)',
                      border: isActive ? `1.5px solid ${tag.border}` : '1px solid var(--border-1)',
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
            background: form.is_story ? 'linear-gradient(135deg,#fdf4ff,#f3e8ff)' : 'var(--card-bg)',
            border: `2px solid ${form.is_story ? '#a855f7' : 'var(--border-1)'}`,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: form.is_story ? 'rgba(168,85,247,0.08)' : 'var(--surface-3)', borderRadius: 12, padding: '10px 12px' }}>
            <Zap size={18} color="#a855f7" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: form.is_story ? '#7e22ce' : '#0f2b6b' }}>חשיפה גבוהה פי 3 בשורת ה-Stories</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>המשימה תופיע למעלה בפיד למשך 24 שעות · עלות: <strong style={{color:'#7e22ce'}}>10 ג'ובות</strong></div>
            </div>
          </div>
        </div>}

        {/* Location */}
        <SectionCard>
          <Label className="text-sm font-bold mb-2 flex items-center gap-1" style={{ color: 'var(--text-1)' }}>
            <MapPin size={14} /> מיקום *
          </Label>
          <div ref={fieldRefs.location_name}>
            <AddressAutocomplete
              value={form.location_name}
              initialConfirmed={!!form.location_name}
              error={!!errors.location_name}
              onBlur={() => {
                if (form.location_name && !addressConfirmed) {
                  setErrors(p => ({ ...p, location_name: true }));
                }
              }}
              onSelect={({ location_name, city, lat, lng }) => {
                if (location_name) {
                  set('location_name', location_name);
                  set('city', city || '');
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
              <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, marginBottom: 4 }}>בניין / מספר בית</p>
              <Input placeholder="לדוגמה: 12"
                value={form.address_building || ''}
                onChange={e => set('address_building', e.target.value)}
                style={{ background: 'var(--input-bg)', border: '1.5px solid var(--border-1)', borderRadius: 12, height: 42 }}
              />
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, marginBottom: 4 }}>קומה</p>
              <Input placeholder="לדוגמה: 3"
                value={form.address_floor || ''}
                onChange={e => set('address_floor', e.target.value)}
                style={{ background: 'var(--input-bg)', border: '1.5px solid var(--border-1)', borderRadius: 12, height: 42 }}
              />
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, marginBottom: 4 }}>דירה</p>
              <Input placeholder="לדוגמה: 5"
                value={form.address_apartment || ''}
                onChange={e => set('address_apartment', e.target.value)}
                style={{ background: 'var(--input-bg)', border: '1.5px solid var(--border-1)', borderRadius: 12, height: 42 }}
              />
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, marginBottom: 4 }}>הערות ניווט</p>
              <Input placeholder="לדוגמה: כניסה אחורית"
                value={form.address_notes || ''}
                onChange={e => set('address_notes', e.target.value)}
                style={{ background: 'var(--input-bg)', border: '1.5px solid var(--border-1)', borderRadius: 12, height: 42 }}
              />
            </div>
          </div>
        </SectionCard>

        {/* Worker Pool Scanner banners removed */}

        {/* Time */}
        <SectionCard>
          <Label className="text-sm font-bold mb-2 flex items-center gap-1" style={{ color: 'var(--text-1)' }}>
            <Clock size={14} /> זמן ביצוע משוער
          </Label>
          <SelectionSheet
            value={form.estimated_time}
            options={TIME_OPTIONS}
            onChange={val => set('estimated_time', val)}
          />
          {form.estimated_time === 'custom' && (
            <input type="text" placeholder="לדוגמא: 3 שעות, יום שלם, שבוע..."
              value={form.custom_time} onChange={e => set('custom_time', e.target.value)}
              style={{ marginTop: 8, width: '100%', padding: '12px 14px', borderRadius: 12, background: 'var(--input-bg)', border: '1px solid var(--border-1)', fontSize: 16, outline: 'none', boxSizing: 'border-box', color: 'var(--text-1)' }}
            />
          )}
        </SectionCard>

        {/* Requirements */}
        <SectionCard>
          <button type="button" onClick={() => setShowRequirements(v => !v)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: showRequirements ? 14 : 0 }}>
            <div>
              <Label className="text-sm font-bold flex items-center gap-1" style={{ color: 'var(--text-1)', cursor: 'pointer', margin: 0 }}>
                <CheckSquare size={14} /> דרישות נוספות (לא חובה)
              </Label>
              <div style={{ fontSize: 11, color: '#f97316', fontWeight: 600, marginTop: 2 }}>⚠️ ככל שתוסיף יותר דרישות, פחות עובדים יוכלו להגיש בקשה</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {(() => { const count = Object.entries(form.requirements).filter(([k,v]) => k !== 'custom' && v === true).length + (form.requirements.custom ? 1 : 0) + (form.requires_invoice ? 1 : 0); return count > 0 ? <span style={{ fontSize: 11, fontWeight: 700, background: '#eff6ff', color: '#1a6fd4', borderRadius: 20, padding: '2px 8px', border: '1px solid #bfdbfe' }}>{count} נבחרו</span> : <span style={{ fontSize: 11, color: '#94a3b8' }}>לחץ להוספה</span>; })()}
              {showRequirements ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
            </div>
          </button>
          {showRequirements && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Invoice — always first */}
              <button type="button" onClick={() => set('requires_invoice', !form.requires_invoice)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, cursor: 'pointer', background: form.requires_invoice ? '#faf5ff' : 'var(--surface-3)', border: `1.5px solid ${form.requires_invoice ? '#d8b4fe' : 'var(--border-1)'}`, transition: 'all 0.15s' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: form.requires_invoice ? '#7c3aed18' : 'var(--input-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1.5px solid ${form.requires_invoice ? '#d8b4fe' : 'var(--border-1)'}`,
                }}>
                  <FileText size={18} color={form.requires_invoice ? '#7c3aed' : '#94a3b8'} />
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: form.requires_invoice ? '#7c3aed' : 'var(--text-1)' }}>📄 חשבונית מס</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 1 }}>דרוש מהעובד חשבונית מס — מתאים לעסקים ועצמאים</div>
                </div>
                <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${form.requires_invoice ? '#7c3aed' : 'var(--border-1)'}`, background: form.requires_invoice ? '#7c3aed' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {form.requires_invoice && <span style={{ color: 'white', fontSize: 11 }}>✓</span>}
                </div>
              </button>
              {getRequirementCategories(form.category).map(cat => (
                <div key={cat.label}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 8, letterSpacing: 0.3 }}>{cat.label}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {cat.items.map(({ key, label }) => {
                      const isSuggested = getSuggestedExtras(form.category).includes(key);
                      const isActive = !!form.requirements[key];
                      return (
                        <button key={key} onClick={() => setReq(key, !form.requirements[key])}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 12, textAlign: 'right', cursor: 'pointer', position: 'relative',
                            background: isActive ? 'rgba(59,130,246,0.08)' : isSuggested ? '#fffbeb' : 'var(--surface-3)',
                            border: `1px solid ${isActive ? '#bfdbfe' : isSuggested ? '#fde68a' : 'var(--border-1)'}`,
                            transition: 'all 0.15s' }}>
                          <div style={{ width: 16, height: 16, borderRadius: 5, border: `2px solid ${isActive ? '#1a6fd4' : isSuggested ? '#f59e0b' : 'var(--border-1)'}`, background: isActive ? '#1a6fd4' : isSuggested ? '#fffbeb' : 'var(--input-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {isActive && <span style={{ color: 'white', fontSize: 9, lineHeight: 1 }}>✓</span>}
                          </div>
                          <span style={{ fontSize: 12, fontWeight: isSuggested ? 700 : 600, color: isActive ? '#1e40af' : isSuggested ? '#92400e' : 'var(--text-2)' }}>{label}</span>
                          {isSuggested && !isActive && (
                            <span style={{ position: 'absolute', top: -6, left: -6, fontSize: 8, fontWeight: 800, color: 'white', background: '#f59e0b', borderRadius: 99, padding: '1px 5px', boxShadow: '0 1px 4px rgba(245,158,11,0.4)' }}>מומלץ</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>דרישה חופשית</div>
                <input type="text" placeholder="לדוגמא: ניסיון עם מוצרי חשמל..."
                  value={form.requirements.custom || ''} onChange={e => setReq('custom', e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 12, background: 'var(--input-bg)', border: '1px solid var(--border-1)', fontSize: 16, outline: 'none', boxSizing: 'border-box', color: 'var(--text-1)' }} />
              </div>
            </div>
          )}
        </SectionCard>

        {/* Payment Method */}
        <div ref={fieldRefs.payment_method}>
        <SectionCard>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <CreditCard size={14} color="#94a3b8" strokeWidth={1.8} />
            <Label className="text-sm font-bold" style={{ color: 'var(--text-1)', margin: 0 }}>איך תרצה לשלם על המשימה? *</Label>
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#166534', fontWeight: 600, lineHeight: 1.5 }}>
            💡 אין צורך להזין פרטי תשלום — רק בחר את השיטה בה תשלם לעובד בסיום המשימה
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
          {PAYMENT_METHODS.map(pm => (
            <button key={pm.value} onClick={() => { set('payment_method', form.payment_method === pm.value ? '' : pm.value); setErrors(p => ({...p, payment_method: false})); }}
              style={{ width: '100%', padding: '10px 4px', borderRadius: 10, fontSize: 13, fontWeight: form.payment_method === pm.value ? 700 : 500, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', ...(form.payment_method === pm.value ? activeBtn : { ...inactiveBtn, outline: errors.payment_method ? '1.5px solid #ef4444' : 'none' }) }}
            >{pm.label}</button>
          ))}
        </div>
        {errors.payment_method && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>יש לבחור אמצעי תשלום</p>}

        </SectionCard>
        </div>

        {/* Submit */}
        {(() => {
          const isReady = !!(form.description && form.price && form.location_name && addressConfirmed && form.payment_method);
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
                  ? <><Loader2 size={22} className="animate-spin" /> {t('publishing_btn')}</>
                  : isReady
                    ? (isEditMode ? <><Save size={20} />{isRepostMode ? t('save_and_repost') : t('save_changes')}</> : <><Zap size={20} />{t('publish_now')} ✓</>)
                    : (isEditMode ? <><Save size={20} />{isRepostMode ? t('save_and_repost') : t('save_changes')}</> : <><Zap size={20} />{t('publish_new_task')}</>)}
              </button>
              {!isEditMode && <SocialProofBar />}
            </div>
          );
        })()}
      </div>
    </div>
  );
}