import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle, MapPin, Navigation, CheckCircle, Loader2, Camera, FileText,
  Phone, MoreVertical, Calendar, X, Package, Truck, Heart, BookOpen,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { useGlobalCategories } from '@/lib/brand/globalCategories';
import { resolveStatusFlow, stepIndexOf, nextCta, proofCopy, flowSteps } from '@/lib/taskStatusFlow';
import { isEngagement, primaryOccurrence, formatOccurrence, scheduleWindows } from '@/lib/scheduling';
import { useScheduleClock } from '@/hooks/useScheduleClock';
import { useJobaSettings } from '@/hooks/useJobaSettings';
import VerifiedBadge from '@/components/VerifiedBadge';
import GoldBadge from '@/components/GoldBadge';
import { hasSocialVerified } from '@/lib/utils';
import WorkerCompletionPhoto from '@/components/WorkerCompletionPhoto';
import InvoiceModal from '@/components/InvoiceModal';
import MediaLightbox from '@/components/MediaLightbox';
import { getCurrentPosition } from '@/lib/nativeGeolocation';
import { trackEvent } from '@/lib/analytics';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';
import { patchTaskCache } from '@/lib/taskCache';
import TaskChip from '@/components/task/TaskChip';
import TaskStepRail from '@/components/task/TaskStepRail';

/**
 * ACTIVE TASK PANEL — the action & progress view of a job in execution.
 *
 * One panel, two audiences: the worker who performs the job and the publisher
 * who hired them. It is deliberately the SAME component for both, because the
 * status, the step and the progress are the same facts on both sides — what
 * differs is the wording, the permitted action and the contact details, and all
 * three are derived per role below.
 *
 * It shows exactly four things: what state the job is in, what happens now, the
 * ONE action this user may take next, and a small row of secondary actions. It
 * is a surface like any other card in the app — no coloured hero, no duplicate
 * title, no competing buttons. Every handler, request and cache write is the
 * one this panel already used; only the presentation changed.
 */

const ICON_MAP = {
  navigation: Navigation, map_pin: MapPin, check: CheckCircle,
  package: Package, truck: Truck, heart: Heart, book: BookOpen, camera: Camera,
};

// The worker's next action, derived from the task's CATEGORY-AWARE status flow.
function getQuickAction(flow, workerStatus) {
  const cta = nextCta(flow, workerStatus);
  if (!cta) return null;
  const icon = cta.key === 'on_the_way' ? 'navigation' : cta.key === 'arrived' ? 'map_pin' : 'check';
  const color = cta.key === 'on_the_way' ? 'var(--brand-banner-bg, var(--brand-primary))' : '#059669';
  return {
    ...cta,
    nextKey: cta.key,
    icon,
    color,
    confirmTitle: cta.confirm_title,
    confirmSub: cta.confirm_sub,
  };
}

// ── One secondary action — same height, radius and weight for every one of them
function SecondaryAction({ icon, label, onClick, href, tone = 'neutral', grow = true }) {
  const success = tone === 'success';
  const shared = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    height: 38, padding: '0 12px', borderRadius: 'var(--r-sm)',
    background: success ? 'var(--color-success-bg)' : 'var(--surface-3)',
    border: `1px solid ${success ? 'var(--color-success-border)' : 'var(--border-1)'}`,
    color: success ? 'var(--color-success)' : 'var(--text-2)',
    fontSize: 12.5, fontWeight: 700, cursor: 'pointer', textDecoration: 'none',
    flex: grow ? '1 1 0' : '0 0 auto', minWidth: 0,
    WebkitTapHighlightColor: 'transparent',
  };
  const body = (
    <>
      {icon}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </>
  );
  if (href) {
    return <a href={href} onClick={e => e.stopPropagation()} style={shared}>{body}</a>;
  }
  return <button onClick={onClick} style={shared}>{body}</button>;
}

