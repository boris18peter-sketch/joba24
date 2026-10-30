import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MapPin, Clock, Zap, CheckSquare, Loader2, Sparkles, Info, AlertTriangle, Save, HelpCircle, Mic, MicOff, ChevronDown, ChevronUp, ChevronRight, Plus, X, Play, CreditCard, FileText, Phone, Calendar, ShieldCheck } from 'lucide-react';
import SelectionSheet from '@/components/SelectionSheet';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { getRequirementCategories, getActiveRequirements } from '@/lib/requirements';
import { useVerifyGuard } from '@/hooks/useVerifyGuard';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { markPublisherContext } from '@/lib/publisherContext';
import PageHeader from '@/components/PageHeader';
import { toast } from 'sonner';
import PriceSuggestion from '@/components/PriceSuggestion';
import { generateTaskTitle, autoGenerateTitle as heuristicTitle } from '@/lib/generateTaskTitle';

import { CATEGORIES, getCategoryLabel, isHourlyCategory } from '@/lib/categories';
import { autoDetectCategory as configAutoDetect, matchesCategory, getCategoryKeywords, formatCategoryDetails, getSuggestedExtras, getCategoryExtraFields, getCategoryConfig } from '@/lib/taskFlowConfig';
import useAutoTaskDescription from '@/hooks/useAutoTaskDescription';
import VerifyModal from '@/components/VerifyModal';
import LoginPromptModal from '@/components/LoginPromptModal';
import BuyCreditsModal from '@/components/BuyCreditsModal';
import { moderateText, moderateImage } from '@/hooks/useModeration';
import SelectedCategoryForm from '@/components/SelectedCategoryForm';
import { useBrandCategories } from '@/lib/brand/brandCategories';
import { useBrand } from '@/lib/brand/BrandProvider';
import { globalFormError, rootOf } from '@/lib/brand/categoryTree';
import CategoryServiceSelector from '@/components/CategoryServiceSelector';
import LiveSearchOverlay from '@/components/LiveSearchOverlay';
import { WorkerPoolBanner, CategoryWorkerHint } from '@/components/WorkerPoolScanner';
import { trackEvent } from '@/lib/analytics';
import { usePublishFunnel } from '@/hooks/usePublishFunnel';
import TaskChatInterface from '@/components/TaskChatInterface';

import { useJobaSettings } from '@/hooks/useJobaSettings';
import { isTaskFormFieldOn, taskFormSectionOrder, TASK_FORM_SECTIONS } from '@/lib/taskFormFields';
import PublishWizardNav from '@/components/publish/PublishWizardNav';
import PublishStepIntro from '@/components/publish/PublishStepIntro';
import PublishHelpVideo from '@/components/publish/PublishHelpVideo';
import WorkerAvailabilityIndicator from '@/components/WorkerAvailabilityIndicator';

const DRAFT_KEY = 'joba24_create_task_draft';
// Which step of the slider the publisher had reached. A visitor who is asked to
// sign in at the end of the form comes back to a NEW page load, and without
// this they landed on step one of a form they had already filled — the publish
// button they were about to press was several screens away from where they
// were standing.
const STEP_KEY = 'joba24_publish_step';
// The COMPLETE form, stashed the moment a visitor is asked to sign in before
// publishing and restored verbatim when they come back — so they resume at the
// exact point they were stopped instead of re-typing the task.
const PENDING_PUBLISH_KEY = 'joba24_pending_publish';
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
  { value: 'immediate', emoji: '🔥', label: 'צריך עובד דחוף', color: 'var(--color-danger)', bg: '#fef2f2', border: '#fca5a5', i18n_key: 'urgency_immediate' },
  { value: 'few_hours', emoji: '⏰', label: 'עובד לשעות הקרובות', color: 'var(--color-warning)', bg: '#fffbeb', border: '#fde68a', i18n_key: 'urgency_few_hours' },
  { value: 'evening',   emoji: '🌅', label: 'עובד לקראת הערב', color: '#7c3aed', bg: '#faf5ff', border: '#c4b5fd', i18n_key: 'urgency_evening' },
  { value: 'flexible',  emoji: '😌', label: 'לא לחוץ בזמן', color: 'var(--color-success)', bg: '#f0fdf4', border: '#86efac', i18n_key: 'urgency_flexible' },
];

