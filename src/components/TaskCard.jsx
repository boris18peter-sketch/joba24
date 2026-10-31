import { useState, useRef, useEffect, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Star, Send, Loader2, MoreVertical, Trash2, CheckCircle2, ChevronDown, ChevronUp, Play, Clock, Calendar, Banknote, Wrench, RefreshCw, Zap, ShieldCheck, X } from 'lucide-react';
import BoostOverlay from '@/components/BoostOverlay';
import MediaLightbox from '@/components/MediaLightbox';
import TaskImage from '@/components/TaskImage';
import { WorkerPoolPill } from '@/components/WorkerPoolScanner';
import useTaskServiceLabel from '@/components/useTaskServiceLabel';
import { categoryKeyForTask } from '@/lib/brand/categoryTree';
import { useGlobalCategories } from '@/lib/brand/globalCategories';
import { resolveStatusFlow, statusLabel } from '@/lib/taskStatusFlow';
import { trackEvent } from '@/lib/analytics';
import VerifiedBadge from '@/components/VerifiedBadge';

import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { calculateCurrentPrice, getHourlyBreakdown, formatHoursLabel, formatHourlySublabel } from '@/lib/priceCalculator';
import CreditIcon from '@/components/CreditIcon';
import CancelTaskConfirmModal from '@/components/CancelTaskConfirmModal';
import ApplySheet from '@/components/ApplySheet';
import LoginPromptModal from '@/components/LoginPromptModal';
import BuyCreditsModal from '@/components/BuyCreditsModal';
import VerifyModal from '@/components/VerifyModal';
import VerificationRequiredModal from '@/components/VerificationRequiredModal';
import TaskDetailsRows from '@/components/TaskDetailsRows.jsx';
import BoostPill from '@/components/BoostPill';
import ApplicantsGoldButton from '@/components/ApplicantsGoldButton';
import TaskChip from '@/components/task/TaskChip';
import { useLanguage } from '@/lib/LanguageContext';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { raiseAppOffer } from '@/lib/appOffer';
import { isUserVerified } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { useTaskTranslation } from '@/hooks/useTaskTranslation';
import { creditsShortfall } from '@/lib/jobaBalance';
import { invalidateTaskCaches } from '@/lib/taskSync';


function normalizeDate(d) {
  const s = String(d);
  // If ISO string has no timezone info, treat as UTC
  if (s.includes('T') && !s.endsWith('Z') && !s.includes('+') && !/[0-9]{2}:[0-9]{2}$/.test(s.slice(-5))) return s + 'Z';
  return s;
}

function getRelativeTime(date, t) {
  if (!date) return null;
  const ms = Date.now() - new Date(normalizeDate(date)).getTime();
  if (ms < 0) return t('now_label');
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return t('now_label');
  if (minutes < 60) return t('minutes_ago').replace('{n}', minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('hours_ago').replace('{n}', hours);
  const days = Math.floor(hours / 24);
  if (days < 30) return t('days_ago').replace('{n}', days);
  return null;
}

/**
 * The card's one-line facts row: location · distance · age · verification ·
 * rating · applicants.
 *
 * Only facts that actually exist are rendered, separated by a hairline dot that
 * is drawn BETWEEN two facts rather than after each one — so a task with two
 * facts has one separator and one with five has four, and the line never ends on
 * a dangling dot or leaves a gap where a missing fact used to be.
 */
function FactsRow({ items }) {
  const shown = items.filter(Boolean);
  if (!shown.length) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6,
      marginTop: 7, fontSize: 11.5, fontWeight: 600, color: 'var(--text-3)',
    }}>
      {shown.map((node, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {i > 0 && (
            <span style={{
              width: 3, height: 3, borderRadius: 99, flexShrink: 0,
              background: 'var(--border-2)', display: 'inline-block',
            }} />
          )}
          {node}
        </span>
      ))}
    </div>
  );
}

const URGENCY_TAG_CONFIG = {
  immediate: { emoji: '🔥', label: 'urgency_immediate', color: 'var(--color-danger)', bg: '#fef2f2', border: '#fca5a5' },
  few_hours: { emoji: '⏰', label: 'urgency_few_hours', color: 'var(--text-2)', bg: '#f1f5f9', border: '#e2e8f0' },
  evening:   { emoji: '🌅', label: 'urgency_evening', color: 'var(--text-2)', bg: '#f1f5f9', border: '#e2e8f0' },
  flexible:  { emoji: '😌', label: 'urgency_flexible', color: 'var(--text-2)', bg: '#f1f5f9', border: '#e2e8f0' },
};

// Scanning texts are now imported from translations via useLanguage() in the component



