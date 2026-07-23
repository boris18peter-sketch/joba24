import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Star, MessageCircle, Flag, CheckCircle2, Loader2, Pencil, RefreshCw, AlertTriangle, Send, DoorOpen, X, Play, MoreVertical, ChevronLeft, ChevronRight, FileText, Phone } from 'lucide-react';
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
import CreditIcon from '@/components/CreditIcon';
import { getCategoryLabel } from '@/lib/categories';
import { getActiveRequirements } from '@/lib/requirements';
import TaskDetailsRows from '@/components/TaskDetailsRows.jsx';
import CategoryDetailsView from '@/components/CategoryDetailsView';
import { calculateCurrentPrice, getHourlyBreakdown, formatHoursLabel, formatHourlySublabel, formatScheduleSlots } from '@/lib/priceCalculator';
import { isUserVerified } from '@/lib/utils';

const CATEGORY_EMOJI = {
  plumbing: '🔧', electricity: '⚡', gardening: '🌿', cleaning: '🧹', car: '🚗',
  moving: '📦', painting: '🎨', carpentry: '🪚', ac: '❄️',
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
import BuyCreditsModal from '@/components/BuyCreditsModal';
import PageHeader from '@/components/PageHeader';
import TrustBadges from '@/components/TrustBadges';
import { parseDescription } from '@/lib/descriptionParser';
import { trackTaskClick } from '@/hooks/useTrackTaskEvent';
import BoostPill from '@/components/BoostPill';
import ActiveTaskBanner from '@/components/ActiveTaskBanner';
import ActiveTaskBannerFromCache from '@/components/ActiveTaskBannerFromCache';
import { useLanguage } from '@/lib/LanguageContext';

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
      <div style={{ fontSize: 13, fontWeight: 800, color: 'white', opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}>
        {scanningTexts[textIdx]}
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>{t('task_exposed_detail')}</div>
    </div>
  );
}

import TaskLocationMap from '@/components/TaskLocationMap';


