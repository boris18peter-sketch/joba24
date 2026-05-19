import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Star, X, Send, Loader2, MoreVertical, Trash2, CheckCircle2 } from 'lucide-react';
import { getCategoryLabel } from '@/lib/categories';
import VerifiedBadge from '@/components/VerifiedBadge';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { calculateCurrentPrice } from '@/lib/priceCalculator';
import TaskBadges from '@/components/TaskBadges';
import CreditIcon from '@/components/CreditIcon';
import CancelTaskConfirmModal from '@/components/CancelTaskConfirmModal';
import LoginPromptModal from '@/components/LoginPromptModal';
import CoinFlyAnimation from '@/components/CoinFlyAnimation';

// ── Apply Modal — mobile optimized ──────────────────────────────────────────
function ApplyModal({ task, currentUserId, workerName, onClose, onApplied }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [coinFly, setCoinFly] = useState(false);
  const [creditsCharged, setCreditsCharged] = useState(null);
  const submitBtnRef = useRef(null);
  const submittedRef = useRef(false);

  const handleSubmit = async () => {
    if (loading || submittedRef.current) return;
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
        toast.error(`אין מספיק קרדיטים. כניסה למשימה: ${res.data.credits_required}`);
        submittedRef.current = false;
        setLoading(false);
        return;
      }
      // Coin fly + success animation
      const charged = res.data?.credits_charged || 0;
      setCreditsCharged(charged);
      setCoinFly(true);
      onApplied(res.data?.application);
      setTimeout(() => {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          toast.success(`הגשת בקשה! ${charged} קרדיטים נוכו`);
        }, 700);
      }, 400);
    } catch {
      submittedRef.current = false;
      setLoading(false);
      toast.error('שגיאה בשליחת הבקשה, נסה שוב');
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
          background: '#fafbff',
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
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 18px' }} />

        {/* Success state overlay */}
        {success && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.97)',
            borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10, zIndex: 10,
            animation: 'fadeInBackdrop 0.2s ease',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#dcfce7,#bbf7d0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'successPop 0.4s cubic-bezier(0.34,1.6,0.64,1)',
              boxShadow: '0 0 0 10px rgba(22,163,74,0.08)',
            }}>
              <CheckCircle2 size={34} color="#16a34a" />
            </div>
            <div style={{ fontSize: 19, fontWeight: 900, color: '#0f1e40' }}>הבקשה נשלחה!</div>
            {creditsCharged > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#b45309', fontWeight: 700, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 20, padding: '4px 12px', animation: 'coinBadgePop 0.4s 0.15s cubic-bezier(0.34,1.6,0.64,1) both' }}>
                <span>-{creditsCharged}</span>
                <svg viewBox="0 0 24 24" width="14" height="14"><circle cx="12" cy="12" r="11" fill="#fbbf24"/><text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="900" fontFamily="Inter,sans-serif" fill="#1a6fd4">J</text></svg>
                <span>קרדיטים</span>
              </div>
            )}
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>ממתין לאישור בעל הג'ובה</div>
          </div>
        )}
        <CoinFlyAnimation trigger={coinFly} count={Math.min(5, Math.max(1, creditsCharged || 2))} fromEl={submitBtnRef} onDone={() => setCoinFly(false)} />

        {/* Task summary */}
        <div style={{ background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', borderRadius: 16, padding: '14px 16px', marginBottom: 16, color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
            <span>עלות הגשה:</span>
            <span style={{ fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 3 }}>
              {Math.max(1, Math.round((task.price || 0) * 0.05))} <CreditIcon size={12} />
            </span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 2 }}>{task.title}</div>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>₪{task.price}</div>
        </div>

        {/* Message area */}
        <div style={{ background: '#eff6ff', borderRadius: 16, padding: 14, border: '1px solid #bfdbfe', marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f2b6b', margin: '0 0 8px' }}>
            הוסף הודעה (לא חובה)
          </p>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="לדוגמה: יש לי ניסיון, אני זמין להגיע מיד..."
            rows={3}
            style={{
              width: '100%', borderRadius: 10, border: '1px solid #bfdbfe',
              padding: '10px 12px', fontSize: 16, fontFamily: 'inherit', resize: 'none',
              outline: 'none', color: '#1a2540', background: 'white', boxSizing: 'border-box',
              lineHeight: 1.5,
            }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{ height: 52, padding: '0 18px', borderRadius: 14, background: 'white', border: '1px solid #dce8f5', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: 14, flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}
          >ביטול</button>
          <button
            ref={submitBtnRef}
            onClick={handleSubmit}
            disabled={loading || success}
            style={{
              flex: 1, height: 52, borderRadius: 14,
              background: success ? '#16a34a' : loading ? '#93b4d8' : 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
              border: 'none', fontSize: 15, fontWeight: 900, color: 'white',
              cursor: (loading || success) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: (loading || success) ? 'none' : '0 6px 20px rgba(26,111,212,0.35)',
              transition: 'background 0.2s, transform 0.1s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> :
             success ? <><CheckCircle2 size={18} /> נשלח!</> :
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

// ── TaskCard ──────────────────────────────────────────────────────────────────
export default function TaskCard({ task, myApp, currentUserId, workerName, badges }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [applyLocked, setApplyLocked] = useState(false);
  const [applyPressed, setApplyPressed] = useState(false); // micro feedback
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancellingTask, setCancellingTask] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Close menu on outside click
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
    if (cancelling || !myApp?.id) return;
    setCancelling(true);
    queryClient.setQueryData(['myApplicationsFeed', currentUserId], (old = []) =>
      old.map(a => a.id === myApp.id ? { ...a, status: 'cancelled' } : a)
    );
    queryClient.setQueryData(['myApp', task.id, currentUserId], null);
    try {
      // Refund credits
      const creditsToRefund = myApp?.credits_charged || 0;
      if (creditsToRefund > 0) {
        const freshUsers = await base44.entities.User.filter({ id: currentUserId });
        const freshMe = freshUsers[0];
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
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['creditTxns', currentUserId] });
      toast.success('הבקשה בוטלה והקרדיטים הוחזרו 🪙');
    } catch {
      queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed', currentUserId] });
      queryClient.setQueryData(['myApp', task.id, currentUserId], myApp);
      toast.error('שגיאה בביטול, נסה שוב');
    } finally {
      setCancelling(false);
    }
  };

  const handleApplied = (realApp) => {
    // Use the real server app record (or a safe fallback)
    const appRecord = realApp || { task_id: task.id, worker_id: currentUserId, status: 'pending', id: `opt_${task.id}` };
    queryClient.setQueryData(['myApplicationsFeed', currentUserId], (old = []) => {
      // Replace any existing record for this task, or append
      const without = old.filter(a => !(a.task_id === task.id && a.worker_id === currentUserId));
      return [...without, appRecord];
    });
    queryClient.setQueryData(['myApp', task.id, currentUserId], appRecord);
    // Hard sync from server to confirm
    queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed', currentUserId] });
    queryClient.invalidateQueries({ queryKey: ['myApp', task.id, currentUserId] });
    queryClient.invalidateQueries({ queryKey: ['applications', task.id] });
  };

  const handleCancelTask = async () => {
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
      setCancellingTask(false);
    }
  };

  const isApproved  = appStatus === 'approved';
  const isPending   = appStatus === 'pending';
  const currentPrice = calculateCurrentPrice(task);

  return (
    <>
      <div
        onClick={() => { if (showMenu) { setShowMenu(false); return; } navigate(`/task/${task.id}`); }}
        className="bg-white active:scale-[0.982] transition-all"
        style={{
          borderRadius: 16,
          border: isApproved ? '1.5px solid #16a34a' : isPending ? '1.5px solid #d97706' : '1px solid #e8edf5',
          boxShadow: '0 1px 6px rgba(15,43,107,0.06)',
          padding: '16px',
          cursor: 'pointer',
        }}
      >
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

        {/* Smart badges */}
        {badges && !hasActiveApp && <TaskBadges badges={badges} />}

        {/* Main content row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>

          {/* Left: title + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Title */}
            <h3 style={{ fontWeight: 700, color: '#0f1e40', fontSize: 15, lineHeight: 1.35, margin: '0 0 6px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {task.title}
            </h3>

            {/* Category chip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{catLabel}</span>
            </div>

            {/* Bottom meta: location + rating */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {task.location_name && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#94a3b8' }}>
                  <MapPin size={11} strokeWidth={1.8} />
                  <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.location_name}</span>
                </span>
              )}
              {task.client_name && (
                <span
                  onClick={e => { e.stopPropagation(); if (task.client_id) navigate(`/public-profile?id=${task.client_id}`); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#94a3b8', cursor: 'pointer' }}>
                  <Star size={10} style={{ fill: '#f59e0b', color: '#f59e0b' }} />
                  <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.client_rating > 0 ? `${task.client_rating.toFixed(1)} · ` : ''}{task.client_name}
                  </span>
                  {task.client_verified && <VerifiedBadge size="sm" />}
                </span>
              )}
            </div>
          </div>

          {/* Right: price + distance + CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>

            {/* Price — prominent */}
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 800, color: '#0f1e40', fontSize: 22, lineHeight: 1, letterSpacing: -0.5 }}>
                ₪{currentPrice}
              </div>
              {dist != null && !isNaN(dist) && (
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, marginTop: 3, display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
                  <Navigation size={10} strokeWidth={2} color="#1a6fd4" />
                  {dist < 1 ? `${Math.round(dist * 1000)}מ'` : `${dist.toFixed(1)}ק"מ`}
                </div>
              )}
            </div>

            {/* Owner menu */}
            {task.created_by === currentUserId && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={e => { e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); setShowMenu(v => !v); }}
                  style={{ width: 28, height: 28, borderRadius: 8, background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <MoreVertical size={14} />
                </button>
                {showMenu && (
                  <div onClick={e => { e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); }}
                    style={{ position: 'absolute', top: 32, right: 0, background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 1000, minWidth: 140, overflow: 'hidden' }}>
                    <button
                      onClick={e => { e.stopPropagation(); setShowMenu(false); setShowCancelConfirm(true); }}
                      style={{ width: '100%', textAlign: 'right', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Trash2 size={14} /> מחק משימה
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* CTA — apply button */}
            {!hasActiveApp && task.created_by !== currentUserId && (
              <button
                onPointerDown={e => { e.stopPropagation(); setApplyPressed(true); }}
                onPointerUp={e => { e.stopPropagation(); setApplyPressed(false); }}
                onPointerLeave={() => setApplyPressed(false)}
                onClick={e => {
                  e.stopPropagation();
                  if (!currentUserId) { setShowLoginPrompt(true); return; }
                  if (applyLocked) return;
                  setApplyLocked(true);
                  setShowApplyModal(true);
                  setTimeout(() => setApplyLocked(false), 600);
                }}
                disabled={applyLocked}
                style={{
                  height: 36, padding: '0 14px', borderRadius: 10,
                  background: '#1a6fd4',
                  border: 'none', color: 'white', fontSize: 12, fontWeight: 700,
                  cursor: applyLocked ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                  opacity: applyLocked ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                  WebkitTapHighlightColor: 'transparent',
                  transform: applyPressed ? 'scale(0.93)' : 'scale(1)',
                  transition: 'transform 0.1s ease, opacity 0.15s',
                  boxShadow: applyPressed ? 'none' : '0 3px 10px rgba(26,111,212,0.3)',
                }}
              >
                {applyLocked ? <Loader2 size={12} className="animate-spin" /> : (
                  <>
                    <Send size={11} strokeWidth={2} />
                    הגש
                    <span style={{ fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5, opacity: 0.85 }}>
                      {Math.max(1, Math.round((task.price || 0) * 0.05))} <CreditIcon size={10} />
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Description — single line, subtle */}
        {task.description && (
          <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 10, marginBottom: 0, lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
            {task.description}
          </p>
        )}
      </div>

      {showApplyModal && createPortal(
        <ApplyModal
          task={task}
          currentUserId={currentUserId}
          workerName={workerName}
          onClose={() => setShowApplyModal(false)}
          onApplied={handleApplied}
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

      <style>{`
        @keyframes pulse-app { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes cardFadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes coinBadgePop { from{transform:scale(0.6);opacity:0} to{transform:scale(1);opacity:1} }
      `}</style>
      </>
      );
      }