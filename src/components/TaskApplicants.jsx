import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Star, CheckCircle2, XCircle, Loader2, Zap, Award } from 'lucide-react';

export default function TaskApplicants({ task, onApprove }) {
  const queryClient = useQueryClient();

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['applications', task.id],
    queryFn: () => base44.entities.TaskApplication.filter({ task_id: task.id }, '-created_date', 20),
    refetchInterval: 3000,
  });

  const approveMutation = useMutation({
    mutationFn: async (app) => {
      // Use backend function for atomic approval + data consistency
      const response = await base44.functions.invoke('approveWorker', {
        taskId: task.id,
        applicationId: app.id,
        workerId: app.worker_id,
        workerName: app.worker_name,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Approval failed');
      }

      // Reject others
      const others = applications.filter(a => a.id !== app.id && a.status === 'pending');
      await Promise.all(others.map(a => base44.entities.TaskApplication.update(a.id, { status: 'rejected' })));

      return response.data;
    },
    onSuccess: async () => {
      // CRITICAL: Invalidate BEFORE refetch to clear cache
      await queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      // CRITICAL: Force immediate fresh fetch
      await queryClient.refetchQueries({ queryKey: ['task', task.id] });
      await queryClient.invalidateQueries({ queryKey: ['applications', task.id] });
      await queryClient.refetchQueries({ queryKey: ['applications', task.id] });
      console.log('✅ APPROVAL MUTATION COMPLETE - Verified via backend function');
      onApprove?.();
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

  const pending = applications.filter(a => a.status === 'pending');

  if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;

  if (pending.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
        <div className="text-2xl mb-2">⏳</div>
        <p className="text-sm font-semibold text-amber-800">ממתין לבקשות עובדים...</p>
        <p className="text-xs text-amber-600 mt-1">כשעובד יבקש את המשימה תוכל לאשר אותו</p>
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
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-600 shrink-0">
                {app.worker_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900 text-sm">{app.worker_name}</span>
                  {app.worker_score > 0 && (
                    <span className="flex items-center gap-0.5 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                      <Award className="w-3 h-3" />
                      {app.worker_score.toFixed(0)} נק'
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  {app.worker_rating > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {app.worker_rating.toFixed(1)}
                    </span>
                  )}
                  {app.worker_tasks_count > 0 && (
                    <span>{app.worker_tasks_count} משימות</span>
                  )}
                </div>
                {app.message && (
                  <p className="text-xs text-gray-600 mt-2 bg-gray-50 rounded-lg p-2">{app.message}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={() => approveMutation.mutate(app)}
              disabled={approveMutation.isPending}
              className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-xs h-9"
            >
              {approveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5 ml-1" />אשר</>}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}