import ApplySheet from '@/components/ApplySheet';
import QuickChatDrawer from '@/components/QuickChatDrawer';
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
const statusConfig = {
  OPEN: { label: 'פתוח', color: 'text-blue-700 bg-blue-100' },
  TAKEN: { label: 'בביצוע', color: 'text-indigo-700 bg-indigo-100' },
  COMPLETED: { label: 'הושלם', color: 'text-gray-700 bg-gray-100' },
  CANCELLED: { label: 'בוטל', color: 'text-red-700 bg-red-100' },
  EXPIRED: { label: 'פג תוקף', color: 'text-orange-700 bg-orange-100' }
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
  const { t } = useLanguage();
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
  const [showQuickChat, setShowQuickChat] = useState(false);
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
  const [descExpanded, setDescExpanded] = useState(false);
  const prevWorkerIdRef = useRef(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, () => {}, { timeout: 5000 });
    }
  }, []);
  const prevTaskStatusRef = useRef(null);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me(), enabled: isAuthenticated });
  // Use the real-time auth user for verification gating (instantly synced via WebSocket + polling)
  const verifyUser = authUser || me;
  const { gate, showVerify, setShowVerify, onSuccess: onVerifySuccess, onClose: onVerifyClose } = useVerifyGuard(verifyUser);

  // Check if current user already reviewed this task
  const { data: myReview } = useQuery({
    queryKey: ['myReview', id, me?.id],
    queryFn: () => base44.entities.Review.filter({ task_id: id, reviewer_id: me.id }),
    select: (data) => data[0] ?? null,
    enabled: !!me?.id
  });
  // Application count for live activity in banner
  const { data: taskApplications = [] } = useQuery({
    queryKey: ['applications-pulse', id],
    queryFn: () => base44.entities.TaskApplication.filter({ task_id: id }),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const applicationCount = taskApplications.filter((a) => a.status === 'pending' || a.status === 'approved').length;

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => base44.entities.Task.filter({ id }),
    select: (data) => data[0],
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

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
    staleTime: 60000,
  });
  const isApproved = myApp?.status === 'approved';
  const hasPendingApp = myApp?.status === 'pending' && myApp?.status !== 'cancelled';

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
      queryClient.setQueryData(['task', id], (old) => old ? { ...old, ...patch } : patch);
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

  // Central update: write to DB — WebSocket event will propagate to Layout (single broadcaster)
  // which updates all shared caches. We only need to update the local ['task', id] cache optimistically.
  const handleWorkerUpdate = async (data) => {
    const patch = { ...data };
    // Optimistic update for TaskDetail view
    queryClient.setQueryData(['task', id], (old) => old ? { ...old, ...patch } : old);
    // Persist to server — WebSocket fires and Layout handles all other caches
    await base44.entities.Task.update(id, patch);
  };

  // Rating popup is handled globally by Layout via WebSocket — no local logic needed here
  // Track task status changes for other side-effects
  useEffect(() => {
    prevTaskStatusRef.current = task?.status;
  }, [task?.status]);

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
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      setConfetti(true);
      setTimeout(() => setConfetti(false), 100);
      toast.success(t('task_taken_toast'));
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('cancelTaskPayment', { taskId: id });
      if (!res.data?.success) throw new Error(t('error_cancelling_task'));
    },
    onSuccess: () => {
      setShowCancelConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasksPage'] });
      toast.success(t('task_cancelled_toast'));
      onSheetClose?.();
      window.dispatchEvent(new CustomEvent('close_task_sheet'));
      navigate('/');
    }
  });

  const reopenMutation = useMutation({
    mutationFn: () => base44.entities.Task.update(id, { status: 'OPEN', expires_at: null, worker_id: null, worker_name: null, worker_status: null, last_boost_at: null, boost_count: 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasksPage'] });
      toast.success(t('task_reopened_toast'));
      onSheetClose?.();
      window.dispatchEvent(new CustomEvent('close_task_sheet'));
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
      queryClient.invalidateQueries({ queryKey: ['myApp', id, me?.id] });
      queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed', me?.id] });
      queryClient.invalidateQueries({ queryKey: ['applications', id] });
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['creditTxns', me?.id] });
      toast.success(t('left_task_credits_back'));
      onSheetClose?.();
      window.dispatchEvent(new CustomEvent('close_task_sheet'));
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
      toast.success(t('app_sent_n_credits').replace('{n}', data.credits_charged));
    } catch (err) {
      // 403 = insufficient credits
      const status = err?.response?.status || err?.status;
      const errData = err?.response?.data || err?.data;
      if (status === 403 || errData?.error === 'insufficient_credits') {
        const needed = errData?.credits_required;
        setCreditsNeeded(needed || null);
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
      content: t('signal_reopen_msg').replace('{title}', task.title)
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
        <div dir="rtl" style={{ padding: '40px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <Loader2 size={28} className="animate-spin" color="#1a6fd4" />
        </div>
      );
    }
    return (
      <div dir="rtl" style={{ background: 'var(--surface-1)', minHeight: '100dvh' }}>
        <PageHeader title="" right={<div style={{ width: 60, height: 26, borderRadius: 20, background: '#e8edf5' }} className="animate-pulse" />} />
        <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Price hero skeleton */}
          <div style={{ borderRadius: 20, background: '#dce8f5', height: 110 }} className="animate-pulse" />
          {/* Description skeleton */}
          <div style={{ background: 'var(--surface-2)', borderRadius: 20, border: '1px solid var(--border-1)', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ height: 14, width: '40%', borderRadius: 8, background: '#e8edf5' }} className="animate-pulse" />
            <div style={{ height: 13, width: '95%', borderRadius: 8, background: '#e8edf5' }} className="animate-pulse" />
            <div style={{ height: 13, width: '80%', borderRadius: 8, background: '#e8edf5' }} className="animate-pulse" />
            <div style={{ height: 13, width: '60%', borderRadius: 8, background: '#e8edf5' }} className="animate-pulse" />
          </div>
          {/* Details skeleton */}
          <div style={{ background: 'var(--surface-2)', borderRadius: 20, border: '1px solid var(--border-1)', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
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

  const STATUS_GRADIENT = {
    OPEN: 'linear-gradient(135deg, #1a6fd4 0%, #3b82f6 100%)',
    TAKEN: task.worker_status === 'done' ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : 'linear-gradient(135deg, #1a6fd4 0%, #3b82f6 100%)',
    COMPLETED: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    CANCELLED: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)',
    EXPIRED: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)'
  };
  const STATUS_PILL = {
    OPEN: { background: '#eff6ff', color: '#1a6fd4', border: '1px solid #bfdbfe' },
    TAKEN: { background: '#fffbeb', color: '#d97706', border: '1px solid #fcd34d' },
    COMPLETED: { background: '#f0fdf4', color: '#059669', border: '1px solid #86efac' },
    CANCELLED: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' },
    EXPIRED: { background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa' }
  };
  const taskGradient = STATUS_GRADIENT[task.status] || STATUS_GRADIENT.OPEN;

  const distKm = (() => {
    if (!userLocation || !task.lat || !task.lng) return null;
    const R = 6371;
    const dLat = (task.lat - userLocation.lat) * Math.PI / 180;
    const dLon = (task.lng - userLocation.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(task.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  })();

  const { mainDescription, extraLines } = parseDescription(task.description);

  const isOwner = me?.id === task.client_id;

  // Show boost pill for all open owner tasks — the pill itself handles charge state
  const boostAvailable = isOwner && task.status === 'OPEN' && !task.worker_id;

  const hasWorker = !!task.worker_id;
  const isWorker = me?.id === task.worker_id && task.status === 'TAKEN';
  const statusLabel = getStatusLabel(task.status, isOwner, t);
  const isExpired = task.status === 'EXPIRED';

  // hasApplied (local state) + myApp (server state) — both prevent showing the apply button
  const alreadyApplied = hasApplied || !!myApp;
  const canApplyManual = task.status === 'OPEN' && !isOwner && !hasWorker && !hasPendingApp && !isApproved && !alreadyApplied;
  const status = statusConfig[task.status] || statusConfig.OPEN;

  return (
    <div dir="rtl" style={{ background: 'var(--surface-1)', paddingBottom: sheetMode ? 'max(24px, env(safe-area-inset-bottom))' : 'calc(80px + env(safe-area-inset-bottom))' }}>
      <TaskTakenConfetti trigger={confetti} />
      {showVerify && createPortal(<VerifyModal onClose={onVerifyClose} onSuccess={onVerifySuccess} />, document.body)}
      {showLoginPrompt && createPortal(
        <LoginPromptModal
          onLogin={() => {
            setShowLoginPrompt(false);
            login();
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
        <div className="mobile-sheet-overlay">
          <div dir="rtl" className="mobile-sheet" style={{ width: '100%', maxWidth: 480, padding: '20px 20px 0' }}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 20px' }} />
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🚪</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#0f1e40', marginBottom: 8 }}>{t('exit_task_title')}</div>
              <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
                {t('exit_task_body')}<br />
                <strong style={{ color: '#0f1e40' }}>{t('exit_task_note')}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => setShowExitWarning(false)}
                style={{ width: '100%', height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', border: 'none', color: 'white', fontWeight: 900, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 16px rgba(26,111,212,0.35)' }}>
                
                {t('continue_in_task')}
              </button>
              <button
                onClick={() => {setShowExitWarning(false);cancelTakeMutation.mutate();}}
                disabled={cancelTakeMutation.isPending}
                style={{ width: '100%', height: 48, borderRadius: 16, background: 'white', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                
                {cancelTakeMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <><DoorOpen size={16} strokeWidth={1.8} /> {t('yes_exit_task')}</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {!sheetMode && <PageHeader title={task.title} right={null} />}
      

      {/* ActiveTaskBanner — reads from the shared activeWorkerTask/activeClientTask cache
          (same source as HomeFeed) so status updates are always in sync */}
      {task.status === 'TAKEN' && (isOwner || me?.id === task.worker_id) && (
        <ActiveTaskBannerFromCache
          taskId={id}
          isWorker={me?.id === task.worker_id}
          extraInfo={{
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
            onQuickChat: () => setShowQuickChat(true),
          }}
        />
      )}

      <div style={{ padding: '8px 12px 0' }} className="space-y-2">
        {/* Expired banner */}
        {isExpired &&
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 20, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <AlertTriangle size={20} color="#f97316" />
              <div>
                <div style={{ fontWeight: 800, color: '#c2410c', fontSize: 14 }}>{t('task_expired_title')}</div>
                <div style={{ fontSize: 12, color: '#ea580c', marginTop: 2 }}>{t('task_was_open_sub')}</div>
              </div>
            </div>
            {isOwner &&
          <Button
            onClick={() => {
              if (task.payment_status === 'funded') {
                onSheetClose?.();
                window.dispatchEvent(new CustomEvent('close_task_sheet'));
                navigate(`/create-task?editId=${id}&repost=1`);
              } else {
                reopenMutation.mutate();
              }
            }}
            disabled={reopenMutation.isPending}
            className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold h-11">
            
                {reopenMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4 ml-2" />{t('reopen_task_btn')}</>}
              </Button>
          }
            {!isOwner && !signalSent &&
          <Button onClick={() => gate(handleSignalReopen)} variant="outline"
          className="w-full rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50 font-semibold h-11">
            
                <Send size={15} strokeWidth={1.8} style={{ marginLeft: 6 }} /> {t('send_signal_owner')}
              </Button>
          }
            {!isOwner && signalSent &&
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '12px 16px' }}>
                <div style={{ fontWeight: 800, color: '#166534', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={15} color="#16a34a" /> {t('signal_sent_ok')}</div>
                <div style={{ fontSize: 12, color: '#15803d', marginTop: 3 }}>{t('awaiting_reopen_label')}</div>
              </div>
          }
          </div>
        }



        {/* Main Task Banner — hidden when task is TAKEN and user is owner/worker (ActiveTaskBanner shown instead) */}
        <div style={{ background: taskGradient, borderRadius: 22, color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', display: (task.status === 'TAKEN' && (isOwner || isWorker)) ? 'none' : 'block' }}>
          <div style={{ position: 'absolute', bottom: -20, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />



          <div style={{ padding: '16px 18px 18px' }}>
            {/* Non-owner status pill */}
            {!isOwner && task.status !== 'OPEN' && (
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5 }}>{statusLabel}</span>
              </div>
            )}

            {/* Title row — description as main heading + category badge, with 3-dot on left for owner */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Main heading = description (or title fallback) */}
                {mainDescription ? (
                  <div className="selectable-text" style={{ fontSize: 20, fontWeight: 900, color: 'white', lineHeight: 1.3, marginBottom: 6 }}>
                    {descExpanded || mainDescription.length <= 180
                      ? mainDescription
                      : <>
                          {mainDescription.slice(0, 180)}
                          <button onClick={(e) => { e.stopPropagation(); setDescExpanded(true); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', fontWeight: 700, cursor: 'pointer', fontSize: 14, padding: 0, marginRight: 4 }}>עוד...</button>
                          <span style={{ opacity: 0.7 }}>…</span>
                        </>
                    }
                    {descExpanded && mainDescription.length > 180 && (
                      <button onClick={(e) => { e.stopPropagation(); setDescExpanded(false); }} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 12, padding: '3px 12px', borderRadius: 8, marginRight: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>פחות ▲</button>
                    )}
                  </div>
                ) : task.title ? (
                  <div style={{ fontSize: 20, fontWeight: 900, color: 'white', lineHeight: 1.25, marginBottom: 6 }}>{task.title}</div>
                ) : null}
                {/* Secondary title = category */}
                {task.category && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.18)', borderRadius: 10, padding: '3px 10px', fontSize: 12, fontWeight: 700, color: 'white', border: '1px solid rgba(255,255,255,0.25)', marginBottom: 4 }}>
                    {CATEGORY_EMOJI[task.category] || '🔨'} {getCategoryLabel(task.category)}
                  </div>
                )}
              </div>
              {isOwner && (task.status === 'OPEN' || task.status === 'EXPIRED' || task.status === 'TAKEN') && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowOwnerMenu(v => !v); }}
                  style={{ width: 34, height: 34, borderRadius: 11, background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', flexShrink: 0, marginTop: 2 }}>
                  <MoreVertical size={17} />
                </button>
              )}
            </div>

            {/* Price + Media row — on same line */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
              {/* Price */}
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 14, padding: '8px 14px', textAlign: 'center', display: 'inline-block' }}>
                <div style={{ color: 'white', fontWeight: 900, fontSize: 28, lineHeight: 1 }}>₪{Math.round(calculateCurrentPrice(task))}</div>
                {(() => { const sub = formatHourlySublabel(task); return sub ? <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 600, marginTop: 3 }}>{sub}</div> : null; })()}
                {task.payment_method && <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 2 }}>{task.payment_method === 'Cash' ? t('cash') : task.payment_method}</div>}
              </div>
              <div style={{ flex: 1 }} />

              {/* Media tile */}
              {(() => {
                const allMedia = [
                  ...(task.images || []).map(url => ({ type: 'image', url })),
                  ...(task.video_url ? [{ type: 'video', url: task.video_url }] : [])
                ];
                if (allMedia.length === 0) return null;
                const cur = allMedia[mediaIdx] || allMedia[0];
                return (
                  <div style={{ flexShrink: 0, position: 'relative', width: 88, height: 72 }}>
                    <button onClick={() => { setLightboxIndex(mediaIdx); setLightboxOpen(true); }}
                      style={{ width: 88, height: 72, borderRadius: 14, overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.35)', background: '#000', padding: 0, cursor: 'pointer', display: 'block' }}>
                      {cur.type === 'image' ? (
                        <img src={cur.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                          <video src={cur.url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                            <Play size={18} color="white" fill="white" />
                          </div>
                        </div>
                      )}
                    </button>
                    {/* Dots or counter */}
                    {allMedia.length > 1 && (
                      <div style={{ position: 'absolute', bottom: 4, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 3, pointerEvents: 'none' }}>
                        {allMedia.length <= 5 ? allMedia.map((_, i) => (
                          <span key={i} style={{ width: i === mediaIdx ? 10 : 5, height: 5, borderRadius: 3, background: i === mediaIdx ? 'white' : 'rgba(255,255,255,0.5)', transition: 'width 0.2s' }} />
                        )) : (
                          <span style={{ fontSize: 9, color: 'white', fontWeight: 700, background: 'rgba(0,0,0,0.4)', borderRadius: 6, padding: '1px 5px' }}>{mediaIdx + 1}/{allMedia.length}</span>
                        )}
                      </div>
                    )}
                    {/* Prev arrow */}
                    {allMedia.length > 1 && (
                      <button onClick={(e) => { e.stopPropagation(); setMediaIdx(i => (i - 1 + allMedia.length) % allMedia.length); }}
                        style={{ position: 'absolute', top: '50%', right: -10, transform: 'translateY(-50%)', width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', padding: 0 }}>
                        <ChevronRight size={13} color="#1a1a1a" />
                      </button>
                    )}
                    {/* Next arrow */}
                    {allMedia.length > 1 && (
                      <button onClick={(e) => { e.stopPropagation(); setMediaIdx(i => (i + 1) % allMedia.length); }}
                        style={{ position: 'absolute', top: '50%', left: -10, transform: 'translateY(-50%)', width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', padding: 0 }}>
                        <ChevronLeft size={13} color="#1a1a1a" />
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Description is now shown as the main heading above — no duplicate here */}

            {/* Publisher + location + published time */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              {task.client_name &&
              <UserBadge
                name={task.client_name}
                userId={task.client_id}
                verified={task.client_verified}
                rating={task.client_rating}
                dark
                size="md"
              />
            }
              {task.location_name && (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <MapPin size={10} strokeWidth={2} />
                  {task.location_name.split(',')[0]}
                  {distKm != null && !isNaN(distKm) && ` · ${distKm < 1 ? `${Math.round(distKm * 1000)}מ'` : `${distKm.toFixed(1)}ק"מ`}`}
                </span>
              )}
              {task.created_date && getRelativeTime(task.created_date, t) && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                {t('posted_in_time')} {getRelativeTime(task.created_date, t)}
              </span>
              )}
            </div>





            {/* Owner scanning/applicants bar + boost button — always same height, symmetric */}
            {isOwner && task.status === 'OPEN' && (
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, marginBottom: 4, height: 54 }}>
                {/* Bar — scanning or applicants */}
                {applicationCount === 0 ? (
                  <div style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: 14,
                    border: '1.5px solid rgba(255,255,255,0.25)',
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '0 14px',
                  }}>
                    <span style={{ position: 'relative', width: 14, height: 14, flexShrink: 0 }}>
                      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.5)', animation: 'scanRing 1.4s ease-in-out infinite' }} />
                      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(rgba(255,255,255,0.6) 0deg, transparent 90deg, transparent 360deg)', animation: 'scanSweep 1.4s linear infinite' }} />
                      <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 3, height: 3, borderRadius: '50%', background: 'white' }} />
                    </span>
                    <ScanningLabelDetail t={t} />
                  </div>
                ) : (
                  <button
                    onClick={() => document.getElementById('task-applicants-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                      borderRadius: 14,
                      border: 'none',
                      color: 'white', fontWeight: 800, fontSize: 13,
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '0 14px',
                      cursor: 'pointer',
                      textAlign: 'right',
                      boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
                    }}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1 }}>🟠</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>{applicationCount} {t('applications')}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 1 }}>{t('click_to_view_approve')}</div>
                    </div>
                  </button>
                )}
                {/* Boost button — symmetric fixed width */}
                {boostAvailable && (
                  <div style={{ width: 54, flexShrink: 0 }}>
                    <BoostPill task={task} size="md" onSheetClose={onSheetClose} onBoostDone={() => { queryClient.invalidateQueries({ queryKey: ['me'] }); queryClient.invalidateQueries({ queryKey: ['task', id] }); }} />
                  </div>
                )}
              </div>
            )}

            {/* Owner Analytics — views & clicks (no emojis) */}
            {isOwner && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.13)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: 'white', lineHeight: 1 }}>{task.views_count || 0}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2, fontWeight: 600 }}>{t('views')}</div>
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.13)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: 'white', lineHeight: 1 }}>{task.clicks_count || 0}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2, fontWeight: 600 }}>{t('clicks') || t('entries')}</div>
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.13)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: 'white', lineHeight: 1 }}>{applicationCount}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2, fontWeight: 600 }}>{t('applications')}</div>
                </div>
              </div>
            )}





            {/* Approved CTA */}
            {isApproved && !isWorker && task.status === 'OPEN' &&
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '12px 14px', marginBottom: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>{t('your_app_approved')}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => gate(() => takeMutation.mutate())} disabled={takeMutation.isPending}
                style={{ flex: 1, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.25)', border: '1.5px solid rgba(255,255,255,0.4)', color: 'white', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  
                    {takeMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : t('go_now_action')}
                  </button>
                  <button onClick={() => cancelApplicationMutation.mutate()} disabled={cancelApplicationMutation.isPending}
                style={{ height: 42, padding: '0 14px', borderRadius: 12, background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  {t('cancel')}</button>
                </div>
              </div>
            }

            {/* Apply button */}
            {canApplyManual && !showApplyForm &&
            <button
              onClick={() => {if (!isAuthenticated) {setShowLoginPrompt(true);return;} if (task.verification_required && !isUserVerified(verifyUser)) { if (verifyUser?.kyc_status === 'pending') { setShowVerificationPending(true); } else { setShowVerificationRequired(true); } return; } gate(() => setShowApplyForm(true));}}
              style={{ width: '100%', height: 46, borderRadius: 13, background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', color: 'white', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, backdropFilter: 'blur(4px)' }}>
              
                <Send size={15} strokeWidth={1.8} />
                {t('apply_to_task')} — {Math.max(1, Math.round((Math.round(calculateCurrentPrice(task)) || 0) * 0.05))} <CreditIcon size={14} />
                </button>
                }
                {canApplyManual && !showApplyForm && (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginTop: 4, fontWeight: 600, lineHeight: 1.4 }}>
                 💡 הקרדיטים מוחזרים אוטומטית אם הבקשה לא תאושר או המשימה תבוטל
                </div>
                )}

            {/* Pending pill */}
            {hasPendingApp && !isOwner &&
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={12} />
                <span style={{ fontSize: 12, fontWeight: 700 }}>{t('your_app_pending')}</span>
              </div>
            }

            {/* Secondary actions: chat + cancel — inside banner */}
            {!isOwner && (hasPendingApp || isApproved) &&
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button
                onClick={() => setShowQuickChat(true)}
                style={{ flex: 1, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                
                  <MessageCircle size={13} /> {t('message_to_publisher')}
                </button>
                {hasPendingApp &&
              <button
                onClick={() => cancelApplicationMutation.mutate()}
                disabled={cancelApplicationMutation.isPending}
                style={{ height: 34, padding: '0 14px', borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.85)', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                
                    {cancelApplicationMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <><X size={11} /> {t('cancel_application_btn')}</>}
                  </button>
              }
              </div>
            }

            {/* Report — tiny, inside banner */}
            {!isOwner &&
            <button
              onClick={() => {if (!isAuthenticated) {setShowLoginPrompt(true);return;}setShowReport(true);}}
              style={{ width: '100%', height: 26, background: 'none', border: 'none', color: 'rgba(255,255,255,0.38)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 2 }}>
              
                <Flag size={10} /> {t('report_task_btn')}
              </button>
            }
          </div>
          <style>{`@keyframes livePing{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(2.5);opacity:0}}@keyframes scanRing{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(1.35);opacity:0}}@keyframes scanSweep{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>

        {/* Completion media section — for worker: always shown with add/edit; for owner: only when proof exists */}
        {task.status === 'TAKEN' && (isWorker || (isOwner && (task.completion_photos?.length > 0 || task.completion_video_url))) && (
          <div style={{ background: 'var(--surface-2)', borderRadius: 20, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', letterSpacing: 0.5 }}>📸 הוכחת ביצוע</div>
              {isWorker && !editingCompletion && (
                <button onClick={() => { setEditPhotos([...(task.completion_photos || [])]); setEditVideo(task.completion_video_url || ''); setEditingCompletion(true); }}
                  style={{ fontSize: 11, fontWeight: 700, color: '#1a6fd4', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '3px 10px', cursor: 'pointer' }}>
                  {task.completion_photos?.length > 0 || task.completion_video_url ? 'עריכה' : '+ הוסף'}
                </button>
              )}
            </div>
            {isWorker && editingCompletion ? (
              <>
                <WorkerCompletionPhoto
                  photos={editPhotos}
                  videoUrl={editVideo}
                  onPhotosChange={setEditPhotos}
                  onVideoChange={setEditVideo}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={async () => {
                    setSavingCompletion(true);
                    await base44.entities.Task.update(id, { completion_photos: editPhotos, completion_video_url: editVideo || null });
                    queryClient.setQueryData(['task', id], old => old ? { ...old, completion_photos: editPhotos, completion_video_url: editVideo || null } : old);
                    queryClient.invalidateQueries({ queryKey: ['task', id] });
                    // Notify task owner in real-time that proof was submitted
                    if (task.client_id && task.client_id !== me?.id) {
                      base44.functions.invoke('sendPushNotification', {
                        user_ids: [task.client_id],
                        title: 'הוכחת ביצוע הועלתה 📸',
                        body: `העובד העלה הוכחת ביצוע למשימה "${task.title}"`,
                        url: `/task/${id}`,
                        tag: `completion_${id}`,
                      }).catch(() => {});
                    }
                    setSavingCompletion(false);
                    setEditingCompletion(false);
                    toast.success('הוכחת הביצוע נשלחה ✓');
                  }} disabled={savingCompletion} style={{ flex: 1, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#059669,#047857)', color: 'white', fontWeight: 800, fontSize: 13, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {savingCompletion ? <Loader2 size={16} className="animate-spin" /> : '📤 שליחה'}
                  </button>
                  <button onClick={() => setEditingCompletion(false)} style={{ height: 44, padding: '0 16px', borderRadius: 12, background: '#f1f5f9', border: 'none', color: '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>ביטול</button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(task.completion_photos || []).map((url, i) => (
                  <button key={i} onClick={() => { setCompletionLightboxIndex(i); setCompletionLightboxOpen(true); }}
                    style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-1)', padding: 0, cursor: 'pointer', background: '#000' }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
                {task.completion_video_url && (
                  <button onClick={() => { setCompletionLightboxIndex(task.completion_photos?.length || 0); setCompletionLightboxOpen(true); }}
                    style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-1)', padding: 0, cursor: 'pointer', background: '#000', position: 'relative' }}>
                    <video src={task.completion_video_url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
                      <Play size={22} color="white" fill="white" />
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Applicants for owner — show when OPEN or TAKEN before worker started */}
        {isOwner && (task.status === 'OPEN' || (task.status === 'TAKEN' && !task.worker_status)) &&
        <div id="task-applicants-section">
          <TaskApplicants task={task} onApprove={() => queryClient.refetchQueries({ queryKey: ['task', id] })} />
        </div>
        }

        {/* Invoice section — visible to both client and worker when invoice exists */}
        {task.status === 'COMPLETED' && task.invoice_html && (isOwner || isWorker) && (
          <div style={{ background: 'linear-gradient(135deg,#faf5ff,#f3e8ff)', borderRadius: 20, border: '1.5px solid #e9d5ff', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}>
              <FileText size={22} color="white" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#6d28d9' }}>חשבונית מס / קבלה זמינה</div>
              <div style={{ fontSize: 12, color: '#7c3aed', marginTop: 2 }}>
                {isOwner ? 'העובד הפיק חשבונית עבורך · לחץ לצפייה והורדה' : 'החשבונית שהפקת זמינה כאן'}
              </div>
            </div>
            <button
              onClick={() => setShowInvoiceView(true)}
              style={{ height: 40, padding: '0 18px', borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', border: 'none', color: 'white', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, boxShadow: '0 3px 12px rgba(124,58,237,0.35)' }}
            >
              <FileText size={15} /> צפה והורד
            </button>
          </div>
        )}

        {/* Task location map — shown for all tasks with location (including TAKEN/active) */}
        {task.lat && task.lng && !['CANCELLED', 'EXPIRED'].includes(task.status) &&
        <TaskLocationMap
          task={task}
          onGenerateInvoice={task.status === 'COMPLETED' && me?.id === task.worker_id ? () => setShowInvoice(true) : undefined}
        />
        }





        {/* ── Task Details Card ───────────────────────────────────────── */}
        {(task.category ||
          task.address_building || task.address_floor || task.address_apartment || task.address_notes ||
          task.requirements ||
          task.category_details ||
          (isOwner && task.auto_bump_enabled && task.base_price && task.max_price)) && (
          <div style={{ background: 'var(--surface-2)', borderRadius: 20, border: '1px solid var(--border-1)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 11 }}>

            {/* Auto-bump — owner only, at top */}
            {isOwner && task.auto_bump_enabled && task.base_price && task.max_price && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '9px 14px' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#92400e', marginBottom: 4 }}>{t('auto_price_increase_title')}</div>
                <div style={{ fontSize: 12, color: '#b45309', lineHeight: 1.5 }}>
                  {t('price_increase_detail')}
                  {applicationCount > 0
                    ? <span style={{ color: '#059669', fontWeight: 700, display: 'block', marginTop: 2 }}>{t('price_frozen_label').replace('{price}', Math.round(calculateCurrentPrice(task)))} — {t('got_request_label')}</span>
                    : <span style={{ display: 'block', marginTop: 2 }}>{t('now_label')}: ₪{Math.round(calculateCurrentPrice(task))} · {t('auto_stops_label')}</span>}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', letterSpacing: 0.5 }}>{t('task_details_title')}</div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(task.id);
                  setIdCopied(true);
                  setTimeout(() => setIdCopied(false), 2000);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: idCopied ? '#059669' : '#94a3b8', fontFamily: 'monospace', background: idCopied ? '#f0fdf4' : 'var(--surface-3)', borderRadius: 6, padding: '2px 7px', letterSpacing: 0.3, border: idCopied ? '1px solid #bbf7d0' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                title="העתק ID"
              >
                {idCopied ? (
                  <>{t('id_copied') || 'הועתק'} <CheckCircle2 size={11} color="#059669" /></>
                ) : (
                  <>#{task.id?.slice(-8)}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></>
                )}
              </button>
            </div>

            {/* Expiry — moved from banner */}
            {task.expires_at && task.status === 'OPEN' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={13} color="#ea580c" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{t('task_validity_label')}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                    <TaskExpiry expiresAt={task.expires_at} showOnlyWhenUrgent={false} inline />
                  </div>
                </div>
              </div>
            )}

            {/* Schedule slots — prominent service times */}
            {formatScheduleSlots(task.category_details?.schedule).length > 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={13} color="#1a6fd4" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 3 }}>מועדי השירות</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {formatScheduleSlots(task.category_details.schedule).map((slot, i) => (
                      <div key={i} style={{ fontSize: 13, fontWeight: 700, color: '#1a6fd4' }}>{slot.dayLabel} · {slot.time}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Scheduled time — single datetime (when no schedule slots) */}
            {task.scheduled_time && !Array.isArray(task.category_details?.schedule) && (() => {
              const raw = String(task.scheduled_time);
              const sDate = new Date(raw.includes('T') && !raw.endsWith('Z') && !raw.includes('+') ? raw + 'Z' : raw);
              if (isNaN(sDate.getTime())) return null;
              const now = new Date();
              const isToday = sDate.toDateString() === now.toDateString();
              const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
              const isTomorrow = sDate.toDateString() === tomorrow.toDateString();
              const timeStr = sDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
              let label;
              if (isToday) label = `היום, ${timeStr}`;
              else if (isTomorrow) label = `מחר, ${timeStr}`;
              else label = sDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Clock size={13} color="#1a6fd4" />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>מועד מדויק</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1a6fd4' }}>{label}</div>
                  </div>
                </div>
              );
            })()}

            {/* Category is now shown as secondary title in banner — not duplicated here */}

            {/* Full address */}
            {(task.address_building || task.address_floor || task.address_apartment || task.address_notes) && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin size={13} color="#ea580c" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>{t('address_details_label')}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.5 }}>
                    {[
                      task.address_building && `${t('building_label')} ${task.address_building}`,
                      task.address_floor && `${t('floor_label')} ${task.address_floor}`,
                      task.address_apartment && `${t('apartment_label')} ${task.address_apartment}`,
                      task.address_notes,
                    ].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </div>
            )}

            {/* Requirements — dynamically extracted from all possible requirement keys */}
            {(() => {
              const reqs = getActiveRequirements(task.requirements, task.category).map(r =>
                r.value ? `${r.label}: ${r.value}` : r.label
              );
              if (task.requires_invoice) reqs.push('דרושה חשבונית מס');
              if (task.verification_required) reqs.push('דרוש ווי ירוק');
              if (reqs.length === 0) return null;
              return (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle2 size={13} color="#059669" />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>{t('requirements_label')}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.6 }}>
                      {reqs.join(' · ')}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Category-specific extra fields (from structured category_details) */}
            <CategoryDetailsView task={task} />
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
          const label = workerSeesPhone ? 'טלפון של המפרסם' : 'טלפון של העובד';
          return (
            <a
              href={`tel:${phone}`}
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                border: '2px solid #16a34a',
                borderRadius: 20,
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                boxShadow: '0 4px 18px rgba(22,163,74,0.18)',
              }}>
                <div style={{ width: 48, height: 48, borderRadius: 15, background: 'linear-gradient(135deg,#16a34a,#15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(22,163,74,0.35)' }}>
                  <Phone size={22} color="white" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#15803d', fontFamily: 'monospace', letterSpacing: 0.5, direction: 'ltr', textAlign: 'right' }}>{phone}</div>
                  <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2, fontWeight: 600 }}>לחץ להתקשרות ישירה 📞</div>
                </div>
                <div style={{ height: 42, padding: '0 16px', borderRadius: 12, background: '#16a34a', color: 'white', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, boxShadow: '0 3px 10px rgba(22,163,74,0.35)' }}>
                  <Phone size={14} /> התקשר
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
        <div className="mobile-sheet-overlay" onClick={() => setShowOwnerMenu(false)}>
          <div dir="rtl" className="mobile-sheet" style={{ width: '100%', maxWidth: 480, padding: '20px 20px 0' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 13, fontWeight: 800, color: '#94a3b8', marginBottom: 12, paddingRight: 4, letterSpacing: 0.3 }}>{t('task_actions_title')}</div>
            {task.status === 'OPEN' &&
            <div onClick={() => { setShowOwnerMenu(false); onSheetClose?.(); window.dispatchEvent(new CustomEvent('close_task_sheet')); navigate(`/create-task?editId=${id}`); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 6px', borderBottom: '1px solid #f0f4fa', cursor: 'pointer' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 13, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Pencil size={17} color="#1a6fd4" />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f2b6b' }}>{t('edit_task_title')}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{t('edit_task_sub')}</div>
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
                <X size={17} color="#dc2626" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }}>{t('cancel_task_title')}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{t('cancel_task_sub')}</div>
              </div>
            </div>
            <div style={{ height: 'max(24px, env(safe-area-inset-bottom))' }} />
          </div>
        </div>,
        document.body
      )}



      {showQuickChat && task && me && <QuickChatDrawer task={task} me={me} onClose={() => setShowQuickChat(false)} />}

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