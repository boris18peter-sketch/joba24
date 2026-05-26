import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Clock, Star, MessageCircle, Flag, CheckCircle2, Loader2, Car, Users, Wrench, Pencil, RefreshCw, AlertTriangle, Navigation, RotateCcw, Send, DoorOpen, X, Play } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import CompletionModal from '@/components/CompletionModal';
import RatingModal from '@/components/RatingModal';
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
import VerifyModal from '@/components/VerifyModal';
import VerifiedBadge from '@/components/VerifiedBadge';
import { useVerifyGuard } from '@/hooks/useVerifyGuard';
import { useAuth } from '@/lib/AuthContext';
import LoginPromptModal from '@/components/LoginPromptModal';
import MediaLightbox from '@/components/MediaLightbox';
import CancelTaskConfirmModal from '@/components/CancelTaskConfirmModal';
import ReportModal from '@/components/ReportModal';
import BuyCreditsModal from '@/components/BuyCreditsModal';
import PageHeader from '@/components/PageHeader';
import TrustBadges from '@/components/TrustBadges';
import LiveActivityPulse from '@/components/LiveActivityPulse';
import LiveWorkerMap from '@/components/LiveWorkerMap';

// Labels are context-aware: isOwner sees employer language, worker sees worker language
const getStatusLabel = (status, isOwner) => {
  if (status === 'OPEN')      return isOwner ? 'מחפש פועל' : 'פתוח';
  if (status === 'TAKEN')     return isOwner ? 'בביצוע' : 'לקחתי';
  if (status === 'COMPLETED') return 'הושלם';
  if (status === 'CANCELLED') return 'בוטל';
  if (status === 'EXPIRED')   return 'פג תוקף';
  return status;
};
const statusConfig = {
  OPEN: { label: 'פתוח', color: 'text-blue-700 bg-blue-100' },
  TAKEN: { label: 'בביצוע', color: 'text-indigo-700 bg-indigo-100' },
  COMPLETED: { label: 'הושלם', color: 'text-gray-700 bg-gray-100' },
  CANCELLED: { label: 'בוטל', color: 'text-red-700 bg-red-100' },
  EXPIRED: { label: 'פג תוקף', color: 'text-orange-700 bg-orange-100' },
};

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


  const [showExitWarning, setShowExitWarning] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [creditsNeeded, setCreditsNeeded] = useState(null);
  const prevWorkerIdRef = useRef(null);
  const prevTaskStatusRef = useRef(null);
  const autoRatingShownRef = useRef(false);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me(), enabled: isAuthenticated });
  const { gate, showVerify, onSuccess: onVerifySuccess, onClose: onVerifyClose } = useVerifyGuard(me);

  // Check if current user already reviewed this task
  const { data: myReview } = useQuery({
    queryKey: ['myReview', id, me?.id],
    queryFn: () => base44.entities.Review.filter({ task_id: id, reviewer_id: me.id }),
    select: data => data[0],
    enabled: !!me?.id,
  });
  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => base44.entities.Task.filter({ id }),
    select: data => data[0],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch client + worker user data for trust badges
  const { data: clientUser } = useQuery({
    queryKey: ['publicUser', task?.client_id],
    queryFn: async () => { const u = await base44.entities.User.filter({ id: task.client_id }); return u[0] || null; },
    enabled: !!task?.client_id,
    staleTime: 120000,
  });
  const { data: workerUser } = useQuery({
    queryKey: ['publicUser', task?.worker_id],
    queryFn: async () => { const u = await base44.entities.User.filter({ id: task.worker_id }); return u[0] || null; },
    enabled: !!task?.worker_id && task?.status === 'TAKEN',
    staleTime: 120000,
  });

  // Check if MY application was approved for this task — only active ones
  const { data: myApp } = useQuery({
    queryKey: ['myApp', id, me?.id],
    queryFn: () => base44.entities.TaskApplication.filter({ task_id: id, worker_id: me.id }),
    select: data => data.find(a => a.status === 'pending' || a.status === 'approved') || null,
    enabled: !!me?.id,
    staleTime: 0,
  });
  const isApproved = myApp?.status === 'approved';
  const hasPendingApp = myApp?.status === 'pending' && myApp?.status !== 'cancelled';

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
      worker_status: 'on_the_way',
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
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('cancelTaskPayment', { taskId: id });
      if (!res.data?.success) throw new Error('שגיאה בביטול');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasksPage'] });
    },
  });

  const reopenMutation = useMutation({
    mutationFn: () => base44.entities.Task.update(id, { status: 'OPEN', expires_at: null, worker_id: null, worker_name: null, worker_status: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      toast.success('המשימה נפתחה מחדש!');
    },
  });

  const cancelTakeMutation = useMutation({
    mutationFn: async () => {
      // 1. Cancel the worker's approved application + refund credits
      const workerApps = await base44.entities.TaskApplication.filter({ task_id: id, worker_id: me?.id });
      const activeApps = workerApps.filter(a => a.status === 'approved' || a.status === 'pending');
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
            note: `החזר קרדיטים - יציאה מהמשימה`,
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
          content: `👋 ${me.full_name} יצא מהמשימה. המשימה חזרה להיות פתוחה — תוכל לאשר בקשות קיימות או לקבל חדשות.`,
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
    },
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
          note: `החזר קרדיטים - ביטול בקשה`,
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
        old.map(a => a.id === myApp.id ? { ...a, status: 'cancelled' } : a)
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
    },
  });

  const handleApply = async () => {
    if (applyLoading) return;
    setApplyLoading(true);
    try {
      const res = await base44.functions.invoke('applyForTask', { taskId: id, message: applyMessage });
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
        const without = old.filter(a => !(a.task_id === id && a.worker_id === me?.id));
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

  // Signal reopen - sends a chat message + creates a notification for task owner
  const handleSignalReopen = async () => {
    if (!me || !task?.client_id || signalSent) return;
    // Send chat message so owner sees it in chat inbox
    await base44.entities.ChatMessage.create({
      task_id: id,
      sender_id: me.id,
      sender_name: me.full_name,
      content: `👋 היי! המשימה "${task.title}" פגה תוקף אבל אני מעוניין לבצע אותה. תוכל לפתוח אותה מחדש עבורי?`,
    });
    // Also create a signal record on the task so owner can see interested workers
    await base44.entities.Task.update(id, {
      signal_worker_id: me.id,
      signal_worker_name: me.full_name,
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
            {[1,2,3].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: '#e8edf5', flexShrink: 0 }} className="animate-pulse" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ height: 11, width: '30%', borderRadius: 6, background: '#e8edf5' }} className="animate-pulse" />
                  <div style={{ height: 14, width: '55%', borderRadius: 6, background: '#e8edf5' }} className="animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (!task) return <div className="p-8 text-center text-muted-foreground">משימה לא נמצאה</div>;

  const isOwner = me?.id === task.client_id;
  const hasWorker = !!task.worker_id;
  const isWorker = me?.id === task.worker_id && task.status === 'TAKEN';
  const statusLabel = getStatusLabel(task.status, isOwner);
  const isExpired = task.status === 'EXPIRED';
  const canTakeInstant = false; // All tasks now require application
  const canApplyManual = task.status === 'OPEN' && !isOwner && !hasWorker && !hasPendingApp && !isApproved;
  const status = statusConfig[task.status] || statusConfig.OPEN;

  return (
    <div className="min-h-screen" dir="rtl" style={{ background: 'var(--surface-1)' }}>
      <TaskTakenConfetti trigger={confetti} />
      {showVerify && createPortal(<VerifyModal onClose={onVerifyClose} onSuccess={onVerifySuccess} />, document.body)}
      {showLoginPrompt && createPortal(
        <LoginPromptModal
          onLogin={() => {
            setShowLoginPrompt(false);
            login();
          }}
          onClose={() => setShowLoginPrompt(false)}
          type="apply"
        />,
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
                style={{ width: '100%', height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', border: 'none', color: 'white', fontWeight: 900, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 16px rgba(26,111,212,0.35)' }}
              >
                המשך במשימה
              </button>
              <button
                onClick={() => { setShowExitWarning(false); cancelTakeMutation.mutate(); }}
                disabled={cancelTakeMutation.isPending}
                style={{ width: '100%', height: 48, borderRadius: 16, background: 'white', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {cancelTakeMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <><DoorOpen size={16} strokeWidth={1.8} /> כן, צא מהמשימה</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Worker 3-min alert */}
      {isWorker && <WorkerStatusAlert task={task} me={me} />}

      <PageHeader
        title={task.title}
        right={<span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: '#eff6ff', color: '#1a6fd4', border: '1px solid #bfdbfe' }}>{statusLabel}</span>}
      />

      <div style={{ padding: '16px 16px 0' }} className="space-y-4">
        {/* Expired banner */}
        {isExpired && (
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 20, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <AlertTriangle size={20} color="#f97316" />
              <div>
                <div style={{ fontWeight: 800, color: '#c2410c', fontSize: 14 }}>המשימה פגה תוקף</div>
                <div style={{ fontSize: 12, color: '#ea580c', marginTop: 2 }}>המשימה הייתה פתוחה ופג תוקפה</div>
              </div>
            </div>
            {isOwner && (
              <Button
                onClick={() => {
                  if (task.payment_status === 'funded') {
                    navigate(`/edit-task/${id}`, { state: { repostMode: true } });
                  } else {
                    reopenMutation.mutate();
                  }
                }}
                disabled={reopenMutation.isPending}
                className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold h-11"
              >
                {reopenMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4 ml-2" />פתח את המשימה מחדש</>}
              </Button>
            )}
            {!isOwner && !signalSent && (
              <Button onClick={() => gate(handleSignalReopen)} variant="outline"
                className="w-full rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50 font-semibold h-11"
              >
                <Send size={15} strokeWidth={1.8} style={{ marginLeft: 6 }} /> שלח איתות לבעל המשימה
              </Button>
            )}
            {!isOwner && signalSent && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '12px 16px' }}>
                <div style={{ fontWeight: 800, color: '#166534', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={15} color="#16a34a" /> האיתות נשלח!</div>
                <div style={{ fontSize: 12, color: '#15803d', marginTop: 3 }}>מחכה לאישור פתיחת המשימה מחדש</div>
              </div>
            )}
          </div>
        )}

        {/* Live Activity Pulse — OPEN tasks only */}
        {task.status === 'OPEN' && (
          <LiveActivityPulse task={task} />
        )}

        {/* Price Hero */}
        <div style={{ background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', borderRadius: 20, padding: '20px 20px', color: 'white', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>תגמול</div>
              <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: -2 }}>₪{task.price}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>{getCategoryLabel(task.category)}</div>
              <div style={{ fontSize: 12, background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Users size={12} /> בחירת עובד
              </div>
            </div>
          </div>
          {/* Bottom row: time + expiry */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
            {task.estimated_time && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                <Clock size={13} />
                <span>זמן משוער: {task.estimated_time}</span>
              </div>
            )}
            {task.expires_at && task.status === 'OPEN' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, padding: '4px 10px', fontSize: 12, fontWeight: 700, color: 'white' }}>
                <Clock size={12} />
                <span>⏳ נסגרת בעוד: <TaskExpiry expiresAt={task.expires_at} showOnlyWhenUrgent={false} inline /></span>
              </div>
            )}
          </div>
        </div>

        {/* Images + Video */}
        {(task.images?.length > 0 || task.video_url) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {task.images?.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {task.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const allItems = [
                        ...task.images.map(url => ({ type: 'image', url })),
                        ...(task.video_url ? [{ type: 'video', url: task.video_url }] : [])
                      ];
                      setLightboxIndex(allItems.findIndex(it => it.url === img));
                      setLightboxOpen(true);
                    }}
                    style={{
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      background: 'none',
                      borderRadius: 16,
                      overflow: 'hidden',
                      flex: '0 0 auto',
                      position: 'relative',
                      display: 'block',
                    }}
                  >
                    <img src={img} alt="" className="w-32 h-24 rounded-2xl object-cover border border-gray-100 hover:opacity-80 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
            {task.video_url && (
              <button
                onClick={() => {
                  const allItems = [
                    ...task.images.map(url => ({ type: 'image', url })),
                    { type: 'video', url: task.video_url }
                  ];
                  setLightboxIndex(allItems.length - 1);
                  setLightboxOpen(true);
                }}
                style={{
                  border: 'none',
                  padding: 0,
                  borderRadius: 16,
                  overflow: 'hidden',
                  background: '#000',
                  cursor: 'pointer',
                  position: 'relative',
                  display: 'block',
                }}
              >
                <video
                  src={task.video_url}
                  style={{ width: '100%', maxHeight: 220, display: 'block', objectFit: 'cover', opacity: 0.9 }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 16,
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Play size={20} color="#000" fill="#000" />
                  </div>
                </div>
              </button>
            )}
          </div>
        )}

        {/* Live worker map — shown when worker is in transit with GPS coordinates */}
        {task.status === 'TAKEN' && task.worker_lat && task.worker_lng &&
          ['on_the_way', 'delayed', 'parking'].includes(task.worker_status) && (
          <LiveWorkerMap task={task} />
        )}

        {/* Worker tracker: Owner & Worker when TAKEN */}
        {((isOwner && task.status === 'TAKEN') || (isWorker && task.status === 'TAKEN')) && (
          <WorkerTrackerBar
            task={task}
            isWorker={isWorker}
            isOwner={isOwner}
            onUpdate={handleWorkerUpdate}
          />
        )}

        {/* Owner waiting for worker to depart — shown after approval but before worker_status is set */}
        {isOwner && task.status === 'TAKEN' && !task.worker_status && (
          <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>⏳</div>
            <div>
              <div style={{ fontWeight: 800, color: '#166534', fontSize: 14 }}>אושר! מחכה שהעובד יצא לדרך</div>
              <div style={{ fontSize: 12, color: '#16a34a', marginTop: 2 }}>העובד <strong>{task.worker_name}</strong> קיבל הודעה ויצא בקרוב</div>
            </div>
          </div>
        )}

        {/* Approved worker banner — shown when this worker's app was approved */}
        {isApproved && !isWorker && task.status === 'OPEN' && (
          <div style={{ background: 'linear-gradient(135deg, #059669, #10b981)', borderRadius: 20, padding: '18px 20px', color: 'white' }}>
            <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 4 }}>🎉 בקשתך אושרה!</div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 14 }}>אתה יכול לצאת לדרך ולהתחיל את המשימה</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => gate(() => takeMutation.mutate())}
                disabled={takeMutation.isPending}
                style={{ flex: 1, height: 46, borderRadius: 14, background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', color: 'white', fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {takeMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : '🚀 צא עכשיו'}
              </button>
              <button
                onClick={() => cancelApplicationMutation.mutate()}
                disabled={cancelApplicationMutation.isPending}
                style={{ height: 46, padding: '0 16px', borderRadius: 14, background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >בטל</button>
            </div>
          </div>
        )}

        {/* Applicants for owner — OPEN (no worker) OR TAKEN but worker hasn't departed yet */}
        {isOwner && (task.status === 'OPEN' || (task.status === 'TAKEN' && !task.worker_status)) && (
          <TaskApplicants task={task} onApprove={() => {
            queryClient.refetchQueries({ queryKey: ['task', id] });
          }} />
        )}

        {/* Description */}
        {task.description && (
          <div style={{ background: 'var(--surface-2)', borderRadius: 20, border: '1px solid var(--border-1)', padding: 16, boxShadow: '0 2px 8px rgba(26,111,212,0.05)' }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#1a6fd4', marginBottom: 8 }}>תיאור</h2>
            <p style={{ color: 'var(--text-1)', lineHeight: 1.65, fontSize: 14 }}>{task.description}</p>
          </div>
        )}

        {/* Details */}
        <div style={{ background: 'var(--surface-2)', borderRadius: 20, border: '1px solid var(--border-1)', padding: 16, boxShadow: '0 2px 8px rgba(26,111,212,0.05)' }} className="space-y-3">
          {task.location_name && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">מיקום</div>
                <div className="font-medium text-sm">{task.location_name}</div>
              </div>
              <NavButtons lat={task.lat} lng={task.lng} locationName={task.location_name} />
            </div>
          )}
          {task.created_date && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">פורסם</div>
                <div className="font-medium text-sm">{format(new Date(task.created_date), 'dd.MM.yyyy · HH:mm')}</div>
              </div>
            </div>
          )}

          {task.client_name && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              </div>
              <div style={{ flex: 1 }}>
                <div className="text-xs text-muted-foreground">מפרסם</div>
                <div className="font-medium text-sm flex items-center gap-1.5">
                  <a href={`/public-profile?id=${task.client_id}`} style={{ color: '#0f2b6b', fontWeight: 700, textDecoration: 'none', borderBottom: '1px solid #bfdbfe' }}>{task.client_name}</a>
                  <VerifiedBadge /> · {task.client_rating?.toFixed(1) || 'חדש'}
                </div>
                {clientUser && <div style={{ marginTop: 6 }}><TrustBadges user={clientUser} compact /></div>}
              </div>
            </div>
          )}
        </div>

        {/* Requirements */}
        {(task.requirements?.vehicle || task.requirements?.two_people || task.requirements?.experience) && (
          <div style={{ background: 'var(--surface-2)', borderRadius: 20, border: '1px solid var(--border-1)', padding: 16, boxShadow: '0 2px 8px rgba(26,111,212,0.05)' }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#1a6fd4', marginBottom: 10 }}>דרישות</h2>
            <div className="flex flex-wrap gap-2">
              {task.requirements.vehicle && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-xl text-sm font-medium"><Car className="w-3.5 h-3.5" /> רכב</span>
              )}
              {task.requirements.two_people && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-xl text-sm font-medium"><Users className="w-3.5 h-3.5" /> שני אנשים</span>
              )}
              {task.requirements.experience && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-xl text-sm font-medium"><Wrench className="w-3.5 h-3.5" /> ניסיון</span>
              )}
            </div>
          </div>
        )}

        {/* Worker info */}
        {task.worker_name && task.status === 'TAKEN' && (
          <div style={{ background: 'var(--surface-2)', borderRadius: 20, border: '1px solid var(--border-1)', padding: 16, boxShadow: '0 2px 8px rgba(26,111,212,0.05)' }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#1a6fd4', marginBottom: 8 }}>מבצע</h2>
            <a href={`/public-profile?id=${task.worker_id}`} style={{ fontWeight: 700, color: 'var(--text-1)', textDecoration: 'none', borderBottom: '1px solid #bfdbfe' }}>{task.worker_name}</a>
            {workerUser && <div style={{ marginTop: 8 }}><TrustBadges user={workerUser} compact /></div>}
          </div>
        )}

        {/* Actions */}
        <div style={{ paddingBottom: canTakeInstant || canApplyManual || hasPendingApp ? 100 : 24, display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Chat button for applicant — can message the task owner */}
          {(hasPendingApp || isApproved) && !isOwner && (
            <button
              onClick={() => navigate(`/chat/${id}`)}
              style={{ width: '100%', height: 44, borderRadius: 14, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1a6fd4', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <MessageCircle size={16} strokeWidth={1.8} /> שלח הודעה למפרסם
            </button>
          )}

          {/* Pending application banner */}
          {hasPendingApp && isWorker && (
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 18, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Clock size={18} color="#d97706" /></div>
              <div>
                <div style={{ fontWeight: 800, color: '#92400e', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={15} /> בקשתך התקבלה וממתינה לאישור</div>
                <div style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>בעל המשימה יאשר אותך בקרוב</div>
              </div>
            </div>
          )}

          {/* Apply form (shown only when triggered) */}
          {canApplyManual && showApplyForm && (
            <div style={{ background: '#eff6ff', borderRadius: 18, padding: 16, border: '1px solid #bfdbfe', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0f2b6b', margin: 0 }}>הוסף הודעה לבעל המשימה (לא חובה)</p>
              <textarea
                placeholder="לדוגמה: יש לי ניסיון של 5 שנים בתחום..."
                value={applyMessage}
                onChange={e => setApplyMessage(e.target.value)}
                rows={3}
                style={{ background: 'white', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 14px', fontSize: 16, fontFamily: 'inherit', resize: 'none', outline: 'none', width: '100%', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleApply} disabled={applyLoading}
                  style={{ flex: 1, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}
                >
                  {applyLoading ? <Loader2 size={18} className="animate-spin" /> : 'שלח בקשה'}
                </button>
                <button onClick={() => setShowApplyForm(false)}
                  style={{ height: 52, padding: '0 18px', borderRadius: 14, background: 'white', border: '1px solid #dce8f5', color: '#666', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                >ביטול</button>
              </div>
            </div>
          )}

          {/* Cancel pending application */}
          {hasPendingApp && !isWorker && (
            <button onClick={() => cancelApplicationMutation.mutate()} disabled={cancelApplicationMutation.isPending}
              style={{ width: '100%', height: 48, borderRadius: 14, background: 'white', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
            >
              {cancelApplicationMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <><X size={16} strokeWidth={2} /> בטל בקשה</>}
            </button>
          )}



          {isOwner && task.status === 'OPEN' && (
            <Link to={`/edit-task/${id}`}>
              <button style={{ width: '100%', height: 48, borderRadius: 14, background: 'white', border: '1px solid #dce8f5', color: '#0f2b6b', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14 }}>
                <Pencil size={18} />עריכת המשימה
              </button>
            </Link>
          )}

          {isOwner && (task.status === 'OPEN' || task.status === 'EXPIRED' || (task.status === 'TAKEN' && !!task.worker_status)) && (
            <button
              onClick={() => {
                const workerIsActive = ['on_the_way', 'delayed', 'parking', 'arrived', 'starting', 'finishing', 'done'].includes(task.worker_status);
                if (task.status === 'TAKEN' && workerIsActive) {
                  window.dispatchEvent(new CustomEvent('show_cancel_warning', { detail: { task } }));
                } else {
                  setShowCancelConfirm(true);
                }
              }}
              disabled={cancelMutation.isPending}
              style={{ width: '100%', height: 48, borderRadius: 14, background: 'white', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
            >
              {cancelMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : 'בטל משימה'}
            </button>
          )}



          {/* Rating CTA for completed tasks */}
          {task.status === 'COMPLETED' && (me?.id === task.client_id || me?.id === task.worker_id) && !myReview && (
            <button onClick={() => setShowRating(true)}
              style={{ width: '100%', height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, boxShadow: '0 4px 14px rgba(251,191,36,0.35)' }}
            >
              <Star size={16} className="fill-white" /> דרג את {me?.id === task.client_id ? task.worker_name : task.client_name}
            </button>
          )}
          {task.status === 'COMPLETED' && (me?.id === task.client_id || me?.id === task.worker_id) && myReview && (
            <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#92400e', fontWeight: 700, cursor: 'not-allowed', opacity: 0.85 }}>
              <Star size={15} className="fill-yellow-400 text-yellow-400" />
              {[1,2,3,4,5].slice(0, myReview.rating).map(() => '★').join('')} הדירוג שלך נשמר — לא ניתן לדרג שוב
            </div>
          )}

          {/* Repost button for owner on closed tasks */}
          {isOwner && ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(task.status) && (
            <button
              onClick={() => {
                // EXPIRED + already paid → go directly to EditTask (no new payment needed)
                if (task.status === 'EXPIRED' && task.payment_status === 'funded') {
                  navigate(`/edit-task/${id}`, { state: { repostMode: true } });
                  return;
                }
                // All other cases → go to CreateTask (new payment required)
                const params = new URLSearchParams({
                  repost: '1',
                  title: task.title || '',
                  description: task.description || '',
                  price: String(task.price || ''),
                  city: task.city || '',
                  location_name: task.location_name || '',
                  category: task.category || '',
                  estimated_time: task.estimated_time || '',
                  approval_mode: task.approval_mode || 'manual',
                });
                navigate(`/create-task?${params.toString()}`);
              }}
              style={{ width: '100%', height: 48, borderRadius: 14, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1a6fd4', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14 }}
            >
              <RotateCcw size={16} /> פרסם שוב
            </button>
          )}

          {isWorker && task.status === 'TAKEN' && task.worker_status !== 'done' && (
            <button onClick={() => setShowExitWarning(true)} disabled={cancelTakeMutation.isPending}
              style={{ width: '100%', height: 48, borderRadius: 14, background: 'white', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
            >
              {cancelTakeMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <><DoorOpen size={16} strokeWidth={1.8} /> צא מהמשימה</>}
            </button>
          )}

          {!isOwner && (
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  setShowLoginPrompt(true);
                  return;
                }
                setShowReport(true);
              }}
              style={{ width: '100%', height: 40, borderRadius: 14, background: 'transparent', border: 'none', color: '#999', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}>
              <Flag size={15} />דיווח על המשימה
            </button>
          )}
        </div>
      </div>

      {/* Sticky bottom CTA */}
      {(canApplyManual && !showApplyForm) && (
        <div style={{ position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom))', left: 16, right: 16, zIndex: 50 }}>
          <button onClick={() => {
            if (!isAuthenticated) {
              setShowLoginPrompt(true);
              return;
            }
            gate(() => setShowApplyForm(true));
          }}
            style={{ width: '100%', height: 58, borderRadius: 18, fontSize: 17, fontWeight: 900, color: 'white', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', boxShadow: '0 8px 28px rgba(26,111,212,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Send size={18} strokeWidth={1.8} /> הגש בקשה לביצוע
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.85, display: 'flex', alignItems: 'center', gap: 4 }}>
              כניסה למשימה {Math.max(1, Math.round((task.price || 0) * 0.05))} <CreditIcon size={13} />
            </div>
          </button>
        </div>
      )}

      {showCompletion && createPortal(
        <CompletionModal task={task} me={me} onClose={() => { setShowCompletion(false); setShowRating(true); }} />,
        document.body
      )}
      {showRating && task && me && createPortal(
        <RatingModal task={task} me={me} onClose={() => setShowRating(false)} />,
        document.body
      )}

      {showReport && task && createPortal(
        <ReportModal task={task} me={me} onClose={() => setShowReport(false)} />,
        document.body
      )}

      {showBuyCredits && (
        <BuyCreditsModal
          creditsNeeded={creditsNeeded}
          onClose={() => setShowBuyCredits(false)}
        />
      )}

      {showCancelConfirm && task && createPortal(
        <CancelTaskConfirmModal
          task={task}
          isLoading={cancelMutation.isPending}
          onConfirm={() => cancelMutation.mutate()}
          onClose={() => setShowCancelConfirm(false)}
        />,
        document.body
      )}

      {/* Lightbox */}
      {task && (
        <MediaLightbox
          isOpen={lightboxOpen}
          items={[
            ...task.images.map(url => ({ type: 'image', url })),
            ...(task.video_url ? [{ type: 'video', url: task.video_url }] : [])
          ]}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}