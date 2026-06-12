import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Clock, Star, MessageCircle, Flag, CheckCircle2, Loader2, Car, Users, Wrench, Pencil, RefreshCw, AlertTriangle, Navigation, RotateCcw, Send, DoorOpen, X, Play, MoreVertical, ChevronLeft, ChevronRight, FileText, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import CompletionModal from '@/components/CompletionModal';
import RatingModal from '@/components/RatingModal';
import InvoiceModal from '@/components/InvoiceModal';
import BoostOverlay from '@/components/BoostOverlay';
import TaskTakenConfetti from '@/components/TaskTakenConfetti';
import TaskExpiry from '@/components/TaskExpiry';
import TaskApplicants from '@/components/TaskApplicants';
import WorkerStatusAlert from '@/components/WorkerStatusAlert';
import ApprovedPopup from '@/components/ApprovedPopup';
import WorkerTrackerBar from '@/components/WorkerTrackerBar';
import BackButton from '@/components/BackButton';
import NavButtons from '@/components/NavButtons';
import CreditIcon from '@/components/CreditIcon';
import { getCategoryLabel } from '@/lib/categories';
import { calculateCurrentPrice } from '@/lib/priceCalculator';

const CATEGORY_EMOJI = {
  plumbing: '🔧', electricity: '⚡', gardening: '🌿', cleaning: '🧹',
  moving: '📦', painting: '🎨', carpentry: '🪚', ac: '❄️',
  locksmith: '🔐', shopping: '🛍️', delivery: '🚚', babysitting: '👶',
  tutoring: '📚', it_support: '💻', other: '🔨'
};
import VerifyModal from '@/components/VerifyModal';
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

const SCANNING_TEXTS_DETAIL = [
  'מאותת לעובדים',
  'סורק עובדים',
  'מחפש התאמות',
  'מגביר חשיפה',
  'מפיץ את המשימה',
  'מרחיב חשיפה',
];

function ScanningLabelDetail() {
  const [textIdx, setTextIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setTextIdx(i => (i + 1) % SCANNING_TEXTS_DETAIL.length);
        setVisible(true);
      }, 400);
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.15)',
      borderRadius: 12, padding: '9px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
      marginBottom: 8,
    }}>
      <span style={{ position: 'relative', width: 14, height: 14, flexShrink: 0 }}>
        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.5)', animation: 'scanRing 1.4s ease-in-out infinite' }} />
        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(rgba(255,255,255,0.6) 0deg, transparent 90deg, transparent 360deg)', animation: 'scanSweep 1.4s linear infinite' }} />
        <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 3, height: 3, borderRadius: '50%', background: 'white' }} />
      </span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'white', opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}>
          {SCANNING_TEXTS_DETAIL[textIdx]}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>המשימה נחשפת לעובדים באזור</div>
      </div>
    </div>
  );
}

import LiveWorkerMap from '@/components/LiveWorkerMap';
import TaskLocationMap from '@/components/TaskLocationMap';

// Charging bolt pill — fills over 1 hour, smooth liquid wave animation
const BOOST_FILL_MS_DETAIL = 60 * 60 * 1000;

function BoostChargeDetail({ onBoost, loading, lastBoostAt, createdDate }) {
  const getProgress = () => {
    const refTime = lastBoostAt || createdDate;
    if (!refTime) return 0;
    const elapsed = Date.now() - new Date(refTime).getTime();
    return Math.min(1, elapsed / BOOST_FILL_MS_DETAIL);
  };

  const [progress, setProgress] = useState(getProgress);
  const charged = progress >= 1;
  const pct = Math.round(progress * 100);

  useEffect(() => {
    if (charged) return;
    const iv = setInterval(() => {
      const p = getProgress();
      setProgress(p);
      if (p >= 1) clearInterval(iv);
    }, 1000);
    return () => clearInterval(iv);
  }, [lastBoostAt, charged]);

  const iconColor = pct > 50 ? 'white' : 'rgba(255,255,255,0.9)';

  return (
    <>
      <div
        onClick={charged && !loading ? onBoost : undefined}
        title={charged ? 'שגר איתות נוסף — 5 ג\'ובות' : `מתטען... ${pct}%`}
        style={{
          height: 38, width: 42, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', position: 'relative',
          border: `1.5px solid ${charged ? 'rgba(192,132,252,0.9)' : 'rgba(192,132,252,0.45)'}`,
          background: 'rgba(255,255,255,0.07)',
          cursor: charged ? 'pointer' : 'default',
          flexShrink: 0,
        }}
      >
        {/* Liquid fill */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: `${pct}%`,
          background: charged
            ? 'linear-gradient(180deg,rgba(168,85,247,0.85),rgba(124,58,237,0.9))'
            : 'linear-gradient(180deg,rgba(192,132,252,0.65),rgba(168,85,247,0.75))',
          transition: 'height 1.2s cubic-bezier(0.22,1,0.36,1)',
          borderRadius: charged ? 8 : '0 0 8px 8px',
          overflow: 'hidden',
        }}>
          {!charged && <>
            <div style={{ position: 'absolute', top: -5, left: 0, right: 0, height: 10, background: 'rgba(255,255,255,0.22)', borderRadius: '50% 50% 0 0 / 100% 100% 0 0', animation: 'bdWave1 1.6s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', top: -4, left: 0, right: 0, height: 8, background: 'rgba(255,255,255,0.15)', borderRadius: '50% 50% 0 0 / 100% 100% 0 0', animation: 'bdWave2 2.1s ease-in-out infinite reverse' }} />
          </>}
          {!charged && [
            { size: 3, left: '25%', delay: '0s', dur: '1.8s' },
            { size: 2, left: '65%', delay: '0.7s', dur: '2.3s' },
          ].map((b, i) => (
            <div key={i} style={{ position: 'absolute', bottom: '5%', width: b.size, height: b.size, borderRadius: '50%', background: 'rgba(255,255,255,0.7)', left: b.left, animation: `bdRise ${b.dur} ease-in infinite`, animationDelay: b.delay }} />
          ))}
        </div>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          {loading
            ? <Loader2 size={13} color="white" className="animate-spin" />
            : <Zap size={14} color={iconColor} fill={charged ? iconColor : 'none'} strokeWidth={charged ? 0 : 2} />
          }
          {!charged && !loading && (
            <span style={{ fontSize: 8, fontWeight: 900, color: iconColor, lineHeight: 1 }}>{pct}%</span>
          )}
        </div>
      </div>
      <style>{`
        @keyframes bdWave1 { 0%{transform:translateX(0%) scaleY(1)}50%{transform:translateX(-8%) scaleY(1.4)}100%{transform:translateX(0%) scaleY(1)} }
        @keyframes bdWave2 { 0%{transform:translateX(0%) scaleY(1)}50%{transform:translateX(8%) scaleY(1.6)}100%{transform:translateX(0%) scaleY(1)} }
        @keyframes bdRise { 0%{transform:translateY(0) scale(1);opacity:0.8} 80%{opacity:0.6} 100%{transform:translateY(-80px) scale(0.4);opacity:0} }
      `}</style>
    </>
  );
}
import ApplySheet from '@/components/ApplySheet';
import QuickChatDrawer from '@/components/QuickChatDrawer';

