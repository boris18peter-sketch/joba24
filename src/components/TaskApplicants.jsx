import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Star, CheckCircle2, XCircle, Loader2, Zap, Award } from 'lucide-react';
import { toast } from 'sonner';

export default function TaskApplicants({ task, onApprove }) {
  const queryClient = useQueryClient();

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['applications', task.id],
    queryFn: () => base44.entities.TaskApplication.filter({ task_id: task.id }, '-created_date', 20),
    refetchInterval: 3000,
  });

  const approveMutation = useMutation({
    mutationFn: async (app) => {
      console.log('🔄 STARTING APPROVAL:', app);
      
      // Step 1: Update task with worker assignment
      await base44.entities.Task.update(task.id, {
        status: 'TAKEN',
        worker_id: app.worker_id,
        worker_name: app.worker_name,
        worker_status: null,
      });
      console.log('✅ Task updated with worker');

      // Step 2: Approve application
      await base44.entities.TaskApplication.update(app.id, { 
        status: 'approved' 
      });
      console.log('✅ Application approved');

      // Step 3: Fetch fresh task to verify
      const freshTasks = await base44.entities.Task.filter({ id: task.id });
      const updatedTask = freshTasks[0];
      console.log('✅ Fresh task fetched:', updatedTask);

      // Step 4: Verify data was saved
      if (updatedTask.worker_id !== app.worker_id) {
        throw new Error('⚠️ worker_id לא נשמר בצורה נכונה');
      }
      if (updatedTask.status !== 'TAKEN') {
        throw new Error('⚠️ status לא שונה ל-TAKEN');
      }

      // Reject others
      const others = applications.filter(a => a.id !== app.id && a.status === 'pending');
      await Promise.all(others.map(a => base44.entities.TaskApplication.update(a.id, { status: 'rejected' })));

      return { task: updatedTask };
    },
    onSuccess: (data) => {
      console.log('✅ APPROVAL SUCCESS - Refetching data');
      // CRITICAL: Invalidate BEFORE refetch to clear cache
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.refetchQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['applications', task.id] });
      queryClient.refetchQueries({ queryKey: ['applications', task.id] });
      toast.success(`${data.task.worker_name} אושר! ✨`);
      onApprove?.();
    },
    onError: (error) => {
      console.error('❌ APPROVAL ERROR:', error);
      toast.error(`שגיאה: ${error.message}`);
    },
  });

  // Real-time subscription to applications
  useEffect(() => {
    const unsubscribe = base44.entities.TaskApplication.subscribe((event) => {
      if (event.data?.task_id === task.id) {
        queryClient.invalidateQueries({ queryKey: ['applications', task.id] });
      }
    });
    return unsubscribe;
  }, [task.id]);

  // Only show pending (not rejected/approved)
  const pending = applications.filter(a => a.status === 'pending');

  if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;

  if (pending.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
        <div className="text-2xl mb-2">✋</div>
        <p className="text-sm font-semibold text-blue-800">ממתין לאישור</p>
        <p className="text-xs text-blue-600 mt-1">עדיין לא הגיעו בקשות מעובדים</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-sm text-gray-700">עובדים שמבקשים לבצע ({pending.length})</h3>
      {pending.map(app => (
        <div key={app.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
            <Link to={`/worker-profile?id=${app.worker_id}`} className="shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-lg font-bold text-white cursor-pointer">
                {app.worker_name?.[0]?.toUpperCase() || '?'}
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link to={`/worker-profile?id=${app.worker_id}`} className="font-bold text-gray-900 text-sm hover:text-blue-700 transition-colors">
                  {app.worker_name}
                </Link>
                {app.worker_rating > 0 && (
                  <span className="flex items-center gap-0.5 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-200">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {app.worker_rating.toFixed(1)}
                  </span>
                )}
                {app.worker_score > 0 && (
                  <span className="flex items-center gap-0.5 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                    <Award className="w-3 h-3" />
                    {app.worker_score.toFixed(0)} נק'
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                {app.worker_tasks_count > 0 && (
                  <span>✅ {app.worker_tasks_count} משימות הושלמו</span>
                )}
              </div>
              {app.message && (
                <p className="text-xs text-gray-600 mt-2 bg-gray-50 rounded-lg p-2 italic">{app.message}</p>
              )}
            </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={() => approveMutation.mutate(app)}
              disabled={approveMutation.isPending}
              className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold text-xs h-9 transition-all"
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin ml-1" />
                  אישור בעיצומו...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
                  אשר
                </>
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}