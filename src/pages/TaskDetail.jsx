import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { trackEvent } from '@/lib/analytics';
import { getCurrentPosition } from '@/lib/nativeGeolocation';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Star, MessageCircle, Flag, CheckCircle2, Loader2, Pencil, RefreshCw, AlertTriangle, Send, DoorOpen, X, Play, MoreVertical, ChevronLeft, ChevronRight, FileText, Phone, Share, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import TaskDetailActions from '@/components/TaskDetailActions';
import RatingModal from '@/components/RatingModal';
import InvoiceModal from '@/components/InvoiceModal';
import InvoiceViewModal from '@/components/InvoiceViewModal';
import BoostOverlay from '@/components/BoostOverlay';
import TaskTakenConfetti from '@/components/TaskTakenConfetti';
import TaskExpiry from '@/components/TaskExpiry';
import TaskApplicants from '@/components/TaskApplicants';
import ApprovedPopup from '@/components/ApprovedPopup';
import BackButton from '@/components/BackButton';
import NavButtons from '@/components/NavButtons';
import TaskImage from '@/components/TaskImage';
import CreditIcon from '@/components/CreditIcon';
import { getCategoryLabel } from '@/lib/categories';
import { localizedCategoryLabel } from '@/lib/brand/categoryLabels';
import { getActiveRequirements } from '@/lib/requirements';
import TaskDetailsRows from '@/components/TaskDetailsRows.jsx';
import CategoryDetailsView from '@/components/CategoryDetailsView';
import { calculateCurrentPrice, getHourlyBreakdown, formatHoursLabel, formatHourlySublabel, formatScheduleSlots } from '@/lib/priceCalculator';
import { isUserVerified, hasSocialVerified, copyToClipboard } from '@/lib/utils';
import { raiseAppOffer } from '@/lib/appOffer';
import { selectTask, patchTaskCache } from '@/lib/taskCache';
import { creditsShortfall } from '@/lib/jobaBalance';

const CATEGORY_EMOJI = {
  plumbing: '🔧', electricity: '⚡', gardening: '🌿', cleaning: '🧹', car: '🚗',
  moving: '📦', painting: '🖌️', carpentry: '🪚', ac: '❄️',
  locksmith: '🔐', shopping: '🛍️', delivery: '🚚', babysitting: '👶',
  tutoring: '📚', it_support: '💻', other: '🔨'
};
import VerifyModal from '@/components/VerifyModal';
import VerificationRequiredModal from '@/components/VerificationRequiredModal';
import VerificationPendingModal from '@/components/VerificationPendingModal';
import VerifiedBadge from '@/components/VerifiedBadge';
import UserBadge from '@/components/UserBadge';
import { useVerifyGuard } from '@/hooks/useVerifyGuard';
import { useAuth } from '@/lib/AuthContext';
import LoginPromptModal from '@/components/LoginPromptModal';
import MediaLightbox from '@/components/MediaLightbox';
import CancelTaskConfirmModal from '@/components/CancelTaskConfirmModal';
import ReportModal from '@/components/ReportModal';
import PageHeader from '@/components/PageHeader';
import TrustBadges from '@/components/TrustBadges';
import { parseDescription } from '@/lib/descriptionParser';
import { trackTaskClick } from '@/hooks/useTrackTaskEvent';
import BoostPill from '@/components/BoostPill';
import ActiveTaskBanner from '@/components/ActiveTaskBanner';
import ActiveTaskBannerFromCache from '@/components/ActiveTaskBannerFromCache';
import TaskChip from '@/components/task/TaskChip';
import TaskActionButton from '@/components/task/TaskActionButton';
import ScheduleChangeCard from '@/components/schedule/ScheduleChangeCard';
import { useLanguage } from '@/lib/LanguageContext';
import { useTaskTranslation } from '@/hooks/useTaskTranslation';
import { fetchPublicTasks, fetchApplicantStats } from '@/lib/publicTasks';
import { actionableCategoryKey } from '@/lib/brand/categoryRegistry';
import { useGlobalCategories } from '@/lib/brand/globalCategories';

const getScanningTexts = (t) => t('scanning_texts');

function ScanningLabelDetail({ t }) {
  const scanningTexts = getScanningTexts(t);
  const [textIdx, setTextIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setTextIdx(i => (i + 1) % scanningTexts.length);
        setVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, [scanningTexts.length]);

  return (
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-1)', opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}>
        {scanningTexts[textIdx]}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{t('task_exposed_detail')}</div>
    </div>
  );
}

// ── THE TWO HEAVY CHILDREN ARE FETCHED SEPARATELY, ON PURPOSE ────────────────
// Both used to be static imports, so opening ANY task card downloaded them
// before the sheet could paint: the map pulls in Mapbox (~1.8 MB) and the
// credits popup pulls in three.js. A task with no location, or a user who never
// buys credits, paid for both. They are their own chunks now and are requested
// only when the thing that needs them is actually on screen.
const TaskLocationMap = lazy(() => import('@/components/TaskLocationMap'));
const BuyCreditsModal = lazy(() => import('@/components/BuyCreditsModal'));


import ApplySheet from '@/components/ApplySheet';
import { chatThreadKey } from '@/lib/chatThread';
import { invalidateTaskCaches } from '@/lib/taskSync';
import WorkerCompletionPhoto from '@/components/WorkerCompletionPhoto';

// Labels are context-aware: isOwner sees employer language, worker sees worker language
const getStatusLabel = (status, isOwner, t) => {
  if (status === 'OPEN') return isOwner ? t('looking_for_worker') : t('open_status');
  if (status === 'TAKEN') return isOwner ? t('in_progress') : t('taken_status_worker');
  if (status === 'COMPLETED') return t('completed');
  if (status === 'CANCELLED') return t('cancelled') || t('cancel');
  if (status === 'EXPIRED') return t('task_expired_title');
  return status;
};
// (The old per-status colour tables lived here. Status colour is now ONE
// mapping — `statusTone` below — rendered through the shared TaskChip, so the
// header and the active task panel can never disagree about what a state is.)

// The header's own icon buttons — one geometry for menu, share and close.
const HEADER_ICON_BTN = {
  width: 30, height: 30, borderRadius: 9,
  background: 'var(--surface-3)', border: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: 'var(--text-2)', flexShrink: 0,
};

