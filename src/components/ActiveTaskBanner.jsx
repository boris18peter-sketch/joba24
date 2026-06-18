import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, MapPin, Navigation, CheckCircle, Loader2, Camera, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import QuickChatDrawer from '@/components/QuickChatDrawer';
import VerifiedBadge from '@/components/VerifiedBadge';
import WorkerCompletionPhoto from '@/components/WorkerCompletionPhoto';
import InvoiceModal from '@/components/InvoiceModal';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';

const STATUS_STEPS = {
  on_the_way: { label: 'בדרך',         ownerLabel: 'בדרך אליך',          step: 0 },
  delayed:    { label: 'מתעכב',        ownerLabel: 'מתעכב',               step: 0 },
  parking:    { label: 'מחפש חניה',    ownerLabel: 'מחפש חניה',           step: 0 },
  arrived:    { label: 'הגעתי',        ownerLabel: 'הגיע',                step: 1 },
  starting:   { label: 'מתחיל עבודה',  ownerLabel: 'בעבודה',              step: 1 },
  finishing:  { label: 'מסיים עבודה',  ownerLabel: 'מסיים',               step: 1 },
  done:       { label: 'ממתין לאישור', ownerLabel: 'ממתין לאישורך',       step: 2 },
};

// Quick Action config per step
function getQuickAction(stepIdx, workerStatus) {
  if (stepIdx < 0)   return { label: 'יצאתי לדרך',  nextKey: 'on_the_way', color: '#1a6fd4' };
  if (stepIdx === 0) return { label: 'הגעתי למיקום', nextKey: 'arrived',    color: '#059669' };
  if (stepIdx === 1) return { label: 'סיימתי המשימה', nextKey: 'done',      color: '#059669' };
  return null; // done
}