// ── Scanning Label (no applicants state) ─────────────────────────────────────
function ScanningLabel({ taskId }) {
  const { t } = useLanguage();
  const [textIdx, setTextIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const scanningTexts = t('scanning_texts') || ['Signaling...', 'Scanning...', 'Finding matches...', 'Boosting visibility...', 'Distributing task...', 'Expanding reach...'];

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setTextIdx(i => (i + 1) % scanningTexts.length);
        setVisible(true);
      }, 400);
    }, 25000);
    return () => clearInterval(interval);
  }, [scanningTexts.length]);

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <span style={{ position: 'relative', width: 12, height: 12, flexShrink: 0 }}>
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.5)', animation: 'scanRing 1.4s ease-in-out infinite' }} />
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(rgba(255,255,255,0.6) 0deg, transparent 90deg, transparent 360deg)', animation: 'scanSweep 1.4s linear infinite' }} />
          <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 3, height: 3, borderRadius: '50%', background: 'white' }} />
        </span>
        <span style={{ fontSize: 12, fontWeight: 800, opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}>
          {scanningTexts[textIdx]}
        </span>
      </span>
      <span style={{ fontSize: 10, opacity: 0.75, fontWeight: 500 }}>{t('task_exposed')}</span>
    </span>
  );
}

// ── TaskCard ──────────────────────────────────────────────────────────────────
const LOCALE_MAP = { he: 'he-IL', ar: 'ar-IL', en: 'en-US', es: 'es-ES', fr: 'fr-FR', ru: 'ru-RU', fil: 'fil-PH', hi: 'hi-IN', zh: 'zh-CN' };