// Labels are context-aware: isOwner sees employer language, worker sees worker language
const getStatusLabel = (status, isOwner) => {
  if (status === 'OPEN') return isOwner ? 'מחפש פועל' : 'פתוח';
  if (status === 'TAKEN') return isOwner ? 'בביצוע' : 'לקחתי';
  if (status === 'COMPLETED') return 'הושלם';
  if (status === 'CANCELLED') return 'בוטל';
  if (status === 'EXPIRED') return 'פג תוקף';
  return status;
};
const statusConfig = {
  OPEN: { label: 'פתוח', color: 'text-blue-700 bg-blue-100' },
  TAKEN: { label: 'בביצוע', color: 'text-indigo-700 bg-indigo-100' },
  COMPLETED: { label: 'הושלם', color: 'text-gray-700 bg-gray-100' },
  CANCELLED: { label: 'בוטל', color: 'text-red-700 bg-red-100' },
  EXPIRED: { label: 'פג תוקף', color: 'text-orange-700 bg-orange-100' }
};

function getRelativeTime(date) {
  if (!date) return null;
  const s = String(date);
  const normalized = s.includes('T') && !s.endsWith('Z') && !s.includes('+') ? s + 'Z' : s;
  const ms = Date.now() - new Date(normalized).getTime();
  if (ms < 0) return 'עכשיו';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'עכשיו';
  if (minutes < 60) return `לפני ${minutes} דקות`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `לפני ${hours} שעות`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `לפני ${days} ימים`;
  return null;
}

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, login } = useAuth();
  const [showCompletion, setShowCompletion] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [taskTaken, setTaskTaken] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [showApprovedPopup, setShowApprovedPopup] = useState(false);
  const [signalSent, setSignalSent] = useState(false);
  const [hasRated, setHasRated] = useState(false);


  const [showExitWarning, setShowExitWarning] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [creditsNeeded, setCreditsNeeded] = useState(null);
  const [showOwnerMenu, setShowOwnerMenu] = useState(false);
  const [showQuickChat, setShowQuickChat] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showBoostOverlay, setShowBoostOverlay] = useState(false);
  const [showBoostConfirm, setShowBoostConfirm] = useState(false);
  const [boostLoading, setBoostLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [labelRotIdx, setLabelRotIdx] = useState(0);
  const [showWorkerMap, setShowWorkerMap] = useState(false);
  const [mediaIdx, setMediaIdx] = useState(0);
  const prevWorkerIdRef = useRef(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, () => {}, { timeout: 5000 });
    }
  }, []);
  const prevTaskStatusRef = useRef(null);
  const autoRatingShownRef = useRef(false);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me(), enabled: isAuthenticated });
  const { gate, showVerify, onSuccess: onVerifySuccess, onClose: onVerifyClose } = useVerifyGuard(me);

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
    staleTime: 60000,
  });
  const applicationCount = taskApplications.filter((a) => a.status === 'pending' || a.status === 'approved').length;

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => base44.entities.Task.filter({ id }),
    select: (data) => data[0],
    staleTime: 30000,
    refetchOnMount: true,
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
    enabled: !!task?.worker_id && task?.status === 'TAKEN',
    staleTime: 120000
  });

  // Check if MY application was approved for this task — only active ones
  const { data: myApp } = useQuery({
    queryKey: ['myApp', id, me?.id],
    queryFn: () => base44.entities.TaskApplication.filter({ task_id: id, worker_id: me.id }),
    select: (data) => data.find((a) => a.status === 'pending' || a.status === 'approved') || null,
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
      queryClient.refetchQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['myApp', id, me?.id] });
    };
    window.addEventListener('task_reset_to_open', handleReset);
    return () => window.removeEventListener('task_reset_to_open', handleReset);
  }, [id, me?.id]);

  // Real-time subscriptions
  useEffect(() => {
    const unsubscribe1 = base44.entities.Task.subscribe((event) => {
      if (event.id === id) {
        queryClient.invalidateQueries({ queryKey: ['task', id] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }
    });
    const unsubscribe2 = base44.entities.TaskApplication.subscribe((event) => {
      if (event.data?.task_id === id) {
        // When approval happens, refetch both myApp AND the task immediately
        queryClient.invalidateQueries({ queryKey: ['myApp', id, me?.id] });
        queryClient.invalidateQueries({ queryKey: ['task', id] });
        queryClient.invalidateQueries({ queryKey: ['applications', id] });
        queryClient.invalidateQueries({ queryKey: ['applications-pulse', id] });
      }
    });
    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [id, me?.id]);

  const handleWorkerUpdate = async (data) => {
    await base44.entities.Task.update(id, data);
    // CRITICAL: Invalidate BEFORE refetch to clear stale cache
    await queryClient.invalidateQueries({ queryKey: ['task', id] });
    // CRITICAL: Force immediate fresh fetch
    await queryClient.refetchQueries({ queryKey: ['task', id] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    console.log('✅ WORKER UPDATE COMPLETE - Task refetched');
  };

  // Auto-open rating popup when task just became COMPLETED (for both sides)
  useEffect(() => {
    if (!task || !me) return;
    const prevStatus = prevTaskStatusRef.current;
    if (prevStatus === 'TAKEN' && task.status === 'COMPLETED') {
      const isParticipant = me.id === task.client_id || me.id === task.worker_id;
      if (isParticipant && !autoRatingShownRef.current) {
        autoRatingShownRef.current = true;
        setTimeout(() => setShowRating(true), 1200);
      }
    }
    prevTaskStatusRef.current = task.status;
  }, [task?.status]);

  // Auto-open rating on page load if task is already COMPLETED and user hasn't rated yet
  useEffect(() => {
    if (!task || !me || autoRatingShownRef.current) return;
    if (task.status !== 'COMPLETED') return;
    const isParticipant = me.id === task.client_id || me.id === task.worker_id;
    if (!isParticipant) return;
    // Only open if myReview is loaded and is empty
    if (myReview !== undefined && !myReview) {
      autoRatingShownRef.current = true;
      setTimeout(() => setShowRating(true), 800);
    }
  }, [task?.status, me?.id, myReview]);

  // Check expiry
  useEffect(() => {
    if (!task || task.status !== 'OPEN') return;
    if (task.expires_at && new Date(task.expires_at) < new Date()) {
      base44.entities.Task.update(id, { status: 'EXPIRED' }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['task', id] });
      });
    }
  }, [task]);

  const takeMutation = useMutation({
    mutationFn: () => base44.entities.Task.update(id, {
      status: 'TAKEN',
      worker_id: me?.id,
      worker_name: me?.full_name,
      worker_status: 'on_the_way'
    }),
    onSuccess: async () => {
      setTaskTaken(true);
      // CRITICAL: Invalidate BEFORE refetch to clear stale cache
      await queryClient.invalidateQueries({ queryKey: ['task', id] });
      // CRITICAL: Force immediate fresh fetch
      await queryClient.refetchQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setConfetti(true);
      setTimeout(() => setConfetti(false), 100);
      console.log('✅ TAKE TASK MUTATION COMPLETE - Task refetched');
      toast.success('קחת את המשימה! 🎉');
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('cancelTaskPayment', { taskId: id });
      if (!res.data?.success) throw new Error('שגיאה בביטול');
    },
    onSuccess: () => {
      setShowCancelConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasksPage'] });
      toast.success('המשימה בוטלה');
      navigate('/');
    }
  });

  const reopenMutation = useMutation({
    mutationFn: () => base44.entities.Task.update(id, { status: 'OPEN', expires_at: null, worker_id: null, worker_name: null, worker_status: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      toast.success('המשימה נפתחה מחדש!');
    }
  });

  const cancelTakeMutation = useMutation({
    mutationFn: async () => {
      // 1. Cancel the worker's approved application + refund credits
      const workerApps = await base44.entities.TaskApplication.filter({ task_id: id, worker_id: me?.id });
      const activeApps = workerApps.filter((a) => a.status === 'approved' || a.status === 'pending');
      for (const app of activeApps) {
        const creditsToRefund = app.credits_charged || 0;
        if (creditsToRefund > 0) {
          const freshMe = await base44.auth.me();
          const currentCredits = freshMe?.worker_credits ?? 0;
          const newBalance = currentCredits + creditsToRefund;
          await base44.auth.updateMe({ worker_credits: newBalance });
          await base44.entities.CreditTransaction.create({
            user_id: me.id,
            amount: creditsToRefund,
            type: 'Refund_Rejection',
            task_id: id,
            balance_after: newBalance,
            note: `החזר קרדיטים - יציאה מהמשימה`
          });
        }
        await base44.entities.TaskApplication.update(app.id, { status: 'cancelled' });
      }
      // 2. Notify task owner via chat
      if (task?.client_id && me) {
        await base44.entities.ChatMessage.create({
          task_id: id,
          sender_id: me.id,
          sender_name: me.full_name,
          content: `👋 ${me.full_name} יצא מהמשימה. המשימה חזרה להיות פתוחה — תוכל לאשר בקשות קיימות או לקבל חדשות.`
        });
      }
      // 3. Reset task back to OPEN
      return base44.entities.Task.update(id, { status: 'OPEN', worker_id: null, worker_name: null, worker_status: null });
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
      toast.success('יצאת מהמשימה והקרדיטים הוחזרו 🪙');
      navigate('/');
    }
  });

  const cancelApplicationMutation = useMutation({
    mutationFn: async () => {
      // Refund credits before cancelling
      const creditsToRefund = myApp?.credits_charged || 0;
      if (creditsToRefund > 0) {
        const freshMe = await base44.auth.me();
        const currentCredits = freshMe?.worker_credits ?? 0;
        const newBalance = currentCredits + creditsToRefund;
        await base44.auth.updateMe({ worker_credits: newBalance });
        await base44.entities.CreditTransaction.create({
          user_id: me.id,
          amount: creditsToRefund,
          type: 'Refund_Rejection',
          task_id: id,
          balance_after: newBalance,
          note: `החזר קרדיטים - ביטול בקשה`
        });
      }
      await base44.entities.TaskApplication.update(myApp.id, { status: 'cancelled' });
    },
    onMutate: () => {
      // Optimistic: immediately remove from myApp cache
      prevWorkerIdRef.current = null;
      queryClient.setQueryData(['myApp', id, me?.id], null);
      // Also update the feed applications cache immediately
      queryClient.setQueryData(['myApplicationsFeed', me?.id], (old = []) =>
      old.map((a) => a.id === myApp.id ? { ...a, status: 'cancelled' } : a)
      );
    },
    onSuccess: () => {
      // Hard sync everything after server confirms
      queryClient.invalidateQueries({ queryKey: ['myApp', id, me?.id] });
      queryClient.invalidateQueries({ queryKey: ['applications', id] });
      queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed'] });
      queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed', me?.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['creditTxns', me?.id] });
      toast.success('הבקשה בוטלה והקרדיטים הוחזרו 🪙');
    }
  });

  const handleApply = async (msgOverride) => {
    if (applyLoading) return;
    setApplyLoading(true);
    const messageToSend = msgOverride !== undefined ? msgOverride : applyMessage;
    try {
      const res = await base44.functions.invoke('applyForTask', { taskId: id, message: messageToSend });
      const data = res.data;

      if (data?.error === 'already_applied') {
        setShowApplyForm(false);
        toast('כבר שלחת בקשה למשימה זו');
        return;
      }

      const newApp = data?.application;
      if (!newApp) throw new Error('שגיאה בשליחת הבקשה');

      // Sync caches
      queryClient.setQueryData(['myApp', id, me?.id], newApp);
      queryClient.setQueryData(['myApplicationsFeed', me?.id], (old = []) => {
        const without = old.filter((a) => !(a.task_id === id && a.worker_id === me?.id));
        return [...without, newApp];
      });
      // Refresh me to reflect updated credits
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setShowApplyForm(false);
      setHasApplied(true);
      toast.success(`הגשת בקשה למשימה: ${data.credits_charged} קרדיטים נוכו`);
      queryClient.invalidateQueries({ queryKey: ['myApp', id, me?.id] });
      queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed', me?.id] });
      queryClient.invalidateQueries({ queryKey: ['applications', id] });
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
        toast.error('שגיאה בשליחת הבקשה, נסה שוב');
      }
    } finally {
      setApplyLoading(false);
    }
  };

  // Boost — deduct 5 credits + update task + show animation
  const handleBoost = async () => {
    if (boostLoading) return;
    const currentCredits = me?.worker_credits ?? 0;
    if (currentCredits < 5) {
      toast.error('אין מספיק ג\'ובות — נדרשות 5 ג\'ובות לאיתות נוסף');
      return;
    }
    setBoostLoading(true);
    const newBalance = currentCredits - 5;
    await base44.auth.updateMe({ worker_credits: newBalance });
    await base44.entities.CreditTransaction.create({
      user_id: me.id,
      amount: -5,
      type: 'Application_Fee',
      task_id: id,
      task_title: task.title,
      balance_after: newBalance,
      note: 'Boost — איתות נוסף',
    });
    await base44.entities.Task.update(id, {
      last_boost_at: new Date().toISOString(),
      boost_count: (task.boost_count || 0) + 1,
    });
    queryClient.invalidateQueries({ queryKey: ['me'] });
    queryClient.invalidateQueries({ queryKey: ['task', id] });
    setBoostLoading(false);
    setShowBoostOverlay(true);
  };

  // Signal reopen - sends a chat message + creates a notification for task owner
  const handleSignalReopen = async () => {
    if (!me || !task?.client_id || signalSent) return;
    // Send chat message so owner sees it in chat inbox
    await base44.entities.ChatMessage.create({
      task_id: id,
      sender_id: me.id,
      sender_name: me.full_name,
      content: `👋 היי! המשימה "${task.title}" פגה תוקף אבל אני מעוניין לבצע אותה. תוכל לפתוח אותה מחדש עבורי?`
    });
    // Also create a signal record on the task so owner can see interested workers
    await base44.entities.Task.update(id, {
      signal_worker_id: me.id,
      signal_worker_name: me.full_name
    });
    setSignalSent(true);
    toast.success('האיתות נשלח לבעל המשימה! 📣');
  };

  if (isLoading) {
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
  if (!task) return <div className="p-8 text-center text-muted-foreground">משימה לא נמצאה</div>;

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
  const statusLabel = getStatusLabel(task.status, isOwner);
  const isExpired = task.status === 'EXPIRED';
  const canTakeInstant = false; // All tasks now require application
  const canApplyManual = task.status === 'OPEN' && !isOwner && !hasWorker && !hasPendingApp && !isApproved;
  const status = statusConfig[task.status] || statusConfig.OPEN;

  return (
    <div className="min-h-screen" dir="rtl" style={{ background: 'var(--surface-1)', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
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
              <div style={{ fontSize: 18, fontWeight: 900, color: '#0f1e40', marginBottom: 8 }}>לצאת מהמשימה?</div>
              <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
                זוהי פעולה סופית — תצא מהמשימה ובעל המשימה יקבל עדכון.<br />
                <strong style={{ color: '#0f1e40' }}>הוא יוכל לאשר בקשות אחרות או לקבל עובדים חדשים.</strong>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => setShowExitWarning(false)}
                style={{ width: '100%', height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', border: 'none', color: 'white', fontWeight: 900, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 16px rgba(26,111,212,0.35)' }}>
                
                המשך במשימה
              </button>
              <button
                onClick={() => {setShowExitWarning(false);cancelTakeMutation.mutate();}}
                disabled={cancelTakeMutation.isPending}
                style={{ width: '100%', height: 48, borderRadius: 16, background: 'white', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                
                {cancelTakeMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <><DoorOpen size={16} strokeWidth={1.8} /> כן, צא מהמשימה</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Worker 3-min alert */}
      {isWorker && <WorkerStatusAlert task={task} me={me} />}

      <PageHeader title={task.title} right={null} />
      

      <div style={{ padding: '8px 12px 0' }} className="space-y-2">
        {/* Expired banner */}
        {isExpired &&
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 20, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <AlertTriangle size={20} color="#f97316" />
              <div>
                <div style={{ fontWeight: 800, color: '#c2410c', fontSize: 14 }}>המשימה פגה תוקף</div>
                <div style={{ fontSize: 12, color: '#ea580c', marginTop: 2 }}>המשימה הייתה פתוחה ופג תוקפה</div>
              </div>
            </div>
            {isOwner &&
          <Button
            onClick={() => {
              if (task.payment_status === 'funded') {
                navigate(`/create-task?editId=${id}&repost=1`);
              } else {
                reopenMutation.mutate();
              }
            }}
            disabled={reopenMutation.isPending}
            className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold h-11">
            
                {reopenMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4 ml-2" />פתח את המשימה מחדש</>}
              </Button>
          }
            {!isOwner && !signalSent &&
          <Button onClick={() => gate(handleSignalReopen)} variant="outline"
          className="w-full rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50 font-semibold h-11">
            
                <Send size={15} strokeWidth={1.8} style={{ marginLeft: 6 }} /> שלח איתות לבעל המשימה
              </Button>
          }
            {!isOwner && signalSent &&
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '12px 16px' }}>
                <div style={{ fontWeight: 800, color: '#166534', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={15} color="#16a34a" /> האיתות נשלח!</div>
                <div style={{ fontSize: 12, color: '#15803d', marginTop: 3 }}>מחכה לאישור פתיחת המשימה מחדש</div>
              </div>
          }
          </div>
        }



        {/* Main Task Banner */}
        <div style={{ background: taskGradient, borderRadius: 22, color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
          <div style={{ position: 'absolute', bottom: -20, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

          {/* WorkerTracker at top when TAKEN */}
          {(isOwner && task.status === 'TAKEN' || isWorker && task.status === 'TAKEN') &&
          <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.18)' }}>
              <WorkerTrackerBar
              task={task}
              isWorker={isWorker}
              isOwner={isOwner}
              onUpdate={handleWorkerUpdate}
              showMapButton={!!(task.worker_lat && task.worker_lng)}
              onMapToggle={() => setShowWorkerMap((v) => !v)} />
            
              {showWorkerMap && isOwner && task.worker_lat && task.worker_lng &&
            <div style={{ marginTop: 10, borderRadius: 16, overflow: 'hidden' }}>
                  <LiveWorkerMap task={task} />
                </div>
            }
            </div>
          }

          <div style={{ padding: '16px 18px 18px' }}>
            {/* Non-owner status pill */}
            {!isOwner && task.status !== 'OPEN' && (
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5 }}>{statusLabel}</span>
              </div>
            )}

            {/* Title row — with 3-dot on left for owner */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
              {task.title && (
                <div style={{ fontSize: 20, fontWeight: 900, color: 'white', lineHeight: 1.25, flex: 1, minWidth: 0 }}>
                  {task.title}
                </div>
              )}
              {isOwner && (task.status === 'OPEN' || task.status === 'EXPIRED' || (task.status === 'TAKEN' && !!task.worker_status)) && (
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
                {task.payment_method && <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 2 }}>{task.payment_method === 'Cash' ? 'מזומן' : task.payment_method}</div>}
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

            {/* Description */}
            {mainDescription &&
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.55, marginBottom: 10 }}>
                {mainDescription.length > 180 ? mainDescription.slice(0, 180) + '…' : mainDescription}
              </div>
            }

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
              {task.created_date && getRelativeTime(task.created_date) && (
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                  פורסם {getRelativeTime(task.created_date)}
                </span>
              )}
            </div>





            {/* Owner scanning label — when OPEN and no applicants yet, with boost pill inline */}
            {isOwner && task.status === 'OPEN' && applicationCount === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ flex: 1 }}>
                  <ScanningLabelDetail />
                </div>
                {boostAvailable && <BoostChargeDetail onBoost={() => setShowBoostConfirm(true)} loading={boostLoading} lastBoostAt={task.last_boost_at} createdDate={task.created_date} />}
              </div>
            )}
            {/* Boost pill + applicants button when there are applicants */}
            {isOwner && task.status === 'OPEN' && applicationCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <button
                  onClick={() => document.getElementById('task-applicants-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  style={{
                    flex: 1, height: 38, borderRadius: 12,
                    background: 'rgba(255,255,255,0.15)',
                    border: '1.5px solid rgba(255,165,0,0.7)',
                    color: 'white', fontWeight: 800, fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    cursor: 'pointer',
                  }}
                >
                  🟠 {applicationCount} בקשות — לחץ לצפייה
                </button>
                {boostAvailable && <BoostChargeDetail onBoost={() => setShowBoostConfirm(true)} loading={boostLoading} lastBoostAt={task.last_boost_at} createdDate={task.created_date} />}
              </div>
            )}

            {/* Owner Analytics — views & clicks (no emojis) */}
            {isOwner && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.13)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: 'white', lineHeight: 1 }}>{task.views_count || 0}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2, fontWeight: 600 }}>צפיות</div>
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.13)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: 'white', lineHeight: 1 }}>{task.clicks_count || 0}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2, fontWeight: 600 }}>כניסות</div>
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.13)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: 'white', lineHeight: 1 }}>{applicationCount}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2, fontWeight: 600 }}>בקשות</div>
                </div>
              </div>
            )}



            {/* Approved CTA */}
            {isApproved && !isWorker && task.status === 'OPEN' &&
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '12px 14px', marginBottom: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>🎉 בקשתך אושרה!</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => gate(() => takeMutation.mutate())} disabled={takeMutation.isPending}
                style={{ flex: 1, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.25)', border: '1.5px solid rgba(255,255,255,0.4)', color: 'white', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  
                    {takeMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : '🚀 צא עכשיו'}
                  </button>
                  <button onClick={() => cancelApplicationMutation.mutate()} disabled={cancelApplicationMutation.isPending}
                style={{ height: 42, padding: '0 14px', borderRadius: 12, background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  בטל</button>
                </div>
              </div>
            }

            {/* Apply button */}
            {canApplyManual && !showApplyForm &&
            <button
              onClick={() => {if (!isAuthenticated) {setShowLoginPrompt(true);return;}gate(() => setShowApplyForm(true));}}
              style={{ width: '100%', height: 46, borderRadius: 13, background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', color: 'white', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, backdropFilter: 'blur(4px)' }}>
              
                <Send size={15} strokeWidth={1.8} />
                הגש מועמדות למשימה — {Math.max(1, Math.round((Math.round(calculateCurrentPrice(task)) || 0) * 0.05))} <CreditIcon size={14} />
              </button>
            }

            {/* Pending pill */}
            {hasPendingApp && !isOwner &&
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={12} />
                <span style={{ fontSize: 12, fontWeight: 700 }}>בקשתך ממתינה לאישור</span>
              </div>
            }

            {/* Secondary actions: chat + cancel — inside banner */}
            {!isOwner && (hasPendingApp || isApproved) &&
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button
                onClick={() => setShowQuickChat(true)}
                style={{ flex: 1, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                
                  <MessageCircle size={13} /> הודעה למפרסם
                </button>
                {hasPendingApp &&
              <button
                onClick={() => cancelApplicationMutation.mutate()}
                disabled={cancelApplicationMutation.isPending}
                style={{ height: 34, padding: '0 14px', borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.85)', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                
                    {cancelApplicationMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <><X size={11} /> בטל בקשה</>}
                  </button>
              }
              </div>
            }

            {/* Report — tiny, inside banner */}
            {!isOwner &&
            <button
              onClick={() => {if (!isAuthenticated) {setShowLoginPrompt(true);return;}setShowReport(true);}}
              style={{ width: '100%', height: 26, background: 'none', border: 'none', color: 'rgba(255,255,255,0.38)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 2 }}>
              
                <Flag size={10} /> דיווח על המשימה
              </button>
            }
          </div>
          <style>{`@keyframes livePing{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(2.5);opacity:0}}@keyframes scanRing{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(1.35);opacity:0}}@keyframes scanSweep{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>

        {/* Applicants for owner — above the map */}
        {isOwner && applicationCount > 0 && (task.status === 'OPEN' || task.status === 'TAKEN' && !task.worker_status) &&
        <div id="task-applicants-section">
          <TaskApplicants task={task} onApprove={() => queryClient.refetchQueries({ queryKey: ['task', id] })} />
        </div>
        }

        {/* Task location map — shown for non-TAKEN tasks with location */}
        {task.status !== 'TAKEN' && task.lat && task.lng &&
        <TaskLocationMap task={task} />
        }

        {/* Live worker map */}
        {task.status === 'TAKEN' && task.worker_lat && task.worker_lng &&
        ['on_the_way', 'delayed', 'parking'].includes(task.worker_status) &&
        <LiveWorkerMap task={task} />
        }



        {/* ── Task Details Card ───────────────────────────────────────── */}
        {(task.estimated_time || task.category ||
          task.address_building || task.address_floor || task.address_apartment || task.address_notes ||
          task.requirements?.vehicle || task.requirements?.two_people || task.requirements?.experience ||
          extraLines.length > 0 ||
          (isOwner && task.auto_bump_enabled && task.base_price && task.max_price)) && (
          <div style={{ background: 'var(--surface-2)', borderRadius: 20, border: '1px solid var(--border-1)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 11 }}>

            {/* Auto-bump — owner only, at top */}
            {isOwner && task.auto_bump_enabled && task.base_price && task.max_price && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '9px 14px' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#92400e', marginBottom: 4 }}>📈 מחיר עולה אוטומטית</div>
                <div style={{ fontSize: 12, color: '#b45309', lineHeight: 1.5 }}>
                  המחיר עולה בהדרגה מ-₪{task.base_price} עד ₪{task.max_price} כל 5 דקות, כדי שהמשימה תהיה אטרקטיבית ותמשוך בקשות לביצוע.
                  {applicationCount > 0
                    ? <span style={{ color: '#059669', fontWeight: 700, display: 'block', marginTop: 2 }}>✓ המחיר הוקפא על ₪{Math.round(calculateCurrentPrice(task))} — התקבלה בקשה</span>
                    : <span style={{ display: 'block', marginTop: 2 }}>כעת: ₪{Math.round(calculateCurrentPrice(task))} · נעצר אוטומטית עם קבלת בקשה ראשונה</span>}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', letterSpacing: 0.5 }}>פרטי המשימה</div>
              <button
                onClick={() => { navigator.clipboard.writeText(task.id); toast('ID הועתק'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#94a3b8', fontFamily: 'monospace', background: 'var(--surface-3)', borderRadius: 6, padding: '2px 7px', letterSpacing: 0.3, border: 'none', cursor: 'pointer' }}
                title="העתק ID"
              >
                #{task.id?.slice(-8)}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              </button>
            </div>

            {/* Expiry — moved from banner */}
            {task.expires_at && task.status === 'OPEN' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={13} color="#ea580c" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>תוקף המשימה</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                    <TaskExpiry expiresAt={task.expires_at} showOnlyWhenUrgent={false} inline />
                  </div>
                </div>
              </div>
            )}

            {/* Estimated time */}
            {task.estimated_time && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={13} color="#1a6fd4" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>זמן משוער</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                    {task.estimated_time === '15m' ? 'רבע שעה' : task.estimated_time === '30m' ? 'חצי שעה' : task.estimated_time === '1h' ? 'שעה' : task.estimated_time === '2h' ? 'שעתיים' : task.estimated_time}
                  </div>
                </div>
              </div>
            )}

            {/* Category */}
            {task.category && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, background: '#f8f9fb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>
                  {CATEGORY_EMOJI[task.category] || '🔨'}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>קטגוריה</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{getCategoryLabel(task.category)}</div>
                </div>
              </div>
            )}

            {/* Full address */}
            {(task.address_building || task.address_floor || task.address_apartment || task.address_notes) && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin size={13} color="#ea580c" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>פרטי כתובת</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.5 }}>
                    {[
                      task.address_building && `בניין ${task.address_building}`,
                      task.address_floor && `קומה ${task.address_floor}`,
                      task.address_apartment && `דירה ${task.address_apartment}`,
                      task.address_notes,
                    ].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </div>
            )}

            {/* Requirements — text only, no tags */}
            {(task.requirements?.vehicle || task.requirements?.two_people || task.requirements?.experience) && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={13} color="#059669" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>דרישות</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.6 }}>
                    {[
                      task.requirements.vehicle && 'נדרש רכב',
                      task.requirements.two_people && 'נדרשים שני אנשים',
                      task.requirements.experience && 'נדרש ניסיון',
                    ].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </div>
            )}

            {/* Category-specific extra fields (from description parser) */}
            {extraLines.length > 0 && (
              <>
                <div style={{ height: 1, background: 'var(--border-1)', margin: '2px 0' }} />
                <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', letterSpacing: 0.5 }}>פרטים נוספים</div>
                {extraLines.map((line, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 10, background: '#f8f9fb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13 }}>
                      {line.isToggle ? '✓' : '•'}
                    </div>
                    <div>
                      {line.isToggle ? (
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{line.label}</div>
                      ) : (
                        <>
                          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{line.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{line.value}</div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Actions */}
        {(canApplyManual || (task.status === 'COMPLETED' && (me?.id === task.client_id || me?.id === task.worker_id)) || (isOwner && ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(task.status)) || (isWorker && task.status === 'TAKEN')) && <div style={{ paddingBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Apply sheet portal */}
          {canApplyManual && showApplyForm && createPortal(
            <ApplySheet
              task={task}
              loading={applyLoading}
              onClose={() => setShowApplyForm(false)}
              onApply={(msg) => {setApplyMessage(msg);handleApply(msg);}} />,

            document.body
          )}

          {/* Invoice button — for worker after completion */}
          {task.status === 'COMPLETED' && me?.id === task.worker_id && (
            <button
              onClick={() => setShowInvoice(true)}
              style={{ width: '100%', height: 48, borderRadius: 14, background: task.requires_invoice ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : '#faf5ff', border: task.requires_invoice ? 'none' : '1.5px solid #e9d5ff', color: task.requires_invoice ? 'white' : '#7c3aed', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, boxShadow: task.requires_invoice ? '0 4px 14px rgba(124,58,237,0.3)' : 'none' }}>
              <FileText size={16} />
              {task.requires_invoice ? '📄 הפק חשבונית מס (נדרש על ידי הלקוח)' : 'הפק חשבונית מס'}
            </button>
          )}

          {/* Rating CTA for completed tasks */}
          {task.status === 'COMPLETED' && (me?.id === task.client_id || me?.id === task.worker_id) && myReview === null && !hasRated &&
          <button onClick={() => setShowRating(true)}
          style={{ width: '100%', height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, boxShadow: '0 4px 14px rgba(251,191,36,0.35)' }}>
              <Star size={16} className="fill-white" /> דרג את {me?.id === task.client_id ? task.worker_name : task.client_name}
            </button>
          }
          {task.status === 'COMPLETED' && (me?.id === task.client_id || me?.id === task.worker_id) && myReview &&
          <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#92400e', fontWeight: 700 }}>
              <Star size={15} className="fill-yellow-400 text-yellow-400" />
              {[1, 2, 3, 4, 5].slice(0, myReview.rating).map(() => '★').join('')} הדירוג שלך נשמר — לא ניתן לדרג שוב
            </div>
          }

          {/* Repost */}
          {isOwner && ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(task.status) &&
          <button
            onClick={() => {
              if (task.status === 'EXPIRED' && task.payment_status === 'funded') {
                navigate(`/create-task?editId=${id}&repost=1`);
                return;
              }
              const params = new URLSearchParams({ repost: '1', title: task.title || '', description: task.description || '', price: String(task.price || ''), city: task.city || '', location_name: task.location_name || '', category: task.category || '', estimated_time: task.estimated_time || '', approval_mode: task.approval_mode || 'manual' });
              navigate(`/create-task?${params.toString()}`);
            }}
            style={{ width: '100%', height: 48, borderRadius: 14, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1a6fd4', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14 }}>
            
              <RotateCcw size={16} /> פרסם שוב
            </button>
          }

          {/* Exit task */}
          {isWorker && task.status === 'TAKEN' && task.worker_status !== 'done' &&
          <button onClick={() => setShowExitWarning(true)} disabled={cancelTakeMutation.isPending}
          style={{ width: '100%', height: 48, borderRadius: 14, background: 'white', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
            
              {cancelTakeMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <><DoorOpen size={16} strokeWidth={1.8} /> צא מהמשימה</>}
            </button>
          }
        </div>}
      </div>



      {showCompletion && createPortal(
        <CompletionModal task={task} me={me} onClose={() => {setShowCompletion(false);setShowRating(true);}} />,
        document.body
      )}
      {showRating && task && me && createPortal(
        <RatingModal task={task} me={me} onClose={() => { setShowRating(false); setHasRated(true); }} />,
        document.body
      )}

      {showReport && task && createPortal(
        <ReportModal task={task} me={me} onClose={() => setShowReport(false)} />,
        document.body
      )}

      {showBuyCredits &&
      <BuyCreditsModal
        creditsNeeded={creditsNeeded}
        onClose={() => setShowBuyCredits(false)} />

      }

      {/* Owner 3-dot bottom sheet */}
      {showOwnerMenu && createPortal(
        <div className="mobile-sheet-overlay" onClick={() => setShowOwnerMenu(false)}>
          <div dir="rtl" className="mobile-sheet" style={{ width: '100%', maxWidth: 480, padding: '20px 20px 0' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 13, fontWeight: 800, color: '#94a3b8', marginBottom: 12, paddingRight: 4, letterSpacing: 0.3 }}>פעולות משימה</div>
            {task.status === 'OPEN' &&
            <div onClick={() => { setShowOwnerMenu(false); navigate(`/create-task?editId=${id}`); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 6px', borderBottom: '1px solid #f0f4fa', cursor: 'pointer' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 13, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Pencil size={17} color="#1a6fd4" />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f2b6b' }}>עריכת משימה</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>שינוי פרטים, מחיר ותיאור</div>
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
                <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }}>ביטול משימה</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>המשימה תחזור לרשימה</div>
              </div>
            </div>
            <div style={{ height: 24 }} />
          </div>
        </div>,
        document.body
      )}

      {/* Boost confirmation popup */}
      {showBoostConfirm && createPortal(
        <div className="mobile-sheet-overlay" onClick={() => setShowBoostConfirm(false)}>
          <div dir="rtl" className="mobile-sheet" style={{ width: '100%', maxWidth: 480, padding: '24px 20px 0' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 20px' }} />
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>⚡</div>
              <div style={{ fontSize: 19, fontWeight: 900, color: '#0f1e40', marginBottom: 10 }}>שגר איתות נוסף</div>
              <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 16 }}>
                האיתות ישלח לכל העובדים הרלוונטיים באזור שלך — על בסיס קטגוריה, ניסיון והיסטוריית פעילות — כדי להגביר חשיפה ולמשוך בקשות חדשות.
              </div>
              <div style={{ background: '#faf5ff', border: '1.5px solid #d8b4fe', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>עלות: 5 ג'ובות מיתרתך</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>·</span>
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>יתרה: {me?.worker_credits ?? 0} ג'ובות</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
              <button
                onClick={() => { setShowBoostConfirm(false); handleBoost(); }}
                style={{ width: '100%', height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', border: 'none', color: 'white', fontWeight: 900, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 18px rgba(124,58,237,0.35)' }}>
                ⚡ שגר עכשיו — 5 ג'ובות
              </button>
              <button onClick={() => setShowBoostConfirm(false)}
                style={{ width: '100%', height: 46, borderRadius: 16, background: 'none', border: '1px solid #e8edf5', color: '#64748b', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                ביטול
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showQuickChat && task && me && <QuickChatDrawer task={task} me={me} onClose={() => setShowQuickChat(false)} />}

      {showInvoice && task && me && createPortal(
        <InvoiceModal task={task} me={me} onClose={() => setShowInvoice(false)} />,
        document.body
      )}

      {showBoostOverlay && task && (
        <BoostOverlay
          taskId={task.id}
          taskTitle={task.title}
          taskPrice={task.price}
          taskCategory={task.category}
          onDismiss={() => setShowBoostOverlay(false)}
        />
      )}

      {showCancelConfirm && task && createPortal(
        <CancelTaskConfirmModal
          task={task}
          isLoading={cancelMutation.isPending}
          onConfirm={() => cancelMutation.mutate()}
          onClose={() => setShowCancelConfirm(false)} />,

        document.body
      )}

      {/* Lightbox */}
      {task &&
      <MediaLightbox
        isOpen={lightboxOpen}
        items={[
        ...task.images.map((url) => ({ type: 'image', url })),
        ...(task.video_url ? [{ type: 'video', url: task.video_url }] : [])]
        }
        initialIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)} />

      }
    </div>);

}