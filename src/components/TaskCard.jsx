import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Star, X, Send, Loader2, MoreVertical, Trash2, LogIn } from 'lucide-react';
import { getCategoryLabel } from '@/lib/categories';
import VerifiedBadge from '@/components/VerifiedBadge';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { calculateCurrentPrice } from '@/lib/priceCalculator';
import TaskBadges from '@/components/TaskBadges';
import CreditIcon from '@/components/CreditIcon';
import CancelTaskConfirmModal from '@/components/CancelTaskConfirmModal';
import LoginPromptModal from '@/components/LoginPromptModal';

// ── Apply Modal — full screen, professional ───────────────────────────────────
function ApplyModal({ task, currentUserId, workerName, onClose, onApplied }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const submittedRef = useRef(false);

  const handleSubmit = async () => {
    // Hard lock: ignore if already submitted or loading
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
      onApplied(res.data?.application);
      onClose();
      toast.success(`הגשת בקשה למשימה: ${res.data?.credits_charged} קרדיטים נוכו`);
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
        animation: 'fadeInBackdrop 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        dir="rtl"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fafbff',
          borderRadius: '28px 28px 0 0',
          width: '100%', maxWidth: 480,
          boxShadow: '0 -16px 60px rgba(0,0,0,0.2)',
          padding: '12px 20px 40px',
          animation: 'slideUpModal 0.28s cubic-bezier(0.34,1.4,0.64,1)',
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 20px' }} />

        {/* Task summary */}
        <div style={{ background: '#1a6fd4', borderRadius: 18, padding: '16px 18px', marginBottom: 18, color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
            <span>הגשת בקשה למשימה:</span>
            <span style={{ fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 3 }}>
              {Math.max(1, Math.round((task.price || 0) * 0.05))} <CreditIcon size={12} />
            </span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 2 }}>{task.title}</div>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: -1 }}>₪{task.price}</div>
        </div>

        {/* Message area — same style as TaskDetail */}
        <div style={{ background: '#eff6ff', borderRadius: 18, padding: 16, border: '1px solid #bfdbfe', marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f2b6b', margin: '0 0 10px' }}>
            הוסף הודעה לבעל הג'ובה (לא חובה)
          </p>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="לדוגמה: יש לי ניסיון של 5 שנים בתחום, אני זמין להגיע מיד..."
            rows={4}
            style={{
              width: '100%', borderRadius: 12, border: '1px solid #bfdbfe',
              padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', resize: 'none',
              outline: 'none', color: '#1a2540', background: 'white', boxSizing: 'border-box',
              lineHeight: 1.5,
            }}
            onFocus={e => e.target.style.borderColor = '#93c5fd'}
            onBlur={e => e.target.style.borderColor = '#bfdbfe'}
            autoFocus
          />
        </div>

        {/* Buttons — same layout as TaskDetail apply form */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{ height: 52, padding: '0 20px', borderRadius: 16, background: 'white', border: '1px solid #dce8f5', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: 14, flexShrink: 0 }}
          >ביטול</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              flex: 1, height: 52, borderRadius: 16,
              background: loading ? '#93b4d8' : '#1a6fd4',
              border: 'none', fontSize: 15, fontWeight: 900, color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: 'none',
            }}
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <><Send size={16} strokeWidth={1.8} /> שלח בקשה</>}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeInBackdrop { from{opacity:0} to{opacity:1} }
        @keyframes slideUpModal { from{transform:translateY(60px);opacity:0} to{transform:translateY(0);opacity:1} }
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
  const [applyLocked, setApplyLocked] = useState(false); // prevents double-tap opening modal
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

  const borderColor = appStatus === 'approved' ? '#10b981' : appStatus === 'pending' ? '#fbbf24' : '#edf1f7';
  const borderWidth = hasActiveApp ? '1.5px' : '1px';

  // Count pending apps for this task (passed from parent or task.applicants)
  const pendingAppsCount = task._pendingAppsCount || 0;

  return (
    <>
      <div
        onClick={() => { if (showMenu) { setShowMenu(false); return; } navigate(`/task/${task.id}`); }}
        className="bg-white rounded-2xl active:scale-[0.982] transition-all"
        style={{ border: `${borderWidth} solid ${borderColor}`, boxShadow: 'none', padding: '16px', cursor: 'pointer' }}
      >
        {/* Approved banner */}
        {appStatus === 'approved' && (
          <div onClick={e => e.stopPropagation()} style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 14, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🎉</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#065f46' }}>הבקשה אושרה!</div>
              <div style={{ fontSize: 11, color: '#16a34a', marginTop: 1 }}>לחץ לצפייה בפרטים ולצאת לדרך</div>
            </div>
            <button onClick={e => { e.stopPropagation(); navigate(`/task/${task.id}`); }}
              style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: 'none', whiteSpace: 'nowrap' }}>
              🚀 צא עכשיו
            </button>
          </div>
        )}

        {/* Pending banner */}
        {appStatus === 'pending' && (
          <div onClick={e => e.stopPropagation()} style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 14, padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', animation: 'pulse-app 1.5s infinite', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#d97706' }}>הבקשה ממתינה לאישור</div>
              <div style={{ fontSize: 11, color: '#92400e', marginTop: 1 }}>תקבל הודעה ברגע שיאשרו</div>
            </div>
            <button onClick={handleCancelApp} disabled={cancelling}
              style={{ background: 'none', border: '1px solid #fcd34d', borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#d97706', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              {cancelling ? <Loader2 size={10} className="animate-spin" /> : 'בטל'}
            </button>
          </div>
        )}

        {/* Smart feed badges */}
        {badges && !hasActiveApp && <TaskBadges badges={badges} />}

        {/* Top row: title + price + apply btn */}
         <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
           <div style={{ flex: 1, minWidth: 0 }}>
             <h3 style={{ fontWeight: 700, color: '#1a2540', fontSize: 14, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: 4 }}>
               {task.title}
             </h3>

             {/* Owner menu - 3 dots with dropdown */}
             {task.created_by === currentUserId && (
               <div style={{ position: 'relative' }}>
                 <button
                   onClick={e => {
                     e.stopPropagation();
                     e.nativeEvent?.stopImmediatePropagation?.();
                     setShowMenu(v => !v);
                   }}
                   style={{
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     width: 24,
                     height: 24,
                     borderRadius: 6,
                     background: showMenu ? '#e0e7ef' : '#f1f5f9',
                     border: 'none',
                     cursor: 'pointer',
                     color: '#94a3b8',
                     marginBottom: 6,
                   }}
                 >
                   <MoreVertical size={14} />
                 </button>
                 {showMenu && (
                   <div
                     onClick={e => { e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); }}
                     style={{
                       position: 'absolute',
                       top: 30,
                       right: 0,
                       background: 'white',
                       border: '1px solid #e5e7eb',
                       borderRadius: 10,
                       boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                       zIndex: 1000,
                       minWidth: 140,
                       overflow: 'hidden',
                     }}
                   >
                     <button
                       onClick={e => {
                         e.stopPropagation();
                         setShowMenu(false);
                         setShowCancelConfirm(true);
                       }}
                       style={{
                         width: '100%',
                         textAlign: 'right',
                         padding: '10px 14px',
                         background: 'none',
                         border: 'none',
                         cursor: 'pointer',
                         fontSize: 13,
                         fontWeight: 600,
                         color: '#dc2626',
                         display: 'flex',
                         alignItems: 'center',
                         gap: 8,
                       }}
                     >
                       <Trash2 size={14} />
                       מחק משימה
                     </button>
                   </div>
                 )}
               </div>
             )}
            {/* Task ID (tiny, for tracking) */}
            <div style={{ fontSize: 8, color: '#cbd5e1', fontFamily: 'monospace', marginBottom: 4 }}>ID: {task.id?.slice(-8)}</div>
            {/* Category + status badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: '#64748b', background: '#f1f5f9', padding: '2px 7px', borderRadius: 20, fontWeight: 500 }}>{catLabel}</span>
              {appStatus === 'approved' && (
                <span style={{ fontSize: 10, color: '#065f46', background: '#f0fdf4', padding: '2px 7px', borderRadius: 20, fontWeight: 700 }}>✓ אושרה</span>
              )}
            </div>
          </div>

          {/* Price + distance + Apply button stacked */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {dist != null && !isNaN(dist) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontWeight: 700, color: '#3b82f6', fontSize: 14 }}>
                  <Navigation size={13} strokeWidth={2} />
                  <span>{dist < 1 ? `${Math.round(dist * 1000)}מ'` : `${dist.toFixed(1)}ק"מ`}</span>
                </div>
              )}
              <div style={{ fontWeight: 800, color: '#1a6fd4', fontSize: 16, lineHeight: 1 }}>₪{calculateCurrentPrice(task)}</div>
            </div>
            {!hasActiveApp && task.created_by !== currentUserId && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  if (!currentUserId) {
                    setShowLoginPrompt(true);
                    return;
                  }
                  if (applyLocked) return;
                  setApplyLocked(true);
                  setShowApplyModal(true);
                  setTimeout(() => setApplyLocked(false), 600);
                }}
                disabled={applyLocked}
                style={{
                  height: 32, padding: '0 12px', borderRadius: 10,
                  background: applyLocked ? '#93b4d8' : '#fbbf24',
                  border: 'none', color: '#1a3a6b', fontSize: 12, fontWeight: 700,
                  cursor: applyLocked ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                  boxShadow: 'none',
                  whiteSpace: 'nowrap',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                {applyLocked ? <Loader2 size={12} className="animate-spin" /> : (
                  <>
                    <Send size={12} strokeWidth={2} /> הגש בקשה
                    <span style={{ fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 2, marginLeft: 3, paddingLeft: 3, borderLeft: '1px solid rgba(255,255,255,0.3)' }}>
                      {Math.max(1, Math.round((task.price || 0) * 0.05))} <CreditIcon size={11} />
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        {task.description && (
        <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 10, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
          {task.description}
        </p>
        )}

        {/* Bottom meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#94a3b8', overflow: 'hidden' }}>
          {task.location_name && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <MapPin size={10} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.location_name}</span>
            </span>
          )}
          {task.client_name && (
            <span
              onClick={e => { e.stopPropagation(); if (task.client_id) navigate(`/public-profile?id=${task.client_id}`); }}
              style={{ display: 'flex', alignItems: 'center', gap: 2, marginRight: 'auto', flexShrink: 0, cursor: 'pointer' }}>
              <Star size={10} style={{ fill: '#fbbf24', color: '#fbbf24' }} />
              <span style={{ maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'underline', textDecorationColor: '#cbd5e1' }}>
                {task.client_rating > 0 ? `${task.client_rating.toFixed(1)} · ` : ''}{task.client_name}
              </span>
              {task.client_verified && <VerifiedBadge size="sm" />}
            </span>
          )}
          {task.created_date && (
            <span style={{ color: '#cbd5e1', flexShrink: 0 }}>{format(new Date(task.created_date), 'HH:mm')}</span>
          )}
        </div>
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

      <style>{`@keyframes pulse-app { 0%,100%{opacity:1}50%{opacity:0.4} }`}</style>
      </>
      );
      }