// ── Confirm Bottom Sheet ────────────────────────────────────────────────────────
function ConfirmSheet({ action, onConfirm, onCancel, loading }) {
  const { t, isRTL } = useLanguage();
  if (!action) return null;
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(5,15,40,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onCancel}
    >
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{ background: 'white', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 40px', boxShadow: '0 -16px 60px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 20px' }} />
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>
            {action.nextKey === 'arrived' ? '📍' : action.nextKey === 'done' ? '✅' : '🚀'}
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#0f1e40', marginBottom: 6 }}>
            {action.nextKey === 'arrived' ? t('confirm_arrival') || 'Confirm arrival' : action.nextKey === 'done' ? t('confirm_done') || 'Confirm completion' : t('leaving_now') || 'Leaving now'}
          </div>
          <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
            {action.nextKey === 'arrived' ? t('owner_gets_update_arrived') || 'Owner will get an update' :
             action.nextKey === 'done' ? t('owner_gets_update_done') || 'Owner will get an update' :
             t('lets_update_leaving') || 'Let\'s update that you\'re leaving!'}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
           <button
             onClick={onConfirm}
             disabled={loading}
             style={{ width: '100%', height: 52, borderRadius: 16, background: action.color, border: 'none', color: 'white', fontWeight: 900, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
           >
             {loading ? <Loader2 size={18} className="animate-spin" /> : action.label}
           </button>
           <button
             onClick={onCancel}
             style={{ width: '100%', height: 44, borderRadius: 14, background: '#f1f5f9', border: 'none', color: '#64748b', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
           >
             {t('cancel_btn')}
           </button>
         </div>
      </div>
    </div>
  );
}

export default function ActiveTaskBanner({ tasks, roleHint }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, isRTL } = useLanguage();
  const [activeIdx, setActiveIdx] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // { task, action }
  const [updating, setUpdating] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState(null);
  const [mediaTask, setMediaTask] = useState(null); // task for media upload sheet
  const [mediaPhotos, setMediaPhotos] = useState([]);
  const [mediaVideo, setMediaVideo] = useState('');
  const [savingMedia, setSavingMedia] = useState(false);
  const [invoiceTask, setInvoiceTask] = useState(null); // task for invoice modal
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  // No local state — read directly from props (which come from React Query cache via Layout/HomeFeed)
  // Layout.jsx is the single broadcaster: it subscribes to WebSocket and updates all caches
  if (!tasks || !me) return null;
  const taskList = Array.isArray(tasks) ? tasks : [tasks];
  if (!taskList.length) return null;

  const handleQuickAction = async () => {
    if (!pendingAction || updating) return;
    const { task, action } = pendingAction;
    setUpdating(true);

    const update = { worker_status: action.nextKey };
    console.log('[Banner] handleQuickAction START — task.id:', task.id, 'update:', update);
    if (action.nextKey === 'on_the_way' && !task.on_the_way_at) {
      update.on_the_way_at = new Date().toISOString();
    } else if (action.nextKey === 'arrived' && !task.arrived_at) {
      update.arrived_at = new Date().toISOString();
    } else if (action.nextKey === 'done') {
      update.completed_at = new Date().toISOString();
    }

    // ── Optimistic update — update cache immediately so UI responds instantly ──
    const optimisticTask = { ...task, ...update };
    queryClient.setQueryData(['task', task.id], optimisticTask);
    // Also update activeWorkerTask cache optimistically so banner stays up-to-date
    queryClient.setQueryData(['activeWorkerTask', me?.id], (old) => {
      console.log('[Banner] optimistic activeWorkerTask — old:', old?.worker_status, '→ new:', update.worker_status);
      return old?.id === task.id ? { ...old, ...update } : old;
    });

    toast.success(action.label + ' ✓');
    setPendingAction(null);
    setUpdating(false);

    // Fire & forget geolocation + DB write in background
    try {
      if (action.nextKey === 'on_the_way' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          base44.entities.Task.update(task.id, { ...update, worker_lat: pos.coords.latitude, worker_lng: pos.coords.longitude })
            .then(() => queryClient.invalidateQueries({ queryKey: ['task', task.id] }))
            .catch(() => {});
        },
        () => {
          base44.entities.Task.update(task.id, update)
            .then(() => queryClient.invalidateQueries({ queryKey: ['task', task.id] }))
            .catch(() => {});
        },
        { timeout: 4000 }
      );
      } else {
        await base44.entities.Task.update(task.id, update);
        console.log('[Banner] DB write done, invalidating task query');
        queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      }
    } catch {
      toast.error(t('error_saving') || 'Error saving — try again');
    }
  };

  const handleOwnerConfirmComplete = async (task) => {
    if (completingTaskId) return;
    setCompletingTaskId(task.id);
    try {
      const res = await base44.functions.invoke('completeTask', { taskId: task.id });
      if (!res.data?.success) throw new Error(res.data?.error || 'שגיאה');
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      toast.success(t('task_completed') || 'Task completed! 🎉');
      // Dispatch rating popup event
      window.dispatchEvent(new CustomEvent('show_rating_modal', { detail: { task } }));
    } catch (err) {
      toast.error((t('error_colon') || 'Error: ') + err.message);
    } finally {
      setCompletingTaskId(null);
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ paddingBottom: 0 }}>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: 6 }}>
        {taskList.map((task, idx) => {
          const tStatusInfo = STATUS_STEPS[task.worker_status] || null;
          const tRole = task._roleHint || roleHint;
          const tIsWorker = tRole === 'worker' || (tRole !== 'client' && me?.id === task.worker_id);
          const tIsOwner  = tRole === 'client' || (tRole !== 'worker' && me?.id === task.client_id);
          const tStepIdx  = tStatusInfo?.step ?? -1;
          // If task is no longer TAKEN (cancelled by publisher), worker cannot update status
          const isTaskActive = task.status === 'TAKEN';
          const quickAction = tIsWorker && isTaskActive ? getQuickAction(tStepIdx, task.worker_status) : null;

          const gradient = 'linear-gradient(135deg, #1a6fd4 0%, #0a52b0 100%)';

          const statusText = tIsOwner
            ? tStatusInfo?.ownerLabel || 'ממתין לעדכון מהעובד'
            : tStatusInfo?.label || 'לחץ יצאתי לדרך';

          // Nav button → show only when on_the_way. After arrived → show chat.
          const showNavBtn  = tIsWorker && tStepIdx === 0 && task.location_name;
          const showChatBtn = tIsWorker && tStepIdx >= 1;

          return (
            <div
              key={task.id}
              style={{ flex: '0 0 100%', background: gradient, borderRadius: 22, padding: '16px', boxShadow: '0 8px 32px rgba(26,111,212,0.3)', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
              onClick={() => navigate(`/task/${task.id}`)}
            >
              {/* Live dot + badge */}
              <div style={{ position: 'absolute', top: 14, left: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
                  <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animation: 'livePing 1.5s ease-in-out infinite' }} />
                  <span style={{ position: 'relative', width: 8, height: 8, borderRadius: '50%', background: 'white', display: 'inline-flex' }} />
                </span>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: 700, letterSpacing: 0.3 }}>
                  {tIsWorker ? t('active_task_worker') || 'Active task' : t('active_task_client') || 'In execution'}
                </span>
              </div>

              {/* Decorative circle */}
              <div style={{ position: 'absolute', bottom: -20, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
              <div style={{ height: 20 }} />

              {/* Title + price */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0, paddingLeft: 8 }}>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600, marginBottom: 3 }}>{statusText}</div>
                  <div style={{ color: 'white', fontWeight: 900, fontSize: 17, lineHeight: 1.2, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                    {tIsWorker ? (
                      <>
                        <span onClick={e => { e.stopPropagation(); if (task.client_id) navigate(`/public-profile?id=${task.client_id}`); }} style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>מעסיק: {task.client_name}</span>
                        {task.client_rating > 0 && <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '1px 6px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>⭐ {task.client_rating.toFixed(1)}</span>}
                                                 {task.client_verified && <VerifiedBadge size="sm" />}
                      </>
                    ) : (
                      <>
                        <span onClick={e => { e.stopPropagation(); if (task.worker_id) navigate(`/public-profile?id=${task.worker_id}`); }} style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>עובד: {task.worker_name}</span>
                        {task.worker_rating > 0 && <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '1px 6px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>⭐ {task.worker_rating.toFixed(1)}</span>}
                                                 {task.worker_verified && <VerifiedBadge size="sm" />}
                      </>
                    )}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 14, padding: '8px 14px', textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ color: 'white', fontWeight: 900, fontSize: 22, lineHeight: 1 }}>₪{task.price}</div>
                </div>
              </div>

              {/* 3-step progress bar */}
              <div style={{ display: 'flex', alignItems: 'center', position: 'relative', marginBottom: 14, padding: '0 8px' }}>
                {/* Track */}
                <div style={{ position: 'absolute', top: 16, right: 8, left: 8, height: 3, background: 'rgba(255,255,255,0.25)', borderRadius: 2 }} />
                {/* Fill */}
                <div style={{
                  position: 'absolute', top: 16, right: 8, height: 3,
                  width: tStepIdx < 0 ? '0%' : tStepIdx === 0 ? '16%' : tStepIdx === 1 ? '50%' : '84%',
                  background: 'rgba(255,255,255,0.9)', borderRadius: 2,
                  transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
                }} />
                {[
                   { Icon: Navigation, label: t('on_the_way') },
                   { Icon: MapPin,     label: t('arrived') },
                   { Icon: CheckCircle,label: t('finished')  },
                ].map(({ Icon, label }, stepIdx) => {
                  const done   = tStepIdx >= 0 && stepIdx <= tStepIdx;
                  const active = tStepIdx >= 0 && stepIdx === tStepIdx;
                  return (
                    <div key={stepIdx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: done ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)',
                        border: `2px solid ${done ? 'white' : 'rgba(255,255,255,0.35)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: active ? '0 0 0 4px rgba(255,255,255,0.2)' : 'none',
                        transition: 'all 0.3s',
                      }}>
                        <Icon size={14} color={done ? '#1a6fd4' : 'rgba(255,255,255,0.6)'} strokeWidth={active ? 2.5 : 1.8} />
                      </div>
                      <div style={{ fontSize: 9, fontWeight: active ? 800 : 500, color: done ? 'white' : 'rgba(255,255,255,0.5)', marginTop: 4 }}>{label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Action row */}
              <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>

                {/* Owner: confirm completion when worker says done */}
                {tIsOwner && task.worker_status === 'done' && (
                  <button
                    onClick={() => handleOwnerConfirmComplete(task)}
                    disabled={completingTaskId === task.id}
                    style={{ flex: 2, height: 46, borderRadius: 14, background: 'linear-gradient(135deg,#059669,#047857)', border: 'none', color: 'white', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 2px 12px rgba(5,150,105,0.4)' }}
                  >
                    {completingTaskId === task.id ? <Loader2 size={15} className="animate-spin" /> : <><CheckCircle size={15} /> {t('confirm_done_work')}</>}
                  </button>
                )}

                {/* Quick action (worker only, not done) */}
                {tIsWorker && quickAction && (
                  <button
                    onClick={() => setPendingAction({ task: task, action: { ...quickAction, color: quickAction.color } })}
                    style={{ flex: 2, height: 46, borderRadius: 14, background: quickAction.color, border: 'none', color: 'white', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}
                  >
                    {quickAction.nextKey === 'arrived' ? <MapPin size={15} /> : quickAction.nextKey === 'done' ? <CheckCircle size={15} /> : <Navigation size={15} />}
                    {quickAction.label}
                  </button>
                )}

                {/* Nav button — only when on_the_way */}
                {showNavBtn && (
                  <button
                    onClick={() => {
                    const dst = task.lat && task.lng ? `${task.lat},${task.lng}` : encodeURIComponent(task.location_name);
                    const wazeUrl = `https://waze.com/ul?q=${dst}&navigate=yes`;
                    const mapsUrl = task.lat && task.lng ? `https://maps.google.com/maps?daddr=${task.lat},${task.lng}` : `https://maps.google.com/maps?q=${encodeURIComponent(task.location_name)}`;
                    const choice = window.confirm(t('navigate_choice') || 'Navigate with Waze?\nClick cancel for Google Maps');
                    window.open(choice ? wazeUrl : mapsUrl, '_blank');
                    }}
                    style={{ flex: 1, height: 46, borderRadius: 14, background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.35)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                  >
                    <Navigation size={15} /> {t('navigate')}
                    </button>
                )}

                {/* Chat button — after arrived */}
                {(showChatBtn || tIsOwner) && (
                  <button
                    onClick={() => setShowChat(true)}
                    style={{ flex: 1, height: 46, borderRadius: 14, background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.35)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                  >
                    <MessageCircle size={15} /> {t('chat')}
                    </button>
                )}

                {/* Details button */}
                <button
                  onClick={() => navigate(`/task/${task.id}`)}
                  style={{ flex: 1, height: 46, borderRadius: 14, background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.35)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {t('details')}
                </button>
              </div>

              {/* Worker extra actions row */}
              {tIsWorker && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => { setMediaTask(task); setMediaPhotos(task.completion_photos || []); setMediaVideo(task.completion_video_url || ''); }}
                    style={{ flex: 1, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                  >
                    <Camera size={13} /> הוכחת ביצוע {(task.completion_photos?.length > 0 || task.completion_video_url) ? '✓' : ''}
                  </button>
                  {task.requires_invoice && (
                    <button
                      onClick={() => setInvoiceTask(task)}
                      style={{ flex: 1, height: 38, borderRadius: 12, background: task.invoice_html ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                    >
                      <FileText size={13} /> חשבונית {task.invoice_html ? '✓' : ''}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirm sheet */}
      <ConfirmSheet
        action={pendingAction?.action}
        onConfirm={handleQuickAction}
        onCancel={() => setPendingAction(null)}
        loading={updating}
      />

      {showChat && me && <QuickChatDrawer task={taskList[activeIdx]} me={me} onClose={() => setShowChat(false)} />}

      {/* Media upload sheet */}
      {mediaTask && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(5,15,40,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setMediaTask(null)}
          onPointerDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
        >
          <div dir="rtl" onClick={e => e.stopPropagation()} style={{ background: 'var(--sheet-bg,white)', borderRadius: '28px 28px 0 0', width: '100%', maxWidth: 480, padding: '0 20px', paddingBottom: 'max(28px, env(safe-area-inset-bottom))', boxShadow: '0 -20px 80px rgba(0,0,0,0.25)', maxHeight: '80dvh', overflowY: 'auto' }}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '14px auto 16px' }} />
            <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1,#0f1e40)', marginBottom: 4 }}>📸 הוכחת ביצוע</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>התמונות/סרטון יוצגו למפרסם המשימה</div>
            <WorkerCompletionPhoto
              photos={mediaPhotos}
              videoUrl={mediaVideo}
              onPhotosChange={setMediaPhotos}
              onVideoChange={setMediaVideo}
            />
            <button
              onClick={async () => {
                setSavingMedia(true);
                await base44.entities.Task.update(mediaTask.id, { completion_photos: mediaPhotos, completion_video_url: mediaVideo || null });
                queryClient.setQueryData(['activeWorkerTask', me?.id], old => old?.id === mediaTask.id ? { ...old, completion_photos: mediaPhotos, completion_video_url: mediaVideo || null } : old);
                setSavingMedia(false);
                toast.success('הוכחת הביצוע נשמרה ✓');
                setMediaTask(null);
              }}
              disabled={savingMedia}
              style={{ marginTop: 14, width: '100%', height: 50, borderRadius: 14, background: 'linear-gradient(135deg,#059669,#047857)', color: 'white', fontWeight: 900, fontSize: 15, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {savingMedia ? <Loader2 size={18} className="animate-spin" /> : '💾 שמור'}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Invoice modal */}
      {invoiceTask && me && createPortal(
        <InvoiceModal task={invoiceTask} me={me} onClose={() => setInvoiceTask(null)} />,
        document.body
      )}

      <style>{`
        @keyframes livePing {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}