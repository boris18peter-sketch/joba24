import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Star, X, Send, Loader2 } from 'lucide-react';
import { getCategoryLabel } from '@/lib/categories';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ── Mini Apply Popup (bottom-sheet style, fixed) ──────────────────────────────
function ApplyPopup({ task, currentUserId, workerName, onClose, onApplied }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Optimistically create — skip the extra filter check for speed
      await base44.entities.TaskApplication.create({
        task_id: task.id,
        worker_id: currentUserId,
        worker_name: workerName || '',
        message: message.trim(),
        status: 'pending',
      });
      toast.success('הבקשה נשלחה! 🎉');
      onApplied();
      onClose();
    } catch {
      toast.error('שגיאה בשליחת הבקשה, נסה שוב');
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5,15,40,0.4)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
          background: 'white', borderRadius: '24px 24px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
          padding: '20px 20px 32px',
          maxWidth: 480, margin: '0 auto',
        }}
        dir="rtl"
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 99, background: '#e2e8f0', margin: '0 auto 16px' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0f1e40' }}>הגשת בקשה</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{task.title} · <span style={{ color: '#1a6fd4', fontWeight: 700 }}>₪{task.price}</span></div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 10, background: '#f1f5f9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={15} color="#64748b" />
          </button>
        </div>

        {/* Message textarea */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>הודעה למפרסם (אופציונלי)</div>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="למשל: יש לי ניסיון רלוונטי, אני זמין עכשיו..."
            rows={3}
            style={{
              width: '100%', borderRadius: 14, border: '1.5px solid #e8eef8',
              padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', resize: 'none',
              outline: 'none', color: '#1a2540', background: '#f8faff', boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = '#93c5fd'}
            onBlur={e => e.target.style.borderColor = '#e8eef8'}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, height: 48, borderRadius: 14, background: '#f1f5f9', border: 'none', fontSize: 14, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}
          >
            ביטול
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              flex: 2, height: 48, borderRadius: 14,
              background: loading ? '#93b4d8' : 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
              border: 'none', fontSize: 14, fontWeight: 700, color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: loading ? 'none' : '0 4px 14px rgba(26,111,212,0.35)',
              transition: 'all 0.15s',
            }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={15} /> שלח בקשה</>}
          </button>
        </div>
      </div>
    </>
  );
}

