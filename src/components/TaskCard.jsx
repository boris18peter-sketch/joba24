import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Star, X, Send, Loader2 } from 'lucide-react';
import { getCategoryLabel } from '@/lib/categories';
import VerifiedBadge from '@/components/VerifiedBadge';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { calculateCurrentPrice } from '@/lib/priceCalculator';

// ── Apply Modal — full screen, professional ───────────────────────────────────
function ApplyModal({ task, currentUserId, workerName, onClose, onApplied }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    // Optimistic: close modal immediately so user sees feedback right away
    onApplied();
    onClose();
    try {
      await base44.entities.TaskApplication.create({
        task_id: task.id,
        worker_id: currentUserId,
        worker_name: workerName || '',
        message: message.trim(),
        status: 'pending',
      });
      toast.success('הבקשה נשלחה לבעל הג\'ובה!');
    } catch {
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
export default function TaskCard({ task, myApp, currentUserId, workerName }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);

  const catLabel = getCategoryLabel(task.category);
  const dist = task._distKm;
  const appStatus = myApp?.status;
  const hasActiveApp = appStatus === 'pending' || appStatus === 'approved';

  const handleCancelApp = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (cancelling) return;
    setCancelling(true);
    // Optimistic: immediately hide the pending banner
    queryClient.setQueryData(['myApplicationsFeed', currentUserId], (old = []) =>
      old.map(a => a.id === myApp.id ? { ...a, status: 'cancelled' } : a)
    );
    try {
      await base44.entities.TaskApplication.update(myApp.id, { status: 'cancelled' });
      // Hard sync everything after server confirms
      queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed'] });
      queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['applications', task.id] });
      queryClient.invalidateQueries({ queryKey: ['myApp', task.id, currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('הבקשה בוטלה');
    } catch {
      // Revert optimistic update on failure
      queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed', currentUserId] });
      toast.error('שגיאה בביטול, נסה שוב');
    } finally {
      setCancelling(false);
    }
  };

  const handleApplied = () => {
    // Optimistic update: immediately mark as pending so button disappears
    queryClient.setQueryData(['myApplicationsFeed', currentUserId], (old = []) => [
      ...old,
      { task_id: task.id, worker_id: currentUserId, status: 'pending', id: `optimistic_${task.id}` },
    ]);
    queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed', currentUserId] });
    queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed'] });
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

        {/* Top row: title + price + apply btn */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 5 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontWeight: 700, color: '#1a2540', fontSize: 14, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: 4 }}>
              {task.title}
            </h3>
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
                onClick={e => { e.stopPropagation(); setShowApplyModal(true); }}
                style={{
                  height: 32, padding: '0 14px', borderRadius: 10,
                  background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
                  border: 'none', color: 'white', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                  boxShadow: '0 2px 8px rgba(26,111,212,0.3)',
                  whiteSpace: 'nowrap',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <Send size={12} strokeWidth={2} /> הגש בקשה
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
            <span style={{ display: 'flex', alignItems: 'center', gap: 2, marginRight: 'auto', flexShrink: 0 }}>
              <Star size={10} style={{ fill: '#fbbf24', color: '#fbbf24' }} />
              <span style={{ maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

      <style>{`@keyframes pulse-app { 0%,100%{opacity:1}50%{opacity:0.4} }`}</style>
    </>
  );
}