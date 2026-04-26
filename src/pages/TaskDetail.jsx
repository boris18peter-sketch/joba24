import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, MapPin, Clock, Star, MessageCircle, Flag, CheckCircle2, Loader2, Car, Users, Wrench, Pencil, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import CompletionModal from '@/components/CompletionModal';
import TaskExpiry from '@/components/TaskExpiry';
import WorkerTracker from '@/components/WorkerTracker';
import TaskApplicants from '@/components/TaskApplicants';
import WorkerStatusAlert from '@/components/WorkerStatusAlert';
import { getCategoryLabel } from '@/lib/categories';

const statusConfig = {
  OPEN: { label: 'פתוח', color: 'text-green-700 bg-green-100' },
  TAKEN: { label: 'נלקח', color: 'text-blue-700 bg-blue-100' },
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

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => base44.entities.Task.filter({ id }),
    select: data => data[0],
    refetchInterval: 8000,
  });

  // Real-time subscription
  useEffect(() => {
    const unsubscribe = base44.entities.Task.subscribe((event) => {
      if (event.id === id) queryClient.invalidateQueries({ queryKey: ['task', id] });
    });
    return unsubscribe;
  }, [id]);

  const handleWorkerUpdate = async (data) => {
    await base44.entities.Task.update(id, data);
    queryClient.invalidateQueries({ queryKey: ['task', id] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
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
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('לקחת את המשימה! 🎉');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => base44.entities.Task.update(id, { status: 'CANCELLED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      navigate('/');
      toast.success('המשימה בוטלה');
    },
  });

  const reopenMutation = useMutation({
    mutationFn: () => {
      const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      return base44.entities.Task.update(id, { status: 'OPEN', expires_at: newExpiry, worker_id: null, worker_name: null, worker_status: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      toast.success('המשימה נפתחה מחדש ל-24 שעות!');
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
    toast.success('הבקשה נשלחה לבעל המשימה!');
  };

  // Signal reopen (worker sending to expired task owner)
  const handleSignalReopen = async () => {
    toast.success('האיתות נשלח לבעל המשימה!');
    // In a real system this would send a notification
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!task) return <div className="p-8 text-center text-muted-foreground">משימה לא נמצאה</div>;

  const isOwner = me?.id === task.client_id;
  const isWorker = me?.id === task.worker_id;
  const isExpired = task.status === 'EXPIRED';
  const canTakeInstant = task.status === 'OPEN' && !isOwner && task.approval_mode === 'instant';
  const canApplyManual = task.status === 'OPEN' && !isOwner && task.approval_mode === 'manual';
  const status = statusConfig[task.status] || statusConfig.OPEN;

  return (
    <div className="min-h-screen" dir="rtl">
      {/* Worker 3-min alert */}
      {isWorker && <WorkerStatusAlert task={task} me={me} />}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 pt-12 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowRight className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-bold truncate flex-1">{task.title}</h1>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.color}`}>{status.label}</span>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Expired banner */}
        {isExpired && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div>
                <div className="font-bold text-orange-800">משימה פגת תוקף</div>
                <div className="text-xs text-orange-600">המשימה הייתה פתוחה ופגה תוקפה</div>
              </div>
            </div>
            {isOwner && (
              <Button onClick={() => reopenMutation.mutate()} disabled={reopenMutation.isPending}
                className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold h-11"
              >
                {reopenMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4 ml-2" />פתח מחדש ל-24 שעות</>}
              </Button>
            )}
            {!isOwner && (
              <Button onClick={handleSignalReopen} variant="outline"
                className="w-full rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50 font-semibold h-11"
              >
                📣 שלח איתות לבעל המשימה
              </Button>
            )}
          </div>
        )}

        {/* Price Hero */}
        <div className="bg-black rounded-2xl p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm opacity-80 mb-1">תשלום</div>
              <div className="text-4xl font-bold">₪{task.price}</div>
              {task.estimated_time && (
                <div className="flex items-center gap-1 mt-2 text-sm opacity-80">
                  <Clock className="w-3.5 h-3.5" />
                  <span>זמן משוער: {task.estimated_time}</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs opacity-60 mb-1">{getCategoryLabel(task.category)}</div>
              {task.expires_at && task.status === 'OPEN' && (
                <TaskExpiry expiresAt={task.expires_at} price={task.price} taskId={task.id} />
              )}
              {task.approval_mode === 'manual' && (
                <div className="mt-2 text-xs bg-white/20 px-2 py-1 rounded-lg">
                  <Users className="w-3 h-3 inline ml-1" />
                  אישור ידני
                </div>
              )}
            </div>
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

        {/* Worker Tracker (GetTaxi-style) */}
        {(isOwner || isWorker) && task.status !== 'EXPIRED' && (
          <WorkerTracker task={task} isOwner={isOwner} isWorker={isWorker} onUpdate={handleWorkerUpdate} />
        )}

        {/* Owner sees applicants for manual mode */}
        {isOwner && task.status === 'OPEN' && task.approval_mode === 'manual' && (
          <TaskApplicants task={task} onApprove={() => queryClient.invalidateQueries({ queryKey: ['task', id] })} />
        )}

        {/* Description */}
        {task.description && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <h2 className="font-semibold mb-2 text-sm text-muted-foreground">תיאור</h2>
            <p className="text-foreground leading-relaxed">{task.description}</p>
          </div>
        )}

        {/* Details */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          {task.location_name && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">מיקום</div>
                <div className="font-medium text-sm">{task.location_name}</div>
              </div>
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
          <div className="bg-card rounded-2xl border border-border p-4">
            <h2 className="font-semibold mb-3 text-sm text-muted-foreground">דרישות</h2>
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
          <div className="bg-card rounded-2xl border border-border p-4">
            <h2 className="font-semibold mb-2 text-sm text-muted-foreground">מבצע</h2>
            <div className="font-medium">{task.worker_name}</div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pb-4">
          {/* Instant take */}
          {canTakeInstant && (
            <Button onClick={() => takeMutation.mutate()} disabled={takeMutation.isPending}
              className="w-full h-14 rounded-2xl text-base font-bold bg-black hover:bg-gray-900 text-white shadow-lg"
            >
              {takeMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : '⚡ קח את המשימה'}
            </Button>
          )}

          {/* Apply for manual */}
          {canApplyManual && !showApplyForm && (
            <Button onClick={() => setShowApplyForm(true)}
              className="w-full h-14 rounded-2xl text-base font-bold bg-black hover:bg-gray-900 text-white shadow-lg"
            >
              📩 שלח בקשה לביצוע
            </Button>
          )}
          {canApplyManual && showApplyForm && (
            <div className="bg-gray-50 rounded-2xl p-4 space-y-3 border border-gray-200">
              <p className="text-sm font-semibold text-gray-700">הוסף הודעה לבעל המשימה (לא חובה)</p>
              <Input placeholder="לדוגמה: יש לי ניסיון של 5 שנים בתחום..."
                value={applyMessage} onChange={e => setApplyMessage(e.target.value)}
                className="bg-white border-gray-200 rounded-xl"
              />
              <div className="flex gap-2">
                <Button onClick={handleApply} disabled={applyLoading}
                  className="flex-1 rounded-xl bg-black hover:bg-gray-900 font-bold"
                >
                  {applyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'שלח בקשה'}
                </Button>
                <Button variant="outline" onClick={() => setShowApplyForm(false)} className="rounded-xl">ביטול</Button>
              </div>
            </div>
          )}

          {(isOwner || isWorker) && task.status === 'TAKEN' && (
            <Button onClick={() => setShowCompletion(true)}
              className="w-full h-14 rounded-2xl text-base font-semibold bg-green-600 hover:bg-green-700 shadow-lg"
            >
              <CheckCircle2 className="w-5 h-5 ml-2" />סמן כהושלם
            </Button>
          )}

          {(isOwner || isWorker) && task.status === 'TAKEN' && (
            <Link to={`/chat/${id}`}>
              <Button variant="outline" className="w-full h-12 rounded-2xl">
                <MessageCircle className="w-4 h-4 ml-2" />פתח צ'אט
              </Button>
            </Link>
          )}

          {isOwner && task.status === 'OPEN' && (
            <Link to={`/edit-task/${id}`}>
              <Button variant="outline" className="w-full h-12 rounded-2xl border-gray-300 font-semibold">
                <Pencil className="w-4 h-4 ml-2" />עריכת משימה
              </Button>
            </Link>
          )}

          {isOwner && (task.status === 'OPEN' || task.status === 'EXPIRED') && (
            <Button variant="outline" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}
              className="w-full h-12 rounded-2xl border-destructive/30 text-destructive hover:bg-destructive/5"
            >
              {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ביטול משימה'}
            </Button>
          )}

          {!isOwner && !isWorker && task.status === 'OPEN' && (
            <Button variant="ghost" className="w-full h-10 rounded-2xl text-muted-foreground text-sm">
              <Flag className="w-4 h-4 ml-1" />דיווח
            </Button>
          )}
        </div>
      </div>

      {showCompletion && (
        <CompletionModal task={task} me={me} onClose={() => setShowCompletion(false)} />
      )}
    </div>
  );
}