// ── Confirm sheet (unchanged behaviour, unified surface) ──────────────────────
function ConfirmSheet({ action, onConfirm, onCancel, loading }) {
  const { t, isRTL } = useLanguage();
  if (!action) return null;
  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000000, background: 'var(--overlay-bg)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onCancel}
    >
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{ background: 'var(--brand-modal-bg, var(--sheet-bg))', border: '1px solid var(--brand-modal-border, var(--border-1))', borderRadius: 'var(--r-2xl) var(--r-2xl) 0 0', width: '100%', maxWidth: 480, padding: '18px 20px max(28px, env(safe-area-inset-bottom))', boxShadow: 'var(--shadow-xl)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '0 auto 18px' }} />
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>{action.emoji}</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--brand-modal-title, var(--text-1))', marginBottom: 6 }}>
            {action.confirmTitle}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--brand-modal-text, var(--text-2))', lineHeight: 1.6 }}>
            {action.confirmSub}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{ width: '100%', height: 50, borderRadius: 'var(--r-md)', background: 'var(--brand-modal-cta-bg, var(--brand-primary))', border: 'none', color: 'var(--brand-modal-cta-text, #ffffff)', fontWeight: 800, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : action.label}
          </button>
          <button
            onClick={onCancel}
            style={{ width: '100%', height: 44, borderRadius: 'var(--r-md)', background: 'var(--surface-3)', border: '1px solid var(--border-1)', color: 'var(--text-2)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            {t('cancel_btn')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ActiveTaskBanner({ tasks, roleHint, extraInfo }) {
  const navigate = useNavigate();
  const { openTaskSheet } = useTaskSheet();
  const queryClient = useQueryClient();
  const { t, isRTL } = useLanguage();
  // The global category catalogue — the single source of every status flow.
  const { rows: catRows } = useGlobalCategories();
  const [pendingAction, setPendingAction] = useState(null); // { task, action }
  const [updating, setUpdating] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState(null);
  const [mediaTask, setMediaTask] = useState(null); // task for media upload sheet
  const [mediaPhotos, setMediaPhotos] = useState([]);
  const [mediaVideo, setMediaVideo] = useState('');
  const [savingMedia, setSavingMedia] = useState(false);
  const [invoiceTask, setInvoiceTask] = useState(null); // task for invoice modal
  const [proofLightbox, setProofLightbox] = useState({ open: false, items: [], index: 0 });
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  // Live scheduling clock — arms a single timer for the exact calendar →
  // upcoming → active boundary, so the panel flips state without a reload and
  // without polling. Declared before the early returns below (rules of hooks).
  const { settings: jobaSettings } = useJobaSettings();
  const scheduleWins = scheduleWindows(jobaSettings);
  const clockNow = useScheduleClock(tasks, scheduleWins);

  // No local state — read directly from props (which come from React Query cache via Layout/HomeFeed)
  if (!tasks || !me) return null;
  const taskList = Array.isArray(tasks) ? tasks : [tasks];
  if (!taskList.length) return null;

  // Inside the task detail sheet the header above the panel already shows the
  // title, the price and the publisher — so the panel drops them and keeps only
  // what it alone can say: status, current step, progress and the next action.
  const inSheet = !!extraInfo?.inSheet;

  const handleQuickAction = async () => {
    if (!pendingAction || updating) return;
    const { task, action } = pendingAction;
    setUpdating(true);

    const update = { worker_status: action.nextKey };
    if (action.nextKey === 'on_the_way' && !task.on_the_way_at) {
      update.on_the_way_at = new Date().toISOString();
    } else if (action.nextKey === 'arrived' && !task.arrived_at) {
      update.arrived_at = new Date().toISOString();
    } else if (action.nextKey === 'done') {
      update.completed_at = new Date().toISOString();
    }

    // ── Optimistic update — update cache immediately so UI responds instantly ──
    const optimisticTask = { ...task, ...update };
    patchTaskCache(queryClient, task.id, optimisticTask);
    queryClient.setQueryData(['activeWorkerTask', me?.id], (old) => {
      return old?.id === task.id ? { ...old, ...update } : old;
    });

    toast.success(action.label + ' ✓');
    setPendingAction(null);
    setUpdating(false);

    // Fire & forget geolocation + DB write in background
    try {
      if (action.nextKey === 'on_the_way' && navigator.geolocation) {
        getCurrentPosition(
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
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      queryClient.invalidateQueries({ queryKey: ['myPublishedTasks'] });
      trackEvent(
        'task_completed',
        { category: task?.category, city: task?.city, value: task?.price, currency: 'ILS' },
        { dedupeKey: task.id }
      );
      toast.success(t('task_completed') || 'Task completed! 🎉');
      window.dispatchEvent(new CustomEvent('show_rating_modal', { detail: { task: { ...task, status: 'COMPLETED' } } }));
    } catch (err) {
      toast.error((t('error_colon') || 'Error: ') + err.message);
    } finally {
      setCompletingTaskId(null);
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: 2 }}>
        {taskList.map((task) => {
          // Category-aware presentation, resolved from the GLOBAL catalogue.
          const flow = resolveStatusFlow(task.category, catRows);
          const flowIdx = stepIndexOf(flow, task.worker_status);
          const tStatusInfo = flowIdx >= 0
            ? { step: flowIdx, label: flow.steps[flowIdx].label, ownerLabel: flow.steps[flowIdx].owner_label }
            : null;
          const tRole = task._roleHint || roleHint;
          const tIsWorker = tRole === 'worker' || (tRole !== 'client' && me?.id === task.worker_id);
          const tIsOwner  = tRole === 'client' || (tRole !== 'worker' && me?.id === task.client_id);
          const tStepIdx  = tStatusInfo?.step ?? -1;
          const isTaskActive = task.status === 'TAKEN';

          // ── Upcoming vs Active Execution ─────────────────────────────────
          // A task scheduled for later is an ENGAGEMENT, not a job in progress:
          // it shows WHEN, and offers no step CTA.
          const isUpcoming = isEngagement(task, clockNow, scheduleWins);
          const nextOccurrence = isUpcoming ? primaryOccurrence(task) : null;
          const quickAction = tIsWorker && isTaskActive && !isUpcoming ? getQuickAction(flow, task.worker_status) : null;
          const QuickActionIcon = quickAction ? (ICON_MAP[quickAction.icon] || Navigation) : null;

          // ── Current step wording — the largest thing on the panel ──
          const cfgStatusLabel = tIsOwner ? tStatusInfo?.ownerLabel : tStatusInfo?.label;
          const nextBtnLabel = quickAction?.label;
          let hero, heroSub;
          if (isUpcoming) {
            hero = tIsWorker ? t('atb_planned_worker') : t('atb_planned_owner');
            heroSub = nextOccurrence
              ? (tIsWorker
                  ? t('atb_planned_worker_sub', { when: formatOccurrence(nextOccurrence) })
                  : t('atb_planned_owner_sub', { when: formatOccurrence(nextOccurrence) }))
              : '';
          } else if (tIsWorker) {
            if (tStepIdx < 0) {
              hero = t('atb_set_out');
              heroSub = nextBtnLabel ? t('atb_sub_btn_start', { btn: nextBtnLabel }) : t('atb_sub_update_status');
            } else if (tStepIdx === 0) {
              hero = t('atb_on_way');
              heroSub = nextBtnLabel ? t('atb_sub_btn_arrive', { btn: nextBtnLabel }) : t('atb_sub_keep_going');
            } else if (tStepIdx === 1) {
              hero = cfgStatusLabel || t('atb_working');
              heroSub = nextBtnLabel ? t('atb_sub_btn_finish', { btn: nextBtnLabel }) : t('atb_sub_work_in_progress');
            } else {
              hero = cfgStatusLabel || t('atb_done_wait');
              heroSub = t('atb_sub_publisher_approves');
            }
          } else {
            if (tStepIdx < 0) {
              hero = t('atb_await_worker');
              heroSub = t('atb_sub_worker_updates');
            } else if (tStepIdx === 0) {
              hero = cfgStatusLabel || t('atb_worker_coming');
              heroSub = t('atb_sub_youll_know');
            } else if (tStepIdx === 1) {
              hero = cfgStatusLabel || t('atb_worker_here');
              heroSub = t('atb_sub_work_in_progress');
            } else {
              hero = cfgStatusLabel || t('atb_worker_done');
              heroSub = t('atb_sub_tap_approve');
            }
          }
          const heroDone = tStepIdx === 2;
          const HeroIcon = isUpcoming ? Calendar : heroDone ? CheckCircle
            : (ICON_MAP[flow.steps[Math.min(Math.max(tStepIdx, 0), flow.steps.length - 1)].icon] || Navigation);

          // The rail shows the SAME canonical steps, worded for the viewer's role.
          const railSteps = flowSteps(flow, tIsOwner ? 'owner' : 'worker');

          // Permission-gated secondary actions
          const showNavBtn = tIsWorker && tStepIdx === 0 && task.location_name;
          const showChatBtn = tIsWorker;

          const workerPhone = tIsWorker && extraInfo?.contactPhone ? extraInfo.contactPhone : null;
          const ownerPhone = tIsOwner && extraInfo?.workerUser?.phone ? extraInfo.workerUser.phone : null;
          const phoneNumber = workerPhone || ownerPhone;

          const personName = tIsWorker ? task.client_name : task.worker_name;
          const personId = tIsWorker ? task.client_id : task.worker_id;
          const personRating = tIsWorker ? task.client_rating : task.worker_rating;
          const personVerified = tIsWorker ? task.client_verified : task.worker_verified;
          const personLabel = tIsWorker ? t('role_poster') : t('role_worker');

          const canConfirmDone = tIsOwner && task.worker_status === 'done';
          const hasPrimary = !!quickAction || canConfirmDone;

          const proofItems = [
            ...(task.completion_photos || []).map(u => ({ type: 'image', url: u })),
            ...(task.completion_video_url ? [{ type: 'video', url: task.completion_video_url }] : []),
          ];

          return (
            <div key={task.id} style={{ flex: '0 0 100%', minWidth: 0 }}>
              <div
                onClick={() => openTaskSheet(task.id)}
                style={{
                  background: 'var(--brand-card-bg, var(--surface-2))',
                  border: '1px solid var(--border-1)',
                  borderRadius: 'var(--r-lg)',
                  boxShadow: 'var(--shadow-xs)',
                  padding: '11px 14px 13px',
                  cursor: 'pointer',
                }}
              >
                {/* ── A. STATUS — one chip, the state and nothing else ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
                  <TaskChip
                    tone={isUpcoming ? 'neutral' : heroDone ? 'success' : 'brand'}
                    icon={<HeroIcon size={11} strokeWidth={2.4} />}
                  >
                    {t('active_task_label')}
                    {tStatusInfo && !isUpcoming ? ` · ${cfgStatusLabel}` : ''}
                  </TaskChip>
                  <div style={{ flex: 1 }} />
                  {!inSheet && task.price != null && (
                    <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-1)', letterSpacing: -0.3, whiteSpace: 'nowrap' }}>
                      ₪{task.price}
                    </span>
                  )}
                  {extraInfo?.onSheetClose && (
                    <button
                      onClick={e => { e.stopPropagation(); extraInfo.onSheetClose(); }}
                      aria-label="Close"
                      className="j-icon-btn"
                      style={{ width: 28, height: 28, borderRadius: 9, background: 'var(--surface-3)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-3)', flexShrink: 0 }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* ── B. CURRENT STEP — what is happening right now ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: heroDone ? 'var(--color-success-bg)' : 'var(--brand-primary-light)', border: `1px solid ${heroDone ? 'var(--color-success-border)' : 'var(--border-2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <HeroIcon size={19} strokeWidth={2} color={heroDone ? 'var(--color-success)' : 'var(--brand-primary)'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.25, letterSpacing: -0.2 }}>{hero}</div>
                    {heroSub ? (
                      <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2, lineHeight: 1.4 }}>{heroSub}</div>
                    ) : null}
                  </div>
                </div>

                {/* Title — only outside the sheet, where no header shows it */}
                {!inSheet && task.title && (
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-2)', marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.title}
                  </div>
                )}

                {/* ── C. PROGRESS — one track and the step names ── */}
                {!isUpcoming && (
                  <TaskStepRail
                    steps={railSteps}
                    activeIndex={tStepIdx}
                    tone={heroDone ? 'success' : 'brand'}
                    style={{ marginTop: 12 }}
                  />
                )}

                {/* The other side of the deal — only where no header shows it */}
                {!inSheet && personName && (
                  <div
                    onClick={e => { e.stopPropagation(); if (personId) navigate(`/public-profile?id=${personId}`); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, padding: '4px 9px', borderRadius: 'var(--r-full)', background: 'var(--surface-3)', border: '1px solid var(--border-1)', cursor: personId ? 'pointer' : 'default', maxWidth: '100%' }}
                  >
                    <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 700 }}>{personLabel}:</span>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{personName}</span>
                    {personRating > 0 && <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-warning)' }}>★ {personRating.toFixed(1)}</span>}
                    {personVerified && (
                      tIsOwner && extraInfo?.workerUser && hasSocialVerified(extraInfo.workerUser)
                        ? <GoldBadge size="sm" />
                        : <VerifiedBadge size="sm" />
                    )}
                  </div>
                )}

                {/* Worker proof — shown to the publisher as soon as it exists */}
                {tIsOwner && proofItems.length > 0 && (
                  <div onClick={e => e.stopPropagation()} style={{ marginTop: 10, background: 'var(--surface-3)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)', padding: '9px 11px' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)', marginBottom: 6 }}>{t('proof_from_worker')}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {proofItems.map((item, i) => (
                        <button key={i} onClick={() => setProofLightbox({ open: true, items: proofItems, index: i })} style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-1)', display: 'block', padding: 0, cursor: 'pointer', position: 'relative', background: item.type === 'video' ? '#000' : 'var(--surface-2)' }}>
                          {item.type === 'video' ? (
                            <>
                              <video src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.75 }} />
                              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Camera size={16} color="white" /></div>
                            </>
                          ) : (
                            <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── D. THE NEXT ACTION — exactly one, role- and state-aware ── */}
                <div onClick={e => e.stopPropagation()}>
                  {hasPrimary && (
                    <div style={{ marginTop: 12 }}>
                      {canConfirmDone ? (
                        <button
                          onClick={() => handleOwnerConfirmComplete(task)}
                          disabled={completingTaskId === task.id}
                          style={{ width: '100%', height: 46, borderRadius: 'var(--r-md)', background: 'linear-gradient(135deg,#059669,#047857)', border: 'none', color: '#ffffff', fontWeight: 800, fontSize: 14.5, cursor: completingTaskId === task.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: '0 4px 14px rgba(5,150,105,0.28)', opacity: completingTaskId === task.id ? 0.75 : 1 }}
                        >
                          {completingTaskId === task.id ? <Loader2 size={17} className="animate-spin" /> : <><CheckCircle size={17} /> {t('confirm_done_work') || 'אשר סיום'}</>}
                        </button>
                      ) : (
                        <button
                          onClick={() => setPendingAction({ task, action: { ...quickAction } })}
                          style={{ width: '100%', height: 46, borderRadius: 'var(--r-md)', background: quickAction.color, border: 'none', color: '#ffffff', fontWeight: 800, fontSize: 14.5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: '0 4px 14px rgba(26,111,212,0.22)' }}
                        >
                          {QuickActionIcon && <QuickActionIcon size={17} />}
                          {quickAction.label}
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── E. SECONDARY ACTIONS — small, uniform, permission-gated ── */}
                  <div style={{ display: 'flex', gap: 6, marginTop: hasPrimary ? 8 : 12 }}>
                    {showNavBtn && (
                      <SecondaryAction
                        icon={<Navigation size={14} />}
                        label={t('navigate') || 'נווט'}
                        onClick={() => {
                          const dst = task.lat && task.lng ? `${task.lat},${task.lng}` : encodeURIComponent(task.location_name);
                          const wazeUrl = `https://waze.com/ul?q=${dst}&navigate=yes`;
                          const mapsUrl = task.lat && task.lng ? `https://maps.google.com/maps?daddr=${task.lat},${task.lng}` : `https://maps.google.com/maps?q=${encodeURIComponent(task.location_name)}`;
                          const choice = window.confirm(t('navigate_choice') || 'Navigate with Waze?\nClick cancel for Google Maps');
                          window.location.href = choice ? wazeUrl : mapsUrl;
                        }}
                      />
                    )}
                    {(showChatBtn || tIsOwner) && (
                      <SecondaryAction
                        icon={<MessageCircle size={14} />}
                        label={t('chat') || 'צ׳אט'}
                        onClick={() => {
                          if (extraInfo?.onQuickChat) { extraInfo.onQuickChat(); return; }
                          const otherId = me?.id === task.client_id ? task.worker_id : task.client_id;
                          if (otherId) navigate(`/chat/${task.id}?with=${otherId}`);
                        }}
                      />
                    )}
                    {phoneNumber && (
                      <SecondaryAction icon={<Phone size={14} />} label={phoneNumber} href={`tel:${phoneNumber}`} tone="success" />
                    )}
                    {!inSheet && (
                      <SecondaryAction
                        icon={<FileText size={14} />}
                        label={t('details') || 'פרטים'}
                        onClick={() => openTaskSheet(task.id)}
                      />
                    )}
                    {extraInfo?.isOwner && extraInfo?.onOwnerMenu && (
                      <SecondaryAction
                        icon={<MoreVertical size={14} />}
                        label=""
                        grow={false}
                        onClick={() => extraInfo.onOwnerMenu()}
                      />
                    )}
                  </div>

                  {/* Proof + invoice — the worker's own tools, after arrival */}
                  {tIsWorker && tStepIdx >= 1 && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <SecondaryAction
                        icon={<Camera size={14} />}
                        label={`${proofCopy(flow).label}${proofItems.length ? ' ✓' : ''}`}
                        onClick={() => { setMediaTask(task); setMediaPhotos([...(task.completion_photos || [])]); setMediaVideo(task.completion_video_url || ''); }}
                      />
                      {task.requires_invoice && (
                        <SecondaryAction
                          icon={<FileText size={14} />}
                          label={`${t('invoice_btn')}${task.invoice_html ? ' ✓' : ''}`}
                          onClick={() => setInvoiceTask(task)}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Publisher's own numbers — quiet, inside the sheet only */}
                {extraInfo?.isOwner && (
                  <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 9, borderTop: '1px solid var(--border-1)' }}>
                    {[
                      { val: extraInfo.viewsCount || 0, label: t('views') },
                      { val: extraInfo.clicksCount || 0, label: t('clicks') },
                      { val: extraInfo.applicationCount || 0, label: t('applications_count') },
                    ].map(({ val, label }, i) => (
                      <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-1)' }}>{val}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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

      {/* Media upload sheet */}
      {mediaTask && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000000, background: 'var(--overlay-bg)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setMediaTask(null)}
          onPointerDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
        >
          <div dir={isRTL ? 'rtl' : 'ltr'} onClick={e => e.stopPropagation()} style={{ background: 'var(--brand-modal-bg, var(--sheet-bg))', border: '1px solid var(--brand-modal-border, var(--border-1))', borderRadius: 'var(--r-2xl) var(--r-2xl) 0 0', width: '100%', maxWidth: 480, padding: '0 20px', paddingBottom: 'max(28px, env(safe-area-inset-bottom))', boxShadow: 'var(--shadow-xl)', maxHeight: '80dvh', overflowY: 'auto' }}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '14px auto 16px' }} />
            <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)', marginBottom: 4 }}>{proofCopy(resolveStatusFlow(mediaTask.category, catRows)).label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 12 }}>{proofCopy(resolveStatusFlow(mediaTask.category, catRows)).sub}</div>
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
                patchTaskCache(queryClient, mediaTask.id, { completion_photos: mediaPhotos, completion_video_url: mediaVideo || null }, { create: false });
                queryClient.invalidateQueries({ queryKey: ['task', mediaTask.id] });
                if (mediaTask.client_id && mediaTask.client_id !== me?.id) {
                  base44.functions.invoke('sendPushNotification', {
                    user_ids: [mediaTask.client_id],
                    title: t('td_proof_uploaded_title'),
                    body: t('td_proof_uploaded_body').replace('{title}', mediaTask.title),
                    url: `/task/${mediaTask.id}`,
                    tag: `completion_${mediaTask.id}`,
                  }).catch(() => {});
                }
                setSavingMedia(false);
                toast.success(t('proof_saved_toast'));
                setMediaTask(null);
              }}
              disabled={savingMedia}
              style={{ marginTop: 14, width: '100%', height: 50, borderRadius: 'var(--r-md)', background: 'linear-gradient(135deg,#059669,#047857)', color: '#ffffff', fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {savingMedia ? <Loader2 size={18} className="animate-spin" /> : t('save_btn')}
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

      {/* In-app proof media viewer (photos + video, with close + swipe) */}
      {proofLightbox.open && (
        <MediaLightbox
          isOpen
          items={proofLightbox.items}
          initialIndex={proofLightbox.index}
          onClose={() => setProofLightbox(p => ({ ...p, open: false }))}
        />
      )}
    </div>
  );
}