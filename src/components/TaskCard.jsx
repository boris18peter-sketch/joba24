import { useState, useRef, useEffect, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Star, Send, Loader2, MoreVertical, Trash2, CheckCircle2, ChevronDown, ChevronUp, Play, Clock, Calendar, Banknote, Wrench, RefreshCw, Zap, ShieldCheck, X } from 'lucide-react';
import BoostOverlay from '@/components/BoostOverlay';
import MediaLightbox from '@/components/MediaLightbox';
import { WorkerPoolPill } from '@/components/WorkerPoolScanner';
import { getCategoryLabel } from '@/lib/categories';
import VerifiedBadge from '@/components/VerifiedBadge';
import UserBadge from '@/components/UserBadge';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { calculateCurrentPrice, getHourlyBreakdown, formatHoursLabel, formatHourlySublabel } from '@/lib/priceCalculator';
import CreditIcon from '@/components/CreditIcon';
import CancelTaskConfirmModal from '@/components/CancelTaskConfirmModal';
import LoginPromptModal from '@/components/LoginPromptModal';
import BuyCreditsModal from '@/components/BuyCreditsModal';
import { parseDescription } from '@/lib/descriptionParser';
import TaskDetailsRows from '@/components/TaskDetailsRows.jsx';
import BoostPill from '@/components/BoostPill';
import { useLanguage } from '@/lib/LanguageContext';
import { useTaskSheet } from '@/lib/TaskSheetContext';


function normalizeDate(d) {
  const s = String(d);
  // If ISO string has no timezone info, treat as UTC
  if (s.includes('T') && !s.endsWith('Z') && !s.includes('+') && !/[0-9]{2}:[0-9]{2}$/.test(s.slice(-5))) return s + 'Z';
  return s;
}

function getRelativeTime(date) {
  if (!date) return null;
  const ms = Date.now() - new Date(normalizeDate(date)).getTime();
  if (ms < 0) return 'עכשיו';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'עכשיו';
  if (minutes < 60) return `לפני ${minutes} דקות`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `לפני ${hours} שעות`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `לפני ${days} ימים`;
  return null;
}

