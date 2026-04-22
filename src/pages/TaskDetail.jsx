import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowRight, MapPin, Clock, Star, MessageCircle, Flag, CheckCircle2, Loader2, Car, Users, Wrench, Pencil, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import CompletionModal from '@/components/CompletionModal';
import TaskExpiry from '@/components/TaskExpiry';
import WorkerTracker from '@/components/WorkerTracker';

const statusConfig = {
  OPEN: { label: 'פתוח', color: 'text-green-700 bg-green-100' },
  TAKEN: { label: 'נלקח', color: 'text-blue-700 bg-blue-100' },
  COMPLETED: { label: 'הושלם', color: 'text-gray-700 bg-gray-100' },
  CANCELLED: { label: 'בוטל', color: 'text-red-700 bg-red-100' },
};

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCompletion, setShowCompletion] = useState(false);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => base44.entities.Task.filter({ id }),
    select: data => data[0],
    refetchInterval: 8000,
  });

  // Real-time subscription for live worker status updates
  useEffect(() => {
    const unsubscribe = base44.entities.Task.subscribe((event) => {
      if (event.id === id) {
        queryClient.invalidateQueries({ queryKey: ['task', id] });
      }
    });
    return unsubscribe;
  }, [id]);

  const handleWorkerUpdate = async (data) => {
    await base44.entities.Task.update(id, data);
    queryClient.invalidateQueries({ queryKey: ['task', id] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!task) return <div className="p-8 text-center text-muted-foreground">משימה לא נמצאה</div>;

  const isOwner = me?.id === task.client_id;
  const isWorker = me?.id === task.worker_id;
  const canTake = task.status === 'OPEN' && !isOwner;
  const status = statusConfig[task.status] || statusConfig.OPEN;

  return (
    <div className="min-h-screen" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 pt-12 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowRight className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-bold truncate flex-1">{task.title}</h1>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.color}`}>{status.label}</span>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Price Hero */}
        <div className="bg-black rounded-2xl p-5 text-white">
          <div className="text-sm opacity-80 mb-1">תשלום</div>
          <div className="text-4xl font-bold">₪{task.price}</div>
          {task.estimated_time && (
            <div className="flex items-center gap-1 mt-2 text-sm opacity-80">
              <Clock className="w-3.5 h-3.5" />
              <span>זמן משוער: {task.estimated_time}</span>
            </div>
          )}
        </div>

        {/* Worker Tracker - GetTaxi style */}
        {(isOwner || isWorker) && (
          <WorkerTracker
            task={task}
            isOwner={isOwner}
            isWorker={isWorker}
            onUpdate={handleWorkerUpdate}
          />
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
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-xl text-sm font-medium">
                  <Car className="w-3.5 h-3.5" /> רכב
                </span>
              )}
              {task.requirements.two_people && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-xl text-sm font-medium">
                  <Users className="w-3.5 h-3.5" /> שני אנשים
                </span>
              )}
              {task.requirements.experience && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-xl text-sm font-medium">
                  <Wrench className="w-3.5 h-3.5" /> ניסיון
                </span>
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
          {canTake && (
            <Button
              onClick={() => takeMutation.mutate()}
              disabled={takeMutation.isPending}
              className="w-full h-14 rounded-2xl text-base font-bold bg-black hover:bg-gray-900 text-white shadow-lg"
            >
              {takeMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : '⚡ קח את המשימה'}
            </Button>
          )}

          {(isOwner || isWorker) && task.status === 'TAKEN' && (
            <Button
              onClick={() => setShowCompletion(true)}
              className="w-full h-14 rounded-2xl text-base font-semibold bg-green-600 hover:bg-green-700 shadow-lg"
            >
              <CheckCircle2 className="w-5 h-5 ml-2" />
              סמן כהושלם
            </Button>
          )}

          {(isOwner || isWorker) && task.status === 'TAKEN' && (
            <Link to={`/chat/${id}`}>
              <Button variant="outline" className="w-full h-12 rounded-2xl">
                <MessageCircle className="w-4 h-4 ml-2" />
                פתח צ'אט
              </Button>
            </Link>
          )}

          {isOwner && task.status === 'OPEN' && (
            <Link to={`/edit-task/${id}`}>
              <Button variant="outline" className="w-full h-12 rounded-2xl border-gray-300 font-semibold">
                <Pencil className="w-4 h-4 ml-2" />
                עריכת משימה
              </Button>
            </Link>
          )}

          {isOwner && task.status === 'OPEN' && (
            <Button
              variant="outline"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="w-full h-12 rounded-2xl border-destructive/30 text-destructive hover:bg-destructive/5"
            >
              {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ביטול משימה'}
            </Button>
          )}

          {!isOwner && !isWorker && (
            <Button variant="ghost" className="w-full h-10 rounded-2xl text-muted-foreground text-sm">
              <Flag className="w-4 h-4 ml-1" />
              דיווח
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