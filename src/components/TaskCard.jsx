import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Star, X, Clock, Send, Loader2 } from 'lucide-react';
import { getCategoryLabel } from '@/lib/categories';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ── Mini Apply Popup ──────────────────────────────────────────────────────────
function ApplyPopup({ task, currentUserId, onClose, onApplied }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    // Check existing application
    const existing = await base44.entities.TaskApplication.filter({ task_id: task.id, worker_id: currentUserId });
    const active = existing.find(a => a.status === 'pending' || a.status === 'approved');
    if (active) {
      toast.error('כבר הגשת בקשה למשימה זו');
      onClose();
      return;
    }
    await base44.entities.TaskApplication.create({
      task_id: task.id,
      worker_id: currentUserId,
      worker_name: '', // will be filled by server / enriched by task owner
      message: message.trim(),
      status: 'pending',
    });
    toast.success('הבקשה נשלחה בהצלחה!');
    onApplied();
    onClose();
    setLoading(false);
  };

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 100,
        background: 'white', borderRadius: 18, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        border: '1px solid #e8eef8', padding: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#0f1e40' }}>הגשת בקשה</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
          <X size={16} color="#94a3b8" />
        </button>
      </div>

      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10, fontWeight: 600 }}>
        {task.title} · ₪{task.price}
      </div>

      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="הוסף הודעה למפרסם (אופציונלי)..."
        rows={3}
        style={{
          width: '100%', borderRadius: 12, border: '1.5px solid #e8eef8',
          padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'none',
          outline: 'none', color: '#1a2540', background: '#f8faff', boxSizing: 'border-box',
        }}
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          onClick={onClose}
          style={{ flex: 1, height: 42, borderRadius: 12, background: '#f1f5f9', border: 'none', fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}
        >
          ביטול
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{ flex: 2, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', border: 'none', fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <><Send size={14} /> שלח בקשה</>}
        </button>
      </div>
    </div>
  );
}

// ── TaskCard ──────────────────────────────────────────────────────────────────
export default function TaskCard({ task, myApp, isMyTask, currentUserId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [showApplyPopup, setShowApplyPopup] = useState(false);

  const catLabel = getCategoryLabel(task.category);
  const dist = task._distKm;
  const appStatus = myApp?.status; // pending | approved | rejected | cancelled | undefined

  // Active app: pending or approved (not cancelled/rejected)
  const hasActiveApp = appStatus === 'pending' || appStatus === 'approved';

  const handleCancelApp = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCancelling(true);
    await base44.entities.TaskApplication.update(myApp.id, { status: 'cancelled' });
    queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed'] });
    toast.success('הבקשה בוטלה');
    setCancelling(false);
  };

  const handleApplied = () => {
    queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed'] });
  };

  const cardBorderColor = appStatus === 'approved' ? '#10b981' : appStatus === 'pending' ? '#fbbf24' : '#e8eef8';
  const cardBorderWidth = hasActiveApp ? '1.5px' : '1px';
  const cardShadow = appStatus === 'approved' ? '0 2px 12px rgba(16,185,129,0.12)' : '0 2px 12px rgba(26,111,212,0.06), 0 1px 3px rgba(0,0,0,0.04)';

  return (
    <div style={{ position: 'relative' }}>
      {/* Overlay to close popup */}
      {showApplyPopup && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 90 }}
          onClick={() => setShowApplyPopup(false)}
        />
      )}

      <div
        onClick={() => navigate(`/task/${task.id}`)}
        className="bg-white rounded-2xl active:scale-[0.982] transition-all"
        style={{
          border: `${cardBorderWidth} solid ${cardBorderColor}`,
          boxShadow: cardShadow,
          padding: '14px 16px',
          cursor: 'pointer',
          position: 'relative',
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
              onClick={() => navigate(`/task/${task.id}`)}
              style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
            >צא עכשיו</button>
          </div>
        )}

        {/* Top row: title + price */}
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

          {/* Pending badge + cancel */}
          {appStatus === 'pending' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#d97706', background: '#fffbeb', padding: '2px 8px', borderRadius: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', animation: 'pulse-app 1.5s infinite' }} />
                ממתין לאישור
              </span>
              <button
                onClick={handleCancelApp}
                disabled={cancelling}
                style={{ width: 20, height: 20, borderRadius: '50%', background: '#fee2e2', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
              >
                <X size={11} color="#dc2626" />
              </button>
            </div>
          )}

          {/* Approved badge */}
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

        {/* Bottom row */}
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
              <Star size={11} style={{ fill: '#fbbf24', color: '#fbbf24', flexShrink: 0 }} />
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

        {/* Apply button — shown only if no active application */}
        {!hasActiveApp && currentUserId && (
          <button
            onClick={e => { e.stopPropagation(); setShowApplyPopup(v => !v); }}
            style={{
              marginTop: 12, width: '100%', height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
              border: 'none', color: 'white', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: '0 3px 10px rgba(26,111,212,0.25)',
            }}
          >
            <Send size={14} /> הגש בקשה
          </button>
        )}
      </div>

      {/* Apply popup — anchored above the card */}
      {showApplyPopup && (
        <ApplyPopup
          task={task}
          currentUserId={currentUserId}
          onClose={() => setShowApplyPopup(false)}
          onApplied={handleApplied}
        />
      )}

      <style>{`
        @keyframes pulse-app { 0%,100%{opacity:1}50%{opacity:0.4} }
      `}</style>
    </div>
  );
}