const URGENCY_TAG_CONFIG = {
  immediate: { emoji: '🔥', label: 'דחוף', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  few_hours: { emoji: '⏰', label: 'שעות הקרובות', color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' },
  evening:   { emoji: '🌅', label: 'לקראת הערב', color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' },
  flexible:  { emoji: '😌', label: 'לא לחוץ', color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' },
};

// ── Apply Modal ──────────────────────────────────────────────────────────────
function ApplyModal({ task, currentUserId, workerName, onClose, onApplied, onInsufficientCredits }) {
  const { t, isRTL } = useLanguage();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [msgBlocked, setMsgBlocked] = useState(false);
  const submitBtnRef = useRef(null);
  const submittedRef = useRef(false);

  const handleSubmit = async () => {
    if (loading || submittedRef.current) return;
    // Moderation check on message
    if (message.trim().length > 3) {
      const { moderateText } = await import('@/hooks/useModeration');
      const mod = await moderateText(message.trim());
      if (mod.flagged) {
        setMsgBlocked(true);
        setTimeout(() => setMsgBlocked(false), 4000);
        return;
      }
    }
    submittedRef.current = true;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('applyForTask', {
        taskId: task.id,
        message: message.trim(),
      });
      if (res.data?.error === 'already_applied') {
        toast(t('already_applied'));
        onClose();
        return;
      }
      if (res.data?.error === 'insufficient_credits') {
        submittedRef.current = false;
        setLoading(false);
        onClose();
        onInsufficientCredits?.(res.data.credits_required);
        return;
      }
      const charged = res.data?.credits_charged || 0;
      onApplied(res.data?.application, charged);
      setTimeout(() => onClose(), 120);
    } catch (err) {
      submittedRef.current = false;
      setLoading(false);
      const errData = err?.response?.data;
      if (errData?.error === 'insufficient_credits') {
        onClose();
        onInsufficientCredits?.(errData.credits_required);
      } else {
        toast.error(t('error_sending_app'));
      }
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(5,15,40,0.55)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(6px)',
        animation: 'fadeInBackdrop 0.18s ease',
        touchAction: 'none',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--sheet-bg)',
          borderRadius: 'var(--r-2xl) var(--r-2xl) 0 0',
          width: '100%', maxWidth: 480,
          boxShadow: 'var(--shadow-xl)',
          padding: '12px 20px',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
          animation: 'sheetSlideUp 0.3s cubic-bezier(0.32,1.2,0.64,1)',
          maxHeight: '90dvh',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 18px' }} />

        <div style={{ background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', borderRadius: 16, padding: '14px 16px', marginBottom: 16, color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
            <span>{t('application_cost')}</span>
            <span style={{ fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 3 }}>
              {Math.max(1, Math.round((calculateCurrentPrice(task) || 0) * 0.05))} <CreditIcon size={12} />
            </span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 2 }}>{task.title}</div>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>₪{Math.round(calculateCurrentPrice(task))}</div>
          {(() => { const sub = formatHourlySublabel(task); return sub ? <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{sub}</div> : null; })()}
        </div>

        {/* Credit refund explanation */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '12px 14px', marginBottom: 14, fontSize: 12, color: '#166534', fontWeight: 600, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>💡 איך עובדים הקרדיטים?</div>
          הקרדיטים מופרדים בעת ההגשה אך <strong>מוחזרים אוטומטית</strong> אם:<br />
          • הבקשה שלך לא אושרה על ידי המפרסם<br />
          • המשימה בוטלה או פג תוקפה<br />
          • נבחר עובד אחר לביצוע המשימה<br />
          <strong>התשלום בפועל נספר רק אם תבצע את המשימה והיא תאושר.</strong>
        </div>

        <div style={{ background: '#eff6ff', borderRadius: 16, padding: 14, border: '1px solid #bfdbfe', marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f2b6b', margin: '0 0 8px' }}>{t('add_message')}</p>
          <textarea
            value={message}
            onChange={e => { setMessage(e.target.value); setMsgBlocked(false); }}
            placeholder={t('message_placeholder')}
            rows={3}
            style={{
              width: '100%', borderRadius: 10, border: `1px solid ${msgBlocked ? '#fca5a5' : '#bfdbfe'}`,
              padding: '10px 12px', fontSize: 16, fontFamily: 'inherit', resize: 'none',
              outline: 'none', color: '#1a2540', background: 'white', boxSizing: 'border-box',
              lineHeight: 1.5,
            }}
          />
          {msgBlocked && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '7px 10px' }}>
              <span style={{ fontSize: 13 }}>🛡️</span>
              <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{t('message_blocked')}</span>
            </div>
          )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{ height: 52, padding: '0 18px', borderRadius: 'var(--r-md)', background: 'var(--surface-3)', border: '1px solid var(--border-1)', color: 'var(--text-2)', fontWeight: 700, cursor: 'pointer', fontSize: 14, flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}
          >{t('cancel_btn')}</button>
          <button
            ref={submitBtnRef}
            onClick={handleSubmit}
            disabled={loading}
            style={{
              flex: 1, height: 52, borderRadius: 'var(--r-md)',
              background: loading ? '#93b4d8' : 'linear-gradient(135deg,var(--brand-primary),var(--brand-primary-dark))',
              border: 'none', fontSize: 15, fontWeight: 900, color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: loading ? 'none' : 'var(--shadow-md)',
              transition: 'background 0.2s, transform 0.1s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> :
             <><Send size={16} strokeWidth={1.8} /> {t('send_application')}</>}
          </button>
          </div>
      </div>

      <style>{`
        @keyframes fadeInBackdrop { from{opacity:0} to{opacity:1} }
        @keyframes slideUpModal { from{transform:translateY(50px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes successPop { from{transform:scale(0.5);opacity:0} to{transform:scale(1);opacity:1} }
      `}</style>
    </div>
  );
}

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
function TaskCard({ task, myApp, currentUserId, workerName, badges, viewOnly, isMyPublished }) {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { openTaskSheet } = useTaskSheet();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const cancellingRef = useRef(false); // hard guard — survives re-renders
  const cancelTaskRef = useRef(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
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

  const catLabel = getCategoryLabel(task.category);
  const dist = task._distKm;
  const appStatus = myApp?.status;
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
      queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success(t('cancelled_credits_returned') || 'הבקשה בוטלה והקרדיטים הוחזרו 🪙');
    } catch {
      // Rollback optimistic update
      queryClient.setQueryData(['myApp', task.id, currentUserId], myApp);
      queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed', currentUserId] });
      toast.error(t('error_cancelling') || 'שגיאה בביטול, נסה שוב');
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
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const handleCancelTask = async () => {
    if (cancelTaskRef.current) return;
    cancelTaskRef.current = true;
    setCancellingTask(true);
    try {
      const res = await base44.functions.invoke('cancelTaskPayment', { taskId: task.id });
      if (!res.data?.success) throw new Error(t('error_cancelling') || 'שגיאה בביטול');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasksPage'] });
      setShowCancelConfirm(false);
    } catch {
      toast.error(t('error_cancelling') || 'שגיאה בביטול, נסה שוב');
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



  // Build badge labels (urgency handled separately)
  const badgeLabels = [];
  const isForYou = !hasActiveApp && badges?.isForYou;
  if (badges && !hasActiveApp) {
    if (badges.isNew)    badgeLabels.push(t('new_tag'));
    if (badges.isHighPay) badgeLabels.push(t('high_pay_tag'));
    if (badges.isFunded)  badgeLabels.push(t('funded_tag'));
    if (badges.isNearby)  badgeLabels.push(t('nearby_tag'));
  }

  return (
    <>
      <div
        ref={cardRef}
        onClick={() => { if (showMenu) { setShowMenu(false); return; } openTaskSheet(task.id); }}
        className="j-task-card"
        style={{
          background: 'var(--surface-2)',
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
        {/* Verification required ribbon — green strip on top of card */}
        {task.verification_required && (
          <div style={{
            position: 'absolute', top: 0, right: 0, left: 0,
            background: 'linear-gradient(135deg, #16a34a, #059669)',
            color: 'white', fontSize: 10, fontWeight: 800,
            padding: '4px 14px', display: 'flex', alignItems: 'center', gap: 5,
            zIndex: 5, letterSpacing: 0.3,
          }}>
            <ShieldCheck size={11} /> דרוש ווי ירוק · רק משתמשים מאומתים
          </div>
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
                 <span>-{cardSuccessCredits}</span>
                 <svg viewBox="0 0 24 24" width="13" height="13"><circle cx="12" cy="12" r="11" fill="#fbbf24"/><text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="900" fontFamily="Inter,sans-serif" fill="#1a6fd4">J</text></svg>
                 <span>{t('credits')}</span>
               </div>
             )}
             <div style={{ fontSize: 11, color: '#16a34a' }}>{t('waiting_approval_short')}</div>
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
             <button onClick={e => { e.stopPropagation(); openTaskSheet(task.id); }}
               className="btn-tap"
               style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', WebkitTapHighlightColor: 'transparent' }}>
               {t('go_now')}
             </button>
           </div>
         )}

         {/* Pending banner */}
         {isPending && (
           <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', borderRadius: 'var(--r-sm)', padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
             <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#d97706', display: 'inline-block', animation: 'pulse-app 1.5s infinite', flexShrink: 0 }} />
             <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#b45309' }}>{t('waiting_approval_short')}</div>
             <button onClick={handleCancelApp} disabled={cancelling}
               style={{ background: 'none', border: '1px solid #fde68a', borderRadius: 7, padding: '4px 10px', fontSize: 11, color: '#b45309', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
               {cancelling ? <Loader2 size={10} className="animate-spin" /> : t('cancel_btn')}
             </button>
           </div>
         )}

        {/* Card Header: tags (right in RTL = first child) + applicant count (left = second child) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          {/* First child = RIGHT side in RTL: all tags */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {task.urgency_tag && URGENCY_TAG_CONFIG[task.urgency_tag] && (() => {
              const tag = URGENCY_TAG_CONFIG[task.urgency_tag];
              return (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: tag.bg, color: tag.color, border: `1px solid ${tag.border}`, whiteSpace: 'nowrap' }}>
                  {tag.emoji} {tag.label}
                </span>
              );
            })()}
            {task.scheduled_time && (() => {
              const raw = String(task.scheduled_time);
              const sDate = new Date(raw.includes('T') && !raw.endsWith('Z') && !raw.includes('+') ? raw + 'Z' : raw);
              if (isNaN(sDate.getTime())) return null;
              const now = new Date();
              const isToday = sDate.toDateString() === now.toDateString();
              const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
              const isTomorrow = sDate.toDateString() === tomorrow.toDateString();
              const timeStr = sDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
              let label;
              if (isToday) label = `היום ${timeStr}`;
              else if (isTomorrow) label = `מחר ${timeStr}`;
              else label = sDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }) + ' ' + timeStr;
              const slotCount = Array.isArray(task.category_details?.schedule) ? task.category_details.schedule.length : 0;
              return (
                <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 20, background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', color: '#1a6fd4', border: '1px solid #93c5fd', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  📅 {label}{slotCount > 1 ? ` · ${slotCount} מועדים` : ''}
                </span>
              );
            })()}
            {badgeLabels.slice(0, 1).map((label, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            ))}
          </div>
          {/* Second child = LEFT side in RTL: For You badge + applicant count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isForYou && (
              <span style={{
                fontSize: 10, fontWeight: 800,
                padding: '2px 8px', borderRadius: 6,
                background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                color: 'white',
                display: 'inline-flex', alignItems: 'center', gap: 3,
                boxShadow: '0 2px 6px rgba(245,158,11,0.45)',
                whiteSpace: 'nowrap',
                letterSpacing: 0.1,
                border: '1px solid rgba(255,255,255,0.25)',
              }}>
                ✦ For You
              </span>
            )}
            {task.status === 'OPEN' && liveApplicantCount > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700,
                padding: '2px 8px', borderRadius: 20,
                background: '#fffbeb', border: '1px solid #fde68a',
                color: '#92400e',
                display: 'inline-flex', alignItems: 'center', gap: 4,
                whiteSpace: 'nowrap',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', animation: 'pulse-app 1.5s infinite', flexShrink: 0 }} />
                {liveApplicantCount} {t('applications_count')}
              </span>
            )}

          </div>
        </div>

        {/* Card Body: title + description + meta + media */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 15, lineHeight: 1.35, margin: '0 0 4px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {task.title}
              </h3>
              {task.description && (
                <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 4px', lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                  {parseDescription(task.description).mainDescription}
                </p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#94a3b8', flexWrap: 'wrap' }}>
                {task.location_name && (
                  <><MapPin size={10} strokeWidth={1.8} />
                  <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.location_name}</span></>
                )}
                {task.client_name && (
                  task.client_id === currentUserId ? (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#1a6fd4', background: '#eff6ff', borderRadius: 20, padding: '1px 6px' }}>אני</span>
                  ) : (
                    <UserBadge
                      name={task.client_name}
                      userId={task.client_id}
                      verified={task.client_verified}
                      rating={task.client_rating}
                    />
                  )
                )}
              </div>
              {task.created_date && getRelativeTime(task.created_date) && (
                <div style={{ fontSize: 10, color: '#b0bac8', marginTop: 4 }}>
                  {t('posted')} {getRelativeTime(task.created_date)}
                </div>
              )}
            </div>
            {/* Media thumbnail — opens lightbox */}
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
                  style={{ width: 78, height: 72, flexShrink: 0, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-1)', position: 'relative', background: '#000', cursor: 'pointer' }}
                >
                  {cur.type === 'image' ? (
                    <img src={cur.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      <video src={cur.url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                        <Play size={16} color="white" fill="white" />
                      </div>
                    </div>
                  )}
                  {allMedia.length > 1 && (
                    <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.55)', borderRadius: 6, padding: '1px 5px', fontSize: 9, color: 'white', fontWeight: 700 }}>
                      +{allMedia.length - 1}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Card Footer: price + apply */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border-1)' }}>
          {/* Price + payment + distance */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap' }}>
              <span style={{ fontWeight: 800, color: 'var(--text-1)', fontSize: 20, lineHeight: 1, letterSpacing: -0.5, whiteSpace: 'nowrap' }}>₪{Math.round(currentPrice)}</span>
              {task.payment_method && <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500, whiteSpace: 'nowrap' }}>{task.payment_method === 'Cash' ? 'מזומן' : task.payment_method}</span>}
            </div>
            {hourlyBreakdown && (
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{formatHourlySublabel(task)}</span>
            )}
            {dist != null && !isNaN(dist) && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1a6fd4', display: 'inline-flex', alignItems: 'center', gap: 2, background: '#eff6ff', borderRadius: 8, padding: '2px 6px', whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>
                <Navigation size={9} strokeWidth={2} color="#1a6fd4" />
                {dist < 1 ? `${Math.round(dist * 1000)}מ'` : `${dist.toFixed(1)}ק"מ`}
              </span>
            )}
            <div style={{ display: 'none' }}>
            </div>
            {isMyPublished && task.auto_bump_enabled && task.base_price && task.max_price && task.status === 'OPEN' && (
             <span style={{ fontSize: 10, color: liveApplicantCount > 0 ? '#059669' : '#b45309', fontWeight: 600 }}>
               📈 ₪{task.base_price} ← ₪{task.max_price}{liveApplicantCount > 0 ? ` · ${t('auto_bump_active')}` : ` · ${t('auto_bump_desc')}`}
             </span>
             )}

          </div>
          {/* Right: owner controls or apply button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
            {isMyPublished ? (
              // Owner management controls — boost pill inline with button
              task.status === 'OPEN' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {boostAvailableCard && <BoostPill task={task} size="sm" onBoostDone={() => { queryClient.invalidateQueries({ queryKey: ['me'] }); queryClient.invalidateQueries({ queryKey: ['tasks'] }); }} />}
                  <button
                   onClick={e => { e.stopPropagation(); openTaskSheet(task.id); }}
                   style={{ minWidth: 110, height: 42, padding: '0 14px', borderRadius: 'var(--r-sm)', background: liveApplicantCount > 0 ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'var(--brand-primary)', border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, boxShadow: 'var(--shadow-sm)', WebkitTapHighlightColor: 'transparent', whiteSpace: 'nowrap' }}
                  >
                    {liveApplicantCount > 0 ? (
                       <>
                         <span>{t('view_applicants')}</span>
                         <span style={{ background: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: 900, borderRadius: 8, padding: '1px 7px' }}>{liveApplicantCount}</span>
                       </>
                     ) : (
                       <ScanningLabel taskId={task.id} />
                     )}
                  </button>
                </div>
              ) : task.status === 'TAKEN' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '5px 10px', fontSize: 11, fontWeight: 700, color: '#b45309', maxWidth: 160 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', flexShrink: 0, animation: 'pulse-app 1.5s infinite', display: 'inline-block' }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.worker_status === 'on_the_way' ? t('on_the_way') : task.worker_status === 'delayed' ? t('delayed') : task.worker_status === 'parking' ? t('parking') : task.worker_status === 'arrived' ? t('arrived') : task.worker_status === 'starting' ? t('starting') : task.worker_status === 'finishing' ? t('finishing') : task.worker_status === 'done' ? t('done_waiting') : t('in_progress')}
                    </span>
                  </div>
              ) : (
                <button onClick={e => { e.stopPropagation(); navigate(`/create-task?repost=1&title=${encodeURIComponent(task.title||'')}&price=${task.base_price||task.price||''}&category=${task.category||''}&city=${encodeURIComponent(task.city||'')}&location_name=${encodeURIComponent(task.location_name||'')}&approval_mode=${task.approval_mode||'manual'}`); }} style={{ height: 32, padding: '0 12px', borderRadius: 8, background: 'var(--brand-primary-light)', border: '1.5px solid #bfdbfe', color: 'var(--brand-primary)', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, WebkitTapHighlightColor: 'transparent' }}>
                   <RefreshCw size={11} /> {t('repost')}
                 </button>
              )
            ) : null}

            {isMyPublished && (
              <div style={{ minWidth: 120, display: 'flex', justifyContent: 'space-around', fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap', paddingTop: 2 }}>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <strong style={{ color: '#64748b', fontSize: 12 }}>{task.views_count || 0}</strong>
                  <span>{t('views')}</span>
                </span>
                <span style={{ color: '#e2e8f0' }}>|</span>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <strong style={{ color: '#64748b', fontSize: 12 }}>{task.clicks_count || 0}</strong>
                  <span>{t('clicks')}</span>
                </span>
              </div>
            )}
            {!isMyPublished && (
              <>
                {task.created_by === currentUserId && (
                  <div style={{ position: 'relative' }}>
                    <button onClick={e => { e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); setShowMenu(v => !v); }} style={{ width: 28, height: 28, borderRadius: 8, background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MoreVertical size={14} /></button>
                    {showMenu && (
                      <div onClick={e => { e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); }} style={{ position: 'absolute', bottom: 32, right: 0, background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 1000, minWidth: 140, overflow: 'hidden' }}>
                        <button onClick={e => { e.stopPropagation(); setShowMenu(false); setShowCancelConfirm(true); }} style={{ width: '100%', textAlign: 'right', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}><Trash2 size={14} /> {t('delete_task')}</button>
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
                      setApplyLocked(true);
                      setShowApplyModal(true);
                      setTimeout(() => setApplyLocked(false), 600);
                    }}
                    disabled={applyLocked}
                    style={{ height: 36, padding: '0 14px', borderRadius: 'var(--r-sm)', background: 'var(--brand-primary)', border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: applyLocked ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, opacity: applyLocked ? 0.6 : 1, whiteSpace: 'nowrap', WebkitTapHighlightColor: 'transparent', transform: applyPressed ? 'scale(0.93)' : 'scale(1)', transition: 'transform 0.1s ease, opacity 0.15s', boxShadow: applyPressed ? 'none' : 'var(--shadow-sm)' }}
                  >
                    {applyLocked ? <Loader2 size={12} className="animate-spin" /> : (
                      <><span>הגש מועמדות</span><span style={{ fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5, opacity: 0.85 }}>{Math.max(1, Math.round((currentPrice || 0) * 0.05))} <CreditIcon size={10} /></span></>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Details toggle — clean, natural footer */}
        <div style={{ paddingBottom: 10 }} onClick={e => e.stopPropagation()}>
          <button
            onClick={e => { e.stopPropagation(); setShowDetails(v => !v); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              width: '100%', height: 30, background: 'none', border: 'none',
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>
              {showDetails ? t('less') : t('details')}
            </span>
            {showDetails
              ? <ChevronUp size={12} color="var(--text-3)" />
              : <ChevronDown size={12} color="var(--text-3)" />}
          </button>
        </div>
        {showDetails && (
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 8, paddingBottom: 4 }} onClick={e => e.stopPropagation()}>
            <TaskDetailsRows task={task} compact={true} />


          </div>
        )}
      </div>

      {showApplyModal && createPortal(
        <ApplyModal
          task={task}
          currentUserId={currentUserId}
          workerName={workerName}
          onClose={() => setShowApplyModal(false)}
          onApplied={handleApplied}
          onInsufficientCredits={(req) => { setNeededCredits(req); setShowBuyCredits(true); }}
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
        />,
        document.body
      )}

      {showBuyCredits && (
        <BuyCreditsModal
          creditsNeeded={neededCredits}
          onClose={() => setShowBuyCredits(false)}
        />
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
  return (
    prev.task.id === next.task.id &&
    prev.task.status === next.task.status &&
    prev.task.price === next.task.price &&
    prev.task.worker_status === next.task.worker_status &&
    (prev.task.applicants?.length ?? 0) === (next.task.applicants?.length ?? 0) &&
    prev.myApp?.status === next.myApp?.status &&
    prev.currentUserId === next.currentUserId &&
    prev.isMyPublished === next.isMyPublished
  );
});