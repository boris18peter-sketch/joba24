import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, MapPin, Clock, Star, MessageCircle, Flag, CheckCircle2, Loader2, Car, Users, Wrench, Pencil, RefreshCw, AlertTriangle, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import CompletionModal from '@/components/CompletionModal';
import TaskTakenConfetti from '@/components/TaskTakenConfetti';
import TaskExpiry from '@/components/TaskExpiry';
import TaskApplicants from '@/components/TaskApplicants';
import WorkerStatusAlert from '@/components/WorkerStatusAlert';
import ApprovedPopup from '@/components/ApprovedPopup';
import WorkerTrackerBar from '@/components/WorkerTrackerBar';
import { getCategoryLabel } from '@/lib/categories';

const statusConfig = {
  OPEN: { label: 'פתוח', color: 'text-blue-700 bg-blue-100' },
  TAKEN: { label: 'נלקח', color: 'text-indigo-700 bg-indigo-100' },
  COMPLETED: { label: 'הושלם', color: 'text-gray-700 bg-gray-100' },
  CANCELLED: { label: 'בוטל', color: 'text-red-700 bg-red-100' },
  EXPIRED: { label: 'פג תוקף', color: 'text-orange-700 bg-orange-100' },
};

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCompletion, setShowCompletion] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [taskTaken, setTaskTaken] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [showApprovedPopup, setShowApprovedPopup] = useState(false);
  const prevWorkerIdRef = useRef(null);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => base44.entities.Task.filter({ id }),
    select: data => data[0],
    refetchInterval: 1000,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // DEBUG: Log task data every render
  useEffect(() => {
    if (task) {
      console.log('TASK DATA:', task);
    }
  }, [task]);

  // Check if MY application was approved for this task
  const { data: myApp } = useQuery({
    queryKey: ['myApp', id, me?.id],
    queryFn: () => base44.entities.TaskApplication.filter({ task_id: id, worker_id: me.id }),
    select: data => data[0],
    enabled: !!me?.id,
    refetchInterval: 2000,
  });
  const isApproved = myApp?.status === 'approved';

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
    mutationFn: () => base44.entities.Task.update(id, { status: 'CANCELLED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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
    mutationFn: () => base44.entities.Task.update(id, { status: 'OPEN', worker_id: null, worker_name: null, worker_status: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('יצאת מהמשימה');
      navigate('/');
    },
  });

  const cancelApplicationMutation = useMutation({
    mutationFn: () => base44.entities.TaskApplication.delete(myApp.id),
    onSuccess: () => {
      prevWorkerIdRef.current = null; // Reset ref to prevent popup on cancel
      queryClient.invalidateQueries({ queryKey: ['myApp', id, me?.id] });
      toast.success('בקשה בוטלה');
      setHasApplied(false);
    },
  });

  const handleApply = async () => {
    setApplyLoading(true);
    await base44.entities.TaskApplication.create({
      task_id: id,
      worker_id: me?.id,
      worker_name: me?.full_name,
      worker_score: me?.worker_score || 0,
      worker_rating: me?.rating || 0,
      worker_tasks_count: me?.score_tasks || 0,
      message: applyMessage,
      status: 'pending',
    });
    setApplyLoading(false);
    setShowApplyForm(false);
    setHasApplied(true);
      toast.success('הבקשה נשלחה לבעל הג\'ובה!');
  };

  // Signal reopen (worker sending to expired task owner)
  const handleSignalReopen = async () => {
    toast.success('האיתות נשלח לבעל המשימה!');
    // In a real system this would send a notification
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!task) return <div className="p-8 text-center text-muted-foreground">ג'ובה לא נמצאה</div>;

  const isOwner = me?.id === task.client_id;
  const hasWorker = !!task.worker_id;
  const isWorker = me?.id === task.worker_id;
  const isExpired = task.status === 'EXPIRED';
  const canTakeInstant = task.status === 'OPEN' && !isOwner && task.approval_mode === 'instant' && !hasWorker;
  const canApplyManual = task.status === 'OPEN' && !isOwner && task.approval_mode === 'manual' && !hasWorker;
  const status = statusConfig[task.status] || statusConfig.OPEN;

  return (
    <div className="min-h-screen" dir="rtl">
      <TaskTakenConfetti trigger={confetti} />
      {showApprovedPopup && (
        <ApprovedPopup task={task} onClose={() => setShowApprovedPopup(false)} />
      )}
      {/* Worker 3-min alert */}
      {isWorker && <WorkerStatusAlert task={task} me={me} />}

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(244,247,251,0.97)', borderBottom: '1px solid #dce8f5', backdropFilter: 'blur(8px)', padding: '44px 16px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/')} style={{ width: 38, height: 38, borderRadius: 12, background: 'white', border: '1px solid #dce8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
          <ArrowRight size={18} color="#1a6fd4" />
        </button>
        <h1 style={{ fontSize: 16, fontWeight: 800, color: '#0f2b6b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</h1>
        <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: '#eff6ff', color: '#1a6fd4', border: '1px solid #bfdbfe', flexShrink: 0 }}>{status.label}</span>
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
            {!isOwner && (
              <Button onClick={handleSignalReopen} variant="outline"
                className="w-full rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50 font-semibold h-11"
              >
                📣 שלח איתות לבעל הג'ובה
              </Button>
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
              {task.approval_mode === 'manual' && (
                <div style={{ fontSize: 12, background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Users size={12} /> אישור ידני
                </div>
              )}
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

        {/* Worker tracker - 3 step progress */}
        {hasWorker && task.status === 'TAKEN' && (
          <WorkerTrackerBar
            task={task}
            isWorker={isWorker}
            isOwner={isOwner}
            onUpdate={handleWorkerUpdate}
          />
        )}

        {/* Applicants for manual approval mode */}
        {isOwner && task.approval_mode === 'manual' && task.status === 'OPEN' && (
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
              {task.lat && task.lng && (
                <div className="flex gap-1.5">
                  <a
                    href={`https://waze.com/ul?ll=${task.lat},${task.lng}&navigate=yes`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg text-white"
                    style={{ background: '#1da462' }}
                  >🚗 Waze</a>
                  <a
                    href={`https://maps.google.com/?q=${task.lat},${task.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg text-white"
                    style={{ background: '#4285f4' }}
                  >🗺️ GPS</a>
                </div>
              )}
              {!task.lat && task.location_name && (
                <div className="flex gap-1.5">
                  <a
                    href={`https://waze.com/ul?q=${encodeURIComponent(task.location_name)}&navigate=yes`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg text-white"
                    style={{ background: '#1da462' }}
                  >🚗 Waze</a>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(task.location_name)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg text-white"
                    style={{ background: '#4285f4' }}
                  >🗺️ GPS</a>
                </div>
              )}
            </div>
          )}
          {task.created_date && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">פורסם</div>
                <div className="font-medium text-sm">{formatDistanceToNow(new Date(task.created_date), { addSuffix: true })}</div>
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
                <div className="font-medium text-sm">{task.client_name} · {task.client_rating?.toFixed(1) || 'חדש'}</div>
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
            <div style={{ fontWeight: 700, color: '#0f2b6b' }}>{task.worker_name}</div>
          </div>
        )}

        {/* Actions */}
        <div style={{ paddingBottom: canTakeInstant || (canApplyManual && !showApplyForm && !hasApplied) ? 100 : 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {canTakeInstant && (
            <div /> /* placeholder — actual button is sticky below */
          )}

          {hasApplied && (
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 18, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 24 }}>⏳</div>
              <div>
                <div style={{ fontWeight: 800, color: '#92400e', fontSize: 14 }}>הבקשה נשלחה!</div>
                <div style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>ממתין לאישור בעל הג'ובה</div>
              </div>
            </div>
          )}

          {canApplyManual && !showApplyForm && !hasApplied && (
            <div /> /* placeholder — actual button is sticky below */
          )}
          {canApplyManual && showApplyForm && !hasApplied && (
            <div style={{ background: '#eff6ff', borderRadius: 18, padding: 16, border: '1px solid #bfdbfe', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0f2b6b', margin: 0 }}>הוסף הודעה לבעל הג'ובה (לא חובה)</p>
              <Input placeholder="לדוגמה: יש לי ניסיון של 5 שנים בתחום..."
                value={applyMessage} onChange={e => setApplyMessage(e.target.value)}
                style={{ background: 'white', border: '1px solid #bfdbfe', borderRadius: 12 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleApply} disabled={applyLoading}
                  style={{ flex: 1, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {applyLoading ? <Loader2 size={18} className="animate-spin" /> : 'שלח בקשה'}
                </button>
                <button onClick={() => setShowApplyForm(false)}
                  style={{ height: 44, padding: '0 16px', borderRadius: 14, background: 'white', border: '1px solid #dce8f5', color: '#666', fontWeight: 600, cursor: 'pointer' }}
                >ביטול</button>
              </div>
            </div>
          )}

          {(isOwner || isWorker) && task.status === 'TAKEN' && (
            <Link to={`/chat/${id}`}>
              <button style={{ width: '100%', height: 48, borderRadius: 14, background: 'white', border: '1px solid #dce8f5', color: '#1a6fd4', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14 }}>
                <MessageCircle size={18} />פתח צ'אט
              </button>
            </Link>
          )}

          {isOwner && task.status === 'OPEN' && (
            <Link to={`/edit-task/${id}`}>
              <button style={{ width: '100%', height: 48, borderRadius: 14, background: 'white', border: '1px solid #dce8f5', color: '#0f2b6b', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14 }}>
                <Pencil size={18} />עריכת הג'ובה
              </button>
            </Link>
          )}

          {isOwner && (task.status === 'OPEN' || task.status === 'EXPIRED') && (
            <button onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}
              style={{ width: '100%', height: 48, borderRadius: 14, background: 'white', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
            >
              {cancelMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : 'ביטול הג\'ובה'}
            </button>
          )}

          {isWorker && task.status === 'TAKEN' && (
            <button onClick={() => cancelTakeMutation.mutate()} disabled={cancelTakeMutation.isPending}
              style={{ width: '100%', height: 48, borderRadius: 14, background: 'white', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
            >
              {cancelTakeMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : '🚪 צא מהמשימה'}
            </button>
          )}

          {!isOwner && !isWorker && task.status === 'OPEN' && (
            <button style={{ width: '100%', height: 40, borderRadius: 14, background: 'transparent', border: 'none', color: '#999', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}>
              <Flag size={15} />דיווח
            </button>
          )}

          {hasApplied && myApp?.status === 'pending' && (
            <button onClick={() => cancelApplicationMutation.mutate()} disabled={cancelApplicationMutation.isPending}
              style={{ width: '100%', height: 48, borderRadius: 14, background: 'white', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
            >
              {cancelApplicationMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : '❌ בטל בקשה'}
            </button>
          )}
        </div>
      </div>

      {/* Sticky bottom CTA */}
      {(canTakeInstant || (canApplyManual && !showApplyForm && !hasApplied)) && (
        <div style={{ position: 'fixed', bottom: 96, left: 16, right: 16, zIndex: 50 }}>
          {canTakeInstant && (
            <button onClick={() => takeMutation.mutate()} disabled={takeMutation.isPending}
              style={{ width: '100%', height: 58, borderRadius: 18, fontSize: 17, fontWeight: 900, color: 'white', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', boxShadow: '0 8px 28px rgba(26,111,212,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {takeMutation.isPending ? <Loader2 size={22} className="animate-spin" /> : '⚡ קח את הג\'ובה'}
            </button>
          )}
          {canApplyManual && !showApplyForm && !hasApplied && (
            <button onClick={() => setShowApplyForm(true)}
              style={{ width: '100%', height: 58, borderRadius: 18, fontSize: 17, fontWeight: 900, color: 'white', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', boxShadow: '0 8px 28px rgba(26,111,212,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              📩 רוצה לבצע את הג'ובה
            </button>
          )}
        </div>
      )}

      {showCompletion && (
        <CompletionModal task={task} me={me} onClose={() => setShowCompletion(false)} />
      )}
    </div>
  );
}