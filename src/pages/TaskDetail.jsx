import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Clock, Star, MessageCircle, Flag, CheckCircle2, Loader2, Car, Users, Wrench, Pencil, RefreshCw, AlertTriangle, Navigation, RotateCcw, Send, DoorOpen, X } from 'lucide-react';
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
import { getCategoryLabel } from '@/lib/categories';
import VerifyModal from '@/components/VerifyModal';
import VerifiedBadge from '@/components/VerifiedBadge';
import { useVerifyGuard } from '@/hooks/useVerifyGuard';
import StripePaymentSheet from '@/components/StripePaymentSheet';
import StripeOnboardingGate from '@/components/StripeOnboardingGate';

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
  const [showCancelWarning, setShowCancelWarning] = useState(false);
  const [showWorkerCancelledPopup, setShowWorkerCancelledPopup] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showStripeGate, setShowStripeGate] = useState(false);
  const prevWorkerIdRef = useRef(null);
  const prevTaskStatusRef = useRef(null);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
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

  // Detect if task was cancelled while worker was on the way — show popup to worker
  useEffect(() => {
    if (!task || !me) return;
    const prevStatus = prevTaskStatusRef.current;
    if (
      prevStatus === 'TAKEN' &&
      task.status === 'CANCELLED' &&
      task.worker_id === me.id &&
      ['on_the_way', 'delayed', 'parking'].includes(task.worker_status)
    ) {
      setShowWorkerCancelledPopup(true);
    }
    prevTaskStatusRef.current = task.status;
  }, [task?.status]);

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
      toast.success('קחת את הג\'ובה! 🎉');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      // Cancel all approved/pending applications so workers can re-apply if task is reopened
      const apps = await base44.entities.TaskApplication.filter({ task_id: id });
      await Promise.all(
        apps
          .filter(a => a.status === 'pending' || a.status === 'approved')
          .map(a => base44.entities.TaskApplication.update(a.id, { status: 'cancelled' }))
      );
      return base44.entities.Task.update(id, {
        status: 'CANCELLED',
        worker_id: null,
        worker_name: null,
        worker_status: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasksPage'] });
      navigate('/');
      toast.success('הג\'ובה בוטלה');
    },
  });

  const reopenMutation = useMutation({
    mutationFn: () => {
      const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      return base44.entities.Task.update(id, { status: 'OPEN', expires_at: newExpiry, worker_id: null, worker_name: null, worker_status: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      toast.success('הג\'ובה נפתחה מחדש ל-24 שעות!');
    },
  });

  const cancelTakeMutation = useMutation({
    mutationFn: async () => {
      // 1. Cancel the worker's approved application — full reset
      const workerApps = await base44.entities.TaskApplication.filter({ task_id: id, worker_id: me?.id });
      await Promise.all(
        workerApps
          .filter(a => a.status === 'approved' || a.status === 'pending')
          .map(a => base44.entities.TaskApplication.update(a.id, { status: 'cancelled' }))
      );
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
      toast.success('יצאת מהמשימה');
      navigate('/');
    },
  });

  const cancelApplicationMutation = useMutation({
    mutationFn: async () => {
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
      toast.success('הבקשה בוטלה בהצלחה');
    },
  });

  const handleApply = async () => {
    if (applyLoading) return;
    setApplyLoading(true);
    try {
      // Server-side duplicate check before creating
      const existing = await base44.entities.TaskApplication.filter({ task_id: id, worker_id: me?.id });
      const alreadyActive = existing.find(a => a.status === 'pending' || a.status === 'approved');
      if (alreadyActive) {
        // Already applied — sync caches and show existing state
        queryClient.setQueryData(['myApp', id, me?.id], alreadyActive);
        queryClient.setQueryData(['myApplicationsFeed', me?.id], (old = []) => {
          const without = old.filter(a => !(a.task_id === id && a.worker_id === me?.id));
          return [...without, alreadyActive];
        });
        setShowApplyForm(false);
        toast('כבר שלחת בקשה למשימה זו');
        return;
      }
      const newApp = await base44.entities.TaskApplication.create({
        task_id: id,
        worker_id: me?.id,
        worker_name: me?.full_name,
        worker_score: me?.worker_score || 0,
        worker_rating: me?.rating || 0,
        worker_tasks_count: me?.score_tasks || 0,
        message: applyMessage,
        status: 'pending',
      });
      // Sync real record immediately into all caches
      queryClient.setQueryData(['myApp', id, me?.id], newApp);
      queryClient.setQueryData(['myApplicationsFeed', me?.id], (old = []) => {
        const without = old.filter(a => !(a.task_id === id && a.worker_id === me?.id));
        return [...without, newApp];
      });
      setShowApplyForm(false);
      setHasApplied(true);
      toast.success('הבקשה נשלחה לבעל הג\'ובה!');
      // Hard sync to confirm
      queryClient.invalidateQueries({ queryKey: ['myApp', id, me?.id] });
      queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed', me?.id] });
      queryClient.invalidateQueries({ queryKey: ['applications', id] });
    } catch {
      toast.error('שגיאה בשליחת הבקשה, נסה שוב');
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
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!task) return <div className="p-8 text-center text-muted-foreground">ג'ובה לא נמצאה</div>;

  const isOwner = me?.id === task.client_id;
  const hasWorker = !!task.worker_id;
  const isWorker = me?.id === task.worker_id;
  const statusLabel = getStatusLabel(task.status, isOwner);
  const isExpired = task.status === 'EXPIRED';
  const canTakeInstant = false; // All tasks now require application
  const canApplyManual = task.status === 'OPEN' && !isOwner && !hasWorker && !hasPendingApp && !isApproved;
  const status = statusConfig[task.status] || statusConfig.OPEN;

  return (
    <div className="min-h-screen" dir="rtl">
      <TaskTakenConfetti trigger={confetti} />
      {showVerify && <VerifyModal onClose={onVerifyClose} onSuccess={onVerifySuccess} />}
      {showApprovedPopup && (
        <ApprovedPopup task={task} onClose={() => setShowApprovedPopup(false)} />
      )}

      {/* Worker: task was cancelled while on the way — big popup */}
      {showWorkerCancelledPopup && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(5,15,40,0.7)', backdropFilter: 'blur(8px)' }} className="mobile-modal-center">
          <div dir="rtl" style={{ padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>😞</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#0f1e40', marginBottom: 10 }}>המשימה בוטלה</div>
            <div style={{ fontSize: 15, color: '#64748b', lineHeight: 1.7, marginBottom: 8 }}>
              בעל המשימה ביטל לאחר שיצאת לדרך.
            </div>
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 16, padding: '16px 20px', marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: '#166534', fontWeight: 700, marginBottom: 4 }}>💰 פיצוי מגיע לך!</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#059669' }}>₪{Math.round((task.price || 0) * 0.2)}</div>
              <div style={{ fontSize: 12, color: '#16a34a', marginTop: 4 }}>עמלת טרחה של 20% מסכום המשימה תזוכה לארנקך</div>
            </div>
            <button
              onClick={() => { setShowWorkerCancelledPopup(false); navigate('/'); }}
              style={{ width: '100%', height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', border: 'none', color: 'white', fontWeight: 900, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 20px rgba(26,111,212,0.35)' }}
            >
              חזור לפיד
            </button>
          </div>
        </div>
      )}

      {/* Cancel warning popup — when worker already on the way */}
      {showCancelWarning && (
        <div className="mobile-sheet-overlay">
          <div dir="rtl" className="mobile-sheet" style={{ width: '100%', maxWidth: 480, padding: '20px 20px 0' }}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 20px' }} />
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#0f1e40', marginBottom: 8 }}>רגע לפני ביטול</div>
              <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
                 העובד <strong style={{ color: '#0f1e40' }}>{task.worker_name}</strong> טרח ויצא במיוחד עבורך.
                 <br />אם תבטל — <strong style={{ color: '#dc2626' }}>תחויב בעמלת טרחה של 20%</strong> מסכום המשימה.
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => setShowCancelWarning(false)}
                style={{ width: '100%', height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', border: 'none', color: 'white', fontWeight: 900, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 16px rgba(26,111,212,0.35)' }}
              >
                השאר את המשימה
              </button>
              <button
                onClick={() => { setShowCancelWarning(false); cancelMutation.mutate(); }}
                disabled={cancelMutation.isPending}
                style={{ width: '100%', height: 48, borderRadius: 16, background: 'white', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {cancelMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : 'בטל משימה (20% עמלה)'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Worker exit confirmation popup */}
      {showExitWarning && (
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
        </div>
      )}

      {/* Worker 3-min alert */}
      {isWorker && <WorkerStatusAlert task={task} me={me} />}

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(244,247,251,0.97)', borderBottom: '1px solid #dce8f5', backdropFilter: 'blur(8px)', padding: '44px 16px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton to="/" />
        <h1 style={{ fontSize: 16, fontWeight: 800, color: '#0f2b6b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</h1>
        <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: '#eff6ff', color: '#1a6fd4', border: '1px solid #bfdbfe', flexShrink: 0 }}>{statusLabel}</span>
      </div>

      <div style={{ padding: '16px 16px 0' }} className="space-y-4">
        {/* Expired banner */}
        {isExpired && (
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 20, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <AlertTriangle size={20} color="#f97316" />
              <div>
                <div style={{ fontWeight: 800, color: '#c2410c', fontSize: 14 }}>הג'ובה פגה תוקף</div>
                <div style={{ fontSize: 12, color: '#ea580c', marginTop: 2 }}>הג'ובה הייתה פתוחה ופג תוקפה</div>
              </div>
            </div>
            {isOwner && (
              <Button onClick={() => reopenMutation.mutate()} disabled={reopenMutation.isPending}
                className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold h-11"
              >
                {reopenMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4 ml-2" />פתח את הג'ובה מחדש ל-24 שעות</>}
              </Button>
            )}
            {!isOwner && !signalSent && (
              <Button onClick={() => gate(handleSignalReopen)} variant="outline"
                className="w-full rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50 font-semibold h-11"
              >
                <Send size={15} strokeWidth={1.8} style={{ marginLeft: 6 }} /> שלח איתות לבעל הג'ובה
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

        {/* Price Hero */}
        <div style={{ background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', borderRadius: 20, padding: '20px 20px', color: 'white', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>תשלום</div>
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

        {/* Images */}
        {task.images?.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {task.images.map((img, i) => (
              <img key={i} src={img} alt="" className="w-32 h-24 rounded-2xl object-cover shrink-0 border border-gray-100" />
            ))}
          </div>
        )}

        {/* Worker tracker:
            - Owner: show when task is TAKEN
            - Worker: show when TAKEN */}
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
          <div style={{ background: 'white', borderRadius: 20, border: '1px solid #dce8f5', padding: 16, boxShadow: '0 2px 8px rgba(26,111,212,0.05)' }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#1a6fd4', marginBottom: 8 }}>תיאור</h2>
            <p style={{ color: '#333', lineHeight: 1.65, fontSize: 14 }}>{task.description}</p>
          </div>
        )}

        {/* Details */}
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #dce8f5', padding: 16, boxShadow: '0 2px 8px rgba(26,111,212,0.05)' }} className="space-y-3">
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
              <div>
                <div className="text-xs text-muted-foreground">מפרסם</div>
                <div className="font-medium text-sm flex items-center gap-1.5">
                  <a href={`/public-profile?id=${task.client_id}`} style={{ color: '#0f2b6b', fontWeight: 700, textDecoration: 'none', borderBottom: '1px solid #bfdbfe' }}>{task.client_name}</a>
                  <VerifiedBadge /> · {task.client_rating?.toFixed(1) || 'חדש'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Requirements */}
        {(task.requirements?.vehicle || task.requirements?.two_people || task.requirements?.experience) && (
          <div style={{ background: 'white', borderRadius: 20, border: '1px solid #dce8f5', padding: 16, boxShadow: '0 2px 8px rgba(26,111,212,0.05)' }}>
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
          <div style={{ background: 'white', borderRadius: 20, border: '1px solid #dce8f5', padding: 16, boxShadow: '0 2px 8px rgba(26,111,212,0.05)' }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#1a6fd4', marginBottom: 8 }}>מבצע</h2>
            <a href={`/public-profile?id=${task.worker_id}`} style={{ fontWeight: 700, color: '#0f2b6b', textDecoration: 'none', borderBottom: '1px solid #bfdbfe' }}>{task.worker_name}</a>
          </div>
        )}

        {/* Actions */}
        <div style={{ paddingBottom: canTakeInstant || canApplyManual || hasPendingApp ? 100 : 24, display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Pending application banner */}
          {hasPendingApp && !isWorker && (
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 18, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Clock size={18} color="#d97706" /></div>
              <div>
                <div style={{ fontWeight: 800, color: '#92400e', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={15} /> בקשתך התקבלה וממתינה לאישור</div>
                <div style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>בעל הג'ובה יאשר אותך בקרוב</div>
              </div>
            </div>
          )}

          {/* Apply form (shown only when triggered) */}
          {canApplyManual && showApplyForm && (
            <div style={{ background: '#eff6ff', borderRadius: 18, padding: 16, border: '1px solid #bfdbfe', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0f2b6b', margin: 0 }}>הוסף הודעה לבעל הג'ובה (לא חובה)</p>
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
                <Pencil size={18} />עריכת הג'ובה
              </button>
            </Link>
          )}

          {isOwner && (task.status === 'OPEN' || task.status === 'EXPIRED' || task.status === 'TAKEN') && (
            <button
              onClick={() => {
                // Show warning for ALL active worker statuses
                const workerIsActive = ['on_the_way', 'delayed', 'parking', 'arrived', 'starting', 'finishing', 'done'].includes(task.worker_status);
                if (task.status === 'TAKEN' && workerIsActive) {
                  setShowCancelWarning(true);
                } else {
                  cancelMutation.mutate();
                }
              }}
              disabled={cancelMutation.isPending}
              style={{ width: '100%', height: 48, borderRadius: 14, background: 'white', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
            >
              {cancelMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : 'ביטול הג\'ובה'}
            </button>
          )}

          {/* Payment CTA for owner — task TAKEN, not yet funded */}
          {isOwner && task.status === 'TAKEN' && task.payment_status !== 'funded' && (
            <button
              onClick={() => setShowPayment(true)}
              style={{ width: '100%', height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#059669,#047857)', border: 'none', color: 'white', fontWeight: 900, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(5,150,105,0.3)' }}
            >
              💳 שלם עבור המשימה — ₪{task.price}
            </button>
          )}
          {isOwner && task.payment_status === 'funded' && (
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#166534', fontWeight: 700 }}>
              ✅ התשלום בוצע ומוחזק בנאמנות
            </div>
          )}

          {/* Rating CTA for completed tasks */}
          {task.status === 'COMPLETED' && (isOwner || isWorker) && !myReview && (
            <button onClick={() => setShowRating(true)}
              style={{ width: '100%', height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, boxShadow: '0 4px 14px rgba(251,191,36,0.35)' }}
            >
              <Star size={16} className="fill-white" /> דרג את {isOwner ? task.worker_name : task.client_name}
            </button>
          )}
          {task.status === 'COMPLETED' && (isOwner || isWorker) && myReview && (
            <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#92400e', fontWeight: 700, cursor: 'not-allowed', opacity: 0.85 }}>
              <Star size={15} className="fill-yellow-400 text-yellow-400" />
              {[1,2,3,4,5].slice(0, myReview.rating).map(() => '★').join('')} הדירוג שלך נשמר — לא ניתן לדרג שוב
            </div>
          )}

          {/* Repost button for owner on closed tasks */}
          {isOwner && ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(task.status) && (
            <button
              onClick={() => {
                // Navigate to CreateTask with pre-filled data — user must go through payment flow
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

          {!isOwner && !isWorker && !hasPendingApp && task.status === 'OPEN' && (
            <button style={{ width: '100%', height: 40, borderRadius: 14, background: 'transparent', border: 'none', color: '#999', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}>
              <Flag size={15} />דיווח
            </button>
          )}
        </div>
      </div>

      {/* Sticky bottom CTA */}
      {(canApplyManual && !showApplyForm) && (
        <div style={{ position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom))', left: 16, right: 16, zIndex: 50 }}>
    
          <button onClick={() => gate(() => setShowStripeGate(true))}
            style={{ width: '100%', height: 58, borderRadius: 18, fontSize: 17, fontWeight: 900, color: 'white', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', boxShadow: '0 8px 28px rgba(26,111,212,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Send size={18} strokeWidth={1.8} /> הגש בקשה לביצוע
          </button>
        </div>
      )}

      {showStripeGate && (
        <StripeOnboardingGate
          onClose={() => setShowStripeGate(false)}
          onReady={() => { setShowStripeGate(false); setShowApplyForm(true); }}
        />
      )}

      {showPayment && (
        <StripePaymentSheet
          task={task}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['task', id] });
            queryClient.refetchQueries({ queryKey: ['task', id] });
          }}
        />
      )}

      {showCompletion && (
        <CompletionModal task={task} me={me} onClose={() => { setShowCompletion(false); setShowRating(true); }} />
      )}
      {showRating && task && me && (
        <RatingModal task={task} me={me} onClose={() => setShowRating(false)} />
      )}
    </div>
  );
}