function toLocalDatetimeInput(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SocialProofBar() {
  return (
    <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3)', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <span>איתות ישלח לכל העובדים הרלוונטיים באזור שלך - על בסיס קטגוריה, ניסיון והיסטוריית פעילות.</span>
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
        style={{ width: '100%', borderRadius: 16, border: '2px dashed var(--border-2)', background: '#f0f7ff', cursor: uploading ? 'not-allowed' : 'pointer', padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        {uploading
          ? <Loader2 size={22} className="animate-spin" color="var(--brand-primary)" />
          : <Plus size={22} color="var(--brand-primary)" strokeWidth={2.5} />}
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-primary)' }}>{t('add_photos_video')}</span>
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
  contactPhone: '',
  location_name: '',
  city: '',
  lat: null,
  lng: null,
  address_building: '',
  address_floor: '',
  address_apartment: '',
  address_notes: '',
  estimated_time: '1h',
  category: '',
  approval_mode: 'manual',
  expiry_hours: null,
  custom_time: '',
  is_story: false,
  images: [],
  video_url: '',
  requirements: { vehicle: false, two_people: false, experience: false },
  verification_required: false,
  payment_method: '',
  urgency_tag: '',
  scheduled_time: '',
  custom_expiry_hours: '',
  category_details: {},
  hourly_rate: '',
  hours: '',
};

const PAYMENT_METHODS = [
   { value: 'Cash', label: 'מזומן', i18n_key: 'cash' },
   { value: 'Bit', label: 'Bit', i18n_key: 'bit' },
   { value: 'PayBox', label: 'PayBox', i18n_key: 'paybox' },
   { value: 'Other', label: 'אחר', i18n_key: 'payment_other' },
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
  const { t, isRTL } = useLanguage();
  const { isAuthenticated, isGuest, login, enterGuestMode } = useAuth();
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

  // ── This session is publishing ────────────────────────────────────────────
  // The welcome-bonus celebration belongs to a visitor who came to find work.
  // A publisher — including a guest who signs in half-way through this form — is
  // on a different journey, and that popup must not land on top of it. Marked
  // here, at the one place every publish starts.
  useEffect(() => { markPublisherContext(); }, []);

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
  // The "?" beside the budget label. It holds the one line in this block that
  // is a RULE rather than a reassurance (both sides honour the agreed price),
  // so it is offered on demand instead of taking a row of its own.
  const [showPriceHelp, setShowPriceHelp] = useState(false);
  // BrandCategory is the authoritative source for the categories THIS Brand
  // offers (falls back to the platform catalogue). A brand-specific category is
  // persisted on the Task as 'other' with its brand key kept in category_details.
  const { brandId } = useBrand();
  const { categories: brandCategories, globalMap, taskCategoryFor, formFieldsFor, contentFor, isLoading: categoriesLoading } = useBrandCategories();
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
        category: searchParams.get('category') || '',
        approval_mode: searchParams.get('approval_mode') || 'manual',
        payment_method: searchParams.get('payment_method') || '',
        urgency_tag: searchParams.get('urgency_tag') || '',
      };
    }
    // Edit / repost mode: start clean — the editTask useEffect populates all
    // fields from the server.  Never load a stale draft here, it would
    // momentarily show wrong data and can race with the server load.
    if (isEditMode) return { ...DEFAULT_FORM };
    // A CAMPAIGN LINK — ?category=<key>, the form the ads point at.
    // The category the visitor arrived for WINS over a saved draft: they came
    // here for that trade, so the form must open on it and not on whatever they
    // happened to be drafting before. Every other field still comes from the
    // draft, so a returning visitor keeps what they had already typed.
    const linkedCategory = searchParams.get('category');
    if (linkedCategory) {
      let base = DEFAULT_FORM;
      try { const saved = localStorage.getItem(DRAFT_KEY); if (saved) base = { ...DEFAULT_FORM, ...JSON.parse(saved) }; } catch (_) {}
      return { ...base, category: linkedCategory, category_details: {} };
    }
    // Try to load saved draft
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return { ...DEFAULT_FORM, ...JSON.parse(saved) };
    } catch (_) {}
    return DEFAULT_FORM;
  });

  // ── The ROOT keys the picker can represent ────────────────────────────────
  // A campaign link may point at a ROOT — ?category=assemblies names the
  // Installations & Assembly niche, not one of the services under it. The value
  // handed to the form must be an actionable service, but the PICKER understands
  // a root key as well: it opens on that root and lists its services for the
  // visitor to choose. These are exactly the roots the picker draws — one per
  // actionable category this Brand offers — so a key in this set is never stale.
  const representableRoots = useMemo(() => {
    const set = new Set();
    for (const c of brandCategories) {
      const row = globalMap[c.value];
      const root = rootOf(row, globalMap) || row;
      if (root?.category_key) set.add(root.category_key);
    }
    return set;
  }, [brandCategories, globalMap]);

  // Rescue ONLY a stale category — one this Brand genuinely does not offer.
  // An empty value means "the user is still choosing" (parent picked, service
  // pending) and must never be overwritten: that reset is what silently snapped
  // the picker back to the first category in the list.
  //
  // A ROOT key is NOT stale, and rescuing it was a real fault: an
  // ?category=assemblies link was rejected here and replaced with
  // brandCategories[0] — the first service in the catalogue, a plumbing one —
  // so the Installations & Assembly link opened the plumbing form. The root is
  // kept, and the picker opens on it with its services ready to choose from.
  // Submission is unaffected: it still requires an actionable service key.
  useEffect(() => {
    if (categoriesLoading || isEditMode) return;
    // An EMPTY catalogue is "not loaded yet", never "nothing is offered": without
    // this, the moment between the brand resolving and its services arriving
    // wiped the visitor's category to ''.
    if (!brandCategories.length) return;
    if (!form.category) return;
    if (brandCategories.some(c => c.value === form.category)) return;
    if (representableRoots.has(form.category)) return;
    setForm(p => ({ ...p, category: brandCategories[0]?.value || '', category_details: {} }));
    setCategoryDetails({});
  }, [categoriesLoading, brandCategories.map(c => c.value).join('|'), representableRoots, isEditMode, form.category]);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  // Pre-fill contactPhone from user profile when not edit mode
  useEffect(() => {
    if (!me?.phone || isEditMode) return;
    setForm(p => ({ ...p, contactPhone: p.contactPhone || me.phone }));
  }, [me?.phone, isEditMode]);

  // Edit mode: load existing task
  const { data: editTask } = useQuery({
    queryKey: ['task-edit', editId],
    queryFn: () => base44.entities.Task.get(editId),
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
      category: editTask.category_details?.brand_category_key || editTask.category || 'other',
      contactPhone: editTask.contactPhone || '',
      approval_mode: 'manual',
      expiry_hours: editTask.expiry_duration_hours || null,
      images: editTask.images || [],
      video_url: editTask.video_url || '',
      requirements: editTask.requirements || { vehicle: false, two_people: false, experience: false },
      payment_method: editTask.payment_method || '',
      urgency_tag: editTask.urgency_tag || '',
      scheduled_time: editTask.scheduled_time || '',
      requires_invoice: editTask.requires_invoice || false,
      verification_required: editTask.verification_required || false,
      custom_expiry_hours: '',
      category_details: editTask.category_details || {},
      hourly_rate: editTask.category_details?.hourly_rate ? String(editTask.category_details.hourly_rate) : '',
      hours: editTask.category_details?.hours ? String(editTask.category_details.hours) : '',
    });
    setCategoryDetails(editTask.category_details || {});
    // An existing task already has a usable address — pre-confirm it so the user
    // isn't forced to re-select the address from the autocomplete list on every edit.
    setAddressConfirmed(!!editTask.location_name);
  }, [editTask]);
  const { gate, showVerify, onSuccess: onVerifySuccess, onClose: onVerifyClose } = useVerifyGuard(me);
  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  // Publishing goes through the trusted server writer: it derives the origin
  // Brand from the request host and resolves the actionable category itself, so
  // a child service (e.g. DJs) is persisted as itself and never becomes 'other'.
  const createTaskViaServer = async (payload) => {
    // A request that never settles leaves the publish button spinning for ever —
    // which is exactly what a dropped mobile connection produces. The timeout
    // turns that dead end into a normal, retryable error the user can see.
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('publish_timeout')), 45000);
    });
    try {
      const res = await Promise.race([
        base44.functions.invoke('createTask', { task: payload }),
        timeout,
      ]);
      if (res?.data?.error) throw new Error(res.data.message || res.data.error);
      const task = res?.data?.task;
      if (!task) throw new Error('publish_no_task');
      return task;
    } finally {
      clearTimeout(timer);
    }
  };
  const setReq = (key, val) => setForm(p => ({ ...p, requirements: { ...p.requirements, [key]: val } }));
  const isHourly = isHourlyCategory(form.category);
  // Distance between origin and destination for moving/delivery/transportation —
  // passed to PriceSuggestion so the AI can factor in fuel + travel time.
  const moveDistance = (() => {
    const oLat = form.lat, oLng = form.lng;
    const dLat = categoryDetails?.to_address_lat, dLng = categoryDetails?.to_address_lng;
    if (!oLat || !oLng || !dLat || !dLng) return null;
    const R = 6371;
    const dLatRad = (dLat - oLat) * Math.PI / 180;
    const dLngRad = (dLng - oLng) * Math.PI / 180;
    const a = Math.sin(dLatRad / 2) ** 2 + Math.cos(oLat * Math.PI / 180) * Math.cos(dLat * Math.PI / 180) * Math.sin(dLngRad / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  })();
  // Requirement labels — fed to the price engine so flagged requirements
  // (extra people, heavy lifting, certification…) affect the suggestion.
  const requirementsText = getActiveRequirements(form.requirements, form.category, t)
    .map(r => (r.value ? `${r.label}: ${r.value}` : r.label))
    .join(', ');
  const updateHourly = (field, val) => {
    setForm(p => {
      const next = { ...p, [field]: val };
      const rate = parseFloat(field === 'hourly_rate' ? val : next.hourly_rate) || 0;
      const hours = parseFloat(field === 'hours' ? val : next.hours) || 0;
      next.price = String(Math.round(rate * hours));
      return next;
    });
  };
  const getFinalCategoryDetails = () => {
    const cd = { ...(Object.keys(categoryDetails).length > 0 ? categoryDetails : {}) };
    cd.brand_category_key = form.category;
    if (isHourly && form.hourly_rate && form.hours) {
      cd.hourly_rate = Number(form.hourly_rate);
      cd.hours = parseFloat(form.hours);
      cd.pricing_type = 'hourly';
    }
    return Object.keys(cd).length > 0 ? cd : undefined;
  };

  // ── The description follows the publisher's own answers ─────────────────────
  // Choosing details in the category form is enough to write a natural Hebrew
  // sentence into the description: no AI call, no server round trip, no new
  // state and no new database field — it is the SAME description field, written
  // through the form's own setter, so it becomes part of the draft exactly like
  // typed text does. The moment the publisher edits the text themselves the hook
  // stops writing, and "update from my choices" is the one deliberate way back.
  const categoryFormFields = useMemo(
    () => getCategoryExtraFields(form.category),
    [form.category],
  );
  const autoDescription = useAutoTaskDescription({
    // The stable key chooses the sentence; the label only names the fault.
    categoryKey: form.category,
    categoryLabel: getCategoryConfig(form.category)?.label,
    fields: categoryFormFields,
    values: categoryDetails,
    description: form.description,
    onApply: (value) => setForm(p => (p.description === value ? p : { ...p, description: value })),
  });

  // ── Schedule ↔ price synchronization ──
  const hasScheduleField = getCategoryExtraFields(form.category).some(f => f.type === 'schedule');
  const scheduleSlots = categoryDetails?.schedule;
  const scheduleMinutes = (() => {
    if (!Array.isArray(scheduleSlots) || scheduleSlots.length === 0) return null;
    let total = 0;
    for (const slot of scheduleSlots) {
      const [sh, sm] = (slot.start || '').split(':').map(Number);
      const [eh, em] = (slot.end || '').split(':').map(Number);
      if (isNaN(sh) || isNaN(eh)) continue;
      total += (eh * 60 + em) - (sh * 60 + sm);
    }
    return total > 0 ? total : null;
  })();
  const scheduleHours = scheduleMinutes != null ? scheduleMinutes / 60 : null;
  const scheduleDriven = isHourly && hasScheduleField && scheduleHours != null;
  const formatDuration = (minutes) => {
    if (minutes == null) return '';
    if (minutes < 60) return `${minutes} ${t('ct_dur_minutes')}`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return h === 1 ? t('ct_dur_hour') : `${h} ${t('ct_dur_hours')}`;
    return `${h} ${t('ct_dur_hours')} ${m} ${t('ct_dur_minutes')}`;
  };
  // Auto-sync: schedule → hours → price (hourly categories only)
  useEffect(() => {
    if (!scheduleDriven) return;
    const rounded = Math.round(scheduleHours * 100) / 100;
    if (parseFloat(form.hours) !== rounded) {
      updateHourly('hours', String(rounded));
    }
  }, [scheduleHours, scheduleDriven]);
  // Auto-derive scheduled_time from the earliest schedule slot
  useEffect(() => {
    if (!hasScheduleField || !Array.isArray(scheduleSlots) || scheduleSlots.length === 0) return;
    const first = [...scheduleSlots].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0];
    const dt = new Date(`${first.date}T${first.start}:00`);
    if (!isNaN(dt.getTime())) {
      set('scheduled_time', dt.toISOString());
    }
  }, [hasScheduleField, scheduleSlots]);
  // ── Admin control over this form ───────────────────────────────────────────
  // The dashboard can switch any field off. A switched-off field must be both
  // invisible AND not required — otherwise the admin removes a question and the
  // publish button still refuses, with nothing left on screen to fill in.
  const { settings: jobaSettings } = useJobaSettings();
  const fieldOn = (key) => isTaskFormFieldOn(jobaSettings, key);

  // ── The order the admin set for the form's sections ──────────────────────
  // Each section registers itself into `sections` exactly where it is written
  // below, and the form then renders them in `sectionOrder`. The blocks stay in
  // source order on purpose: registration and rendering are two halves of one
  // list, so a section can never be rendered twice or silently forgotten.
  const sections = {};
  const sectionOrder = taskFormSectionOrder(jobaSettings);

  // ── FORM STYLE — chosen by the admin in the dashboard ────────────────────
  // 'slider' shows the SAME form one section at a time; 'classic' keeps the
  // single long form. Both render the same blocks, in the same admin order,
  // with the same switches — so flipping the style can never change which
  // questions are asked, only how they are presented.
  const isSliderForm = jobaSettings?.task_form_style === 'slider';
  // Picked up from the last session so a sign-in (or any reload) puts the
  // publisher back on the step they were on, not at the beginning. Only when
  // there is still work saved — a leftover step with no task behind it would
  // drop someone onto the last screen of an empty form.
  const [stepIdx, setStepIdx] = useState(() => {
    try {
      const hasWork = localStorage.getItem(DRAFT_KEY) || localStorage.getItem(PENDING_PUBLISH_KEY);
      const saved = parseInt(localStorage.getItem(STEP_KEY), 10);
      return hasWork && Number.isFinite(saved) && saved > 0 ? saved : 0;
    } catch (_) { return 0; }
  });

  // Remember it, so the step survives the page load that a login causes. Never
  // for editing or reposting: those open the form fresh on purpose.
  useEffect(() => {
    if (!isSliderForm || isEditMode || isRepost) return;
    try { localStorage.setItem(STEP_KEY, String(stepIdx)); } catch (_) { /* ignore */ }
  }, [stepIdx, isSliderForm, isEditMode, isRepost]);

  // A step per section the admin left switched ON. The 'schedule' card holds
  // three separate questions, so it stands as long as ANY of them is on —
  // exactly the rule the card itself follows, which is what stops the slider
  // from ever showing an empty step.
  const STEP_CONTAINERS = { schedule: ['expiry', 'urgency', 'exact_datetime'] };
  const wizardSectionKeys = sectionOrder.filter(key =>
    (STEP_CONTAINERS[key] || [key]).some(fieldOn));
  // Step 0 is the service choice — its own card, outside the section list.
  const wizardTotal = 1 + wizardSectionKeys.length;
  const wizardKey = stepIdx > 0 ? wizardSectionKeys[stepIdx - 1] : null;

  const wizardScrollRef = useRef(null);
  // A new step starts at the top: the previous step's scroll position would
  // otherwise leave the new question cut in half.
  useEffect(() => {
    if (isSliderForm) wizardScrollRef.current?.scrollTo({ top: 0 });
  }, [stepIdx, isSliderForm]);

  // The admin can turn a section off while a publisher is mid-form; the step
  // list shrinks under them, so the index is pulled back to a real step.
  useEffect(() => {
    if (stepIdx > wizardTotal - 1) setStepIdx(Math.max(0, wizardTotal - 1));
  }, [wizardTotal, stepIdx]);

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
    contactPhone: useRef(null),
    categoryForm: useRef(null),
    categoryPicker: useRef(null),
    publishBtn: useRef(null),
  };

  // ── Resume after sign-in ──────────────────────────────────────────────────
  // A visitor may fill the whole form and only then be asked to sign in (the
  // PUBLISH button is the one action that requires an account). The complete
  // form is restored and the page scrolls straight back to the publish button,
  // so they continue from exactly where they were stopped.
  const [resumePublish, setResumePublish] = useState(false);
  useEffect(() => {
    if (!isAuthenticated || isEditMode || isRepost) return;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(PENDING_PUBLISH_KEY) || 'null'); } catch (_) { saved = null; }
    if (!saved) return;
    localStorage.removeItem(PENDING_PUBLISH_KEY);
    setForm({ ...DEFAULT_FORM, ...saved });
    if (saved.category_details) setCategoryDetails(saved.category_details);
    if (saved.location_name) setAddressConfirmed(true);
    setResumePublish(true);
  }, [isAuthenticated, isEditMode, isRepost]);

  useEffect(() => {
    if (!resumePublish || categoriesLoading) return;
    const timer = setTimeout(() => {
      fieldRefs.publishBtn.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setResumePublish(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [resumePublish, categoriesLoading]);

  // Auto-save draft on form change (debounced 1s)
  useEffect(() => {
    if (isRepost || isEditMode) return;
    clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      const draftFields = { title: form.title, description: form.description, location_name: form.location_name, city: form.city, category: form.category, estimated_time: form.estimated_time, approval_mode: form.approval_mode, scheduled_time: form.scheduled_time };
      // Never persist price/bump settings — these must always be entered fresh
      // Only save if user has typed something meaningful
      if (form.title || form.description) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draftFields));
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2000);
      }
    }, 1000);
    return () => clearTimeout(draftTimerRef.current);
  }, [form.title, form.description, form.price, form.location_name, form.city, form.category, form.estimated_time, form.approval_mode, form.scheduled_time, isRepost]);

  // Category keywords now live in taskFlowConfig.js — single source of truth
  const CATEGORY_KEYWORDS = Object.fromEntries(
    CATEGORIES.filter(c => c.value !== 'other').map(c => [c.value, getCategoryKeywords(c.value)])
  );

  // Check if text looks like gibberish (random key mashing)
  // Returns error string if looks like gibberish, null if ok
  const checkGibberish = (text, fieldLabel) => {
    fieldLabel = fieldLabel || t('ct_field_text');
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
        return t('ct_gibberish_invalid', { field: fieldLabel });
      }
    }
    // Check for runs of 5+ consecutive same/similar chars (lbgbmtz style)
    if (/(.)\1{4,}/.test(t)) {
      return t('ct_gibberish_repeat', { field: fieldLabel });
    }
    // Check for all-consonant Hebrew with no vowel helpers (e.g. לבגבמצ)
    if (hebrewLetters.length >= 4) {
      const hebrewVowelLike = /[אויהא]/g;
      const vowelCount = (hebrewLetters.match(hebrewVowelLike) || []).length;
      const ratio = vowelCount / hebrewLetters.length;
      if (ratio < 0.05 && hebrewLetters.length > 6) {
        return t('ct_gibberish_random', { field: fieldLabel });
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

  // Suggested title generated in the background from the full description.
  // The LLM reads the ENTIRE description and returns a concise title that
  // captures all the requested work — so a multi-task post (e.g. a Facebook
  // post listing several jobs) isn't truncated to just its first line.
  const [suggestedTitle, setSuggestedTitle] = useState('');
  const titleTimerRef = useRef(null);
  useEffect(() => {
    if (isEditMode || isRepost) return;
    clearTimeout(titleTimerRef.current);
    if (!form.description || form.description.trim().length < 8) {
      setSuggestedTitle('');
      return;
    }
    // Clear any stale title from a previous description so a quick submit
    // never uses a title that no longer matches the (now richer) description.
    setSuggestedTitle('');
    let cancelled = false;
    const currentDesc = form.description;
    titleTimerRef.current = setTimeout(async () => {
      const title = await generateTaskTitle(currentDesc);
      if (!cancelled) setSuggestedTitle(title);
    }, 1200);
    return () => { cancelled = true; clearTimeout(titleTimerRef.current); };
  }, [form.description, isEditMode, isRepost]);

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
      const catLabel = getCategoryLabel(category, t);
      if (detectedOtherCategory) {
        const detectedLabel = getCategoryLabel(detectedOtherCategory, t);
        return t('ct_cat_mismatch_detected', { detected: detectedLabel, selected: catLabel });
      }
      return t('ct_cat_mismatch_generic', { selected: catLabel });
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
      setModerationErrors(p => ({ ...p, [field]: t('ct_mod_field') }));
    } else {
      setModerationErrors(p => ({ ...p, [field]: null }));
    }
  };

  // Publisher funnel — the publisher opened the create-task flow.
  // 'session' dedup: fires once per app session, not on every rerender.
  useEffect(() => {
    trackEvent('task_creation_started', {}, { dedupeKey: 'create-task' });
  }, []);

  // ── Required-field validation ──────────────────────────────────────────────
  // Shared by the pre-sign-in gate and the submit path, so "the form is
  // complete" can never mean two different things depending on whether the
  // person filling it has an account.
  // The fields that stand between the user and publishing, in the order they
  // appear on screen. Only fields the admin left switched ON qualify, so a field
  // removed in the dashboard can never block a publish. ONE definition, used by
  // the required-field check, the progress bar and the publish button alike.
  const requiredFieldOrder = () =>
    ['description', 'location_name', 'price', 'payment_method', 'contactPhone'].filter(fieldOn);

  // Is a required field actually filled? Used by every readiness indicator.
  const requiredValues = () => ({
    description: !!form.description,
    location_name: !!(form.location_name && addressConfirmed),
    price: !!form.price,
    payment_method: !!form.payment_method,
    contactPhone: (form.contactPhone || '').replace(/\D/g, '').length >= 9,
  });

  // ── Can the slider move on? ───────────────────────────────────────────────
  // Only the fields that already block publishing can block a step, so the
  // slider never invents a rule the classic form does not have: everything the
  // admin marked optional stays optional, and every step is still reachable.
  // What still holds this step, written the way the bar shows it. An empty
  // string means the step is done and the bar may move on — so the button's
  // disabled state and the sentence under it can never disagree.
  const wizardMissing = (() => {
    if (stepIdx === 0) return form.category ? '' : 'בחירת סוג השירות';
    if (!wizardKey) return '';
    if (!requiredFieldOrder().includes(wizardKey)) return '';
    if (requiredValues()[wizardKey]) return '';
    return TASK_FORM_SECTIONS.find(s => s.key === wizardKey)?.label || 'מילוי השדה';
  })();
  const wizardCanAdvance = !wizardMissing;

  const collectRequiredErrors = () => {
    const errs = {};
    const values = requiredValues();
    requiredFieldOrder().forEach(key => { if (!values[key]) errs[key] = true; });
    return errs;
  };

  // ── Publisher funnel — how far THIS attempt got, and where it stopped ─────
  // The step is DERIVED from the form's own state and reported as one value
  // rather than fired from eight different places in the markup: a derived step
  // cannot be missed because somebody forgot a call site. The ladder is strictly
  // cumulative (each step implies the ones above it) and the hook only ever
  // moves forward, so clearing a field again cannot walk the funnel backwards.
  // Reported for signed-out visitors too — that is the whole point, since the
  // campaign sends people here before they have an account.
  const trackFunnel = usePublishFunnel();

  // ── EVERY STEP THAT IS TRUE, IN ORDER — NEVER ONLY THE FURTHEST ONE ───────
  // This used to compute a SINGLE step: the furthest condition that happened to
  // be met, evaluated top-down. That silently lost whole steps. The address
  // check sat above the description check, so the moment a publisher confirmed
  // their address the ladder answered 'location' — and it kept answering
  // 'location' after they wrote the description, because the address was still
  // confirmed. The description, the field that takes the most effort in the
  // entire form, was therefore recorded ZERO times in the live data while
  // 'location' was recorded normally. That is a tracking fault, not a drop-off.
  //
  // The ladder is now built as an ascending list of every step whose condition
  // holds. The hook fires them in order and the server keeps the highest, so a
  // step that is satisfied later than a higher one is still recorded when it
  // arrives, and no step can ever be skipped by the order of the checks below.
  //
  // 'opened' is ALWAYS first and unconditional. A campaign link prefills the
  // category, so the old single-step version reported 'category' on the very
  // first pass and 'opened' was never sent at all — which is why the entry step
  // of the funnel read almost empty while the second step was full.
  const funnelSteps = (() => {
    const phoneOk = (form.contactPhone || '').replace(/\D/g, '').length >= 9;
    const pricingOk = !!(form.price && form.payment_method);
    const steps = ['opened'];
    if (form.category) steps.push('category');
    // The description is the step, NOT the title: the title is a suggestion
    // held in its own state and is not required, so requiring it filed every
    // attempt as "stopped at the category". The description is also written
    // automatically from the category answers — that text IS the description,
    // so it counts exactly like typed text does.
    if (form.description) steps.push('details');
    if (form.location_name && addressConfirmed) steps.push('location');
    if (pricingOk) steps.push('pricing');
    if (pricingOk && phoneOk) steps.push('contact');
    if (requiredFieldOrder().every(k => requiredValues()[k])) steps.push('ready');
    return steps;
  })();
  // The dep is the joined list, so the effect runs whenever the SET of satisfied
  // steps changes — not on every keystroke in an unrelated field.
  const funnelKey = funnelSteps.join(',');
  useEffect(() => {
    funnelSteps.forEach(step => trackFunnel(step, {
      category: form.category || undefined,
      city: form.city || undefined,
      has_account: isAuthenticated,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funnelKey]);

  const focusFirstMissingField = (errs) => {
    const first = requiredFieldOrder().find(k => errs[k]);
    if (!first || !fieldRefs[first]?.current) return;
    fieldRefs[first].current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    fieldRefs[first].current.querySelector?.('input,textarea')?.focus();
  };
  const showRequiredErrors = (errs) => {
    setErrors(errs);
    setShowErrorBanner(true);
    // In the slider the missing field is usually on another step, so scrolling
    // would land on a step the publisher cannot see. Jumping to the step that
    // holds it is the same behaviour, expressed in the form's own terms.
    if (isSliderForm) {
      const first = requiredFieldOrder().find(k => errs[k]);
      const target = wizardSectionKeys.indexOf(first);
      if (target >= 0) { setStepIdx(target + 1); return; }
    }
    focusFirstMissingField(errs);
  };
  const scrollToCategoryForm = () => {
    setErrors({ categoryForm: true });
    setShowErrorBanner(true);
    if (isSliderForm) {
      const target = wizardSectionKeys.indexOf('category_form');
      if (target >= 0) { setStepIdx(target + 1); return; }
    }
    fieldRefs.categoryForm.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleSubmit = () => {
    // A visitor must be able to COMPLETE the form before being asked to sign in.
    // Prompting earlier is a dead end — they sign in and still cannot publish —
    // so every required field is checked first, and while one is missing the
    // user is scrolled straight to it instead of being sent to the login popup.
    if (categoriesLoading) return;
    if (!form.category || (!isEditMode && !brandCategories.some(c => c.value === form.category))) {
      // Nothing filled in yet? The service choice IS the missing field, so that
      // is where the user is taken — never a toast they might not even see.
      setShowErrorBanner(true);
      fieldRefs.categoryPicker.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast.error('יש לבחור שירות זמין במותג');
      return;
    }
    const formError = globalFormError(formFieldsFor(form.category), categoryDetails);
    if (formError) {
      scrollToCategoryForm();
      toast.error(formError);
      return;
    }
    const requiredErrors = collectRequiredErrors();
    if (Object.keys(requiredErrors).length > 0) {
      showRequiredErrors(requiredErrors);
      return;
    }
    if (form.auto_bump_enabled && form.max_price && Number(form.max_price) <= Number(form.price)) {
      toast.error(t('ct_max_err'));
      return;
    }
    // The form is complete — the publisher funnel's mid-step. Fired for
    // signed-out visitors too, so near-publishers can be retargeted.
    trackEvent('task_form_completed', { category: form.category, city: form.city }, { dedupeKey: 'task-form' });
    if (!isAuthenticated) {
      // Everything is filled — the account is the only thing still missing.
      // Stash the WHOLE form so signing in brings them back to this exact state.
      try { localStorage.setItem(PENDING_PUBLISH_KEY, JSON.stringify(form)); } catch (_) {}
      setShowLoginPrompt(true);
      return;
    }
    doSubmit();
  };

  const doSubmit = async () => {
    if (submittingRef.current) return;
    if (categoriesLoading || (!isEditMode && !brandCategories.some(c => c.value === form.category))) {
      toast.error('יש לבחור שירות זמין במותג'); return;
    }
    const formError = globalFormError(formFieldsFor(form.category), categoryDetails);
    if (formError) {
      // A required question in the category form is still empty — mark the whole
      // section red and take the user straight to it.
      setErrors({ categoryForm: true });
      setShowErrorBanner(true);
      toast.error(formError);
      fieldRefs.categoryForm.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    submittingRef.current = true;
    let submitted = false;
    const newErrors = collectRequiredErrors();
    if (form.auto_bump_enabled && form.max_price && Number(form.max_price) <= Number(form.price)) {
      newErrors.max_price = true;
      toast.error(t('ct_max_err'));
      submittingRef.current = false;
      return;
    }

    // Edit mode: save & navigate (but NOT repost mode — repost creates a new task)
    if (isEditMode && !isRepostMode) {
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setShowErrorBanner(true);
        submittingRef.current = false;
        return;
      }
      // Gibberish check for edit mode too
      const tg = checkGibberish(form.title, t('ct_field_title'));
      const dg = checkGibberish(form.description, t('ct_field_desc'));
      if (tg || dg) {
        setModerationErrors({ title: tg || undefined, description: dg || undefined });
        setShowErrorBanner(true);
        submittingRef.current = false;
        return;
      }
      setLoading(true);
      const expiryHoursEdit = form.expiry_hours === 'custom' ? (parseFloat(form.custom_expiry_hours) || null) : form.expiry_hours;
      const expires = expiryHoursEdit ? new Date(Date.now() + expiryHoursEdit * 60 * 60 * 1000).toISOString() : null;
      submittingRef.current = false;
      try {
      await base44.entities.Task.update(editId, {
        title: form.title,
        description: form.description,
        contactPhone: form.contactPhone || undefined,
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
        category: taskCategoryFor(form.category),
        category_details: getFinalCategoryDetails(),
        expiry_duration_hours: expiryHoursEdit,
        expires_at: expires,
        images: form.images,
        video_url: form.video_url || undefined,
        requirements: form.requirements,
        payment_method: form.payment_method || undefined,
        urgency_tag: form.urgency_tag || undefined,
        scheduled_time: form.scheduled_time || undefined,
        requires_invoice: form.requires_invoice || false,
        verification_required: form.verification_required || false,
        ...(isRepostMode ? { status: 'OPEN', worker_id: null, worker_name: null, worker_status: null, expires_at: expires } : {}),
        });
      setLoading(false);
      submittingRef.current = false;
      toast.success(isRepostMode ? t('ct_repost_ok') : t('ct_edit_ok'));
      // Navigate to the main feed with the task card highlighted (same highlight
      // animation used after publishing a new task) — no scanning popups on edit.
      navigate('/?newTaskId=' + editId);
      } catch (err) {
        setLoading(false);
        submittingRef.current = false;
        toast.error(t('ct_save_err'));
      }
      return;
    }
    if (Object.keys(newErrors).length > 0) {
      showRequiredErrors(newErrors);
      submittingRef.current = false;
      return;
    }
    setShowErrorBanner(false);
    setErrors({});
    setModerationErrors({});
    setLoading(true);

    // Gibberish / meaningless content check (fast, no API) — description only
    const descGibberish = checkGibberish(form.description, t('ct_field_desc'));
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
      setModerationErrors({ description: t('ct_mod_desc') });
      setShowErrorBanner(true);
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    // Title is generated in the background from the full description (captures
    // the whole scope of work, not just the first line). Fall back to the
    // heuristic if the background generation hasn't finished yet.
    const autoTitle = suggestedTitle || heuristicTitle(form.description);
    // Respect user's explicit category choice — do NOT auto-detect on submit
    // A brand-specific category is stored as 'other' on the Task (the enum is
    // fixed) with the brand key preserved in category_details.
    const finalCategory = taskCategoryFor(form.category || 'other');

    // The photos are checked TOGETHER, not one after another. They are
    // independent questions, so awaiting them in a loop made the publisher wait
    // for a separate round-trip per photo — before the task had even been sent.
    // Same checks, same verdict, one wait instead of N.
    const imageUrls = form.images || [];
    if (imageUrls.length) {
      setCheckingModeration('images');
      const imageChecks = await Promise.all(imageUrls.map((url) => moderateImage(url)));
      setCheckingModeration('');
      if (imageChecks.some((check) => check.flagged)) {
        setModerationErrors({ images: t('ct_mod_img') });
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
    let created;
    try {
      created = await createTaskViaServer({
      payment_method: form.payment_method,
      contactPhone: form.contactPhone || undefined,
      title: autoTitle,
      // The description IS the sentence composed from the publisher's own
      // choices (see useAutoTaskDescription). The category answers are stored
      // structurally on `category_details` and rendered from there by
      // CategoryDetailsView, so appending a raw "label: value" dump here would
      // be the same information written twice — which is what this replaced.
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
      category: finalCategory,
      category_details: getFinalCategoryDetails(),
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
      verification_required: form.verification_required || false,
      urgency_tag: form.urgency_tag || undefined,
      scheduled_time: form.scheduled_time || undefined,
      client_id: me?.id,
      client_name: me?.full_name,
      client_rating: me?.rating || 0,
      client_verified: me?.is_verified || false,
      origin_brand_id: brandId,
      });
    } catch (err) {
      setLoading(false);
      submittingRef.current = false;
      toast.error(err?.response?.data?.message || t('ct_publish_err'));
      return;
    }

    // Deduct story credits via backend (idempotent — safe to fire-and-forget)
    if (form.is_story && created?.id) {
      base44.functions.invoke('deductStoryCredits', { taskId: created.id, taskTitle: autoTitle }).catch(() => {});
    }
    submitted = true;
    setLoading(false);
    submittingRef.current = false;
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(STEP_KEY);
    // Publisher funnel — KEY CONVERSION. Fires only after the backend returned
    // a persisted task record, so it can never report a failed publish.
    trackEvent(
      'task_published',
      { category: finalCategory, city: form.city, value: Number(form.price), currency: 'ILS' },
      { dedupeKey: created?.id }
    );
    trackFunnel('published', { published_task_id: created?.id, category: finalCategory, city: form.city });
    toast.success(t('ct_publish_ok'));
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

  const activeBtn = { background: '#2563EB', color: 'var(--brand-btn-primary-text, white)', border: 'none', boxShadow: '0 2px 8px rgba(37,99,235,0.25)' };
  const inactiveBtn = { background: 'var(--surface-3)', color: 'var(--text-2)', border: 'none' };

  // Publish from chat mode
  const handleChatPublish = async (chatFormData) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);

    try {
      if (isEditMode) {
        const expiryHoursEdit = chatFormData.expiry_hours === 'custom' 
          ? (parseFloat(chatFormData.custom_expiry_hours) || null) 
          : chatFormData.expiry_hours;
        const expires = expiryHoursEdit 
          ? new Date(Date.now() + expiryHoursEdit * 60 * 60 * 1000).toISOString() 
          : null;

        await base44.entities.Task.update(editId, {
          title: chatFormData.title,
          contactPhone: chatFormData.contactPhone || form.contactPhone || undefined,
          description: chatFormData.description,
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
          category: taskCategoryFor(chatFormData.category || 'other'),
          category_details: Object.keys(categoryDetails).length > 0 ? categoryDetails : (chatFormData.category_details || undefined),
          expiry_duration_hours: expiryHoursEdit,
          expires_at: expires,
          images: chatFormData.images,
          video_url: chatFormData.video_url || undefined,
          requirements: chatFormData.requirements || {},
          payment_method: chatFormData.payment_method || undefined,
          urgency_tag: chatFormData.urgency_tag || undefined,
          scheduled_time: chatFormData.scheduled_time || undefined,
          requires_invoice: chatFormData.requires_invoice || false,
          ...(isRepostMode ? { status: 'OPEN', worker_id: null, worker_name: null, worker_status: null, expires_at: expires } : {}),
        });
        setLoading(false);
        submittingRef.current = false;
        toast.success(isRepostMode ? t('ct_repost_ok') : t('ct_edit_ok'));
        navigate('/?newTaskId=' + editId);
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
      const created = await createTaskViaServer({
        payment_method: chatFormData.payment_method || 'Cash',
        contactPhone: chatFormData.contactPhone || form.contactPhone || undefined,
        title: chatFormData.title,
        // The description already IS the sentence composed from the publisher's
        // choices; the answers themselves are stored on `category_details` and
        // rendered from there. Appending the raw "label: value" dump here wrote
        // the same information twice.
        description: chatFormData.description,
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
        category: taskCategoryFor(chatFormData.category || 'other'),
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
        verification_required: chatFormData.verification_required || false,
        urgency_tag: chatFormData.urgency_tag || undefined,
        scheduled_time: chatFormData.scheduled_time || undefined,
        client_id: me?.id,
        client_name: me?.full_name,
        client_rating: me?.rating || 0,
        client_verified: me?.is_verified || false,
        origin_brand_id: brandId,
      });

      // Deduct story credits via backend
      if (chatFormData.is_story && created?.id) {
        base44.functions.invoke('deductStoryCredits', { taskId: created.id, taskTitle: chatFormData.title }).catch(() => {});
      }
      setLoading(false);
      submittingRef.current = false;
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(STEP_KEY);
      // Publisher funnel — KEY CONVERSION (chat-composer publish path).
      trackEvent(
        'task_published',
        { category: chatFormData.category || 'other', city: chatFormData.city, value: Number(chatFormData.price), currency: 'ILS' },
        { dedupeKey: created?.id }
      );
      trackFunnel('published', { published_task_id: created?.id, category: chatFormData.category, city: chatFormData.city });
      toast.success(t('ct_publish_ok'));

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
      toast.error(t('ct_publish_err'));
    }
  };

  // ── LEAVING THE FORM puts the publisher back where he was ────────────────
  // The guest flag comes first (the feed refuses to render without it, and the
  // guest gate would bounce him straight back into this form), then the history
  // is walked back one step. `idx` is 0 on the first entry of the session, which
  // is the case where "back" would leave the app entirely.
  const closeForm = () => {
    if (!isAuthenticated && !isGuest) enterGuestMode();
    const idx = window.history.state?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/');
  };

  // Chat mode rendering — available in all modes (create, edit, repost)
  if (chatMode) {
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', flexDirection: 'column', background: 'var(--surface-1)' }} dir={isRTL ? 'rtl' : 'ltr'}>
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
      </div>,
      document.body
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

  // ── THE FORM OWNS ITS OWN HEIGHT, WHATEVER CONTAINER IT LANDS IN ──────────
  // The body below is the form's scroller (flex: 1, minHeight: 0, overflowY:
  // auto); it can only scroll when THIS element has a definite height. `flex: 1`
  // supplied one in the signed-out layout (a flex-column container) but NOT in
  // the signed-in one, whose non-root route container is a plain BLOCK — there
  // `flex: 1` is inert, so this box fell back to its content height, the
  // scroller inside it became exactly as tall as its content (nothing to
  // scroll), and its `overscroll-behavior: contain` swallowed the swipe instead
  // of passing it to the page container. `height: 100%` gives it a definite
  // height there too; in the flex container `flex: 1` still wins (flex-basis
  // overrides height), so the signed-out path is untouched.
  return (
    <div style={{ background: 'var(--surface-1)', display: 'flex', flexDirection: 'column', flex: 1, height: '100%', minHeight: 0 }} dir={isRTL ? 'rtl' : 'ltr'}>
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
        // Measured against the fields the admin actually kept — including the
        // phone, which used to be missing from this count and let the bar read
        // 100% while the form still refused to publish.
        const required = requiredFieldOrder();
        const values = requiredValues();
        const filled = required.filter(k => values[k]).length;
        const pct = required.length ? Math.round((filled / required.length) * 100) : 100;
        return (
          <div style={{ flexShrink: 0, background: 'linear-gradient(135deg, var(--brand-hero-bg, #0f2b6b), var(--brand-hero-bg, var(--brand-primary)))', position: 'relative', zIndex: 5 }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 10px' }}>
              {/* CLOSE MEANS GO BACK, NOT START OVER.

                  Closing the form returns the publisher to the screen he was
                  actually on — the feed, a task he opened, wherever he came
                  from — instead of always dumping him on the home feed. A
                  visitor who had two screens open in the app lost his place
                  every time.

                  Two things make that safe, and both are required:
                    • A visitor with no account becomes a GUEST first. Without
                      the guest flag the feed shows a spinner and the guest gate
                      pushes him straight back into this form, so the X would
                      look dead.
                    • The history stack is only walked when there is something
                      to walk back TO (`history.state.idx`). A visitor who landed
                      here from a link has nothing behind him, and going "back"
                      would leave the app — he goes to the feed instead.

                  Closing is still not a protected action: no sign-in prompt is
                  ever raised from this button. */}
              <button
                type="button"
                onClick={closeForm}
                aria-label="סגירה"
                style={{
                  width: 34, height: 34, borderRadius: 11, flexShrink: 0, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
                }}
              >
                <X size={18} color="var(--brand-hero-text, white)" strokeWidth={2.4} />
              </button>
              <span style={{
                // The headline now carries the whole promise — free to post, and
                // people will answer — so it is sized to wrap onto a second line
                // in the bar instead of being clipped to one.
                fontWeight: 800, fontSize: 15.5, lineHeight: 1.32,
                color: 'var(--brand-hero-text, white)', flex: 1, minWidth: 0,
              }}>
        {isRepostMode ? t('repost') : isEditMode ? t('edit_task_title') : isRepost ? t('repost') : t('publish_task_onboard_title')}
      </span>
              {/* Chat feature button — temporarily disabled
              <button
                onClick={() => setChatMode(m => !m)}
                style={{
                  display: 'none',
                  fontSize: 11, fontWeight: 700, color: 'var(--brand-btn-primary-text, white)',
                  background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)',
                  borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                  whiteSpace: 'nowrap', boxShadow: 'none',
                }}
              >
                {chatMode ? '📋 טופס' : '💬 צ\'אט'}
              </button>
              */}
              {draftSaved && <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '4px 8px', fontSize: 11, color: 'var(--brand-btn-primary-text, white)', fontWeight: 700, flexShrink: 0 }}><Save size={11} /> {t('draft_saved')}</div>}
            </div>
            {/* Available professionals for the chosen service and city — it
                narrows as the publisher picks, and disappears on its own when
                nobody matches. Only its second line was ever meant to go, so
                the bar is back and the count stays. */}
            <WorkerAvailabilityIndicator category={form.category} city={form.city} />

            {/* How complete the task is. In the slider this is the ONLY bar on
                the screen — a single small line, not a step tracker — because a
                row of pips told the publisher how MANY screens were left and
                made a short form feel like a long one. */}
            <div style={{ padding: isSliderForm ? '0 16px 10px' : '0 16px 12px' }}>
              {!isSliderForm && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{t('form_progress')}</span>
                  <span style={{ fontSize: 10, color: pct === 100 ? '#4ade80' : 'rgba(255,255,255,0.7)', fontWeight: 800 }}>{pct}%{pct === 100 ? ' ✓ ' + t('ready_to_publish') : ''}</span>
                </div>
              )}
              <div style={{ height: isSliderForm ? 3 : 4, background: 'rgba(255,255,255,0.15)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#4ade80' : 'rgba(255,255,255,0.75)', borderRadius: 99, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          </div>
        );
      })()}

      <div ref={wizardScrollRef} className="px-4 py-4 space-y-4" style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        {/* What THIS step is asking, in the publisher's own question — not the
            field's internal name. Re-keyed on the step so it animates in with
            the content it belongs to. */}
        {isSliderForm && (
          <div key={stepIdx} className="j-step-in">
            <PublishStepIntro stepKey={stepIdx === 0 ? 'category' : wizardKey} fieldOn={fieldOn} />
          </div>
        )}

        {/* Draft restore indicator */}
        {!isRepost && !isEditMode && form.title && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#166534', fontWeight: 700 }}>
              <Save size={14} /> {t('draft_restored')}
            </div>
            <button onClick={() => { setForm(DEFAULT_FORM); localStorage.removeItem(DRAFT_KEY); }} style={{ fontSize: 11, color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>{t('delete_task')}</button>
          </div>
        )}

        {/* Error banner */}
        {showErrorBanner && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 16, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertTriangle size={16} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: 'var(--color-danger)', margin: 0, lineHeight: 1.6, fontWeight: 700 }}>
              {t('missing_fields_warning')}
            </p>
          </div>
        )}

        {/* Moderation image error */}
        {moderationErrors.images && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 16, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertTriangle size={16} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: 'var(--color-danger)', margin: 0, lineHeight: 1.6, fontWeight: 700 }}>🛡️ {moderationErrors.images}</p>
          </div>
        )}

        {/* Category — the slider's first step; always on screen in classic mode */}
        {(!isSliderForm || stepIdx === 0) && (
        <div className="j-step-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SectionCard>
          <Label className="text-sm font-bold mb-2 block" style={{ color: 'var(--text-1)' }}>{t('ct_category')}</Label>
          <div ref={fieldRefs.categoryPicker}>
          <CategoryServiceSelector value={form.category} allowHistorical={isEditMode} onChange={val => {
            set('category', val);
            setCategoryDetails({});
            setExtraFieldsText('');
            set('category_details', {});
            setModerationErrors(p => ({ ...p, categoryMismatch: null }));
            // A new category is a new task: the description drops the sentence
            // written for the old one and follows the new choices from here on,
            // with no button press.
            autoDescription.resetForCategory();
          }} />
          </div>
        </SectionCard>

        {/* Category mismatch warning — shown right below category picker */}
        {moderationErrors.categoryMismatch && (
          <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 14, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertTriangle size={15} color="#f97316" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: '#c2410c', margin: 0, lineHeight: 1.6, fontWeight: 600 }}>{moderationErrors.categoryMismatch}</p>
          </div>
        )}
        </div>
        )}

        {/* Worker count hint — removed per design decision */}

        {/* One selected actionable service, one global form; no parent form alongside it. */}
        {void (sections.category_form = (<>
        {fieldOn('category_form') && (
        <div ref={fieldRefs.categoryForm} style={errors.categoryForm ? { borderRadius: 18, outline: '2px solid #ef4444', outlineOffset: 4 } : undefined}>
          <SelectedCategoryForm
            key={form.category}
            category={form.category}
            values={categoryDetails}
            originLat={form.lat}
            originLng={form.lng}
            initialValues={isEditMode ? form.category_details : undefined}
            onLegacyChange={(data, text) => { setCategoryDetails(prev => ({ ...prev, ...data })); setExtraFieldsText(text); setErrors(p => ({ ...p, categoryForm: false })); }}
            onChange={(k, v) => { setCategoryDetails(prev => ({ ...prev, [k]: v })); setErrors(p => ({ ...p, categoryForm: false })); }}
          />
          {errors.categoryForm && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 6, fontWeight: 700 }}>{t('ct_required')}</p>}
        </div>
        )}

        </>))}

        {/* Description — the main input. Title and category are auto-generated from this. */}
        {void (sections.description = (<>
        {fieldOn('description') && (
        <div ref={fieldRefs.description} style={errors.description ? { borderRadius: 18, outline: '2px solid #ef4444', outlineOffset: 4 } : undefined}>
        <SectionCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Label className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{t('ct_describe_task')}</Label>
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={transcribing}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', background: recording ? '#fee2e2' : 'var(--brand-primary-light)', color: recording ? 'var(--color-danger)' : 'var(--brand-primary)' }}
            >
              {transcribing ? <Loader2 size={13} className="animate-spin" /> : recording ? <MicOff size={13} /> : <Mic size={13} />}
              {transcribing ? t('processing') : recording ? t('stop_recording') : t('record_description')}
            </button>
          </div>
          {recording && (
            <div style={{ background: '#fee2e2', borderRadius: 10, padding: '8px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-danger)', fontWeight: 700 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-danger)', display: 'inline-block' }} />
              {t('recording_press_stop')}
            </div>
          )}
          <Textarea placeholder={contentFor(form.category)?.descriptionExample || t('ct_describe_ph')}
            value={form.description}
            onChange={e => { set('description', e.target.value); setErrors(p => ({...p, description: false})); setModerationErrors(p => ({...p, description: null, categoryMismatch: null})); }}
            onBlur={() => {
              checkFieldModeration('description', form.description);
              // Don't auto-change category from "other" — respect user's explicit choice
              const mismatch = checkCategoryDescriptionMatch(form.category, form.description, form.title);
              setModerationErrors(p => ({ ...p, categoryMismatch: mismatch }));
            }}
            style={{ background: 'var(--input-bg)', border: `1.5px solid ${errors.description || moderationErrors.description || moderationErrors.categoryMismatch ? '#ef4444' : 'var(--border-1)'}`, borderRadius: 12, resize: 'none' }} rows={5}
          />
          {checkingModeration === 'description' && <p style={{ fontSize: 11, color: 'var(--brand-primary)', marginTop: 4 }}>{t('ct_checking')}</p>}
          {errors.description && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{t('ct_required')}</p>}
          {moderationErrors.description && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>🛡️ {moderationErrors.description}</p>}

          {/* Auto-detected category chip */}
          {form.description && form.category && form.category !== 'other' && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{t('ct_detected_cat')}</span>
              <span style={{
                background: 'linear-gradient(135deg, var(--brand-primary-light), var(--brand-primary-light))', border: '1px solid var(--border-2)',
                borderRadius: 10, padding: '3px 10px', fontSize: 12, fontWeight: 700, color: 'var(--brand-primary)',
              }}>
                🏷️ {getCategoryLabel(form.category, t)}
              </span>
            </div>
          )}

          {/* The description writes itself from the choices above, so the field
              says so while that is true — and offers the one deliberate way back
              once the publisher has taken the text over. Changing the category
              rebuilds it on its own; there is nothing to press. */}
          {autoDescription.isAuto ? (
            autoDescription.hasSuggestion && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--text-3)' }}>
                <Sparkles size={13} color="var(--brand-primary)" />
                {t('ct_desc_auto_note', 'נכתב אוטומטית מהבחירות שלך — אפשר לערוך בחופשיות')}
              </div>
            )
          ) : (
            autoDescription.hasSuggestion && (
              <button
                type="button"
                onClick={() => autoDescription.regenerate()}
                style={{
                  marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 12, fontWeight: 700, color: 'var(--brand-primary)',
                }}
              >
                <Sparkles size={13} />
                {t('ct_desc_update_from_choices', 'עדכן לפי הבחירות')}
              </button>
            )
          )}

          {/* ── IMAGES + VIDEO — THE SAME STEP AS THE DESCRIPTION ─────────────
              They were a step of their own, so a publisher who had just said
              what he needs was handed a whole screen whose only message was
              "add a picture" — one more screen to get through, and one more
              place to give up. A photo is part of describing the job, so it
              now sits in the same card, directly under the text. */}
          {fieldOn('media') && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-1)' }}>
              <Label className="text-sm font-bold mb-3 block" style={{ color: 'var(--text-1)' }}>{t('media')}</Label>
              <MediaUploader images={form.images} videoUrl={form.video_url} onImagesChange={imgs => set('images', imgs)} onVideoChange={url => set('video_url', url)} t={t} />
            </div>
          )}
        </SectionCard>

        </div>
        )}

        </>))}

        {/* Expiry + Urgency — each part can be switched off on its own from the
            dashboard, and the whole card disappears when all three are off. */}
        {void (sections.schedule = (<>
        {(fieldOn('expiry') || fieldOn('urgency') || fieldOn('exact_datetime')) && (
        <SectionCard>
          {fieldOn('expiry') && (<>
          <Label className="text-sm font-bold mb-2 flex items-center gap-1" style={{ color: 'var(--text-1)' }}>
            <Clock size={14} /> {t('ct_expiry')}
          </Label>
          <div style={{ marginBottom: 4 }}>
            <SelectionSheet
              value={form.expiry_hours === null ? 'null' : String(form.expiry_hours)}
              options={EXPIRY_OPTIONS.map(opt => ({ value: opt.hours === null ? 'null' : String(opt.hours), label: t(opt.i18n_key) }))}
              onChange={v => set('expiry_hours', v === 'null' ? null : v === 'custom' ? 'custom' : parseFloat(v))}
            />
          </div>
          {form.expiry_hours === 'custom' && (
            <input type="number" min="0.5" step="0.5" placeholder={t('ct_custom_hours_ph')}
              value={form.custom_expiry_hours} onChange={e => set('custom_expiry_hours', e.target.value)}
              style={{ width: '100%', marginTop: 8, padding: '10px 14px', borderRadius: 12, background: 'var(--input-bg)', border: '1px solid var(--border-1)', fontSize: 16, outline: 'none', boxSizing: 'border-box' }}
            />
          )}
          </>)}

          {/* Urgency tag */}
          {(fieldOn('urgency') || fieldOn('exact_datetime')) && (
          <div style={{ marginTop: fieldOn('expiry') ? 18 : 0, paddingTop: fieldOn('expiry') ? 16 : 0, borderTop: fieldOn('expiry') ? '1px solid var(--border-1)' : 'none' }}>
          {fieldOn('urgency') && (<>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <Zap size={14} color="var(--text-3)" strokeWidth={1.8} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{t('ct_when_worker')}</span>
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
                    {t(tag.i18n_key)}
                  </button>
                );
              })}
            </div>
          </>)}

            {/* Specific date/time picker — hidden when category has a schedule table (avoids duplication) */}
            {fieldOn('exact_datetime') && !hasScheduleField && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <Calendar size={14} color="var(--text-3)" strokeWidth={1.8} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{t('ct_exact_dt')}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="datetime-local"
                  value={form.scheduled_time ? toLocalDatetimeInput(form.scheduled_time) : ''}
                  onChange={e => {
                    const val = e.target.value;
                    if (val) {
                      set('scheduled_time', new Date(val).toISOString());
                    } else {
                      set('scheduled_time', '');
                    }
                  }}
                  style={{ flex: 1, height: 48, borderRadius: 12, border: '1.5px solid var(--border-1)', background: 'var(--input-bg)', padding: '0 14px', fontSize: 16, color: 'var(--text-1)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                {form.scheduled_time && (
                  <button
                    type="button"
                    onClick={() => set('scheduled_time', '')}
                    style={{ width: 48, height: 48, borderRadius: 12, border: '1.5px solid var(--border-1)', background: 'var(--surface-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text-2)' }}
                    title={t('ct_reset_dt')}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.4 }}>{t('ct_exact_dt_help')}</p>
            </div>
            )}
            {fieldOn('exact_datetime') && hasScheduleField && scheduleMinutes != null && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <Calendar size={14} color="var(--color-success)" strokeWidth={1.8} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-success)' }}>{t('ct_schedule_selected')}</span>
              </div>
              <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1px solid #bbf7d0', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={13} color="var(--color-success)" />
                {t('ct_total_time')} {formatDuration(scheduleMinutes)}{scheduleSlots.length > 1 ? ` · ${scheduleSlots.length} ${t('ct_slots')}` : ''}
              </div>
            </div>
            )}
          </div>
          )}
        </SectionCard>
        )}

        </>))}

        {/* Story — only when creating new task */}
        {void (sections.story = (<>
        {!isEditMode && fieldOn('story') && <div
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
              {form.is_story && <span style={{ color: 'var(--brand-btn-primary-text, white)', fontSize: 11 }}>✓</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: form.is_story ? '#7e22ce' : '#111', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={15} color="#a855f7" /> {t('ct_story')}
                <span style={{ fontSize: 10, fontWeight: 800, background: '#f59e0b', color: 'var(--brand-btn-primary-text, white)', padding: '2px 7px', borderRadius: 20, marginRight: 4 }}>{t('ct_recommended')}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: form.is_story ? 'rgba(168,85,247,0.08)' : 'var(--surface-3)', borderRadius: 12, padding: '10px 12px' }}>
            <Zap size={18} color="#a855f7" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: form.is_story ? '#7e22ce' : 'var(--text-1)' }}>{t('ct_story_3x')}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{t('ct_story_help')}</div>
            </div>
          </div>
        </div>}

        </>))}

        {/* Location */}
        {void (sections.location_name = (<>
        {fieldOn('location_name') && (
        <SectionCard>
          <Label className="text-sm font-bold mb-2 flex items-center gap-1" style={{ color: 'var(--text-1)' }}>
            <MapPin size={14} /> {t('ct_location_req')}
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
          {errors.location_name && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{t('ct_addr_err')}</p>}
          {/* Extra address details */}
          {fieldOn('address_details') && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, marginBottom: 4 }}>{t('ct_building')}</p>
              <Input placeholder={t('ct_building_ph')}
                value={form.address_building || ''}
                onChange={e => set('address_building', e.target.value)}
                style={{ background: 'var(--input-bg)', border: '1.5px solid var(--border-1)', borderRadius: 12, height: 42 }}
              />
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, marginBottom: 4 }}>{t('ct_floor')}</p>
              <Input placeholder={t('ct_floor_ph')}
                value={form.address_floor || ''}
                onChange={e => set('address_floor', e.target.value)}
                style={{ background: 'var(--input-bg)', border: '1.5px solid var(--border-1)', borderRadius: 12, height: 42 }}
              />
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, marginBottom: 4 }}>{t('ct_apartment')}</p>
              <Input placeholder={t('ct_apartment_ph')}
                value={form.address_apartment || ''}
                onChange={e => set('address_apartment', e.target.value)}
                style={{ background: 'var(--input-bg)', border: '1.5px solid var(--border-1)', borderRadius: 12, height: 42 }}
              />
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, marginBottom: 4 }}>{t('ct_nav_notes')}</p>
              <Input placeholder={t('ct_nav_notes_ph')}
                value={form.address_notes || ''}
                onChange={e => set('address_notes', e.target.value)}
                style={{ background: 'var(--input-bg)', border: '1.5px solid var(--border-1)', borderRadius: 12, height: 42 }}
              />
            </div>
          </div>
          )}
        </SectionCard>
        )}

        </>))}

        {/* Worker Pool Scanner banners removed */}

        {/* Requirements */}
        {void (sections.requirements = (<>
        {fieldOn('requirements') && (
        <SectionCard>
          <button type="button" onClick={() => setShowRequirements(v => !v)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: showRequirements ? 14 : 0 }}>
            <div>
              <Label className="text-sm font-bold flex items-center gap-1" style={{ color: 'var(--text-1)', cursor: 'pointer', margin: 0 }}>
                <CheckSquare size={14} /> {t('ct_extra_req')}
              </Label>
              <div style={{ fontSize: 11, color: '#f97316', fontWeight: 600, marginTop: 2 }}>{t('ct_req_warn')}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {(() => { const count = Object.entries(form.requirements).filter(([k,v]) => k !== 'custom' && v === true).length + (form.requirements.custom ? 1 : 0) + (form.requires_invoice ? 1 : 0); return count > 0 ? <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--brand-primary-light)', color: 'var(--brand-primary)', borderRadius: 20, padding: '2px 8px', border: '1px solid var(--border-2)' }}>{t('ct_selected', { count })}</span> : <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{t('ct_click_add')}</span>; })()}
              {showRequirements ? <ChevronUp size={16} color="var(--text-2)" /> : <ChevronDown size={16} color="var(--text-2)" />}
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
                  <FileText size={18} color={form.requires_invoice ? '#7c3aed' : 'var(--text-3)'} />
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: form.requires_invoice ? '#7c3aed' : 'var(--text-1)' }}>{t('ct_invoice')}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 1 }}>{t('ct_invoice_help')}</div>
                </div>
                <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${form.requires_invoice ? '#7c3aed' : 'var(--border-1)'}`, background: form.requires_invoice ? '#7c3aed' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {form.requires_invoice && <span style={{ color: 'var(--brand-btn-primary-text, white)', fontSize: 11 }}>✓</span>}
                </div>
              </button>
              {getRequirementCategories(form.category, t).map(cat => (
                <div key={cat.label}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-2)', marginBottom: 8, letterSpacing: 0.3 }}>{cat.label}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {cat.items.map(({ key, label }) => {
                      const isSuggested = getSuggestedExtras(form.category).includes(key);
                      const isActive = !!form.requirements[key];
                      return (
                        <button key={key} onClick={() => setReq(key, !form.requirements[key])}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 12, textAlign: 'right', cursor: 'pointer', position: 'relative',
                            background: isActive ? 'rgba(59,130,246,0.08)' : isSuggested ? '#fffbeb' : 'var(--surface-3)',
                            border: `1px solid ${isActive ? 'var(--border-2)' : isSuggested ? '#fde68a' : 'var(--border-1)'}`,
                            transition: 'all 0.15s' }}>
                          <div style={{ width: 16, height: 16, borderRadius: 5, border: `2px solid ${isActive ? 'var(--brand-primary)' : isSuggested ? '#f59e0b' : 'var(--border-1)'}`, background: isActive ? 'var(--brand-primary)' : isSuggested ? '#fffbeb' : 'var(--input-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {isActive && <span style={{ color: 'var(--brand-btn-primary-text, white)', fontSize: 9, lineHeight: 1 }}>✓</span>}
                          </div>
                          <span style={{ fontSize: 12, fontWeight: isSuggested ? 700 : 600, color: isActive ? 'var(--brand-primary-dark)' : isSuggested ? '#92400e' : 'var(--text-2)' }}>{label}</span>
                          {isSuggested && !isActive && (
                            <span style={{ position: 'absolute', top: -6, left: -6, fontSize: 8, fontWeight: 800, color: 'var(--brand-btn-primary-text, white)', background: '#f59e0b', borderRadius: 99, padding: '1px 5px', boxShadow: '0 1px 4px rgba(245,158,11,0.4)' }}>{t('ct_recommended')}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>{t('ct_custom_req')}</div>
                <input type="text" placeholder={t('ct_custom_req_ph')}
                  value={form.requirements.custom || ''} onChange={e => setReq('custom', e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 12, background: 'var(--input-bg)', border: '1px solid var(--border-1)', fontSize: 16, outline: 'none', boxSizing: 'border-box', color: 'var(--text-1)' }} />
              </div>
            </div>
          )}
        </SectionCard>
        )}

        </>))}

        {/* Verification Requirement */}
        {void (sections.verification = (<>
        {fieldOn('verification') && (
        <SectionCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <ShieldCheck size={14} color="var(--color-success)" strokeWidth={1.8} />
            <Label className="text-sm font-bold" style={{ color: 'var(--text-1)', margin: 0 }}>{t('ct_worker_verify')}</Label>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10, lineHeight: 1.5 }}>
            {t('ct_verify_help')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => set('verification_required', false)}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                background: !form.verification_required ? '#f0fdf4' : 'var(--surface-3)',
                color: !form.verification_required ? 'var(--color-success)' : 'var(--text-2)',
                border: `1.5px solid ${!form.verification_required ? '#bbf7d0' : 'var(--border-1)'}`,
              }}
            >
              {t('ct_no_verify')}
            </button>
            <button
              type="button"
              onClick={() => set('verification_required', true)}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                background: form.verification_required ? '#f0fdf4' : 'var(--surface-3)',
                color: form.verification_required ? 'var(--color-success)' : 'var(--text-2)',
                border: `1.5px solid ${form.verification_required ? '#bbf7d0' : 'var(--border-1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              <ShieldCheck size={14} /> {t('ct_require_green')}
            </button>
          </div>
          {form.verification_required && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', fontSize: 11, color: '#166534', fontWeight: 600, lineHeight: 1.5 }}>
              {t('ct_verify_note')}
            </div>
          )}
        </SectionCard>
        )}

        </>))}

        {/* Price — moved here from above, just before payment */}
        {void (sections.price = (<>
        {fieldOn('price') && (
        <div ref={fieldRefs.price}>
        <SectionCard>
          {isHourly ? (
            <>
              <Label className="text-sm font-bold mb-2 block" style={{ color: 'var(--text-1)' }}>{t('ct_price_hour')}</Label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div>
                  <Input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="50"
                    value={form.hourly_rate}
                    onChange={e => { if (hasActiveApplications) return; const v = e.target.value.replace(/[^0-9]/g, ''); updateHourly('hourly_rate', v); setErrors(p => ({...p, price: false})); }}
                    disabled={hasActiveApplications}
                    style={{ background: 'var(--input-bg)', border: `1.5px solid ${errors.price ? '#ef4444' : 'var(--border-1)'}`, borderRadius: 12, height: 48, fontSize: 18, fontWeight: 800, opacity: hasActiveApplications ? 0.5 : 1 }}
                  />
                  <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4, fontWeight: 600 }}>{t('ct_per_hour')}</p>
                </div>
                <div>
                  {scheduleDriven ? (
                    <div style={{ height: 48, borderRadius: 12, border: '1.5px solid #bbf7d0', background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#166534' }}>
                      {formatDuration(scheduleMinutes)}
                    </div>
                  ) : (
                    <Input type="text" inputMode="decimal" pattern="[0-9.]*" placeholder="3"
                      value={form.hours}
                      onChange={e => { if (hasActiveApplications) return; const v = e.target.value.replace(/[^0-9.]/g, ''); updateHourly('hours', v); setErrors(p => ({...p, price: false})); }}
                      disabled={hasActiveApplications}
                      style={{ background: 'var(--input-bg)', border: `1.5px solid ${errors.price ? '#ef4444' : 'var(--border-1)'}`, borderRadius: 12, height: 48, fontSize: 18, fontWeight: 800, opacity: hasActiveApplications ? 0.5 : 1 }}
                    />
                  )}
                  <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4, fontWeight: 600 }}>{scheduleDriven ? t('ct_from_schedule') : t('ct_num_hours')}</p>
                </div>
              </div>
              {form.hourly_rate && form.hours ? (
                scheduleDriven ? (
                  <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--color-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>{t('ct_auto_calc')}</span>
                      <span style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>{scheduleMinutes < 60 ? formatDuration(scheduleMinutes) : `₪${form.hourly_rate} לשעה · ${formatDuration(scheduleMinutes)}`}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #bbf7d0' }}>
                      <span style={{ fontSize: 13, color: '#166534', fontWeight: 700 }}>{t('ct_total')}</span>
                      <span style={{ fontSize: 22, fontWeight: 900, color: '#059669' }}>₪{Math.round((Number(form.hourly_rate) || 0) * (parseFloat(form.hours) || 0))}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '10px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#166534', fontWeight: 700 }}>{t('ct_total')}</span>
                    <span style={{ fontSize: 22, fontWeight: 900, color: '#059669' }}>₪{Math.round((Number(form.hourly_rate) || 0) * (parseFloat(form.hours) || 0))}</span>
                  </div>
                )
              ) : (
                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '10px 14px', marginBottom: 8, fontSize: 12, color: '#92400e', fontWeight: 600 }}>
                  {scheduleDriven ? t('ct_enter_rate') : t('ct_enter_rate_hours')}
                </div>
              )}
            </>
          ) : (
            <>
              {/* ── THE BUDGET ────────────────────────────────────────────────
                  The label asks the question the publisher is actually answering
                  — what is your budget — instead of naming the field. The shekel
                  then sits INSIDE the field, on the side the digits do not
                  occupy, so the eye lands on the number and the currency is
                  context rather than a second thing to read.

                  `insetInlineEnd` / `paddingInlineEnd` rather than left/right:
                  the symbol must always take the side the number is NOT on, so
                  it follows the writing direction instead of being pinned to a
                  screen edge. */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <Label className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>
                  {t('price_label')} *
                </Label>
                <button
                  type="button"
                  onClick={() => setShowPriceHelp(v => !v)}
                  aria-label={t('ct_price_note')}
                  aria-expanded={showPriceHelp}
                  className="j-icon-btn"
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', color: 'var(--text-3)',
                  }}
                >
                  <HelpCircle size={17} />
                </button>
              </div>
              {showPriceHelp && (
                <div style={{
                  background: 'var(--surface-3)', border: '1px solid var(--border-1)',
                  borderRadius: 12, padding: '10px 12px', marginBottom: 8,
                  fontSize: 12, color: 'var(--text-2)', fontWeight: 600, lineHeight: 1.55,
                }}>
                  {t('ct_price_note')}
                </div>
              )}
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <Input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="100"
                  value={form.price}
                  onChange={e => { if (hasActiveApplications) return; const v = e.target.value.replace(/[^0-9]/g, ''); set('price', v); setErrors(p => ({...p, price: false})); }}
                  disabled={hasActiveApplications}
                  style={{ background: 'var(--input-bg)', border: `1.5px solid ${errors.price ? '#ef4444' : 'var(--border-1)'}`, borderRadius: 12, height: 48, fontSize: 18, fontWeight: 800, paddingInlineEnd: 40, opacity: hasActiveApplications ? 0.5 : 1 }}
                />
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute', insetInlineEnd: 14, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 17, fontWeight: 700, color: 'var(--text-3)', pointerEvents: 'none',
                  }}
                >
                  ₪
                </span>
              </div>
            </>
          )}
          {hasActiveApplications && <p style={{ fontSize: 12, color: 'var(--color-danger)', marginBottom: 6 }}>{t('ct_price_locked')}</p>}
          {errors.price && <p style={{ fontSize: 11, color: '#ef4444', marginBottom: 6 }}>{t('ct_required')}</p>}
          {/* ── WHAT HAPPENS AFTER THE NUMBER ─────────────────────────────────
              The two things a publisher needs before typing a price. The first
              is a FACT — nothing is charged now — so it is short, stated plainly
              and carries the green that means "no risk" everywhere else in the
              app. The second explains how the offer works, which is guidance
              rather than a promise, so it sits one step quieter underneath. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <ShieldCheck size={16} color="var(--color-success)" strokeWidth={2.2} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--color-success)' }}>
              {t('ct_no_pay_now')}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.55, fontWeight: 600, marginBottom: 8 }}>
            {t('ct_budget_explain')}
          </p>
          <PriceSuggestion
            category={form.category}
            estimatedTime={form.estimated_time}
            description={form.description}
            location={form.city || form.location_name}
            isHourly={isHourly}
            distance={moveDistance}
            images={form.images}
            detailsText={extraFieldsText}
            requirementsText={requirementsText}
            onAccept={p => { if (isHourly) { updateHourly('hourly_rate', String(p)); } else { set('price', String(p)); setErrors(prev => ({...prev, price: false})); } }}
          />

          {/* Auto bump */}
          {fieldOn('auto_bump') && (<>
          <button type="button" onClick={() => set('auto_bump_enabled', !form.auto_bump_enabled)}
            style={{ marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, textAlign: 'right', cursor: 'pointer', background: form.auto_bump_enabled ? '#fffbeb' : 'var(--surface-3)', border: `1px solid ${form.auto_bump_enabled ? '#fcd34d' : 'var(--border-1)'}` }}
          >
            <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${form.auto_bump_enabled ? '#f59e0b' : '#cbd5e1'}`, background: form.auto_bump_enabled ? '#f59e0b' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {form.auto_bump_enabled && <span style={{ color: 'var(--brand-btn-primary-text, white)', fontSize: 11 }}>✓</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{t('ct_bump_title')}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2, lineHeight: 1.4 }}>{t('ct_bump_desc')}</div>
            </div>
          </button>
          {form.auto_bump_enabled && (
            <div style={{ marginTop: 10, padding: '12px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 14 }}>
              <Label className="text-sm font-semibold block" style={{ color: '#92400e', marginBottom: 4 }}>{isHourly ? t('ct_max_price_total') : t('ct_max_price')}</Label>
              <div style={{ fontSize: 11, color: '#b45309', marginBottom: 8, lineHeight: 1.4 }}>{isHourly ? t('ct_bump_help_hourly', { price: form.price || '?' }) : t('ct_bump_help', { price: form.price || '?' })}</div>
              <Input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="250"
                value={form.max_price}
                onChange={e => set('max_price', e.target.value.replace(/[^0-9]/g, ''))}
                style={{ background: 'white', border: `1.5px solid ${form.max_price && Number(form.max_price) <= Number(form.price) ? '#ef4444' : '#fcd34d'}`, borderRadius: 12, height: 44, fontSize: 16, fontWeight: 700 }}
              />
              {form.max_price && Number(form.max_price) <= Number(form.price) && (
                <p style={{ fontSize: 12, color: '#ef4444', marginTop: 6, fontWeight: 700 }}>{t('ct_bump_err', { price: form.price })}</p>
              )}
            </div>
          )}
          </>)}
        </SectionCard>

        </div>
        )}

        </>))}

        {/* Payment Method */}
        {void (sections.payment_method = (<>
        {fieldOn('payment_method') && (
        <div ref={fieldRefs.payment_method}>
        <SectionCard>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <CreditCard size={14} color="var(--text-3)" strokeWidth={1.8} />
            <Label className="text-sm font-bold" style={{ color: 'var(--text-1)', margin: 0 }}>{t('ct_how_pay')}</Label>
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#166534', fontWeight: 600, lineHeight: 1.5 }}>
            {t('ct_pay_note')}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
          {PAYMENT_METHODS.map(pm => (
            <button key={pm.value} onClick={() => { set('payment_method', form.payment_method === pm.value ? '' : pm.value); setErrors(p => ({...p, payment_method: false})); }}
              style={{ width: '100%', padding: '10px 4px', borderRadius: 10, fontSize: 13, fontWeight: form.payment_method === pm.value ? 700 : 500, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', ...(form.payment_method === pm.value ? activeBtn : { ...inactiveBtn, outline: errors.payment_method ? '1.5px solid #ef4444' : 'none' }) }}
            >{t(pm.i18n_key)}</button>
          ))}
        </div>
        {errors.payment_method && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>{t('ct_pay_err')}</p>}

        </SectionCard>
        </div>
        )}

        </>))}

        {/* Contact Phone */}
        {void (sections.contactPhone = (<>
        {fieldOn('contactPhone') && (
        <div ref={fieldRefs.contactPhone}>
        <SectionCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <Phone size={14} color={errors.contactPhone ? '#ef4444' : 'var(--text-3)'} strokeWidth={1.8} />
            <Label className="text-sm font-bold" style={{ color: errors.contactPhone ? '#ef4444' : 'var(--text-1)', margin: 0 }}>{t('ct_contact')}</Label>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, lineHeight: 1.5 }}>
            {t('ct_contact_help')}
          </div>
          <Input
            type="tel"
            inputMode="tel"
            dir="ltr"
            placeholder="05X-XXXXXXX"
            value={form.contactPhone || ''}
            onChange={e => { set('contactPhone', e.target.value); setErrors(p => ({ ...p, contactPhone: false })); }}
            // ── THE PHONE IS REMEMBERED FROM THE FIRST TASK ONWARD ───────────
            // The form has always PREFILLED from the profile, but nothing ever
            // wrote the number TO the profile — so the field was empty every
            // single time and the publisher retyped it on every task.
            //
            // Saved on blur, not on every keystroke: a half-typed number is not
            // a phone number, and the blur is the first moment the value is
            // finished. Only a number that could actually be called is stored,
            // and only when it differs from what is already on the profile, so
            // this never fires a pointless write.
            onBlur={() => {
              const typed = (form.contactPhone || '').trim();
              if (typed.replace(/\D/g, '').length < 9) return;
              if (typed === (me?.phone || '')) return;
              base44.auth.updateMe({ phone: typed }).catch(() => {});
            }}
            style={{ background: 'var(--input-bg)', border: `1.5px solid ${errors.contactPhone ? '#ef4444' : 'var(--border-1)'}`, borderRadius: 12, height: 48, fontSize: 16 }}
          />
          {errors.contactPhone && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 6, fontWeight: 700 }}>{t('ct_phone_err')}</p>}
        </SectionCard>
        </div>
        )}

        </>))}

        {/* The form, in the order the admin set it (Dashboard → Task Form).
            Every section registered itself above; this is what actually renders
            them, so moving a section in the dashboard moves it here. */}
        {isSliderForm
          ? (() => {
              const node = wizardKey ? sections[wizardKey] : null;
              return node ? <div key={wizardKey} className="j-step-in">{node}</div> : null;
            })()
          : sectionOrder.map(key => (sections[key] ? <React.Fragment key={key}>{sections[key]}</React.Fragment> : null))}

        {/* Submit — the slider's last step, the end of the form otherwise */}
        {(!isSliderForm || stepIdx === wizardTotal - 1) && (() => {
          // Ready means every remaining required field is filled — the same list
          // the validation uses, so the green button can never lie.
          const values = requiredValues();
          const isReady = requiredFieldOrder().every(k => values[k]);
          return (
            <div ref={fieldRefs.publishBtn} style={{ marginTop: 8, paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
              {/* ── THE LAST STEP IS STILL A STEP ──────────────────────────────
                  Publishing used to be the only thing on this screen, so a
                  publisher who wanted to change one detail had to leave the
                  form and start again. The way back now sits beside the publish
                  button, in the same row and at the same height. */}
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 10 }}>
              {isSliderForm && stepIdx > 0 && (
                <button
                  type="button"
                  onClick={() => setStepIdx(i => Math.max(0, i - 1))}
                  aria-label="חזרה"
                  style={{
                    width: 60, height: 60, flexShrink: 0, cursor: 'pointer',
                    borderRadius: 18,
                    background: 'var(--surface-2)',
                    border: '1.5px solid var(--border-2)',
                    color: 'var(--text-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <ChevronRight size={24} strokeWidth={2.6} />
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={loading || !!checkingModeration || categoriesLoading || (!isEditMode && !brandCategories.length)}
                className="btn-tap"
                style={{
                  flex: 1, minWidth: 0, height: 60, borderRadius: 18, fontSize: 17, fontWeight: 900,
                  color: 'var(--brand-btn-primary-text, white)', border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  background: isReady
                    ? 'linear-gradient(135deg, var(--brand-btn-primary-bg, #059669), var(--brand-btn-primary-bg, #047857))'
                    : 'linear-gradient(135deg, var(--brand-btn-primary-bg, var(--brand-primary)), var(--brand-btn-primary-bg, var(--brand-primary-dark)))',
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
              </div>
              {!isEditMode && <SocialProofBar />}
            </div>
          );
        })()}
      </div>

      {/* The slider's motion through the form. Publishing itself stays the same
          button at the end of the last step — this bar only moves between steps. */}
      {isSliderForm && (
        <PublishWizardNav
          step={stepIdx}
          total={wizardTotal}
          canNext={wizardCanAdvance}
          missing={wizardMissing}
          isLast={stepIdx === wizardTotal - 1}
          onBack={() => setStepIdx(i => Math.max(0, i - 1))}
          onNext={() => setStepIdx(i => Math.min(wizardTotal - 1, i + 1))}
        />
      )}

      {/* The explainer video — an icon-sized pill that never opens by itself. */}
      <PublishHelpVideo />
    </div>
  );
}