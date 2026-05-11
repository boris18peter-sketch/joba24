import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Star, X, Clock } from 'lucide-react';
import { getCategoryLabel } from '@/lib/categories';
import VerifiedBadge from '@/components/VerifiedBadge';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function TaskCard({ task, myApp, isMyTask }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const catLabel = getCategoryLabel(task.category);
  const dist = task._distKm;
  const appStatus = myApp?.status;

  const handleCancelApp = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCancelling(true);
    await base44.entities.TaskApplication.update(myApp.id, { status: 'cancelled' });
    queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed'] });
    toast.success('הבקשה בוטלה');
    setCancelling(false);
  };

  return (
    <Link to={`/task/${task.id}`} className="block">
      <div
        className="bg-white rounded-2xl active:scale-[0.982] transition-all"
        style={{
          border: appStatus === 'approved' ? '1.5px solid #10b981' : appStatus === 'pending' ? '1.5px solid #fbbf24' : '1px solid #e8eef8',
          boxShadow: appStatus === 'approved' ? '0 2px 12px rgba(16,185,129,0.12)' : '0 2px 12px rgba(26,111,212,0.06), 0 1px 3px rgba(0,0,0,0.04)',
          padding: '14px 16px',
        }}
      >
        {/* Approved banner */}
        {appStatus === 'approved' && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '8px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#065f46' }}>✅ בקשתך אושרה — אתה יכול לצאת לדרך!</span>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/task/${task.id}`); }}
              style={{ marginRight: 'auto', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
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

        {/* Category + status badge */}
        <div className="flex items-center gap-1.5 mb-2.5" style={{ flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 20, fontWeight: 500, flexShrink: 0 }}>
            {catLabel}
          </span>
          {isMyTask && (
            <span style={{ fontSize: 11, color: '#1a6fd4', background: '#eff6ff', padding: '2px 7px', borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>
              שלי
            </span>
          )}
          {!isMyTask && appStatus === 'pending' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#d97706', background: '#fffbeb', padding: '2px 7px', borderRadius: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                הגשתי בקשה
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
          {!isMyTask && appStatus === 'approved' && (
            <span style={{ fontSize: 11, color: '#065f46', background: '#f0fdf4', padding: '2px 7px', borderRadius: 20, fontWeight: 700, flexShrink: 0 }}>
              ✓ אושרתי
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
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }`}</style>
    </Link>
  );
}