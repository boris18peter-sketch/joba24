import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Star, Send, Loader2, MoreVertical, Trash2, CheckCircle2, ChevronDown, ChevronUp, Play, Clock, Calendar, Banknote, Wrench, RefreshCw, Zap } from 'lucide-react';
import BoostOverlay from '@/components/BoostOverlay';
import MediaLightbox from '@/components/MediaLightbox';
import { WorkerPoolPill } from '@/components/WorkerPoolScanner';
import { getCategoryLabel } from '@/lib/categories';
import VerifiedBadge from '@/components/VerifiedBadge';
import UserBadge from '@/components/UserBadge';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { calculateCurrentPrice } from '@/lib/priceCalculator';
import CreditIcon from '@/components/CreditIcon';
import CancelTaskConfirmModal from '@/components/CancelTaskConfirmModal';
import LoginPromptModal from '@/components/LoginPromptModal';
import CoinFlyAnimation from '@/components/CoinFlyAnimation';
import BuyCreditsModal from '@/components/BuyCreditsModal';
import { parseDescription } from '@/lib/descriptionParser';
import TaskDetailsRows from '@/components/TaskDetailsRows.jsx';


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
        toast('כבר שלחת בקשה למשימה זו');
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
        toast.error('שגיאה בשליחת הבקשה, נסה שוב');
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
        dir="rtl"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--modal-bg)',
          borderRadius: '24px 24px 0 0',
          width: '100%', maxWidth: 480,
          boxShadow: '0 -16px 60px rgba(0,0,0,0.2)',
          padding: '12px 20px',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
          animation: 'slideUpModal 0.26s cubic-bezier(0.34,1.3,0.64,1)',
          maxHeight: '90dvh',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 18px' }} />

        <div style={{ background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', borderRadius: 16, padding: '14px 16px', marginBottom: 16, color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
            <span>עלות הגשה:</span>
            <span style={{ fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 3 }}>
              {Math.max(1, Math.round((calculateCurrentPrice(task) || 0) * 0.05))} <CreditIcon size={12} />
            </span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 2 }}>{task.title}</div>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>₪{Math.round(calculateCurrentPrice(task))}</div>
        </div>

        <div style={{ background: '#eff6ff', borderRadius: 16, padding: 14, border: '1px solid #bfdbfe', marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f2b6b', margin: '0 0 8px' }}>הוסף הודעה (לא חובה)</p>
          <textarea
            value={message}
            onChange={e => { setMessage(e.target.value); setMsgBlocked(false); }}
            placeholder="לדוגמה: יש לי ניסיון, אני זמין להגיע מיד..."
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
              <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>הודעה זו נחסמה — אנא שמור על שיח מכבד</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{ height: 52, padding: '0 18px', borderRadius: 14, background: 'white', border: '1px solid #dce8f5', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: 14, flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}
          >ביטול</button>
          <button
            ref={submitBtnRef}
            onClick={handleSubmit}
            disabled={loading}
            style={{
              flex: 1, height: 52, borderRadius: 14,
              background: loading ? '#93b4d8' : 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
              border: 'none', fontSize: 15, fontWeight: 900, color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: loading ? 'none' : '0 6px 20px rgba(26,111,212,0.35)',
              transition: 'background 0.2s, transform 0.1s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> :
             <><Send size={16} strokeWidth={1.8} /> שלח בקשה</>}
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

const SCANNING_TEXTS = [
  'מאותת לעובדים',
  'סורק עובדים',
  'מחפש התאמות',
  'מגביר חשיפה',
  'מפיץ את המשימה',
  'מרחיב חשיפה',
];

// ── Scanning Label (no applicants state) ─────────────────────────────────────
function ScanningLabel({ taskId }) {
  const [textIdx, setTextIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setTextIdx(i => (i + 1) % SCANNING_TEXTS.length);
        setVisible(true);
      }, 400);
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <span style={{ position: 'relative', width: 12, height: 12, flexShrink: 0 }}>
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.5)', animation: 'scanRing 1.4s ease-in-out infinite' }} />
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(rgba(255,255,255,0.6) 0deg, transparent 90deg, transparent 360deg)', animation: 'scanSweep 1.4s linear infinite' }} />
          <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 3, height: 3, borderRadius: '50%', background: 'white' }} />
        </span>
        <span style={{ fontSize: 12, fontWeight: 800, opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}>
          {SCANNING_TEXTS[textIdx]}
        </span>
      </span>
      <span style={{ fontSize: 10, opacity: 0.75, fontWeight: 500 }}>המשימה נחשפת לעובדים באזור</span>
    </span>
  );
}

