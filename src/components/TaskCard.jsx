import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Star, X, Send, Loader2, Clock } from 'lucide-react';
import { getCategoryLabel } from '@/lib/categories';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ── Apply Drawer — same style as TaskDetail ───────────────────────────────────
function ApplyDrawer({ task, currentUserId, workerName, onClose, onApplied }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await base44.entities.TaskApplication.create({
        task_id: task.id,
        worker_id: currentUserId,
        worker_name: workerName || '',
        message: message.trim(),
        status: 'pending',
      });
      toast.success('הבקשה נשלחה לבעל הג\'ובה!');
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
        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5,15,40,0.45)', backdropFilter: 'blur(3px)' }}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        dir="rtl"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
          background: '#f4f7fb',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
          padding: '12px 16px 40px',
          maxWidth: 480, margin: '0 auto',
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 99, background: '#d1dce8', margin: '0 auto 18px' }} />

        {/* Title */}
        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f1e40', marginBottom: 4 }}>הגשת בקשה</div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
          {task.title} ·{' '}
          <span style={{ color: '#1a6fd4', fontWeight: 700 }}>₪{task.price}</span>
        </div>

        {/* Message box — same style as TaskDetail apply form */}
        <div style={{ background: '#eff6ff', borderRadius: 18, padding: 16, border: '1px solid #bfdbfe', marginBottom: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f2b6b', margin: '0 0 10px' }}>
            הוסף הודעה לבעל הג'ובה (לא חובה)
          </p>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="לדוגמה: יש לי ניסיון של 5 שנים בתחום..."
            rows={3}
            style={{
              width: '100%', borderRadius: 12, border: '1px solid #bfdbfe',
              padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'none',
              outline: 'none', color: '#1a2540', background: 'white', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{ height: 44, padding: '0 16px', borderRadius: 14, background: 'white', border: '1px solid #dce8f5', color: '#666', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
          >ביטול</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              flex: 1, height: 44, borderRadius: 14,
              background: loading ? '#93b4d8' : 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
              border: 'none', fontSize: 14, fontWeight: 800, color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: loading ? 'none' : '0 4px 14px rgba(26,111,212,0.35)',
            }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'שלח בקשה'}
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
  const [showApplyDrawer, setShowApplyDrawer] = useState(false);

  const catLabel = getCategoryLabel(task.category);
  const dist = task._distKm;
  const appStatus = myApp?.status;
  const hasActiveApp = appStatus === 'pending' || appStatus === 'approved';

  const handleCancelApp = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (cancelling) return;
    setCancelling(true);
    try {
      await base44.entities.TaskApplication.update(myApp.id, { status: 'cancelled' });
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

  return (
    <>
      <div
        onClick={() => navigate(`/task/${task.id}`)}
        className="bg-white rounded-2xl active:scale-[0.982] transition-all"
        style={{
          border: `${borderWidth} solid ${borderColor}`,
          boxShadow: '0 1px 6px rgba(26,111,212,0.06)',
          padding: '12px 14px',
          cursor: 'pointer',
        }}
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
              style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >צא עכשיו</button>
          </div>
        )}

        {/* Top row: title + price + apply button */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
          {/* Left: title + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontWeight: 700, color: '#1a2540', fontSize: 14, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: 4 }}>
              {task.title}
            </h3>

            {/* Category + status badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: '#64748b', background: '#f1f5f9', padding: '2px 7px', borderRadius: 20, fontWeight: 500 }}>
                {catLabel}
              </span>
              {appStatus === 'pending' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
                  <span style={{ fontSize: 10, color: '#d97706', background: '#fffbeb', padding: '2px 7px', borderRadius: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', animation: 'pulse-app 1.5s infinite' }} />
                    ממתין לאישור
                  </span>
                  <button
                    onClick={handleCancelApp}
                    disabled={cancelling}
                    style={{ width: 18, height: 18, borderRadius: '50%', background: '#fee2e2', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: cancelling ? 0.5 : 1 }}
                  >
                    {cancelling ? <Loader2 size={9} className="animate-spin" color="#dc2626" /> : <X size={10} color="#dc2626" />}
                  </button>
                </div>
              )}
              {appStatus === 'approved' && (
                <span style={{ fontSize: 10, color: '#065f46', background: '#f0fdf4', padding: '2px 7px', borderRadius: 20, fontWeight: 700 }}>
                  ✓ אושרה
                </span>
              )}
            </div>
          </div>

          {/* Right: price + apply button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            <div style={{ fontWeight: 800, color: '#1a6fd4', fontSize: 19, lineHeight: 1, whiteSpace: 'nowrap' }}>
              ₪{task.price}
            </div>
            {!hasActiveApp && currentUserId && (
              <button
                onClick={e => { e.stopPropagation(); setShowApplyDrawer(true); }}
                style={{
                  height: 30, padding: '0 12px', borderRadius: 20,
                  background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
                  border: 'none', color: 'white', fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  boxShadow: '0 2px 8px rgba(26,111,212,0.3)',
                  whiteSpace: 'nowrap',
                }}
              >
                <Send size={11} /> הגש בקשה
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <p style={{ color: '#94a3b8', fontSize: 11, marginBottom: 8, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
            {task.description}
          </p>
        )}

        {/* Bottom meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#94a3b8', overflow: 'hidden' }}>
          {task.location_name && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <MapPin size={10} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.location_name}</span>
            </span>
          )}
          {dist != null && !isNaN(dist) && (
            <span style={{ color: '#60a5fa', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              <Navigation size={10} />
              {dist < 1 ? `${Math.round(dist * 1000)}מ'` : `${dist.toFixed(1)}ק"מ`}
            </span>
          )}
          {task.client_name && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 2, marginRight: 'auto', flexShrink: 0 }}>
              <Star size={10} style={{ fill: '#fbbf24', color: '#fbbf24' }} />
              <span style={{ maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {task.client_rating > 0 ? `${task.client_rating.toFixed(1)} · ` : ''}{task.client_name}
              </span>
            </span>
          )}
          {task.created_date && (
            <span style={{ color: '#cbd5e1', flexShrink: 0 }}>
              {format(new Date(task.created_date), 'HH:mm')}
            </span>
          )}
        </div>
      </div>

      {showApplyDrawer && (
        <ApplyDrawer
          task={task}
          currentUserId={currentUserId}
          workerName={workerName}
          onClose={() => setShowApplyDrawer(false)}
          onApplied={handleApplied}
        />
      )}

      <style>{`@keyframes pulse-app { 0%,100%{opacity:1}50%{opacity:0.4} }`}</style>
    </>
  );
}