import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Star, CheckCircle2, Loader2, Award, MessageCircle, UserX } from 'lucide-react';
import TrustBadges from '@/components/TrustBadges';
import { toast } from 'sonner';

export default function TaskApplicants({ task, onApprove }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showCancelWorkerConfirm, setShowCancelWorkerConfirm] = useState(false);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['applications', task.id],
    queryFn: () => base44.entities.TaskApplication.filter({ task_id: task.id }, '-created_date', 20),
    staleTime: 30000,
  });

  // Fetch full user data for trust badges per applicant
  const workerIds = [...new Set(applications.map(a => a.worker_id).filter(Boolean))];
  const { data: workerUsers = [] } = useQuery({
    queryKey: ['applicantUsers', workerIds.join(',')],
    queryFn: async () => {
      if (!workerIds.length) return [];
      const all = await base44.entities.User.list();
      return all.filter(u => workerIds.includes(u.id));
    },
    enabled: workerIds.length > 0,
    staleTime: 60000,
  });
  const workerMap = Object.fromEntries(workerUsers.map(u => [u.id, u]));

  const approveMutation = useMutation({
    mutationFn: async (app) => {
      // Use backend function — it handles approval, rejection, and credit refunds atomically
      const res = await base44.functions.invoke('approveWorker', {
        taskId: task.id,
        applicationId: app.id,
        workerId: app.worker_id,
        workerName: app.worker_name,
      });
      if (!res.data?.success) throw new Error(res.data?.error || 'שגיאה באישור');
      return { task: res.data.task };
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

  const cancelWorkerMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('cancelApprovedWorker', { taskId: task.id });
      if (!res.data?.success) throw new Error('שגיאה בביטול');
      return res.data;
    },
    onSuccess: async (data) => {
      setShowCancelWorkerConfirm(false);
      await queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      await queryClient.refetchQueries({ queryKey: ['task', task.id] });
      await queryClient.invalidateQueries({ queryKey: ['applications', task.id] });
      await queryClient.refetchQueries({ queryKey: ['applications', task.id] });
      queryClient.invalidateQueries({ queryKey: ['myApp'] });
      // Notify worker via event (approval_revoked is the correct type for this scenario)
      window.dispatchEvent(new CustomEvent('approval_revoked_by_client', { detail: { task } }));
      const stored = JSON.parse(localStorage.getItem('joba24_notifications') || '[]');
      const newNotif = { type: 'approval_revoked', taskTitle: task.title, taskId: task.id, timestamp: new Date().toISOString(), read: false };
      localStorage.setItem('joba24_notifications', JSON.stringify([newNotif, ...stored].slice(0, 50)));
      toast.success('העובד בוטל והקרדיטים הוחזרו אליו 🪙');
      onApprove?.();
    },
    onError: (err) => {
      toast.error('שגיאה בביטול: ' + err.message);
    },
  });

  // Approved app (if any)
  const approvedApp = applications.find(a => a.status === 'approved');
  // Pending apps (not yet decided)
  const pending = applications.filter(a => a.status === 'pending');
  // Worker has started moving (on_the_way or beyond)
  const workerStarted = !!(task.worker_status);

  if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;

  // No applications at all
  if (applications.filter(a => a.status !== 'rejected').length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
        <div className="text-2xl mb-2">✋</div>
        <p className="text-sm font-semibold text-blue-800">ממתין לאישור</p>
        <p className="text-xs text-blue-600 mt-1">עדיין לא הגיעו בקשות מעובדים</p>
      </div>
    );
  }

  // Visible list: approved first, then pending
  const visibleApps = [
    ...(approvedApp ? [approvedApp] : []),
    ...pending,
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Cancel Worker Confirmation Modal */}
      {showCancelWorkerConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(5,15,40,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowCancelWorkerConfirm(false)}>
          <div dir="rtl" style={{ background: 'white', borderRadius: '28px 28px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 0', paddingBottom: 'max(28px, env(safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 20px' }} />
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🚫</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#0f1e40', marginBottom: 8 }}>לבטל את העובד?</div>
              <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
                העובד <strong style={{ color: '#0f1e40' }}>{approvedApp?.worker_name}</strong> יקבל החזר קרדיטים מלא.<br />
                המשימה תחזור לסטטוס פתוח ותוכל לאשר עובד אחר.
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => setShowCancelWorkerConfirm(false)}
                style={{ width: '100%', height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', border: 'none', color: 'white', fontWeight: 900, fontSize: 15, cursor: 'pointer' }}
              >
                השאר את העובד
              </button>
              <button
                onClick={() => cancelWorkerMutation.mutate()}
                disabled={cancelWorkerMutation.isPending}
                style={{ width: '100%', height: 48, borderRadius: 16, background: 'white', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {cancelWorkerMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <><UserX size={16} /> כן, בטל עובד</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: 0.3 }}>עובדים שמבקשים לבצע ({visibleApps.length})</span>
      </div>

      {visibleApps.map(app => {
        const isApproved = app.status === 'approved';
        return (
          <div key={app.id} style={{ background: isApproved ? '#f0fdf4' : 'white', border: isApproved ? '1.5px solid #86efac' : '1px solid #e8edf5', borderRadius: 14, padding: '10px 12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            {/* Top row: avatar + name + rating + actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Avatar */}
              <div
                onClick={() => navigate(`/public-profile?id=${app.worker_id}`)}
                style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: 'white', cursor: 'pointer', flexShrink: 0 }}
              >
                {app.worker_name?.[0]?.toUpperCase() || '?'}
              </div>

              {/* Name + rating + tasks */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span
                    onClick={() => navigate(`/public-profile?id=${app.worker_id}`)}
                    style={{ fontSize: 13, fontWeight: 800, color: '#0f1e40', cursor: 'pointer' }}
                  >
                    {app.worker_name}
                  </span>
                  {app.worker_rating > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: '#b45309', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 20, padding: '1px 7px' }}>
                      <Star size={10} style={{ fill: '#f59e0b', color: '#f59e0b' }} />
                      {app.worker_rating.toFixed(1)}
                    </span>
                  )}
                  {app.worker_tasks_count > 0 && (
                    <span style={{ fontSize: 10, color: '#64748b' }}>✅ {app.worker_tasks_count}</span>
                  )}
                </div>
                {app.message && (
                  <p style={{ fontSize: 11, color: '#6b7280', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{app.message}</p>
                )}
              </div>

              {/* Actions — inline */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => navigate(`/chat/${task.id}`)}
                  style={{ width: 32, height: 32, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  title={`הודעה ל${app.worker_name?.split(' ')[0]}`}
                >
                  <MessageCircle size={14} color="#1a6fd4" />
                </button>

                {isApproved ? (
                  !workerStarted && (
                    <button
                      onClick={() => setShowCancelWorkerConfirm(true)}
                      style={{ height: 32, padding: '0 10px', borderRadius: 10, background: 'white', border: '1.5px solid #fca5a5', color: '#dc2626', fontWeight: 700, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <UserX size={12} /> בטל
                    </button>
                  )
                ) : (
                  !approvedApp && (
                    <button
                      onClick={() => approveMutation.mutate(app)}
                      disabled={approveMutation.isPending}
                      style={{ height: 32, padding: '0 12px', borderRadius: 10, background: 'linear-gradient(135deg,#059669,#047857)', border: 'none', color: 'white', fontWeight: 800, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, opacity: approveMutation.isPending ? 0.6 : 1 }}
                    >
                      {approveMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <><CheckCircle2 size={13} /> אשר</>}
                    </button>
                  )
                )}

                {isApproved && (
                  <div style={{ height: 32, padding: '0 10px', borderRadius: 10, background: '#dcfce7', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#166534' }}>
                    <CheckCircle2 size={12} /> {workerStarted ? 'יצא ✓' : 'אושר'}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}