// ── TaskCard ──────────────────────────────────────────────────────────────────
export default function TaskCard({ task, myApp, currentUserId, workerName, badges, viewOnly, isMyPublished }) {
  const navigate = useNavigate();
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
  const [coinFlyActive, setCoinFlyActive] = useState(false);
  const [coinFlyDir, setCoinFlyDir] = useState('debit');
  const [applyBtnPos, setApplyBtnPos] = useState(null);
  const cardRef = useRef(null);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [neededCredits, setNeededCredits] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [showBoostOverlay, setShowBoostOverlay] = useState(false);
  const [boostLoading, setBoostLoading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  // Live applicant count — initialised from TaskApplication entity to avoid stale task.applicants cache
  const [liveApplicantCount, setLiveApplicantCount] = useState(() => {
    // task.applicants may be stale; we'll refetch from DB shortly, but start with best guess
    return task.applicants?.length || 0;
  });
  const prevCountRef = useRef(liveApplicantCount);

  // Sync count when task.applicants prop updates (from real-time cache updates in HomeFeed)
  useEffect(() => {
    setLiveApplicantCount(task.applicants?.length || 0);
  }, [task.applicants?.length]);

  useEffect(() => {
    prevCountRef.current = liveApplicantCount;
  }, [liveApplicantCount]);

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
    queryClient.setQueryData(['myApplicationsFeed', currentUserId], (old = []) =>
      old.map(a => a.id === myApp.id ? { ...a, status: 'cancelled' } : a)
    );
    queryClient.setQueryData(['myApp', task.id, currentUserId], null);
    try {
      const creditsToRefund = myApp?.credits_charged || 0;
      if (creditsToRefund > 0) {
        const freshMe = await base44.auth.me();
        const currentCredits = freshMe?.worker_credits ?? 0;
        const newBalance = currentCredits + creditsToRefund;
        await base44.auth.updateMe({ worker_credits: newBalance });
        await base44.entities.CreditTransaction.create({
          user_id: currentUserId,
          amount: creditsToRefund,
          type: 'Refund_Rejection',
          task_id: task.id,
          balance_after: newBalance,
          note: `החזר קרדיטים - ביטול בקשה`,
        });
      }
      await base44.entities.TaskApplication.update(myApp.id, { status: 'cancelled' });
      queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['applications', task.id] });
      queryClient.invalidateQueries({ queryKey: ['myApp', task.id, currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['creditTxns', currentUserId] });
      if (cardRef.current) {
        const r = cardRef.current.getBoundingClientRect();
        setApplyBtnPos({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }
      setCoinFlyDir('credit');
      setCoinFlyActive(true);
      toast.success('הבקשה בוטלה והקרדיטים הוחזרו 🪙');
    } catch {
      queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed', currentUserId] });
      queryClient.setQueryData(['myApp', task.id, currentUserId], myApp);
      toast.error('שגיאה בביטול, נסה שוב');
    } finally {
      cancellingRef.current = false;
      setCancelling(false);
    }
  };

  const handleApplied = (realApp, creditsCharged = 0) => {
    setShowCardSuccess(true);
    setCardSuccessCredits(creditsCharged);
    setTimeout(() => setShowCardSuccess(false), 4000);
    setCoinFlyDir('debit');
    setCoinFlyActive(true);
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
      if (!res.data?.success) throw new Error('שגיאה בביטול');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasksPage'] });
      setShowCancelConfirm(false);
    } catch {
      toast.error('שגיאה בביטול, נסה שוב');
    } finally {
      cancelTaskRef.current = false;
      setCancellingTask(false);
    }
  };

  const isApproved  = appStatus === 'approved';
  const isPending   = appStatus === 'pending';
  const currentPrice = calculateCurrentPrice(task);

  // Boost availability check for card
  const boostAvailableCard = (() => {
    if (!isMyPublished || task.status !== 'OPEN') return false;
    const ageMs = Date.now() - new Date(task.created_date).getTime();
    if (ageMs < 60 * 60 * 1000) return false;
    if (task.worker_id) return false;
    if (task.last_boost_at) {
      const msSinceBoost = Date.now() - new Date(task.last_boost_at).getTime();
      if (msSinceBoost < 3 * 60 * 60 * 1000) return false;
    }
    return liveApplicantCount === 0;
  })();

  const handleBoostCard = async (e) => {
    e.stopPropagation();
    if (boostLoading) return;
    const freshMe = await base44.auth.me();
    const currentCredits = freshMe?.worker_credits ?? 0;
    if (currentCredits < 5) {
      toast.error('אין מספיק ג\'ובות — נדרשות 5');
      return;
    }
    setBoostLoading(true);
    const newBalance = currentCredits - 5;
    await base44.auth.updateMe({ worker_credits: newBalance });
    await base44.entities.CreditTransaction.create({ user_id: currentUserId, amount: -5, type: 'Application_Fee', task_id: task.id, task_title: task.title, balance_after: newBalance, note: 'Boost — איתות נוסף' });
    await base44.entities.Task.update(task.id, { last_boost_at: new Date().toISOString(), boost_count: (task.boost_count || 0) + 1 });
    queryClient.invalidateQueries({ queryKey: ['me'] });
    setBoostLoading(false);
    setShowBoostOverlay(true);
  };

  // Build badge labels (urgency handled separately)
  const badgeLabels = [];
  const isForYou = !hasActiveApp && badges?.isForYou;
  if (badges && !hasActiveApp) {
    if (badges.isNew)    badgeLabels.push('חדש');
    if (badges.isHighPay) badgeLabels.push('שכר גבוה');
    if (badges.isFunded)  badgeLabels.push('ממומן');
    if (badges.isNearby)  badgeLabels.push('קרוב אליך');
  }

  return (
    <>
      <div
        ref={cardRef}
        onClick={() => { if (showMenu) { setShowMenu(false); return; } navigate(`/task/${task.id}`); }}
        className="active:scale-[0.982] transition-all"
        style={{
          background: 'var(--surface-2)',
          borderRadius: 16,
          border: isApproved ? '1.5px solid #16a34a' : isPending ? '1.5px solid #d97706' : showCardSuccess ? '1.5px solid #16a34a' : '1px solid #e8edf5',
          boxShadow: '0 1px 6px rgba(15,43,107,0.06)',
          padding: '16px 16px 24px',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
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
              boxShadow: '0 0 0 8px rgba(22,163,74,0.1)',
              animation: 'successPop 0.4s cubic-bezier(0.34,1.6,0.64,1)',
            }}>
              <CheckCircle2 size={26} color="#16a34a" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#14532d' }}>הבקשה נשלחה!</div>
            {cardSuccessCredits > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#b45309', fontWeight: 700, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 20, padding: '3px 10px', animation: 'coinBadgePop 0.35s 0.15s cubic-bezier(0.34,1.6,0.64,1) both' }}>
                <span>-{cardSuccessCredits}</span>
                <svg viewBox="0 0 24 24" width="13" height="13"><circle cx="12" cy="12" r="11" fill="#fbbf24"/><text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="900" fontFamily="Inter,sans-serif" fill="#1a6fd4">J</text></svg>
                <span>קרדיטים</span>
              </div>
            )}
            <div style={{ fontSize: 11, color: '#16a34a' }}>ממתין לאישור</div>
          </div>
        )}

        {/* Approved banner */}
        {isApproved && (
          <div onClick={e => e.stopPropagation()} style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
            padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10,
            animation: 'cardFadeIn 0.3s ease',
          }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle2 size={16} color="#16a34a" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>הבקשה אושרה! ✅</div>
              <div style={{ fontSize: 11, color: '#16a34a', marginTop: 1 }}>לחץ לפרטים ולצאת לדרך</div>
            </div>
            <button onClick={e => { e.stopPropagation(); navigate(`/task/${task.id}`); }}
              className="btn-tap"
              style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', WebkitTapHighlightColor: 'transparent' }}>
              צא עכשיו
            </button>
          </div>
        )}

        {/* Pending banner */}
        {isPending && (
          <div onClick={e => e.stopPropagation()} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#d97706', display: 'inline-block', animation: 'pulse-app 1.5s infinite', flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#b45309' }}>ממתינה לאישור</div>
            <button onClick={handleCancelApp} disabled={cancelling}
              style={{ background: 'none', border: '1px solid #fde68a', borderRadius: 7, padding: '4px 10px', fontSize: 11, color: '#b45309', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
              {cancelling ? <Loader2 size={10} className="animate-spin" /> : 'בטל'}
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
                {liveApplicantCount} מועמדויות
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
                  פורסם {getRelativeTime(task.created_date)}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
          {/* Price + payment + distance */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap' }}>
              <span style={{ fontWeight: 800, color: 'var(--text-1)', fontSize: dist != null && !isNaN(dist) ? 17 : 20, lineHeight: 1, letterSpacing: -0.5, whiteSpace: 'nowrap' }}>₪{Math.round(currentPrice)}</span>
              {task.payment_method && <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500, whiteSpace: 'nowrap' }}>{task.payment_method === 'Cash' ? 'מזומן' : task.payment_method}</span>}
              {dist != null && !isNaN(dist) && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#1a6fd4', display: 'flex', alignItems: 'center', gap: 2, background: '#eff6ff', borderRadius: 8, padding: '2px 6px', whiteSpace: 'nowrap' }}>
                  <Navigation size={9} strokeWidth={2} color="#1a6fd4" />
                  {dist < 1 ? `${Math.round(dist * 1000)}מ'` : `${dist.toFixed(1)}ק"מ`}
                </span>
              )}
            </div>
            {isMyPublished && task.auto_bump_enabled && task.base_price && task.max_price && task.status === 'OPEN' && (
            <span style={{ fontSize: 10, color: liveApplicantCount > 0 ? '#059669' : '#b45309', fontWeight: 600 }}>
              📈 ₪{task.base_price} ← ₪{task.max_price}{liveApplicantCount > 0 ? ' · נעצר (יש בקשה)' : ' · נעצר כאשר יש בקשה'}
            </span>
            )}

          </div>
          {/* Right: owner controls or apply button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
            {isMyPublished ? (
              // Owner management controls
              task.status === 'OPEN' ? (
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/task/${task.id}`); }}
                  style={{ minWidth: 120, height: 42, padding: '0 14px', borderRadius: 10, background: liveApplicantCount > 0 ? 'linear-gradient(135deg,#f59e0b,#d97706)' : '#1a6fd4', border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, boxShadow: '0 3px 10px rgba(0,0,0,0.12)', WebkitTapHighlightColor: 'transparent', whiteSpace: 'nowrap' }}
                >
                  {liveApplicantCount > 0 ? (
                    <>
                      <span>צפה במועמדים</span>
                      <span style={{ background: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: 900, borderRadius: 8, padding: '1px 7px' }}>{liveApplicantCount}</span>
                    </>
                  ) : (
                    <ScanningLabel taskId={task.id} />
                  )}
                </button>
              ) : task.status === 'TAKEN' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '5px 10px', fontSize: 11, fontWeight: 700, color: '#b45309', maxWidth: 160 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', flexShrink: 0, animation: 'pulse-app 1.5s infinite', display: 'inline-block' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.worker_status === 'on_the_way' ? 'בדרך אליך' : task.worker_status === 'arrived' ? 'הגיע לשטח' : task.worker_status === 'done' ? 'ממתין לאישורך' : 'בעבודה'}
                  </span>
                </div>
              ) : (
                <button onClick={e => { e.stopPropagation(); navigate(`/create-task?repost=1&title=${encodeURIComponent(task.title||'')}&price=${task.base_price||task.price||''}&category=${task.category||''}&city=${encodeURIComponent(task.city||'')}&location_name=${encodeURIComponent(task.location_name||'')}&estimated_time=${task.estimated_time||''}&approval_mode=${task.approval_mode||'manual'}`); }} style={{ height: 32, padding: '0 12px', borderRadius: 8, background: '#eff6ff', border: '1.5px solid #bfdbfe', color: '#1d4ed8', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, WebkitTapHighlightColor: 'transparent' }}>
                  <RefreshCw size={11} /> פרסם שוב
                </button>
              )
            ) : null}
            {/* Boost button on card — purple, only when eligible */}
            {boostAvailableCard && (
              <button
                onClick={handleBoostCard}
                disabled={boostLoading}
                style={{ minWidth: 120, height: 30, borderRadius: 8, background: boostLoading ? '#a78bfa' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', border: 'none', color: 'white', fontSize: 11, fontWeight: 800, cursor: boostLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, boxShadow: '0 2px 10px rgba(124,58,237,0.4)', WebkitTapHighlightColor: 'transparent' }}>
                {boostLoading ? <Loader2 size={10} className="animate-spin" /> : <><Zap size={10} /> שגר איתות · 5 ג'ובות</>}
              </button>
            )}

            {isMyPublished && (
              <div style={{ minWidth: 120, display: 'flex', justifyContent: 'space-around', fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap', paddingTop: 2 }}>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <strong style={{ color: '#64748b', fontSize: 12 }}>{task.views_count || 0}</strong>
                  <span>צפיות</span>
                </span>
                <span style={{ color: '#e2e8f0' }}>|</span>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <strong style={{ color: '#64748b', fontSize: 12 }}>{task.clicks_count || 0}</strong>
                  <span>כניסות</span>
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
                        <button onClick={e => { e.stopPropagation(); setShowMenu(false); setShowCancelConfirm(true); }} style={{ width: '100%', textAlign: 'right', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}><Trash2 size={14} /> מחק משימה</button>
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
                    style={{ height: 36, padding: '0 14px', borderRadius: 10, background: '#1a6fd4', border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: applyLocked ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, opacity: applyLocked ? 0.6 : 1, whiteSpace: 'nowrap', WebkitTapHighlightColor: 'transparent', transform: applyPressed ? 'scale(0.93)' : 'scale(1)', transition: 'transform 0.1s ease, opacity 0.15s', boxShadow: applyPressed ? 'none' : '0 3px 10px rgba(26,111,212,0.3)' }}
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

        {/* Details dropdown — compact arrow only */}
        <div style={{ position: 'absolute', bottom: 8, left: 8 }}>
          <button
            onClick={e => { e.stopPropagation(); setShowDetails(v => !v); }}
            style={{ width: 24, height: 24, borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent', flexShrink: 0 }}
          >
            {showDetails ? <ChevronUp size={12} color="#94a3b8" /> : <ChevronDown size={12} color="#94a3b8" />}
          </button>
        </div>
        {showDetails && (
          <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 4, paddingTop: 8, paddingBottom: 4 }} onClick={e => e.stopPropagation()}>
            <TaskDetailsRows task={task} compact={true} />
            {isMyPublished && liveApplicantCount === 0 && task.status === 'OPEN' && task.city && task.category && (
              <div style={{ marginTop: 8 }}>
                <WorkerPoolPill category={task.category} city={task.city} />
              </div>
            )}
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

      {showBoostOverlay && (
        <BoostOverlay
          taskId={task.id}
          taskTitle={task.title}
          taskPrice={task.price}
          taskCategory={task.category}
          onDismiss={() => setShowBoostOverlay(false)}
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

      <CoinFlyAnimation
        trigger={coinFlyActive}
        count={8}
        direction={coinFlyDir}
        toPos={coinFlyDir === 'debit' ? applyBtnPos : undefined}
        fromPos={coinFlyDir === 'credit' ? applyBtnPos : undefined}
        onDone={() => setCoinFlyActive(false)}
      />

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