function getRelativeTime(date, t) {
  if (!date) return null;
  const s = String(date);
  const normalized = s.includes('T') && !s.endsWith('Z') && !s.includes('+') ? s + 'Z' : s;
  const ms = Date.now() - new Date(normalized).getTime();
  if (ms < 0) return t('now_label');
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return t('now_label');
  if (minutes < 60) return t('minutes_ago').replace('{n}', minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('hours_ago').replace('{n}', hours);
  const days = Math.floor(hours / 24);
  if (days < 30) return t('days_ago').replace('{n}', days);
  return null;
}

export default function TaskDetail(props) {
  const params = useParams();
  const id = props?.taskId || params?.id;
  const sheetMode = props?.sheetMode;
  const onSheetClose = props?.onSheetClose;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, login, user: authUser } = useAuth();
  const { t, isRTL, lang } = useLanguage();
  const [applyMessage, setApplyMessage] = useState('');
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [showVerificationRequired, setShowVerificationRequired] = useState(false);
  const [showVerificationPending, setShowVerificationPending] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [taskTaken, setTaskTaken] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [showRating, setShowRating] = useState(false); // kept for manual trigger only
  const [showApprovedPopup, setShowApprovedPopup] = useState(false);
  const [signalSent, setSignalSent] = useState(false);


  const [showExitWarning, setShowExitWarning] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [completionLightboxOpen, setCompletionLightboxOpen] = useState(false);
  const [completionLightboxIndex, setCompletionLightboxIndex] = useState(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [creditsNeeded, setCreditsNeeded] = useState(null);
  const [showOwnerMenu, setShowOwnerMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Delete is a permanent removal. Authorization is SERVER-AUTHORITATIVE: the
  // Task RLS permits delete only for the owner (client_id) or an admin, so a
  // non-owner request is rejected by the server even if the UI were bypassed.
  const deleteMutation = useMutation({
    mutationFn: async () => {
      // SERVER-AUTHORITATIVE: releasing every applicant's committed jobas and
      // removing the task happen together, so a delete can never strand credits.
      const res = await base44.functions.invoke('deleteTask', { taskId: id });
      if (!res.data?.success) throw new Error(res.data?.error || 'delete_failed');
    },
    onSuccess: () => {
      invalidateTaskCaches(queryClient, { taskId: id, meId: me?.id });
      toast.success(t('task_deleted_toast') || 'המשימה נמחקה');
      setShowDeleteConfirm(false);
      window.dispatchEvent(new CustomEvent('close_task_sheet'));
    },
    onError: (err) => {
      const code = err?.response?.data?.error || err?.data?.error;
      if (code === 'work_in_progress_not_deletable') {
        toast.error(t('delete_blocked_in_progress') || 'העבודה כבר החלה — יש לבטל את המשימה במקום למחוק אותה');
      } else {
        toast.error(t('delete_error_toast') || 'שגיאה במחיקה');
      }
    },
  });
  const [showInvoice, setShowInvoice] = useState(false);
  const [showInvoiceView, setShowInvoiceView] = useState(false);
  const [showBoostOverlay, setShowBoostOverlay] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [editingCompletion, setEditingCompletion] = useState(false);
  const [editPhotos, setEditPhotos] = useState([]);
  const [editVideo, setEditVideo] = useState('');
  const [savingCompletion, setSavingCompletion] = useState(false);
  const [labelRotIdx, setLabelRotIdx] = useState(0);
  const [mediaIdx, setMediaIdx] = useState(0);
  const [idCopied, setIdCopied] = useState(false);
  const prevWorkerIdRef = useRef(null);

  useEffect(() => {
    if (navigator.geolocation) {
      getCurrentPosition((pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, () => {}, { timeout: 5000 });
    }
  }, []);
  const prevTaskStatusRef = useRef(null);

  const { map: categoryMap } = useGlobalCategories();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me(), enabled: isAuthenticated });
  // Use the real-time auth user for verification gating (instantly synced via WebSocket + polling)
  const verifyUser = authUser || me;
  // `gateAuth` alongside `gate`: sending the owner a signal is a message, not
  // taking work, so it needs a signed-in user and not a verified identity.
  const { gate, gateAuth, showVerify, setShowVerify, onSuccess: onVerifySuccess, onClose: onVerifyClose } = useVerifyGuard(verifyUser);

  // Check if current user already reviewed this task
  const { data: myReview } = useQuery({
    queryKey: ['myReview', id, me?.id],
    queryFn: () => base44.entities.Review.filter({ task_id: id, reviewer_id: me.id }),
    select: (data) => data[0] ?? null,
    enabled: !!me?.id
  });
  // Application count for live activity in banner — a NUMBER from the public
  // stats reader; no TaskApplication record is exposed to the client.
  const { data: appStats } = useQuery({
    queryKey: ['applicant-stats', id],
    queryFn: () => fetchApplicantStats([id]),
    enabled: !!id,
    staleTime: 15000,
    refetchInterval: 30000,
  });
  const applicationCount = appStats?.[id]?.active ?? 0;

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => fetchPublicTasks({ mode: 'single', taskId: id }),
    // The cache holds either an array (fresh fetch) or a single object
    // (realtime/optimistic write) — normalise so the sheet never goes blank.
    select: selectTask,
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  // Auto-translate task content to the user's UI language (like Twitter)
  const { translatedTask, isTranslated, isLoading: isTranslating } = useTaskTranslation(task);

  // Rotate status label text every 3s for OPEN tasks
  useEffect(() => {
    if (!task || task.status !== 'OPEN' || applicationCount === 0) return;
    const iv = setInterval(() => setLabelRotIdx((i) => (i + 1) % 2), 3000);
    return () => clearInterval(iv);
  }, [task?.status, applicationCount]);

  // Fetch client + worker user data for trust badges
  const { data: clientUser } = useQuery({
    queryKey: ['publicUser', task?.client_id],
    queryFn: async () => {const u = await base44.entities.User.filter({ id: task.client_id });return u[0] || null;},
    enabled: !!task?.client_id,
    staleTime: 120000
  });
  const { data: workerUser } = useQuery({
    queryKey: ['publicUser', task?.worker_id],
    queryFn: async () => {const u = await base44.entities.User.filter({ id: task.worker_id });return u[0] || null;},
    enabled: !!task?.worker_id && ['TAKEN', 'COMPLETED', 'APPROVED_PENDING_DEPARTURE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'].includes(task?.status),
    staleTime: 30000,
  });

  // Check if MY application was approved for this task — only active ones
  const { data: myApp } = useQuery({
    queryKey: ['myApp', id, me?.id],
    queryFn: () => base44.entities.TaskApplication.filter({ task_id: id, worker_id: me.id }),
    select: (data) => {
      if (!data) return null;
      const arr = Array.isArray(data) ? data : [data];
      return arr.find((a) => a.status === 'pending' || a.status === 'approved') || null;
    },
    enabled: !!me?.id,
    // Never serve a cached verdict. The instant this worker is selected the
    // application becomes `approved` and the cancel control must disappear; a
    // minute-long stale window is what kept "בקשתך ממתינה" and its cancel button
    // on screen after the job had already been handed over.
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const isApproved = myApp?.status === 'approved';
  // The commitment fee is consumed at SELECTION, so once the job is this worker's
  // there is no pending application left to cancel — not even if a stale cache
  // still says `pending`, and not once the worker has set off.
  const assignedToMe = !!me?.id && task?.worker_id === me.id;
  const hasPendingApp = myApp?.status === 'pending' && !assignedToMe && !task?.worker_status;

  // Track click (entry into TaskDetail) — only for non-owners, once per session
  useEffect(() => {
    if (!task?.id) return;
    const isOwnerForTracking = me?.id ? (me.id === task.client_id) : false;
    if (!isOwnerForTracking) {
      trackTaskClick(task.id, queryClient);
    }
  }, [task?.id, me?.id]);

  // Detect when my application just got approved
  useEffect(() => {
    if (!myApp) return;
    const prev = prevWorkerIdRef.current;
    if (prev === 'pending' && myApp.status === 'approved') {
      setShowApprovedPopup(true);
      setConfetti(true);
      setTimeout(() => setConfetti(false), 100);
    }
    prevWorkerIdRef.current = myApp.status;
  }, [myApp?.status]);

  // Listen for no-show task reset event from WorkerTrackerBar
  useEffect(() => {
    const handleReset = () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['myApp', id, me?.id] });
    };
    window.addEventListener('task_reset_to_open', handleReset);
    return () => window.removeEventListener('task_reset_to_open', handleReset);
  }, [id, me?.id]);

  // Real-time task subscription — updates ['task', id] cache for TaskDetail.
  // Subscribes only on `id` (stable) — me?.id is read via ref to avoid re-subscribing on auth load.
  const meIdRef = useRef(me?.id);
  useEffect(() => { meIdRef.current = me?.id; }, [me?.id]);

  useEffect(() => {
    const unsubTask = base44.entities.Task.subscribe((event) => {
      if (event.id !== id) return;
      if (event.type === 'delete') {
        queryClient.setQueryData(['task', id], null);
        return;
      }
      if (!event.data) return;
      // Strip undefined so partial patch never overwrites existing fields with undefined
      const patch = Object.fromEntries(Object.entries(event.data).filter(([, v]) => v !== undefined));
      patchTaskCache(queryClient, id, patch);
      // Also keep activeWorkerTask / activeClientTask in sync so banner inside TaskDetail is live
      const currentMeId = meIdRef.current;
      if (currentMeId) {
        const TERMINAL = ['CANCELLED', 'COMPLETED', 'EXPIRED'];
        queryClient.setQueryData(['activeWorkerTask', currentMeId], (old) => {
          if (!old || old.id !== id) return old;
          if (patch.status && TERMINAL.includes(patch.status)) return null;
          return { ...old, ...patch };
        });
        queryClient.setQueryData(['activeClientTask', currentMeId], (old) => {
          if (!old || old.id !== id) return old;
          if (patch.status && TERMINAL.includes(patch.status)) return null;
          return { ...old, ...patch };
        });
      }
      if (patch.status === 'COMPLETED') {
        queryClient.invalidateQueries({ queryKey: ['myReview', id, currentMeId] });

        // ── THE SHEET MUST NOT OUTLIVE THE JOB ───────────────────────────────
        // The publisher approved the completion from INSIDE this sheet, so the
        // sheet stayed open on a task that was already finished — and the rating
        // popup then opened on top of it, leaving the user to close two layers of
        // a job that no longer existed.
        //
        // Closing it first is what lets the completion flow be READ: the sheet
        // drops away, the task card underneath shows its ✓, and only then does
        // the rating arrive. Deliberately a beat, not instant — the sheet
        // vanishing in the same frame as the approval would read as a dismissal
        // rather than a result. The rating is dispatched below and Layout holds it
        // for 800ms, so the card's ✓ is always seen before anything covers it.
        setTimeout(() => onSheetClose?.(), 300);

        // Reliable rating trigger for both owner and worker — dispatches with the
        // full cached task (now COMPLETED). Dedup in maybeShowRating (shownRatingRef
        // + localStorage) prevents double-popups if Layout's WebSocket handler also fires.
        const fullTask = selectTask(queryClient.getQueryData(['task', id]));
        if (fullTask && (fullTask.client_id === currentMeId || fullTask.worker_id === currentMeId)) {
          window.dispatchEvent(new CustomEvent('show_rating_modal', { detail: { task: fullTask } }));
        }
      }
    });

    const unsubApp = base44.entities.TaskApplication.subscribe((event) => {
      if (!event.data || event.data.task_id !== id) return;
      const app = event.data;
      const currentMeId = meIdRef.current;

      // applications-pulse for applicant counter
      queryClient.setQueryData(['applications-pulse', id], (old = []) => {
        if (event.type === 'create') return old.find(a => a.id === app.id) ? old : [...old, app];
        if (event.type === 'update') return old.map(a => a.id === app.id ? { ...a, ...app } : a);
        if (event.type === 'delete') return old.filter(a => a.id !== app.id);
        return old;
      });
      // myApp cache for current worker
      if (currentMeId && app.worker_id === currentMeId) {
        queryClient.setQueryData(['myApp', id, currentMeId], (old) => {
          if (event.type === 'delete') return null;
          if (event.type === 'create') return app;
          if (event.type === 'update') {
            if (app.status === 'cancelled' || app.status === 'rejected') return null;
            return old ? { ...old, ...app } : app;
          }
          return old;
        });
      }
      // applications list for owner
      queryClient.setQueryData(['applications', id], (old = []) => {
        if (!old) return old;
        if (event.type === 'create') return old.find(a => a.id === app.id) ? old : [...old, app];
        if (event.type === 'update') return old.map(a => a.id === app.id ? { ...a, ...app } : a);
        if (event.type === 'delete') return old.filter(a => a.id !== app.id);
        return old;
      });
    });

    return () => { unsubTask(); unsubApp(); };
  }, [id, queryClient]); // ← stable deps only — me?.id read via ref, no re-subscribe on auth load

  // Trigger the rating modal when opening an ALREADY-completed task — e.g. a user
  // who was outside the app (WebSocket missed the COMPLETED event) taps the push
  // notification, deep-links into the task sheet, and the rating popup never
  // appeared. Fires once the task + myReview query have resolved.
  const ratingTriggeredRef = useRef(false);
  useEffect(() => {
    if (ratingTriggeredRef.current) return;
    if (!me?.id || !task?.id || task.status !== 'COMPLETED') return;
    if (me.id !== task.client_id && me.id !== task.worker_id) return;
    if (myReview === undefined) return; // still loading
    if (myReview && myReview.id) return; // already reviewed
    ratingTriggeredRef.current = true;
    const t = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('show_rating_modal', { detail: { task } }));
    }, 900);
    return () => clearTimeout(t);
  }, [task?.id, task?.status, me?.id, myReview]);

  // Central update: write to DB — WebSocket event will propagate to Layout (single broadcaster)
  // which updates all shared caches. We only need to update the local ['task', id] cache optimistically.
  const handleWorkerUpdate = async (data) => {
    const patch = { ...data };
    // Optimistic update for TaskDetail view
    patchTaskCache(queryClient, id, patch, { create: false });
    // Persist to server — WebSocket fires and Layout handles all other caches
    await base44.entities.Task.update(id, patch);
  };

  // Rating popup is handled globally by Layout via WebSocket — no local logic needed here
  // Track task status changes for other side-effects
  useEffect(() => {
    prevTaskStatusRef.current = task?.status;
  }, [task?.status]);

  // Worker funnel — the worker opened this task listing.
  // 'session' dedup: counted once per task per app session, so rerenders and
  // reopening the sheet do not inflate the funnel.
  useEffect(() => {
    if (task?.id) {
      trackEvent('task_viewed', { category: task.category, city: task.city, value: task.price }, { dedupeKey: task.id });
    }
  }, [task?.id]);

  // Check expiry — update via backend function to avoid direct client-side status writes
  useEffect(() => {
    if (!task || task.status !== 'OPEN') return;
    if (task.expires_at && new Date(task.expires_at) < new Date()) {
      base44.functions.invoke('expireInactiveTasks', {}).catch(() => {}).finally(() => {
        queryClient.invalidateQueries({ queryKey: ['task', id] });
      });
    }
  }, [task?.id, task?.expires_at]);

  const takeMutation = useMutation({
    mutationFn: () => base44.functions.invoke('approveWorker', {
      taskId: id,
      applicationId: myApp?.id,
      workerId: me?.id,
      workerName: me?.full_name,
    }),
    onSuccess: (res) => {
      if (!res.data?.success && res.data?.error !== 'already_assigned') {
        toast.error(res.data?.error || t('error_taking_task'));
        return;
      }
      setTaskTaken(true);
      // Marketplace — a worker was selected for this task (deduped per task,
      // so the publisher-approval and worker-self-take paths never double-count).
      trackEvent('worker_selected', { category: task?.category, city: task?.city, value: task?.price }, { dedupeKey: id });
      // Sync all caches so the UI transitions from "go now" to the active
      // worker flow (WorkerStatusUpdater / ActiveTaskBanner) — the "go now"
      // and "יצאתי לדרך" buttons stay synchronized.
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['myApp', id, me?.id] });
      queryClient.invalidateQueries({ queryKey: ['activeWorkerTask', me?.id] });
      queryClient.invalidateQueries({ queryKey: ['applications', id] });
      queryClient.invalidateQueries({ queryKey: ['applications-pulse', id] });
      setConfetti(true);
      setTimeout(() => setConfetti(false), 100);
      toast.success(t('task_taken_toast'));
    },
    onError: (err) => {
      const errData = err?.response?.data || err?.data;
      if (errData?.error === 'already_assigned') {
        // Already taken (likely by this worker after a cache desync) — sync UI
        queryClient.invalidateQueries({ queryKey: ['task', id] });
        queryClient.invalidateQueries({ queryKey: ['myApp', id, me?.id] });
        return;
      }
      toast.error(errData?.error || t('error_taking_task'));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('cancelTaskPayment', { taskId: id });
      if (!res.data?.success) throw new Error(t('error_cancelling_task'));
    },
    onSuccess: () => {
      setShowCancelConfirm(false);
      invalidateTaskCaches(queryClient, { taskId: id, meId: me?.id });
      toast.success(t('task_cancelled_toast'));
      navigate('/');
    }
  });

  const reopenMutation = useMutation({
    mutationFn: () => base44.entities.Task.update(id, { status: 'OPEN', expires_at: null, worker_id: null, worker_name: null, worker_status: null, last_boost_at: null, boost_count: 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      queryClient.invalidateQueries({ queryKey: ['myPublishedTasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasksPage'] });
      toast.success(t('task_reopened_toast'));
      navigate(`/?newTaskId=${id}`);
    }
  });

  const cancelTakeMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('workerLeaveTask', { taskId: id });
      if (!res.data?.success) throw new Error(res.data?.error || 'שגיאה');
    },
    onSuccess: () => {
      // Clear application cache so the worker sees the task as fresh
      queryClient.setQueryData(['myApp', id, me?.id], null);
      invalidateTaskCaches(queryClient, { taskId: id, meId: me?.id });
      toast.success(t('left_task_credits_back'));
      navigate('/');
    }
  });

  const cancelApplicationMutation = useMutation({
    mutationFn: async () => {
      if (!myApp?.id) throw new Error('no application');
      const res = await base44.functions.invoke('cancelMyApplication', { applicationId: myApp.id, taskId: id });
      if (!res.data?.success) throw new Error(res.data?.error || 'שגיאה');
    },
    onMutate: () => {
      prevWorkerIdRef.current = null;
      queryClient.setQueryData(['myApp', id, me?.id], null);
      queryClient.setQueryData(['myApplicationsFeed', me?.id], (old = []) =>
        old.map((a) => a.id === myApp?.id ? { ...a, status: 'cancelled' } : a)
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myApp', id, me?.id] });
      queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed', me?.id] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['applications-pulse', id] });
      queryClient.invalidateQueries({ queryKey: ['applications', id] });
      toast.success(t('app_cancelled_credits_back'));
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['myApp', id, me?.id] });
      toast.error(t('error_cancel_app'));
    }
  });

  const handleApply = async (msgOverride, imagesOverride) => {
    if (applyLoading) return;
    setApplyLoading(true);
    const messageToSend = msgOverride !== undefined ? msgOverride : applyMessage;
    const imagesToSend = imagesOverride || [];
    try {
      const res = await base44.functions.invoke('applyForTask', { taskId: id, message: messageToSend, images: imagesToSend });
      const data = res.data;

      if (data?.error === 'already_applied') {
        setShowApplyForm(false);
        toast(t('already_applied_toast'));
        return;
      }

      const newApp = data?.application;
      if (!newApp) throw new Error(t('error_sending_app_toast'));

      // Sync caches with real server data — no need to invalidate immediately after setQueryData
      queryClient.setQueryData(['myApp', id, me?.id], newApp);
      queryClient.setQueryData(['myApplicationsFeed', me?.id], (old = []) => {
        const without = old.filter((a) => !(a.task_id === id && a.worker_id === me?.id));
        return [...without, newApp];
      });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['applications-pulse', id] });
      queryClient.invalidateQueries({ queryKey: ['applications', id] });
      setShowApplyForm(false);
      setHasApplied(true);
      // Worker funnel — deeper quality event. Fires only after the backend
      // returned a persisted application record.
      trackEvent(
        'application_submitted',
        { category: task?.category, city: task?.city, value: task?.price },
        { dedupeKey: newApp?.id || id }
      );
      toast.success(t('app_sent_n_credits').replace('{n}', data.credits_charged));
      // A web visitor who has just applied is worth offering the app to: the
      // publisher's approval arrives as a push notification, which only the
      // installed app can deliver. First application only.
      raiseAppOffer('apply');
    } catch (err) {
      // 403 = insufficient credits
      const status = err?.response?.status || err?.status;
      const errData = err?.response?.data || err?.data;
      if (status === 403 || errData?.error === 'insufficient_credits') {
        // Show the SHORTFALL, not the task's full cost — a worker holding 84
        // jobas on an 85-joba application is 1 short, not 85 short.
        setCreditsNeeded(creditsShortfall(errData, me?.worker_credits ?? authUser?.worker_credits ?? 0));
        setShowApplyForm(false);
        setShowBuyCredits(true);
      } else {
        toast.error(t('error_sending_app_toast'));
      }
    } finally {
      setApplyLoading(false);
    }
  };



  // Signal reopen - sends a chat message + creates a notification for task owner
  const handleSignalReopen = async () => {
    if (!me || !task?.client_id || signalSent) return;
    // Send chat message so owner sees it in chat inbox
    await base44.entities.ChatMessage.create({
      task_id: id,
      sender_id: me.id,
      sender_name: me.full_name,
      content: t('signal_reopen_msg').replace('{title}', task.title),
      thread_key: chatThreadKey(me.id, task.client_id),
      recipient_id: task.client_id,
    });
    // Also create a signal record on the task so owner can see interested workers
    await base44.entities.Task.update(id, {
      signal_worker_id: me.id,
      signal_worker_name: me.full_name
    });
    setSignalSent(true);
    toast.success(t('signal_sent_success'));
  };

  if (isLoading) {
    if (sheetMode) {
      return (
        <div dir={isRTL ? 'rtl' : 'ltr'} style={{ padding: '40px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <Loader2 size={28} className="animate-spin" color="var(--brand-primary)" />
        </div>
      );
    }
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} style={{ background: 'var(--surface-1)', minHeight: '100dvh' }}>
        <PageHeader title="" right={<div style={{ width: 60, height: 26, borderRadius: 20, background: '#e8edf5' }} className="animate-pulse" />} />
        <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Price hero skeleton */}
          <div style={{ borderRadius: 20, background: '#dce8f5', height: 110 }} className="animate-pulse" />
          {/* Description skeleton */}
          <div style={{ background: 'var(--brand-card-bg, var(--surface-2))', borderRadius: 20, border: '1px solid var(--border-1)', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ height: 14, width: '40%', borderRadius: 8, background: '#e8edf5' }} className="animate-pulse" />
            <div style={{ height: 13, width: '95%', borderRadius: 8, background: '#e8edf5' }} className="animate-pulse" />
            <div style={{ height: 13, width: '80%', borderRadius: 8, background: '#e8edf5' }} className="animate-pulse" />
            <div style={{ height: 13, width: '60%', borderRadius: 8, background: '#e8edf5' }} className="animate-pulse" />
          </div>
          {/* Details skeleton */}
          <div style={{ background: 'var(--brand-card-bg, var(--surface-2))', borderRadius: 20, border: '1px solid var(--border-1)', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[1, 2, 3].map((i) =>
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: '#e8edf5', flexShrink: 0 }} className="animate-pulse" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ height: 11, width: '30%', borderRadius: 6, background: '#e8edf5' }} className="animate-pulse" />
                  <div style={{ height: 14, width: '55%', borderRadius: 6, background: '#e8edf5' }} className="animate-pulse" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>);

  }
  if (!task) return <div className="p-8 text-center text-muted-foreground">{t('task_not_found')}</div>;

  const distKm = (() => {
    if (!userLocation || !task.lat || !task.lng) return null;
    const R = 6371;
    const dLat = (task.lat - userLocation.lat) * Math.PI / 180;
    const dLon = (task.lng - userLocation.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(task.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  })();

  const { mainDescription, extraLines } = parseDescription(translatedTask.description);

  const isOwner = me?.id === task.client_id;

  // Chat always opens the NORMAL Chat page, never a nested drawer. The sheet is
  // hidden first (keeping its history entry) so the conversation opens cleanly
  // and the user lands on the real chat screen they can navigate back from.
  const openChatWith = (otherId) => {
    if (!otherId) return;
    window.dispatchEvent(new CustomEvent('hide_task_sheet'));
    navigate(`/chat/${id}?with=${otherId}`);
  };
  const openChatWithCounterpart = () => {
    if (!me?.id || !task) return;
    openChatWith(me.id === task.client_id ? task.worker_id : task.client_id);
  };

  // Show boost pill for all open owner tasks — the pill itself handles charge state
  const boostAvailable = isOwner && task.status === 'OPEN' && !task.worker_id;

  const hasWorker = !!task.worker_id;
  const isWorker = me?.id === task.worker_id && task.status === 'TAKEN';
  const statusLabel = getStatusLabel(task.status, isOwner, t);
  const isExpired = task.status === 'EXPIRED';

  // hasApplied (local state) + myApp (server state) — both prevent showing the apply button
  const alreadyApplied = hasApplied || !!myApp;
  const canApplyManual = task.status === 'OPEN' && !isOwner && !hasWorker && !hasPendingApp && !isApproved && !alreadyApplied;

  // ── ONE status → tone mapping ─────────────────────────────────────────────
  // Every surface that shows this task (header chip, panel chip) reads the same
  // mapping, so a job can never look "in progress" in one place and "done" in
  // another. States and their meanings are unchanged — only their colour is.
  const statusTone =
    task.status === 'COMPLETED' ? 'success'
    : task.status === 'CANCELLED' ? 'danger'
    : task.status === 'EXPIRED' ? 'warning'
    : task.status === 'TAKEN' ? (task.worker_status === 'done' ? 'success' : 'brand')
    : 'brand';
  const StatusIcon =
    task.status === 'COMPLETED' ? CheckCircle2
    : task.status === 'CANCELLED' ? X
    : task.status === 'EXPIRED' ? AlertTriangle
    : task.status === 'TAKEN' ? Clock
    : null;

  // Native share sheet (Apple on iOS, Android/Google on Android). Falls back to
  // copying the link when the Web Share API is unavailable. The link opens the
  // task popup in the app (PWA deep link) or on the website if no app installed.
  const handleShare = async () => {
    const url = `${window.location.origin}/?open_task=${id}`;
    const shareData = { title: 'Joba24', url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        const ok = await copyToClipboard(url);
        if (ok) toast.success(t('share_link_copied'));
      }
    } catch (e) {
      if (e?.name !== 'AbortError') {
        const ok = await copyToClipboard(url);
        if (ok) toast.success(t('share_link_copied'));
      }
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ background: 'var(--surface-1)', paddingBottom: sheetMode ? 'max(24px, env(safe-area-inset-bottom))' : 'calc(80px + env(safe-area-inset-bottom))' }}>
      <TaskTakenConfetti trigger={confetti} />
      {showVerify && createPortal(<VerifyModal onClose={onVerifyClose} onSuccess={onVerifySuccess} />, document.body)}
      {showLoginPrompt && createPortal(
        <LoginPromptModal
          onLogin={() => {
            setShowLoginPrompt(false);
            login('login_title_apply_task');
          }}
          onClose={() => setShowLoginPrompt(false)}
          type="apply" />,

        document.body
      )}
      {showApprovedPopup && createPortal(
        <ApprovedPopup task={task} onClose={() => setShowApprovedPopup(false)} />,
        document.body
      )}








      {/* Worker exit confirmation popup */}
      {showExitWarning && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000001, background: 'var(--overlay-bg)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div dir={isRTL ? 'rtl' : 'ltr'} className="mobile-sheet" style={{ width: '100%', maxWidth: 480, padding: '20px 20px 0' }}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 20px' }} />
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🚪</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', marginBottom: 8 }}>{t('exit_task_title')}</div>
              <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
                {t('exit_task_body')}<br />
                <strong style={{ color: 'var(--text-1)' }}>{t('exit_task_note')}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => setShowExitWarning(false)}
                style={{ width: '100%', height: 52, borderRadius: 16, background: 'linear-gradient(135deg,var(--brand-btn-primary-bg, var(--brand-primary)),var(--brand-btn-primary-bg, var(--brand-primary-dark)))', border: 'none', color: 'var(--brand-btn-primary-text, white)', fontWeight: 900, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 16px rgba(26,111,212,0.35)' }}>
                
                {t('continue_in_task')}
              </button>
              <button
                onClick={() => {setShowExitWarning(false);cancelTakeMutation.mutate();}}
                disabled={cancelTakeMutation.isPending}
                style={{ width: '100%', height: 48, borderRadius: 16, background: 'white', border: '1px solid #fecaca', color: 'var(--color-danger)', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                
                {cancelTakeMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <><DoorOpen size={16} strokeWidth={1.8} /> {t('yes_exit_task')}</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {!sheetMode && <PageHeader title={translatedTask.title} right={null} />}
      

      <div style={{ padding: '8px 12px 0' }} className="space-y-2">
        {/* ══ HEADER — one hierarchy for every status and every role ═════════
            Status → title → facts → publisher → price. This is a surface like
            every other card in the app, not a coloured hero: brand colour is
            spent only on the status chip, the progress and the primary action.

            It is ALWAYS on screen — including for a job in progress. That is
            what lets the active task panel below drop the title, the price and
            the publisher: the header says them once, the panel says only what
            it alone can say. */}
        <div style={{
          background: 'var(--brand-card-bg, var(--surface-2))',
          border: '1px solid var(--border-1)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--shadow-xs)',
          padding: '12px 14px 14px',
        }}>
          {/* Status + the task's own actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
            <TaskChip tone={statusTone} icon={StatusIcon ? <StatusIcon size={11} strokeWidth={2.4} /> : null}>
              {statusLabel}
            </TaskChip>
            {isOwner && task.status === 'OPEN' && (
              <TaskChip tone="neutral">{applicationCount} {t('applications')}</TaskChip>
            )}
            <div style={{ flex: 1 }} />
            {isOwner && (task.status === 'OPEN' || task.status === 'EXPIRED' || task.status === 'TAKEN') && (
              <button
                className="j-icon-btn"
                onClick={(e) => { e.stopPropagation(); setShowOwnerMenu(v => !v); }}
                aria-label="More"
                style={HEADER_ICON_BTN}
              >
                <MoreVertical size={15} />
              </button>
            )}
            <button className="j-icon-btn" onClick={handleShare} aria-label={t('share_task')} style={HEADER_ICON_BTN}>
              <Share size={15} />
            </button>
            {sheetMode && (
              <button className="j-icon-btn" onClick={onSheetClose} aria-label="Close" style={HEADER_ICON_BTN}>
                <X size={15} />
              </button>
            )}
          </div>

          {/* Title */}
          <div style={{ fontSize: 19, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.3, letterSpacing: -0.3 }}>
            {translatedTask.title}
            {isTranslating && <Loader2 size={13} className="animate-spin" style={{ display: 'inline-block', marginInlineStart: 6, verticalAlign: 'middle', opacity: 0.6 }} />}
          </div>
          {isTranslated && (
            <div style={{ marginTop: 6 }}>
              <TaskChip tone="brand">{t('translated_badge')}</TaskChip>
            </div>
          )}

          {/* Where, how far, how fresh */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 8, fontSize: 11.5, fontWeight: 600, color: 'var(--text-3)' }}>
            {translatedTask.location_name && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--text-2)' }}>
                <MapPin size={11} strokeWidth={2} />
                {translatedTask.location_name}
                {distKm != null && !isNaN(distKm) && ` · ${distKm < 1 ? `${Math.round(distKm * 1000)}${t('meters_short')}` : `${distKm.toFixed(1)}${t('km_short')}`}`}
              </span>
            )}
            {task.created_date && getRelativeTime(task.created_date, t) && (
              <span>· {getRelativeTime(task.created_date, t)}</span>
            )}
          </div>

          {/* Publisher — the worker needs to know who they are dealing with;
              the publisher does not need to be shown their own name. */}
          {task.client_name && !isOwner && (
            <div style={{ marginTop: 10 }}>
              <UserBadge
                name={task.client_name}
                userId={task.client_id}
                verified={isUserVerified(clientUser) || task.client_verified}
                gold={hasSocialVerified(clientUser)}
                rating={task.client_rating}
                size="md"
              />
            </div>
          )}

          {/* Price — the number the task is really about */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, marginTop: 12, paddingTop: 11, borderTop: '1px solid var(--border-1)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap', minWidth: 0 }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1, letterSpacing: -0.6 }}>₪{Math.round(calculateCurrentPrice(task))}</span>
              {task.payment_method && (
                <span style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600 }}>
                  {task.payment_method === 'Cash' ? t('cash') : task.payment_method}
                </span>
              )}
              {(() => { const sub = formatHourlySublabel(task); return sub ? <span style={{ fontSize: 10.5, color: 'var(--text-2)', fontWeight: 600 }}>{sub}</span> : null; })()}
            </div>

            {/* Media — opens the lightbox, same tile the card shows */}
            {(() => {
              const allMedia = [
                ...(task.images || []).map(url => ({ type: 'image', url })),
                ...(task.video_url ? [{ type: 'video', url: task.video_url }] : []),
              ];
              if (!allMedia.length) return null;
              const cur = allMedia[mediaIdx] || allMedia[0];
              return (
                <div style={{ flexShrink: 0, position: 'relative', width: 84, height: 68 }}>
                  <button
                    onClick={() => { setLightboxIndex(mediaIdx); setLightboxOpen(true); }}
                    style={{ width: 84, height: 68, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-1)', background: 'var(--surface-3)', padding: 0, cursor: 'pointer', display: 'block' }}
                  >
                    {cur.type === 'image' ? (
                      <TaskImage src={cur.url} priority />
                    ) : (
                      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <video src={cur.url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                          <Play size={16} color="white" fill="white" />
                        </div>
                      </div>
                    )}
                  </button>
                  {allMedia.length > 1 && (
                    <div style={{ position: 'absolute', bottom: 4, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 3, pointerEvents: 'none' }}>
                      {allMedia.length <= 5 ? allMedia.map((_, i) => (
                        <span key={i} style={{ width: i === mediaIdx ? 9 : 4, height: 4, borderRadius: 3, background: i === mediaIdx ? 'var(--brand-primary)' : 'var(--border-2)' }} />
                      )) : (
                        <span style={{ fontSize: 9, color: 'var(--text-2)', fontWeight: 700, background: 'var(--surface-2)', borderRadius: 6, padding: '1px 5px' }}>{mediaIdx + 1}/{allMedia.length}</span>
                      )}
                    </div>
                  )}
                  {allMedia.length > 1 && (
                    <>
                      <button className="j-icon-btn" onClick={(e) => { e.stopPropagation(); setMediaIdx(i => (i - 1 + allMedia.length) % allMedia.length); }}
                        style={{ position: 'absolute', top: '50%', insetInlineStart: -6, transform: 'translateY(-50%)', width: 18, height: 18, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, zIndex: 2 }}>
                        <ChevronLeft size={10} color="var(--text-2)" strokeWidth={2.5} />
                      </button>
                      <button className="j-icon-btn" onClick={(e) => { e.stopPropagation(); setMediaIdx(i => (i + 1) % allMedia.length); }}
                        style={{ position: 'absolute', top: '50%', insetInlineEnd: -6, transform: 'translateY(-50%)', width: 18, height: 18, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, zIndex: 2 }}>
                        <ChevronRight size={10} color="var(--text-2)" strokeWidth={2.5} />
                      </button>
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Publisher's own numbers — quiet, one line */}
          {isOwner && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 11, paddingTop: 10, borderTop: '1px solid var(--border-1)' }}>
              {[
                { val: task.views_count || 0, label: t('views') },
                { val: task.clicks_count || 0, label: t('clicks') || t('entries') },
                { val: applicationCount, label: t('applications') },
              ].map(({ val, label }, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, minWidth: 0 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 900, color: 'var(--text-1)' }}>{val}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* A task whose time ran out — one clear way forward for each side */}
        {isExpired && (
          <div style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', borderRadius: 'var(--r-lg)', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <AlertTriangle size={18} color="var(--color-warning)" />
              <div>
                <div style={{ fontWeight: 800, color: 'var(--color-warning)', fontSize: 13.5 }}>{t('task_expired_title')}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 2 }}>{t('task_was_open_sub')}</div>
              </div>
            </div>
            {isOwner && (
              <Button
                onClick={() => {
                  if (task.payment_status === 'funded') {
                    window.dispatchEvent(new CustomEvent('hide_task_sheet'));
                    navigate(`/create-task?editId=${id}&repost=1`);
                  } else {
                    reopenMutation.mutate();
                  }
                }}
                disabled={reopenMutation.isPending}
                className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold h-11"
              >
                {reopenMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4 ml-2" />{t('reopen_task_btn')}</>}
              </Button>
            )}
            {!isOwner && !signalSent && (
              <Button onClick={() => gateAuth(handleSignalReopen)} variant="outline" className="w-full rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50 font-semibold h-11">
                <Send size={15} strokeWidth={1.8} style={{ marginInlineEnd: 6 }} /> {t('send_signal_owner')}
              </Button>
            )}
            {!isOwner && signalSent && (
              <div style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', borderRadius: 'var(--r-md)', padding: '11px 14px' }}>
                <div style={{ fontWeight: 800, color: 'var(--color-success)', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={15} /> {t('signal_sent_ok')}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 3 }}>{t('awaiting_reopen_label')}</div>
              </div>
            )}
          </div>
        )}

        {/* ══ ACTIVE TASK PANEL — status, progress and the next action ══════
            Reads the shared activeWorkerTask/activeClientTask cache, exactly like
            the feed does, so both sides stay in sync. `inSheet` tells it the
            header above already prints the title, the price and the publisher. */}
        {task.status === 'TAKEN' && (isOwner || me?.id === task.worker_id) && (
          <ActiveTaskBannerFromCache
            taskId={id}
            isWorker={me?.id === task.worker_id}
            extraInfo={{
              inSheet: true,
              clientName: task.client_name,
              clientId: task.client_id,
              clientRating: task.client_rating,
              clientVerified: task.client_verified,
              workerUser: workerUser,
              locationName: task.location_name,
              createdDate: task.created_date,
              viewsCount: task.views_count,
              clicksCount: task.clicks_count,
              applicationCount,
              contactPhone: task.contactPhone,
              isOwner,
              onOwnerMenu: () => setShowOwnerMenu(v => !v),
              onQuickChat: openChatWithCounterpart,
              onSheetClose,
            }}
          />
        )}

        {/* מועד חדש — זמין לשני הצדדים לאחר שנקבעה עבודה */}
        {task.status === 'TAKEN' && (isOwner || me?.id === task.worker_id) && (
          <ScheduleChangeCard task={task} me={me} />
        )}

        {/* ══ DYNAMIC ACTION ZONE — one primary action for this role and state ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Worker approved for an open task — go now, or step back */}
          {isApproved && !isWorker && task.status === 'OPEN' && (
            <div style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', borderRadius: 'var(--r-md)', padding: '11px 12px' }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--color-success)', marginBottom: 8 }}>{t('your_app_approved')}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <TaskActionButton variant="success" height={44} loading={takeMutation.isPending} onClick={() => takeMutation.mutate()}>
                    {t('go_now_action')}
                  </TaskActionButton>
                </div>
                <button
                  onClick={() => cancelApplicationMutation.mutate()}
                  disabled={cancelApplicationMutation.isPending}
                  style={{ height: 44, padding: '0 14px', borderRadius: 'var(--r-md)', background: 'transparent', border: '1px solid var(--color-success-border)', color: 'var(--text-2)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          )}

          {/* Apply — the worker's one action on an open task */}
          {canApplyManual && !showApplyForm && (
            <>
              <TaskActionButton
                icon={<Send size={15} strokeWidth={2} />}
                onClick={() => {
                  if (!isAuthenticated) { setShowLoginPrompt(true); return; }
                  if (task.verification_required && !isUserVerified(verifyUser)) {
                    if (verifyUser?.kyc_status === 'pending') { setShowVerificationPending(true); } else { setShowVerificationRequired(true); }
                    return;
                  }
                  setShowApplyForm(true);
                }}
              >
                {t('apply_to_task')} · {Math.max(1, Math.round((Math.round(calculateCurrentPrice(task)) || 0) * 0.05))} <CreditIcon size={14} />
              </TaskActionButton>
              <div style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'center', fontWeight: 600, lineHeight: 1.4 }}>
                {t('td_apply_return_note')}
              </div>
            </>
          )}

          {/* Pending application */}
          {hasPendingApp && !isOwner && (
            <div style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', borderRadius: 'var(--r-md)', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-warning)', flexShrink: 0, animation: 'pulse-app 1.5s infinite', display: 'inline-block' }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-warning)' }}>{t('your_app_pending')}</span>
            </div>
          )}

          {/* Talking to the publisher before the job starts */}
          {!isOwner && (hasPendingApp || isApproved) && (
            <div style={{ display: 'flex', gap: 8 }}>
              <TaskActionButton variant="secondary" height={40} icon={<MessageCircle size={14} />} onClick={openChatWithCounterpart}>
                {t('message_to_publisher')}
              </TaskActionButton>
              {hasPendingApp && (
                <button
                  onClick={() => cancelApplicationMutation.mutate()}
                  disabled={cancelApplicationMutation.isPending}
                  style={{ height: 40, padding: '0 12px', borderRadius: 'var(--r-md)', background: 'transparent', border: '1px solid var(--border-1)', color: 'var(--text-2)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
                >
                  {cancelApplicationMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <X size={12} />} {t('cancel_application_btn')}
                </button>
              )}
            </div>
          )}

          {/* Publisher, task still open — scanning, then the applicants */}
          {isOwner && task.status === 'OPEN' && (
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, height: 54 }}>
              {applicationCount === 0 ? (
                <div style={{ flex: 1, background: 'var(--surface-3)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px' }}>
                  <span style={{ position: 'relative', width: 14, height: 14, flexShrink: 0 }}>
                    <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid var(--border-2)', animation: 'scanRing 1.4s ease-in-out infinite' }} />
                    <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(var(--brand-primary) 0deg, transparent 90deg, transparent 360deg)', animation: 'scanSweep 1.4s linear infinite' }} />
                    <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 3, height: 3, borderRadius: '50%', background: 'var(--brand-primary)' }} />
                  </span>
                  <ScanningLabelDetail t={t} />
                </div>
              ) : (
                <button
                  onClick={() => document.getElementById('task-applicants-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  style={{ flex: 1, background: 'linear-gradient(135deg,#f59e0b,var(--color-warning))', borderRadius: 'var(--r-md)', border: 'none', color: '#ffffff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', cursor: 'pointer', textAlign: 'start', boxShadow: '0 4px 14px rgba(245,158,11,0.28)' }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>{applicationCount} {t('applications')}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', marginTop: 1 }}>{t('click_to_view_approve')}</div>
                  </div>
                </button>
              )}
              {boostAvailable && (
                <div style={{ width: 54, flexShrink: 0 }}>
                  <BoostPill task={task} size="md" onSheetClose={onSheetClose} onBoostDone={() => { queryClient.invalidateQueries({ queryKey: ['me'] }); queryClient.invalidateQueries({ queryKey: ['task', id] }); }} />
                </div>
              )}
            </div>
          )}

          {/* Report — the exception, kept quiet */}
          {!isOwner && (
            <button
              onClick={() => { if (!isAuthenticated) { setShowLoginPrompt(true); return; } setShowReport(true); }}
              style={{ width: '100%', height: 30, background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
            >
              <Flag size={10} /> {t('report_task_btn')}
            </button>
          )}
        </div>
        <style>{`@keyframes livePing{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(2.5);opacity:0}}@keyframes scanRing{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(1.35);opacity:0}}@keyframes scanSweep{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

        {/* Applicants for owner — show when OPEN or TAKEN before worker started */}
        {isOwner && (task.status === 'OPEN' || (task.status === 'TAKEN' && !task.worker_status)) &&
        <div id="task-applicants-section">
          <TaskApplicants task={task} onApprove={() => queryClient.refetchQueries({ queryKey: ['task', id] })} />
        </div>
        }

        {/* Invoice section — visible to both client and worker when invoice exists */}
        {task.status === 'COMPLETED' && task.invoice_html && (isOwner || isWorker) && (
          <div style={{ background: 'var(--brand-card-bg, var(--surface-2))', borderRadius: 'var(--r-lg)', border: '1px solid var(--border-1)', boxShadow: 'var(--shadow-xs)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}>
              <FileText size={22} color="white" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#6d28d9' }}>{t('td_invoice_available')}</div>
              <div style={{ fontSize: 12, color: '#7c3aed', marginTop: 2 }}>
                {isOwner ? t('td_invoice_owner') : t('td_invoice_worker')}
              </div>
            </div>
            <button
              onClick={() => setShowInvoiceView(true)}
              style={{ height: 40, padding: '0 18px', borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', border: 'none', color: 'var(--brand-btn-primary-text, white)', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, boxShadow: '0 3px 12px rgba(124,58,237,0.35)' }}
            >
              <FileText size={15} /> {t('td_view_download')}
            </button>
          </div>
        )}

        {/* Task location map — shown for all tasks with location (including TAKEN/active) */}
        {task.lat && task.lng && !['CANCELLED', 'EXPIRED'].includes(task.status) &&
        <Suspense fallback={<div style={{ height: 168, margin: '8px 12px 0', borderRadius: 20, background: 'var(--surface-3)' }} className="animate-pulse" />}>
          <TaskLocationMap
            task={task}
            onGenerateInvoice={task.status === 'COMPLETED' && me?.id === task.worker_id ? () => setShowInvoice(true) : undefined}
          />
        </Suspense>
        }





        {/* ── Task Details Card ───────────────────────────────────────── */}
        {(task.category ||
          task.address_building || task.address_floor || task.address_apartment || task.address_notes ||
          task.requirements ||
          task.category_details ||
          (isOwner && task.auto_bump_enabled && task.base_price && task.max_price)) && (
          <div style={{ background: 'var(--brand-card-bg, var(--surface-2))', borderRadius: 'var(--r-lg)', border: '1px solid var(--border-1)', boxShadow: 'var(--shadow-xs)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Auto-bump — owner only, at top */}
            {isOwner && task.auto_bump_enabled && task.base_price && task.max_price && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '9px 14px' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#92400e', marginBottom: 4 }}>{t('auto_price_increase_title')}</div>
                <div style={{ fontSize: 12, color: '#b45309', lineHeight: 1.5 }}>
                  {t('price_increase_detail')}
                  {applicationCount > 0
                    ? <span style={{ color: 'var(--color-success)', fontWeight: 700, display: 'block', marginTop: 2 }}>{t('price_frozen_label').replace('{price}', Math.round(calculateCurrentPrice(task)))} — {t('got_request_label')}</span>
                    : <span style={{ display: 'block', marginTop: 2 }}>{t('now_label')}: ₪{Math.round(calculateCurrentPrice(task))} · {t('auto_stops_label')}</span>}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.5 }}>{t('task_details_title')}</div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(task.id);
                  setIdCopied(true);
                  setTimeout(() => setIdCopied(false), 2000);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: idCopied ? 'var(--color-success)' : 'var(--text-3)', fontFamily: 'monospace', background: idCopied ? '#f0fdf4' : 'var(--surface-3)', borderRadius: 6, padding: '2px 7px', letterSpacing: 0.3, border: idCopied ? '1px solid #bbf7d0' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                title={t('td_copy_id')}
              >
                {idCopied ? (
                  <>{t('id_copied') || 'הועתק'} <CheckCircle2 size={11} color="var(--color-success)" /></>
                ) : (
                  <>#{task.id?.slice(-8)}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></>
                )}
              </button>
            </div>

            {/* ── The SAME rows the task card shows ───────────────────────────
                This card used to hand-roll its own list, which had quietly
                drifted from the card's: urgency, the full description and the
                task's own location were simply never rendered here, so the
                sheet was missing details the card already showed. It now uses
                the shared component the card dropdown uses, so the two can
                never disagree again. The heading above stays (it carries the
                copyable id), so the component's own heading is suppressed. */}
            <TaskDetailsRows task={task} showTaskDetailsLabel={false} />
          </div>
        )}

        {/* Contact Phone — mutual reveal after approval; hidden when TAKEN (shown in banner instead) */}
        {(() => {
          // Worker sees client's phone only if their application is approved
          const workerSeesPhone = isApproved && task.contactPhone;
          // Owner sees worker's phone when task is active or completed
          const ownerSeesWorkerPhone = isOwner && ['TAKEN', 'COMPLETED', 'APPROVED_PENDING_DEPARTURE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'].includes(task.status) && workerUser?.phone;
          if (!workerSeesPhone && !ownerSeesWorkerPhone) return null;
          // Hide the standalone phone card when TAKEN — phone is already in the ActiveTaskBanner above
          if (task.status === 'TAKEN' && (isOwner || isWorker)) return null;
          const phone = workerSeesPhone ? task.contactPhone : workerUser?.phone;
          const label = workerSeesPhone ? t('td_phone_publisher') : t('td_phone_worker');
          return (
            <a
              href={`tel:${phone}`}
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div style={{
                background: 'var(--brand-card-bg, var(--surface-2))',
                border: `1px solid var(--color-success-border)`,
                borderRadius: 'var(--r-lg)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                boxShadow: 'var(--shadow-xs)',
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--color-success-border)' }}>
                  <Phone size={19} color="var(--color-success)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)', letterSpacing: 0.3, direction: 'ltr', textAlign: 'start' }}>{phone}</div>
                </div>
                <div style={{ height: 40, padding: '0 14px', borderRadius: 'var(--r-md)', background: 'var(--color-success)', color: '#ffffff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <Phone size={14} /> {t('td_call_btn')}
                </div>
              </div>
            </a>
          );
        })()}

        {/* Actions */}
        {(canApplyManual || (task.status === 'COMPLETED' && (me?.id === task.client_id || me?.id === task.worker_id)) || (isOwner && ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(task.status)) || (isWorker && task.status === 'TAKEN')) && (
          <TaskDetailActions
            task={task} me={me} id={id}
            isOwner={isOwner} isWorker={isWorker}
            canApplyManual={canApplyManual}
            myApp={myApp} myReview={myReview}
            applyLoading={applyLoading}
            onSheetClose={onSheetClose}
            onApply={(msg, imgs) => { setApplyMessage(msg); handleApply(msg, imgs); }}
            onSetShowApplyForm={setShowApplyForm}
            showApplyForm={showApplyForm}
          />
        )}
      </div>

      {showVerificationRequired && createPortal(
        <VerificationRequiredModal
          onClose={() => setShowVerificationRequired(false)}
          onVerify={() => { setShowVerificationRequired(false); setShowVerify(true); }}
        />,
        document.body
      )}

      {showVerificationPending && createPortal(
        <VerificationPendingModal onClose={() => setShowVerificationPending(false)} />,
        document.body
      )}

      {/* Purchase popup — must render from inside the sheet too, otherwise the
          "not enough jobas" flow from the task sheet does nothing. */}
      {showBuyCredits && createPortal(
        <Suspense fallback={null}>
          <BuyCreditsModal
            creditsNeeded={creditsNeeded}
            onClose={() => { setShowBuyCredits(false); setCreditsNeeded(null); }}
          />
        </Suspense>,
        document.body
      )}

      {showReport && task && createPortal(
        <ReportModal task={task} me={me} onClose={() => setShowReport(false)} />,
        document.body
      )}
      {showRating && task && me && createPortal(
        <RatingModal task={task} me={me} onClose={() => setShowRating(false)} />,
        document.body
      )}

      {/* Owner 3-dot bottom sheet */}
      {showOwnerMenu && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000001, background: 'var(--overlay-bg)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowOwnerMenu(false)}>
          <div dir={isRTL ? 'rtl' : 'ltr'} className="mobile-sheet" style={{ width: '100%', maxWidth: 480, padding: '20px 20px 0' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-3)', marginBottom: 12, paddingRight: 4, letterSpacing: 0.3 }}>{t('task_actions_title')}</div>
            {(task.status === 'OPEN' || task.status === 'EXPIRED') &&
            <div onClick={() => { setShowOwnerMenu(false); window.dispatchEvent(new CustomEvent('hide_task_sheet')); navigate(`/create-task?editId=${id}`); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 6px', borderBottom: '1px solid #f0f4fa', cursor: 'pointer' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 13, background: 'var(--brand-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Pencil size={17} color="var(--brand-primary)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{t('edit_task_title')}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{t('edit_task_sub')}</div>
                  </div>
                </div>
              </div>
            }
            <div
              onClick={() => {
                setShowOwnerMenu(false);
                const workerIsActive = ['on_the_way', 'delayed', 'parking', 'arrived', 'starting', 'finishing', 'done'].includes(task.worker_status);
                if (task.status === 'TAKEN' && workerIsActive) {
                  window.dispatchEvent(new CustomEvent('show_cancel_warning', { detail: { task } }));
                } else {setShowCancelConfirm(true);}
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 6px', cursor: 'pointer' }}>
              
              <div style={{ width: 40, height: 40, borderRadius: 13, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <X size={17} color="var(--color-danger)" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-danger)' }}>{t('cancel_task_title')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{t('cancel_task_sub')}</div>
              </div>
            </div>
            <div
              onClick={() => { setShowOwnerMenu(false); setShowDeleteConfirm(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 6px', cursor: 'pointer' }}>
              <div style={{ width: 40, height: 40, borderRadius: 13, background: 'var(--color-danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={17} color="var(--color-danger)" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-danger)' }}>{t('delete_task_title') || 'מחיקת משימה'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{t('delete_task_sub') || 'מחיקה סופית — לא ניתן לשחזר'}</div>
              </div>
            </div>
            <div style={{ height: 'max(24px, env(safe-area-inset-bottom))' }} />
          </div>
        </div>,
        document.body
      )}



      {showDeleteConfirm && task && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000002, background: 'var(--overlay-bg)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowDeleteConfirm(false)}>
          <div dir={isRTL ? 'rtl' : 'ltr'} className="mobile-sheet" style={{ width: '100%', maxWidth: 480, padding: '20px 20px 0' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)', marginBottom: 6 }}>{t('delete_task_title') || 'מחיקת משימה'}</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 18 }}>{t('delete_task_confirm') || 'המשימה תימחק לצמיתות. לא ניתן לשחזר פעולה זו.'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}
                style={{ width: '100%', height: 48, borderRadius: 14, background: 'var(--color-danger)', border: 'none', color: 'white', fontWeight: 900, fontSize: 15, cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {deleteMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <><Trash2 size={16} /> {t('delete_task_btn') || 'מחק משימה'}</>}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} disabled={deleteMutation.isPending}
                style={{ width: '100%', height: 44, borderRadius: 14, background: 'var(--surface-3)', border: '1px solid var(--border-1)', color: 'var(--text-1)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {t('cancel')}
              </button>
            </div>
            <div style={{ height: 'max(24px, env(safe-area-inset-bottom))' }} />
          </div>
        </div>,
        document.body
      )}

      {showInvoice && task && me && createPortal(
        <InvoiceModal task={task} me={me} onClose={() => setShowInvoice(false)} />,
        document.body
      )}

      {showInvoiceView && task?.invoice_html && createPortal(
        <InvoiceViewModal invoiceHtml={task.invoice_html} onClose={() => setShowInvoiceView(false)} />,
        document.body
      )}



      {showCancelConfirm && task && createPortal(
        <CancelTaskConfirmModal
          task={task}
          isLoading={cancelMutation.isPending}
          onConfirm={() => cancelMutation.mutate()}
          onClose={() => setShowCancelConfirm(false)} />,

        document.body
      )}

      {/* Task media lightbox */}
      {task &&
      <MediaLightbox
        isOpen={lightboxOpen}
        items={[
          ...(task.images || []).map((url) => ({ type: 'image', url })),
          ...(task.video_url ? [{ type: 'video', url: task.video_url }] : []),
        ]}
        initialIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)} />
      }

      {/* Completion proof lightbox — separate from task media */}
      {task &&
      <MediaLightbox
        isOpen={completionLightboxOpen}
        items={[
          ...(task.completion_photos || []).map((url) => ({ type: 'image', url })),
          ...(task.completion_video_url ? [{ type: 'video', url: task.completion_video_url }] : []),
        ]}
        initialIndex={completionLightboxIndex}
        onClose={() => setCompletionLightboxOpen(false)} />
      }
    </div>);

}