function TaskCard({ task, myApp, currentUserId, workerName, badges, viewOnly, isMyPublished, hideApplyCost = false }) {
  const { t, isRTL, lang } = useLanguage();
  const navigate = useNavigate();
  // Global category catalogue — resolves the category-aware status wording.
  const { rows: catRows } = useGlobalCategories();
  const { openTaskSheet } = useTaskSheet();
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const { translatedTask, isTranslated, isLoading: isTranslating } = useTaskTranslation(task);
  const displayTask = translatedTask;
  const [cancelling, setCancelling] = useState(false);
  const cancellingRef = useRef(false); // hard guard — survives re-renders
  const cancelTaskRef = useRef(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [applyLocked, setApplyLocked] = useState(false);
  const [applyPressed, setApplyPressed] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancellingTask, setCancellingTask] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showCardSuccess, setShowCardSuccess] = useState(false);
  const [cardSuccessCredits, setCardSuccessCredits] = useState(0);
  const [applyBtnPos, setApplyBtnPos] = useState(null);
  const cardRef = useRef(null);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [neededCredits, setNeededCredits] = useState(0);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showVerificationRequired, setShowVerificationRequired] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showBoostOverlay, setShowBoostOverlay] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  // Applicant count — use applicants array length from task; this is kept in sync by WS handlers in HomeFeed
  // We intentionally don't drop to 0 if it's undefined/null (could be stale); treat undefined as 0 but never as "missing"
  const liveApplicantCount = Array.isArray(task.applicants) ? task.applicants.length : 0;

  useEffect(() => {
    if (!showMenu) return;
    const handler = () => setShowMenu(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showMenu]);

  const catLabel = useTaskServiceLabel(task, t);
  const dist = task._distKm;
  // ── THE TASK, NOT THE CACHE, DECIDES WHETHER THIS IS STILL "PENDING" ─────
  // `myApp` comes from a cached list, so for up to a minute after the publisher
  // selected this worker the card could still read `pending` — painting the amber
  // "waiting for approval" banner with its cancel button onto a job that was
  // already theirs. Tapping that cancel was refused by the server (only a
  // genuinely pending application may be cancelled and refunded), so the button
  // appeared to do nothing and the banner stayed on screen. Once the task is this
  // worker's, the card shows the assigned state; the way back out is the leave
  // control on the task itself, which refunds and returns the task to OPEN.
  const assignedToMe = !!currentUserId && task?.worker_id === currentUserId;
  const appStatus = assignedToMe ? 'approved' : myApp?.status;
  const hasActiveApp = appStatus === 'pending' || appStatus === 'approved';

  const handleCancelApp = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (cancellingRef.current || !myApp?.id) return;
    cancellingRef.current = true;
    setCancelling(true);
    // Optimistic update
    queryClient.setQueryData(['myApplicationsFeed', currentUserId], (old = []) =>
      old.map(a => a.id === myApp.id ? { ...a, status: 'cancelled' } : a)
    );
    queryClient.setQueryData(['myApp', task.id, currentUserId], null);
    try {
      const res = await base44.functions.invoke('cancelMyApplication', { applicationId: myApp.id, taskId: task.id });
      if (!res.data?.success) throw new Error(res.data?.error || 'שגיאה');
      invalidateTaskCaches(queryClient, { taskId: task.id, meId: currentUserId });
      toast.success(t('app_cancelled_credits_back'));
    } catch {
      // Rollback optimistic update
      queryClient.setQueryData(['myApp', task.id, currentUserId], myApp);
      queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed', currentUserId] });
      toast.error(t('error_cancelling_task'));
    } finally {
      cancellingRef.current = false;
      setCancelling(false);
    }
  };

  const handleApplied = (realApp, creditsCharged = 0) => {
    setShowCardSuccess(true);
    setCardSuccessCredits(creditsCharged);
    setTimeout(() => setShowCardSuccess(false), 4000);
    const appRecord = realApp || { task_id: task.id, worker_id: currentUserId, status: 'pending', id: `opt_${task.id}` };
    queryClient.setQueryData(['myApplicationsFeed', currentUserId], (old = []) => {
      const without = old.filter(a => !(a.task_id === task.id && a.worker_id === currentUserId));
      return [...without, appRecord];
    });
    queryClient.setQueryData(['myApp', task.id, currentUserId], appRecord);
    queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed', currentUserId] });
    queryClient.invalidateQueries({ queryKey: ['myApp', task.id, currentUserId] });
    queryClient.invalidateQueries({ queryKey: ['applications', task.id] });
    queryClient.invalidateQueries({ queryKey: ['task', task.id] });
    queryClient.invalidateQueries({ queryKey: ['allTasks'] });
  };

  // Submission for the shared ApplySheet popup (same component the task-detail
  // sheet renders, so both entry points behave identically).
  const handleApplySubmit = async (msg) => {
    setApplySubmitting(true);
    try {
      const res = await base44.functions.invoke('applyForTask', { taskId: displayTask.id, message: msg });
      if (res.data?.error === 'already_applied') {
        toast(t('already_applied'));
        setShowApplyModal(false);
        return;
      }
      if (res.data?.error === 'insufficient_credits') {
        setShowApplyModal(false);
        setNeededCredits(creditsShortfall(res.data));
        setShowBuyCredits(true);
        return;
      }
      if (res.data?.error === 'verification_required') {
        setShowApplyModal(false);
        setShowVerificationRequired(true);
        return;
      }
      // Worker funnel — deeper quality event. Fires only after the backend
      // returned a persisted application record.
      trackEvent(
        'application_submitted',
        { category: displayTask?.category, city: displayTask?.city, value: displayTask?.price },
        { dedupeKey: res.data?.application?.id || displayTask?.id }
      );
      handleApplied(res.data?.application, res.data?.credits_charged || 0);
      // A web visitor who has just applied is worth offering the app to: the
      // publisher's approval arrives as a push notification, which only the
      // installed app can deliver. First application only.
      raiseAppOffer('apply');
      setTimeout(() => setShowApplyModal(false), 120);
    } catch (err) {
      const errData = err?.response?.data;
      if (errData?.error === 'insufficient_credits') {
        setShowApplyModal(false);
        setNeededCredits(creditsShortfall(errData));
        setShowBuyCredits(true);
      } else if (errData?.error === 'verification_required') {
        setShowApplyModal(false);
        setShowVerificationRequired(true);
      } else {
        toast.error(t('error_sending_app'));
      }
    } finally {
      setApplySubmitting(false);
    }
  };

  const handleCancelTask = async () => {
    if (cancelTaskRef.current) return;
    cancelTaskRef.current = true;
    setCancellingTask(true);
    try {
      const res = await base44.functions.invoke('cancelTaskPayment', { taskId: task.id });
      if (!res.data?.success) throw new Error(t('error_cancelling_task'));
      invalidateTaskCaches(queryClient, { taskId: task.id, meId: currentUserId });
      setShowCancelConfirm(false);
    } catch {
      toast.error(t('error_cancelling_task'));
    } finally {
      cancelTaskRef.current = false;
      setCancellingTask(false);
    }
  };

  const isApproved  = appStatus === 'approved';
  const isPending   = appStatus === 'pending';
  const currentPrice = calculateCurrentPrice(task);
  const hourlyBreakdown = getHourlyBreakdown(task);

  // Boost availability check for card — show pill for all open owned tasks (pill handles charge state)
  // Sync logic with TaskDetail: card pill counts from createdDate when never boosted (same as detail)
  const boostAvailableCard = isMyPublished && task.status === 'OPEN' && !task.worker_id;



  // ── THE CARD'S TAGS — ONE ORDERED LIST, NEVER MORE THAN TWO ─────────────
  // Ordered by what a worker scanning the feed needs first: is this FOR ME, is
  // it urgent, when is it, then the softer signals. The list is built here and
  // sliced to two where it renders, so the row cannot overflow the card however
  // many signals a task happens to carry.
  //
  // "שכר גבוה" (high pay) is deliberately gone: the price is already the most
  // prominent number on the card, so the tag only repeated it while taking the
  // space the row needed.
  const isForYou = !hasActiveApp && badges?.isForYou;
  const headerTags = [];

  if (isForYou) {
    headerTags.push(
      <TaskChip tone="warning">✦ {t('for_you_badge')}</TaskChip>
    );
  }

  if (task.urgency_tag && URGENCY_TAG_CONFIG[task.urgency_tag]) {
    const tag = URGENCY_TAG_CONFIG[task.urgency_tag];
    headerTags.push(
      <TaskChip tone={task.urgency_tag === 'immediate' ? 'danger' : 'neutral'}>
        {tag.emoji} {t(tag.label)}
      </TaskChip>
    );
  }

  if (task.scheduled_time) {
    const raw = String(task.scheduled_time);
    const sDate = new Date(raw.includes('T') && !raw.endsWith('Z') && !raw.includes('+') ? raw + 'Z' : raw);
    if (!isNaN(sDate.getTime())) {
      const now = new Date();
      const isToday = sDate.toDateString() === now.toDateString();
      const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
      const isTomorrow = sDate.toDateString() === tomorrow.toDateString();
      const locale = LOCALE_MAP[lang] || 'he-IL';
      const timeStr = sDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
      let label;
      if (isToday) label = `${t('today')} ${timeStr}`;
      else if (isTomorrow) label = `${t('tomorrow')} ${timeStr}`;
      else label = sDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' }) + ' ' + timeStr;
      const slotCount = Array.isArray(task.category_details?.schedule) ? task.category_details.schedule.length : 0;
      headerTags.push(
        <TaskChip tone="brand">📅 {label}{slotCount > 1 ? ` · ${slotCount} ${t('slots')}` : ''}</TaskChip>
      );
    }
  }

  if (badges && !hasActiveApp) {
    const softLabel = badges.isNew ? t('new_tag')
      : badges.isFunded ? t('funded_tag')
      : badges.isNearby ? t('nearby_tag')
      : null;
    if (softLabel) {
      headerTags.push(
        <TaskChip tone="neutral">{softLabel}</TaskChip>
      );
    }
  }

  return (
    <>
      <div
        ref={cardRef}
        onClick={() => { if (showMenu) { setShowMenu(false); return; } openTaskSheet(task.id, task); }}
        className="j-task-card"
        style={{
          background: 'var(--brand-card-bg, var(--surface-2))',
          borderRadius: 'var(--r-lg)',
          border: isApproved
            ? '1.5px solid var(--color-success-border)'
            : isPending
            ? '1.5px solid var(--color-warning-border)'
            : showCardSuccess
            ? '1.5px solid var(--color-success-border)'
            : '1px solid var(--border-1)',
          boxShadow: 'var(--shadow-xs)',
          padding: '14px 14px 0',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Verification required — subtle diagonal ribbon + thin accent strip */}
        {task.verification_required && (
          <>
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: 0, width: 3,
              background: 'linear-gradient(180deg, rgba(22,163,74,0.5), rgba(5,150,105,0.35))',
              zIndex: 5, flexShrink: 0,
            }} />
            <div style={{
              position: 'absolute', top: 7, left: -24, zIndex: 6,
              transform: 'rotate(-45deg)',
              background: 'linear-gradient(135deg, rgba(22,163,74,0.9), rgba(5,150,105,0.9))',
              padding: '2px 26px',
              fontSize: 8, fontWeight: 800, color: 'white', whiteSpace: 'nowrap',
              boxShadow: '0 1px 5px rgba(22,163,74,0.25)',
              letterSpacing: 0.3,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
            }}>
              {t('verification_required_ribbon')}
            </div>
          </>
        )}

        {/* In-card success overlay */}
        {showCardSuccess && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 20,
            background: 'rgba(240,253,244,0.97)',
            borderRadius: 16,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
            animation: 'cardSuccessIn 0.3s cubic-bezier(0.34,1.4,0.64,1)',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'linear-gradient(135deg,#dcfce7,#bbf7d0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 10px rgba(22,163,74,0.08)',
              animation: 'successPop 0.4s cubic-bezier(0.34,1.6,0.64,1)',
            }}>
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                <circle cx="13" cy="13" r="13" fill="#16a34a" opacity="0.15" />
                <path className="j-checkmark-path" d="M7 13.5l4.5 4.5L19 9" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#14532d' }}>{t('application_sent')}</div>
             {cardSuccessCredits > 0 && (
               <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#b45309', fontWeight: 700, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 20, padding: '3px 10px', animation: 'coinBadgePop 0.35s 0.15s cubic-bezier(0.34,1.6,0.64,1) both' }}>
                 <span>{t('commitment_label')} {cardSuccessCredits}</span>
                 <svg viewBox="0 0 24 24" width="13" height="13"><circle cx="12" cy="12" r="11" fill="#fbbf24"/><text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="900" fontFamily="Inter,sans-serif" fill="var(--brand-primary)">J</text></svg>
                 <span>{t('credits')}</span>
               </div>
             )}
             <div style={{ fontSize: 11, color: '#16a34a' }}>{t('waiting_approval_short')}</div>
          </div>
        )}

        {/* ── COMPLETED BANNER — the ✓ that lands the moment the job is done ──
            Completion is the one event both sides waited for, and it used to be
            announced ONLY by a popup taking over the screen. The card underneath
            — the thing the user was actually looking at — said nothing. So the
            fact arrived and then vanished with the popup, leaving no trace on the
            card that it had happened.

            Same shape as the approved banner below it, deliberately: a user who
            has seen one already knows how to read the other. It is the FIRST
            beat of the completion flow — the ✓ on the card, then the rating, then
            the thank-you — so it is on screen before anything else opens. */}
        {task.status === 'COMPLETED' && (
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', borderRadius: 'var(--r-sm)',
            padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10,
            animation: 'cardFadeIn 0.3s ease',
          }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle2 size={16} color="#16a34a" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>{t('task_completed_badge')} ✅</div>
            </div>
          </div>
        )}

        {/* Approved banner */}
        {isApproved && (
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', borderRadius: 'var(--r-sm)',
            padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10,
            animation: 'cardFadeIn 0.3s ease',
          }}>
             <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
               <CheckCircle2 size={16} color="#16a34a" />
             </div>
             <div style={{ flex: 1 }}>
               <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>{t('approved')} ✅</div>
               <div style={{ fontSize: 11, color: '#16a34a', marginTop: 1 }}>{t('approved_sub')}</div>
             </div>
             <button onClick={e => { e.stopPropagation(); openTaskSheet(task.id, task); }}
               className="btn-tap"
               style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', WebkitTapHighlightColor: 'transparent' }}>
               {t('go_now')}
             </button>
           </div>
         )}

         {/* Pending banner */}
         {isPending && (
           <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', borderRadius: 'var(--r-sm)', padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
             <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-warning)', display: 'inline-block', animation: 'pulse-app 1.5s infinite', flexShrink: 0 }} />
             <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#b45309' }}>{t('waiting_approval_short')}</div>
             <button onClick={handleCancelApp} disabled={cancelling}
               style={{ background: 'none', border: '1px solid #fde68a', borderRadius: 7, padding: '4px 10px', fontSize: 11, color: '#b45309', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
               {cancelling ? <Loader2 size={10} className="animate-spin" /> : t('cancel_btn')}
             </button>
           </div>
         )}

        {/* Card Header: AT MOST TWO TAGS.
            This row used to hold urgency + schedule + a badge on one side and the
            For-You marker + the applicant count on the other — up to five pills in
            a single ~400px row, which is what pushed the tags past the card's edge
            on narrower phones and made the card look broken. It is now ONE ordered
            list capped at two; the applicant count moved down to the meta row with
            the rest of the task's facts. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8, overflow: 'hidden' }}>
          {headerTags.slice(0, 2).map((node, i) => (
            <span key={i} style={{ display: 'inline-flex', flexShrink: 0 }}>{node}</span>
          ))}
        </div>

        {/* ── WHAT THE JOB IS, THEN WHAT DECIDES IT ────────────────────────
            Title, and ONE compact line of facts: where, how far, how fresh,
            whether the publisher is verified, their rating, how many have
            already applied. The full description is gone from the card — it was
            prose repeated on every card in the feed, which is what made the
            board heavy to scan; it is one tap away under "פרטים נוספים". */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 title={displayTask.title} style={{ fontWeight: 800, color: 'var(--text-1)', fontSize: 16, lineHeight: 1.3, letterSpacing: -0.2, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {displayTask.title}
              {isTranslated && (
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--brand-primary)', background: 'var(--brand-primary-light)', borderRadius: 6, padding: '1px 5px', marginRight: 4, verticalAlign: 'middle', whiteSpace: 'nowrap', border: '1px solid var(--border-2)' }}>
                  {t('translated_badge')}
                </span>
              )}
              {isTranslating && (
                <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-3)', marginRight: 4, verticalAlign: 'middle' }}>…</span>
              )}
            </h3>

            <FactsRow items={[
              displayTask.location_name ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, maxWidth: 150, color: 'var(--text-2)' }}>
                  <MapPin size={11} strokeWidth={2} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayTask.location_name}</span>
                </span>
              ) : null,
              dist != null && !isNaN(dist) ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--brand-primary)', fontWeight: 700 }}>
                  <Navigation size={10} strokeWidth={2.2} />
                  {dist < 1 ? `${Math.round(dist * 1000)}${t('meters_short')}` : `${dist.toFixed(1)}${t('km_short')}`}
                </span>
              ) : null,
              task.created_date && getRelativeTime(task.created_date, t) ? (
                <span>{getRelativeTime(task.created_date, t)}</span>
              ) : null,
              task.client_verified ? (
                <span title={t('verified_badge_short', 'מאומת')} style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--color-success)' }}>
                  <ShieldCheck size={12} strokeWidth={2.2} />
                </span>
              ) : null,
              Number(task.client_rating) > 0 ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: 'var(--text-2)', fontWeight: 700 }}>
                  <Star size={11} fill="#fbbf24" color="#fbbf24" />
                  {Number(task.client_rating).toFixed(1)}
                </span>
              ) : null,
              task.status === 'OPEN' && liveApplicantCount > 0 ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#92400e', fontWeight: 700 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', animation: 'pulse-app 1.5s infinite', flexShrink: 0 }} />
                  {liveApplicantCount} {t('applications_count')}
                </span>
              ) : null,
            ]} />
          </div>

          {/* Media thumbnail — opens the lightbox */}
          {(() => {
            const allMedia = [
              ...(task.images || []).map(url => ({ type: 'image', url })),
              ...(task.video_url ? [{ type: 'video', url: task.video_url }] : [])
            ];
            if (!allMedia.length) return null;
            const cur = allMedia[0];
            return (
              <div
                onClick={e => { e.stopPropagation(); setLightboxIndex(0); setLightboxOpen(true); }}
                style={{ width: 62, height: 62, flexShrink: 0, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--brand-card-border, var(--border-1))', position: 'relative', background: 'var(--surface-3)', cursor: 'pointer' }}
              >
                {cur.type === 'image' ? (
                  // `priority` only for the first card — the thumbnail that is on
                  // screen the moment the feed opens. Every other card stays lazy,
                  // so a long feed still fetches only what is near the viewport.
                  <TaskImage src={cur.url} priority={!!task._isFirstCard} />
                ) : (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <video src={cur.url} preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                      <Play size={16} color="white" fill="white" />
                    </div>
                  </div>
                )}
                {allMedia.length > 1 && (
                  <div style={{ position: 'absolute', bottom: 3, right: 3, background: 'rgba(0,0,0,0.55)', borderRadius: 6, padding: '1px 5px', fontSize: 9, color: 'white', fontWeight: 700 }}>
                    +{allMedia.length - 1}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* ── PRICE — the one number the card is really about ─────────────
            It sits on its own line, directly above the action it belongs to,
            instead of sharing a row with a column of controls. Payment method
            and the hourly figure stay secondary, in the same line and muted. */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-1)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
            <span style={{ fontSize: 23, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1, letterSpacing: -0.6, whiteSpace: 'nowrap' }}>₪{Math.round(currentPrice)}</span>
            {task.payment_method && (
              <span style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {task.payment_method === 'Cash' ? t('cash') : task.payment_method}
              </span>
            )}
            {hourlyBreakdown && (
              <span style={{ fontSize: 10.5, color: 'var(--text-2)', fontWeight: 600, whiteSpace: 'nowrap' }}>{formatHourlySublabel(task)}</span>
            )}
          </div>

          {/* Views & entries — present on every card, kept deliberately quiet so
              they never compete with the price or the action. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
            <span>{task.views_count || 0} {t('views')}</span>
            <span style={{ width: 3, height: 3, borderRadius: 99, background: 'var(--border-2)', display: 'inline-block' }} />
            <span>{task.clicks_count || 0} {t('clicks')}</span>
          </div>
        </div>

        {isMyPublished && task.auto_bump_enabled && task.base_price && task.max_price && task.status === 'OPEN' && (
          <span style={{ display: 'inline-block', marginTop: 6, fontSize: 10.5, color: liveApplicantCount > 0 ? 'var(--color-success)' : '#b45309', fontWeight: 600 }}>
            📈 ₪{task.base_price} {isRTL ? '←' : '→'} ₪{task.max_price}{liveApplicantCount > 0 ? ` · ${t('auto_bump_active')}` : ` · ${t('auto_bump_desc')}`}
          </span>
        )}

        {/* ── ONE DOMINANT ACTION ──────────────────────────────────────────
            The whole width belongs to the single next step: apply (with the
            Joba cost beside the label), or — on a task of his own — the
            applicants. Owner management stays exactly as it was, only moved
            here so every card ends with one button in the same place. */}
        <div style={{ marginTop: 10 }} onClick={e => e.stopPropagation()}>
          {isMyPublished ? (
            task.status === 'OPEN' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {boostAvailableCard && (
                  <BoostPill task={task} size="sm" onBoostDone={() => { queryClient.invalidateQueries({ queryKey: ['me'] }); queryClient.invalidateQueries({ queryKey: ['allTasks'] }); }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <ApplicantsGoldButton
                    count={liveApplicantCount}
                    label={t('view_applicants')}
                    onClick={e => { e.stopPropagation(); openTaskSheet(task.id, task); }}
                    scanning={<ScanningLabel taskId={task.id} />}
                    fullWidth
                  />
                </div>
              </div>
            ) : task.status === 'TAKEN' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '9px 12px', fontSize: 12, fontWeight: 700, color: '#b45309' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', flexShrink: 0, animation: 'pulse-app 1.5s infinite', display: 'inline-block' }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {/* The viewer here is the PUBLISHER (this whole branch is
                      `isMyPublished`), so the label must be the OWNER's. */}
                  {statusLabel(resolveStatusFlow(task.category, catRows), task.worker_status, 'owner') || t('in_progress')}
                </span>
              </div>
            ) : (
              <button
                onClick={e => { e.stopPropagation(); navigate(`/create-task?repost=1&title=${encodeURIComponent(task.title||'')}&price=${task.base_price||task.price||''}&category=${categoryKeyForTask(task)}&city=${encodeURIComponent(task.city||'')}&location_name=${encodeURIComponent(task.location_name||'')}&approval_mode=${task.approval_mode||'manual'}`); }}
                style={{ width: '100%', height: 46, borderRadius: 14, background: 'var(--brand-primary-light)', border: '1.5px solid var(--border-2)', color: 'var(--brand-primary)', fontSize: 13.5, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, WebkitTapHighlightColor: 'transparent' }}
              >
                <RefreshCw size={14} /> {t('repost')}
              </button>
            )
          ) : (
            <>
              {task.created_by === currentUserId && (
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                  <button onClick={e => { e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); setShowMenu(v => !v); }} style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--surface-3)', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MoreVertical size={14} /></button>
                  {showMenu && (
                    <div onClick={e => { e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); }} style={{ position: 'absolute', bottom: 34, right: 0, background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: 10, boxShadow: 'var(--shadow-md)', zIndex: 1000, minWidth: 140, overflow: 'hidden' }}>
                      <button onClick={e => { e.stopPropagation(); setShowMenu(false); setShowCancelConfirm(true); }} style={{ width: '100%', textAlign: 'right', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 8 }}><Trash2 size={14} /> {t('delete_task')}</button>
                    </div>
                  )}
                </div>
              )}

              {!viewOnly && !hasActiveApp && task.created_by !== currentUserId && (
                <button
                  id={task._isFirstCard ? 'onboarding-apply-btn' : undefined}
                  onPointerDown={e => { e.stopPropagation(); setApplyPressed(true); }}
                  onPointerUp={e => { e.stopPropagation(); setApplyPressed(false); }}
                  onPointerLeave={() => setApplyPressed(false)}
                  onClick={e => {
                    e.stopPropagation();
                    const r = e.currentTarget.getBoundingClientRect();
                    setApplyBtnPos({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
                    if (!currentUserId) { setShowLoginPrompt(true); return; }
                    if (applyLocked) return;
                    // Verification gate: if task requires verified workers and user isn't verified,
                    // show the VerificationRequiredModal first (with a button to open the full KYC flow)
                    if (task.verification_required && !isUserVerified(me)) {
                      setShowVerificationRequired(true);
                      return;
                    }
                    setApplyLocked(true);
                    setShowApplyModal(true);
                    setTimeout(() => setApplyLocked(false), 600);
                  }}
                  disabled={applyLocked}
                  style={{
                    width: '100%', height: 46, borderRadius: 14,
                    background: 'var(--brand-btn-primary-bg, var(--brand-primary))',
                    color: 'var(--brand-btn-primary-text, #ffffff)',
                    border: 'none', fontSize: 14.5, fontWeight: 800,
                    cursor: applyLocked ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    opacity: applyLocked ? 0.65 : 1,
                    whiteSpace: 'nowrap', WebkitTapHighlightColor: 'transparent',
                    transform: applyPressed ? 'scale(0.98)' : 'scale(1)',
                    transition: 'transform 0.1s ease, opacity 0.15s',
                    boxShadow: applyPressed ? 'none' : '0 4px 14px rgba(26,111,212,0.24)',
                  }}
                >
                  {applyLocked ? <Loader2 size={16} className="animate-spin" /> : (
                    // The Joba cost of applying belongs to the live card only.
                    // The onboarding illustration passes hideApplyCost so the
                    // worker's first screen shows the ACTION, not a price list.
                    hideApplyCost ? (
                      <span>{t('apply')}</span>
                    ) : (
                      <>
                        <Send size={15} strokeWidth={2.2} />
                        <span>{t('apply')}</span>
                        <span style={{ fontSize: 11.5, fontWeight: 800, background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '2px 7px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          {Math.max(1, Math.round((currentPrice || 0) * 0.05))} <CreditIcon size={10} />
                        </span>
                      </>
                    )
                  )}
                </button>
              )}
            </>
          )}
        </div>

        {/* ── SECONDARY ACTION: the details, one quiet line at the bottom ──── */}
        <div style={{ paddingTop: 2, paddingBottom: 10 }} onClick={e => e.stopPropagation()}>
          <button
            onClick={e => { e.stopPropagation(); setShowDetails(v => !v); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              width: '100%', height: 34, background: 'none', border: 'none',
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 700 }}>
              {showDetails ? t('less') : t('more_details')}
            </span>
            {showDetails
              ? <ChevronUp size={13} color="var(--text-3)" />
              : <ChevronDown size={13} color="var(--text-3)" />}
          </button>
        </div>
        {showDetails && (
          <div style={{ borderTop: '1px solid var(--border-1)', paddingTop: 8, paddingBottom: 4 }} onClick={e => e.stopPropagation()}>
            <TaskDetailsRows task={displayTask} compact={true} />
          </div>
        )}
      </div>

      {showApplyModal && createPortal(
        <ApplySheet
          task={displayTask}
          loading={applySubmitting}
          onClose={() => setShowApplyModal(false)}
          onApply={handleApplySubmit}
        />,
        document.body
      )}

      {showCancelConfirm && createPortal(
        <CancelTaskConfirmModal
          task={task}
          isLoading={cancellingTask}
          onConfirm={handleCancelTask}
          onClose={() => setShowCancelConfirm(false)}
        />,
        document.body
      )}

      {showLoginPrompt && createPortal(
        <LoginPromptModal
          onLogin={() => { setShowLoginPrompt(false); base44.auth.redirectToLogin(window.location.href); }}
          onClose={() => setShowLoginPrompt(false)}
          type="apply"
          titleKey="login_title_apply_task"
        />,
        document.body
      )}

      {showBuyCredits && (
        <BuyCreditsModal
          creditsNeeded={neededCredits}
          onClose={() => setShowBuyCredits(false)}
        />
      )}

      {showVerifyModal && (
        <VerifyModal
          onClose={() => setShowVerifyModal(false)}
          onSuccess={() => {
            setShowVerifyModal(false);
            queryClient.invalidateQueries({ queryKey: ['me'] });
          }}
        />
      )}

      {showVerificationRequired && createPortal(
        <VerificationRequiredModal
          onClose={() => setShowVerificationRequired(false)}
          onVerify={() => {
            setShowVerificationRequired(false);
            setShowVerifyModal(true);
          }}
        />,
        document.body
      )}



      {lightboxOpen && (() => {
        const allMedia = [
          ...(task.images || []).map(url => ({ type: 'image', url })),
          ...(task.video_url ? [{ type: 'video', url: task.video_url }] : [])
        ];
        return (
          <MediaLightbox
            isOpen={lightboxOpen}
            items={allMedia}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxOpen(false)}
          />
        );
      })()}

      <style>{`
        @keyframes pulse-app { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes cardFadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes coinBadgePop { from{transform:scale(0.6);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes cardSuccessIn { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
        @keyframes successPop { from{transform:scale(0.5);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes scanRing { 0%,100%{transform:scale(1);opacity:0.5} 50%{transform:scale(1.35);opacity:0} }
        @keyframes scanSweep { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </>
  );
}

export default memo(TaskCard, (prev, next) => {
  // ══════════════════════════════════════════════════════════════════════════
  // WHY THIS COMPARATOR WAS WRONG, AND WHAT MAKES IT RIGHT
  //
  // It listed FIVE task fields by name, but the card renders roughly twenty-five
  // of them. A task whose title, photos, schedule, category, payment method or
  // client details changed therefore compared as "equal" and the card kept
  // showing the OLD data — a stale card with no error anywhere, which is exactly
  // the failure mode a hand-written field list always ends up having: the list
  // silently falls behind the markup.
  //
  // The fix is not a longer list. `updated_date` is the platform's own record
  // version and is written on every change to the record — verified against live
  // data (12 of 12 recent tasks had it ahead of created_date). Comparing it
  // covers every displayed field at once, so this can never fall behind the
  // markup again, and it costs one comparison instead of twenty-five.
  // ══════════════════════════════════════════════════════════════════════════
  if (prev.task.updated_date !== next.task.updated_date) return false;

  // ── The original field checks are KEPT, deliberately ──────────────────────
  // `updated_date` only moves when the SERVER writes the record. The feed also
  // patches the query cache optimistically on the client (status, price, worker
  // status, applicant count), and those patches never touch updated_date. These
  // five checks are what catch them, so removing them would have made optimistic
  // updates stop repainting.
  if (prev.task.id !== next.task.id) return false;
  if (prev.task.status !== next.task.status) return false;
  if (prev.task.price !== next.task.price) return false;
  if (prev.task.worker_status !== next.task.worker_status) return false;
  if ((prev.task.applicants?.length ?? 0) !== (next.task.applicants?.length ?? 0)) return false;

  // ── Decorations the FEED adds are not part of the record ──────────────────
  // Attached after the fetch, so they never move updated_date.
  if (prev.task._isFirstCard !== next.task._isFirstCard) return false;
  if (prev.task._distKm !== next.task._distKm) return false;

  // ── The props the card renders or acts on ─────────────────────────────────
  // `workerName` is shown on the card, so a renamed user must repaint it.
  // `viewOnly` gates the apply block, and `myApp.id` is what the cancel handler
  // operates on — a changed application id with an unchanged status would have
  // left the handler pointing at the old record.
  if (prev.currentUserId !== next.currentUserId) return false;
  if (prev.isMyPublished !== next.isMyPublished) return false;
  if (prev.hideApplyCost !== next.hideApplyCost) return false;
  if (prev.viewOnly !== next.viewOnly) return false;
  if (prev.workerName !== next.workerName) return false;
  if (prev.myApp?.id !== next.myApp?.id) return false;
  if (prev.myApp?.status !== next.myApp?.status) return false;

  // `badges` is a fresh object on every feed build, so comparing it by identity
  // would defeat memo entirely. It is compared by the flags the card renders.
  const b = prev.badges, n = next.badges;
  if (!!b !== !!n) return false;
  if (b && (
    b.isForYou !== n.isForYou ||
    b.isNew !== n.isNew ||
    b.isHighPay !== n.isHighPay ||
    b.isFunded !== n.isFunded ||
    b.isNearby !== n.isNearby
  )) return false;

  // Nothing that can affect this card changed — skip the re-render.
  return true;
});