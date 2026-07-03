import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Star, CheckCircle2, Loader2, MessageCircle, UserX, X, ShieldCheck, Phone, Lock, Briefcase } from 'lucide-react';
import MediaLightbox from '@/components/MediaLightbox';
import { toast } from 'sonner';
import QuickChatDrawer from '@/components/QuickChatDrawer';

export default function TaskApplicants({ task, onApprove }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showCancelWorkerConfirm, setShowCancelWorkerConfirm] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [lightbox, setLightbox] = useState({ open: false, images: [], index: 0 });
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const decliningRef = useRef(new Set());
  const [decliningIds, setDecliningIds] = useState(new Set());
  const [fadingIds, setFadingIds] = useState(new Set());

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['applications', task.id],
    queryFn: () => base44.entities.TaskApplication.filter({ task_id: task.id }, '-created_date', 20),
    staleTime: 60000,
  });

  // Fetch ALL applicant profiles in parallel — includes profile_photo, bio, etc.
  const { data: applicantProfiles = {} } = useQuery({
    queryKey: ['applicantProfiles', task.id],
    queryFn: async () => {
      const profiles = {};
      await Promise.all(applications.map(async (app) => {
        try {
          const res = await base44.functions.invoke('getPublicUserProfile', { userId: app.worker_id, taskId: task.id });
          if (res.data?.user) profiles[app.worker_id] = res.data.user;
        } catch {}
      }));
      return profiles;
    },
    enabled: applications.length > 0,
    staleTime: 120000,
  });

  const approvedWorkerId = applications.find(a => a.status === 'approved')?.worker_id;

  const approveMutation = useMutation({
    mutationFn: async (app) => {
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
      const updatedTask = data.task;
      if (updatedTask) {
        queryClient.setQueryData(['task', task.id], (old) => old ? { ...old, ...updatedTask } : updatedTask);
        queryClient.setQueryData(['workerTasksLayout', updatedTask.worker_id], (old = []) => {
          if (!Array.isArray(old)) return old;
          const exists = old.find(t => t.id === task.id);
          return exists ? old.map(t => t.id === task.id ? { ...t, ...updatedTask } : t) : [updatedTask, ...old];
        });
        queryClient.setQueryData(['myPublishedTasks', me?.id], (old = []) =>
          Array.isArray(old) ? old.map(t => t.id === task.id ? { ...t, ...updatedTask } : t) : old
        );
        queryClient.setQueryData(['myTasks', me?.id], (old = []) =>
          Array.isArray(old) ? old.map(t => t.id === task.id ? { ...t, ...updatedTask } : t) : old
        );
        queryClient.setQueryData(['allTasks'], (old = []) =>
          Array.isArray(old) ? old.map(t => t.id === task.id ? { ...t, ...updatedTask } : t) : old
        );
        window.dispatchEvent(new CustomEvent('task_status_update', { detail: { taskId: task.id, update: updatedTask } }));
      }
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['applications', task.id] });
      queryClient.invalidateQueries({ queryKey: ['applications-pulse', task.id] });
      queryClient.invalidateQueries({ queryKey: ['workerTasksLayout', updatedTask?.worker_id] });
      toast.success(`${updatedTask?.worker_name || 'העובד'} אושר! ✨`);
      onApprove?.();
    },
    onError: (error) => {
      toast.error(`שגיאה: ${error.message}`);
    },
  });

  useEffect(() => {
    const unsubscribe = base44.entities.TaskApplication.subscribe((event) => {
      const appData = event.data;
      if (appData?.task_id === task.id) {
        queryClient.setQueryData(['applications', task.id], (old = []) => {
          if (event.type === 'create') return old.find(a => a.id === appData.id) ? old : [...old, appData];
          if (event.type === 'update') return old.map(a => a.id === appData.id ? { ...a, ...appData } : a);
          if (event.type === 'delete') return old.filter(a => a.id !== appData.id);
          return old;
        });
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
    onSuccess: async () => {
      setShowCancelWorkerConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['applications', task.id] });
      queryClient.invalidateQueries({ queryKey: ['applications-pulse', task.id] });
      queryClient.invalidateQueries({ queryKey: ['myApp'] });
      window.dispatchEvent(new CustomEvent('approval_revoked_by_client', { detail: { task } }));
      toast.success('העובד בוטל והקרדיטים הוחזרו אליו 🪙');
      onApprove?.();
    },
    onError: (err) => {
      toast.error('שגיאה בביטול: ' + err.message);
    },
  });

  const handleDecline = async (app) => {
    if (decliningRef.current.has(app.id)) return;
    decliningRef.current.add(app.id);
    setDecliningIds(new Set(decliningRef.current));

    try {
      const res = await base44.functions.invoke('declineApplication', {
        applicationId: app.id,
        taskId: task.id,
      });

      if (res.data?.code === 'already_declined') {
        toast.info('הבקשה כבר נדחתה');
        return;
      }
      if (!res.data?.success) throw new Error(res.data?.error || 'שגיאה');

      setFadingIds(prev => new Set([...prev, app.id]));
      setTimeout(() => {
        setFadingIds(prev => { const n = new Set(prev); n.delete(app.id); return n; });
        queryClient.invalidateQueries({ queryKey: ['applications', task.id] });
        queryClient.invalidateQueries({ queryKey: ['applications-pulse', task.id] });
        queryClient.invalidateQueries({ queryKey: ['task', task.id] });
        if (res.data?.auto_bump_resumed) {
          toast.success('הבקשה נדחתה ועליית המחיר האוטומטית ממשיכה 📈');
        } else {
          toast.success('הבקשה נדחתה והקרדיטים הוחזרו לעובד 🪙');
        }
        onApprove?.();
      }, 350);

    } catch (err) {
      if (err?.response?.status === 409) {
        toast.info('הבקשה כבר נדחתה');
      } else {
        toast.error('שגיאה בדחיית הבקשה');
      }
    } finally {
      decliningRef.current.delete(app.id);
      setDecliningIds(new Set(decliningRef.current));
    }
  };

  const approvedApp = applications.find(a => a.status === 'approved');
  const pending = applications.filter(a => a.status === 'pending');
  const workerStarted = !!(task.worker_status);

  if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;

  if (applications.filter(a => a.status !== 'rejected' && a.status !== 'cancelled').length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
        <div className="text-2xl mb-2">✋</div>
        <p className="text-sm font-semibold text-blue-800">ממתין לאישור</p>
        <p className="text-xs text-blue-600 mt-1">עדיין לא הגיעו בקשות מעובדים</p>
      </div>
    );
  }

  const sortedPending = [...pending].sort((a, b) => {
    const aProfile = applicantProfiles[a.worker_id];
    const bProfile = applicantProfiles[b.worker_id];
    if (aProfile?.is_verified && !bProfile?.is_verified) return -1;
    if (!aProfile?.is_verified && bProfile?.is_verified) return 1;
    return (bProfile?.rating || b.worker_rating || 0) - (aProfile?.rating || a.worker_rating || 0);
  });

  const visibleApps = [
    ...(approvedApp ? [approvedApp] : []),
    ...sortedPending,
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Cancel Worker Confirmation Modal */}
      {showCancelWorkerConfirm && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(5,15,40,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', touchAction: 'none' }}
          onClick={() => setShowCancelWorkerConfirm(false)}
        >
          <div
            dir="rtl"
            style={{ background: 'white', borderRadius: '28px 28px 0 0', width: '100%', maxWidth: 480, padding: '0 20px', paddingBottom: 'max(28px, env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '14px auto 20px' }} />
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
                style={{ width: '100%', height: 48, borderRadius: 16, background: 'white', border: '1.5px solid #fecaca', color: '#dc2626', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {cancelWorkerMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <><UserX size={16} /> כן, בטל עובד</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 0.3 }}>מועמדים ({visibleApps.length})</span>
      </div>

      {visibleApps.map(app => {
        const isApproved = app.status === 'approved';
        const isBeingDeclined = decliningIds.has(app.id);
        const isFading = fadingIds.has(app.id);
        const profile = applicantProfiles[app.worker_id];
        const photo = profile?.profile_photo;
        const rating = profile?.rating || app.worker_rating || 0;
        const isVerified = profile?.is_verified || app.worker_verified;
        const tasksCompleted = profile?.tasks_completed ?? app.worker_tasks_count ?? 0;
        const phone = isApproved ? profile?.phone : null;

        return (
          <div
            key={app.id}
            style={{
              background: isApproved ? '#f0fdf4' : 'var(--surface-2)',
              border: isApproved ? '1.5px solid #86efac' : '1px solid var(--border-1)',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-xs)',
              transition: 'opacity 0.35s ease, transform 0.35s ease',
              opacity: isFading ? 0 : 1,
              transform: isFading ? 'translateX(30px)' : 'translateX(0)',
              pointerEvents: isFading ? 'none' : 'auto',
            }}
          >
            {/* ── Top section: avatar + info + actions ── */}
            <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {/* Avatar — circular with photo or gradient fallback */}
              <div
                onClick={() => navigate(`/public-profile?id=${app.worker_id}&taskId=${task.id}`)}
                style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: photo ? 'var(--surface-3)' : 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 900, color: 'white', cursor: 'pointer', flexShrink: 0,
                  overflow: 'hidden', position: 'relative',
                  border: isVerified ? '2px solid #16a34a' : '2px solid transparent',
                  boxShadow: isVerified ? '0 0 0 2px rgba(22,163,74,0.15)' : 'none',
                }}
              >
                {photo ? (
                  <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  app.worker_name?.[0]?.toUpperCase() || '?'
                )}
              </div>

              {/* Name + badges */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  <span
                    onClick={() => navigate(`/public-profile?id=${app.worker_id}&taskId=${task.id}`)}
                    style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)', cursor: 'pointer' }}
                  >
                    {app.worker_name}
                  </span>
                  {isApproved && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 800, color: '#059669', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 20, padding: '2px 8px' }}>
                      <CheckCircle2 size={11} /> אושר
                    </span>
                  )}
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  {rating > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: '#b45309' }}>
                      <Star size={11} style={{ fill: '#f59e0b', color: '#f59e0b' }} />
                      {rating.toFixed(1)}
                    </span>
                  )}
                  {isVerified && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: '#059669' }}>
                      <ShieldCheck size={11} /> מאומת
                    </span>
                  )}
                  {tasksCompleted > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, color: 'var(--text-3)' }}>
                      <Briefcase size={10} /> {tasksCompleted} משימות
                    </span>
                  )}
                </div>

                {/* Phone (approved only) or privacy note */}
                {isApproved && phone ? (
                  <a href={`tel:${phone}`} onClick={e => e.stopPropagation()} dir="ltr"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 13, fontWeight: 800, color: '#16a34a', textDecoration: 'none', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '3px 10px' }}>
                    <Phone size={12} color="#16a34a" /> {phone}
                  </a>
                ) : !isApproved ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 10, fontWeight: 600, color: 'var(--text-3)' }}>
                    <Lock size={9} color="#d97706" /> המספר יוצג לאחר אישור
                  </div>
                ) : null}
              </div>

              {/* Quick action: chat */}
              <button
                onClick={() => setShowChat(true)}
                style={{
                  width: 36, height: 36, borderRadius: 11, flexShrink: 0,
                  background: '#eff6ff', border: '1px solid #bfdbfe',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <MessageCircle size={16} color="#1a6fd4" />
              </button>
            </div>

            {/* ── Message (if any) ── */}
            {app.message && (
              <div style={{ padding: '0 14px 8px' }}>
                <div style={{ background: 'var(--surface-3)', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                  {app.message}
                </div>
              </div>
            )}

            {/* ── Images (if any) ── */}
            {app.images?.length > 0 && (
              <div style={{ padding: '0 14px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {app.images.slice(0, 5).map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setLightbox({ open: true, images: app.images, index: i })}
                    style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', border: '1.5px solid var(--border-1)', padding: 0, cursor: 'pointer', position: 'relative', background: 'var(--surface-3)', flexShrink: 0 }}
                  >
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    {i === 4 && app.images.length > 5 && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'white' }}>
                        +{app.images.length - 5}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* ── Action bar ── */}
            <div style={{ borderTop: `1px solid ${isApproved ? '#bbf7d0' : 'var(--border-1)'}`, padding: '8px 14px', display: 'flex', gap: 8 }}>
              {isApproved ? (
                !workerStarted && (
                  <button
                    onClick={() => setShowCancelWorkerConfirm(true)}
                    style={{
                      flex: 1, height: 40, borderRadius: 11,
                      background: '#fff1f2', border: '1.5px solid #fca5a5',
                      color: '#dc2626', fontWeight: 700, fontSize: 13,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <UserX size={15} /> בטל עובד
                  </button>
                )
              ) : !approvedApp ? (
                <>
                  <button
                    onClick={() => handleDecline(app)}
                    disabled={isBeingDeclined}
                    style={{
                      flex: 1, height: 40, borderRadius: 11,
                      background: 'var(--surface-3)', border: '1px solid var(--border-1)',
                      color: isBeingDeclined ? 'var(--text-3)' : 'var(--text-2)',
                      fontWeight: 700, fontSize: 13,
                      cursor: isBeingDeclined ? 'not-allowed' : 'pointer',
                      opacity: isBeingDeclined ? 0.6 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    {isBeingDeclined ? <Loader2 size={15} className="animate-spin" /> : <><X size={15} /> דחה</>}
                  </button>
                  <button
                    onClick={() => approveMutation.mutate(app)}
                    disabled={approveMutation.isPending}
                    style={{
                      flex: 1.5, height: 40, borderRadius: 11,
                      background: approveMutation.isPending ? '#86efac' : 'linear-gradient(135deg,#059669,#047857)',
                      border: 'none', color: 'white', fontWeight: 800, fontSize: 13,
                      cursor: 'pointer', opacity: approveMutation.isPending ? 0.7 : 1,
                      boxShadow: '0 2px 10px rgba(5,150,105,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    {approveMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <><CheckCircle2 size={15} /> אשר עובד</>}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        );
      })}

      {showChat && me && <QuickChatDrawer task={task} me={me} onClose={() => setShowChat(false)} />}
      <MediaLightbox
        isOpen={lightbox.open}
        items={lightbox.images.map(url => ({ type: 'image', url }))}
        initialIndex={lightbox.index}
        onClose={() => setLightbox(l => ({ ...l, open: false }))}
      />
    </div>
  );
}