// ── TaskCard ──────────────────────────────────────────────────────────────────
export default function TaskCard({ task, myApp, currentUserId, workerName }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [showApplyPopup, setShowApplyPopup] = useState(false);

  const catLabel = getCategoryLabel(task.category);
  const dist = task._distKm;
  const appStatus = myApp?.status; // pending | approved | rejected | cancelled | undefined
  const hasActiveApp = appStatus === 'pending' || appStatus === 'approved';

  const handleCancelApp = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (cancelling) return;
    setCancelling(true);
    try {
      await base44.entities.TaskApplication.update(myApp.id, { status: 'cancelled' });
      // Optimistic update in cache
      queryClient.setQueryData(['myApplicationsFeed', currentUserId], (old = []) =>
        old.map(a => a.id === myApp.id ? { ...a, status: 'cancelled' } : a)
      );
      toast.success('הבקשה בוטלה');
    } finally {
      setCancelling(false);
    }
  };

  const handleApplied = () => {
    queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed', currentUserId] });
    queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed'] });
  };

  const borderColor = appStatus === 'approved' ? '#10b981' : appStatus === 'pending' ? '#fbbf24' : '#e8eef8';
  const borderWidth = hasActiveApp ? '1.5px' : '1px';
  const shadow = appStatus === 'approved'
    ? '0 2px 12px rgba(16,185,129,0.12)'
    : '0 2px 12px rgba(26,111,212,0.06), 0 1px 3px rgba(0,0,0,0.04)';

  return (
    <>
      <div
        onClick={() => navigate(`/task/${task.id}`)}
        className="bg-white rounded-2xl active:scale-[0.982] transition-all"
        style={{ border: `${borderWidth} solid ${borderColor}`, boxShadow: shadow, padding: '14px 16px', cursor: 'pointer', position: 'relative' }}
      >
        {/* Approved banner */}
        {appStatus === 'approved' && (
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '8px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span style={{ fontSize: 13, fontWeight: 800, color: '#065f46', flex: 1 }}>✅ בקשתך אושרה!</span>
            <button
              onClick={e => { e.stopPropagation(); navigate(`/task/${task.id}`); }}
              style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
            >צא עכשיו</button>
          </div>
        )}

        {/* Title + price */}
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <h3 style={{ fontWeight: 600, color: '#1a2540', fontSize: 15, lineHeight: 1.35, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {task.title}
          </h3>
          <div style={{ fontWeight: 700, color: '#1a6fd4', fontSize: 17, flexShrink: 0, whiteSpace: 'nowrap' }}>
            ₪{task.price}
          </div>
        </div>

        {/* Category + status badges */}
        <div className="flex items-center gap-1.5 mb-2.5" style={{ flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 20, fontWeight: 500, flexShrink: 0 }}>
            {catLabel}
          </span>
          {appStatus === 'pending' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
              <span style={{ fontSize: 11, color: '#d97706', background: '#fffbeb', padding: '2px 8px', borderRadius: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', animation: 'pulse-app 1.5s infinite' }} />
                ממתין לאישור
              </span>
              <button
                onClick={handleCancelApp}
                disabled={cancelling}
                style={{ width: 20, height: 20, borderRadius: '50%', background: '#fee2e2', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, opacity: cancelling ? 0.5 : 1 }}
              >
                {cancelling ? <Loader2 size={10} className="animate-spin" color="#dc2626" /> : <X size={11} color="#dc2626" />}
              </button>
            </div>
          )}
          {appStatus === 'approved' && (
            <span style={{ fontSize: 11, color: '#065f46', background: '#f0fdf4', padding: '2px 8px', borderRadius: 20, fontWeight: 700, flexShrink: 0 }}>
              ✓ בקשה אושרה
            </span>
          )}
        </div>

        {/* Description */}
        {task.description && (
          <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 10, lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
            {task.description}
          </p>
        )}

        {/* Bottom meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#94a3b8', flexWrap: 'nowrap', overflow: 'hidden' }}>
          {task.location_name && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <MapPin size={11} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.location_name}</span>
            </span>
          )}
          {dist != null && !isNaN(dist) && (
            <span style={{ color: '#60a5fa', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
              <Navigation size={11} />
              {dist < 1 ? `${Math.round(dist * 1000)}מ'` : `${dist.toFixed(1)}ק"מ`}
            </span>
          )}
          {task.client_name && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, marginRight: 'auto', flexShrink: 0 }}>
              <Star size={11} style={{ fill: '#fbbf24', color: '#fbbf24' }} />
              <span style={{ color: '#94a3b8', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {task.client_rating > 0 ? `${task.client_rating.toFixed(1)} · ` : ''}{task.client_name}
              </span>
            </span>
          )}
          {task.created_date && (
            <span style={{ color: '#cbd5e1', fontSize: 11, flexShrink: 0 }}>
              {format(new Date(task.created_date), 'HH:mm')}
            </span>
          )}
        </div>

        {/* Apply button */}
        {!hasActiveApp && currentUserId && (
          <button
            onClick={e => { e.stopPropagation(); setShowApplyPopup(true); }}
            style={{
              marginTop: 12, width: '100%', height: 42, borderRadius: 12,
              background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
              border: 'none', color: 'white', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: '0 3px 10px rgba(26,111,212,0.25)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Send size={14} /> הגש בקשה
          </button>
        )}
      </div>

      {/* Apply popup rendered in portal-like fixed position */}
      {showApplyPopup && (
        <ApplyPopup
          task={task}
          currentUserId={currentUserId}
          workerName={workerName}
          onClose={() => setShowApplyPopup(false)}
          onApplied={handleApplied}
        />
      )}

      <style>{`@keyframes pulse-app { 0%,100%{opacity:1}50%{opacity:0.4} }`}</style>
    </>
  );
}