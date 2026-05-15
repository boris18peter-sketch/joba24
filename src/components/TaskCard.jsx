import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Star, X, Send, Loader2, MoreVertical } from 'lucide-react';
import { getCategoryLabel } from '@/lib/categories';
import VerifiedBadge from '@/components/VerifiedBadge';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { calculateCurrentPrice } from '@/lib/priceCalculator';
import TaskBadges from '@/components/TaskBadges';
import CancelTaskConfirmModal from '@/components/CancelTaskConfirmModal';

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
      // Server-side: check if application already exists before creating
      const existing = await base44.entities.TaskApplication.filter({
        task_id: task.id,
        worker_id: currentUserId,
      });
      const alreadyActive = existing.find(a => a.status === 'pending' || a.status === 'approved');
      if (alreadyActive) {
        // Already applied — just reflect existing state without creating duplicate
        onApplied(alreadyActive);
        onClose();
        toast('כבר שלחת בקשה למשימה זו');
        return;
      }
      const newApp = await base44.entities.TaskApplication.create({
        task_id: task.id,
        worker_id: currentUserId,
        worker_name: workerName || '',
        message: message.trim(),
        status: 'pending',
      });
      onApplied(newApp);
      onClose();
      toast.success('הבקשה נשלחה לבעל הג\'ובה!');
    } catch {
      submittedRef.current = false; // allow retry on error
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
        <div style={{ background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', borderRadius: 18, padding: '16px 18px', marginBottom: 18, color: 'white' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>מגיש בקשה למשימה</div>
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
              background: loading ? '#93b4d8' : 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
              border: 'none', fontSize: 15, fontWeight: 900, color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: loading ? 'none' : '0 6px 20px rgba(26,111,212,0.4)',
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
  const [applyLocked, setApplyLocked] = useState(false); // prevents double-tap opening modal
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancellingTask, setCancellingTask] = useState(false);

  const catLabel = getCategoryLabel(task.category);
  const dist = task._distKm;
  const appStatus = myApp?.status;
  const hasActiveApp = appStatus === 'pending' || appStatus === 'approved';

  const handleCancelApp = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (cancelling || !myApp?.id) return;
    setCancelling(true);
    // Optimistic: immediately remove from all caches
    queryClient.setQueryData(['myApplicationsFeed', currentUserId], (old = []) =>
      old.map(a => a.id === myApp.id ? { ...a, status: 'cancelled' } : a)
    );
    queryClient.setQueryData(['myApp', task.id, currentUserId], null);
    try {
      await base44.entities.TaskApplication.update(myApp.id, { status: 'cancelled' });
      queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['applications', task.id] });
      queryClient.invalidateQueries({ queryKey: ['myApp', task.id, currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('הבקשה בוטלה');
    } catch {
      // Revert optimistic update on failure
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
        onClick={() => navigate(`/task/${task.id}`)}
        className="bg-white rounded-2xl active:scale-[0.982] transition-all"
        style={{ border: `${borderWidth} solid ${borderColor}`, boxShadow: '0 2px 12px rgba(15,43,107,0.07)', padding: '13px 14px', cursor: 'pointer' }}
      >
        {/* Approved banner */}
        {appStatus === 'approved' && (
          <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1.5px solid #86efac', borderRadius: 14, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🎉</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#065f46' }}>הבקשה אושרה!</div>
              <div style={{ fontSize: 11, color: '#16a34a', marginTop: 1 }}>לחץ לצפייה בפרטים ולצאת לדרך</div>
            </div>
            <button onClick={e => { e.stopPropagation(); navigate(`/task/${task.id}`); }}
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.35)', whiteSpace: 'nowrap' }}>
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
         <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 5 }}>
           <div style={{ flex: 1, minWidth: 0 }}>
             <h3 style={{ fontWeight: 700, color: '#1a2540', fontSize: 14, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: 4 }}>
               {task.title}
             </h3>

             {/* Owner menu - 3 dots */}
             {task.created_by === currentUserId && (
               <button
                 onClick={e => {
                   e.stopPropagation();
                   setShowCancelConfirm(true);
                 }}
                 style={{
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   width: 24,
                   height: 24,
                   borderRadius: 6,
                   background: '#f1f5f9',
                   border: 'none',
                   cursor: 'pointer',
                   color: '#94a3b8',
                   marginBottom: 6,
                 }}
               >
                 <MoreVertical size={14} />
               </button>
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

          {/* Price + Apply button stacked */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7, flexShrink: 0 }}>
            <div style={{ fontWeight: 800, color: '#1a6fd4', fontSize: 16, lineHeight: 1 }}>₪{calculateCurrentPrice(task)}</div>
            {!hasActiveApp && currentUserId && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  if (applyLocked) return;
                  setApplyLocked(true);
                  setShowApplyModal(true);
                  // Reset lock after modal opens (150ms safety debounce)
                  setTimeout(() => setApplyLocked(false), 600);
                }}
                disabled={applyLocked}
                style={{
                  height: 32, padding: '0 14px', borderRadius: 10,
                  background: applyLocked ? '#93b4d8' : 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
                  border: 'none', color: 'white', fontSize: 12, fontWeight: 700,
                  cursor: applyLocked ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                  boxShadow: applyLocked ? 'none' : '0 2px 8px rgba(26,111,212,0.3)',
                  whiteSpace: 'nowrap',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                {applyLocked ? <Loader2 size={12} className="animate-spin" /> : <><Send size={12} strokeWidth={2} /> הגש בקשה</>}
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <p style={{ color: '#94a3b8', fontSize: 11, marginBottom: 7, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
            {task.description}
          </p>
        )}

        {/* Bottom meta with ID */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#94a3b8', overflow: 'hidden' }}>
          {task.location_name && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <MapPin size={10} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.location_name}</span>
            </span>
          )}
          {dist != null && !isNaN(dist) && (
            <span style={{ color: '#60a5fa', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              <Navigation size={10} />{dist < 1 ? `${Math.round(dist * 1000)}מ'` : `${dist.toFixed(1)}ק"מ`}
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

      <style>{`@keyframes pulse-app { 0%,100%{opacity:1}50%{opacity:0.4} }`}</style>
      </>
      );
      }