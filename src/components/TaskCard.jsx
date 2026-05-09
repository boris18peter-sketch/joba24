import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Star, Zap, Users, Pin } from 'lucide-react';
import { getCategoryLabel } from '@/lib/categories';
import VerifiedBadge from '@/components/VerifiedBadge';
import { format } from 'date-fns';

export default function TaskCard({ task, myApp, isMyTask }) {
  const navigate = useNavigate();
  const catLabel = getCategoryLabel(task.category);
  const dist = task._distKm;

  // Application status indicator (only 1 badge max)
  const appStatus = myApp?.status;

  return (
    <Link to={`/task/${task.id}`} className="block">
      <div
        className="bg-white rounded-2xl active:scale-[0.982] transition-all"
        style={{
          border: '1px solid #e8eef8',
          boxShadow: '0 2px 12px rgba(26,111,212,0.06), 0 1px 3px rgba(0,0,0,0.04)',
          padding: '14px 16px',
        }}
      >
        {/* Top row: title + price */}
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <h3 style={{ fontWeight: 600, color: '#1a2540', fontSize: 15, lineHeight: 1.35, flex: 1 }}>
            {task.title}
          </h3>
          <div style={{ fontWeight: 700, color: '#1a6fd4', fontSize: 17, shrink: 0, whiteSpace: 'nowrap' }}>
            ₪{task.price}
          </div>
        </div>

        {/* Category + approval — minimal, only the most relevant badge */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <span style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>
            {catLabel}
          </span>

          {/* Only 1 status badge at most */}
          {isMyTask && (
            <span style={{ fontSize: 11, color: '#2563eb', background: '#eff6ff', padding: '2px 7px', borderRadius: 20, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Pin className="w-2.5 h-2.5" /> שלי
            </span>
          )}
          {!isMyTask && appStatus === 'pending' && (
            <span style={{ fontSize: 11, color: '#d97706', background: '#fffbeb', padding: '2px 7px', borderRadius: 20, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
              ממתין
            </span>
          )}
          {!isMyTask && appStatus === 'approved' && (
            <span style={{ fontSize: 11, color: '#16a34a', background: '#f0fdf4', padding: '2px 7px', borderRadius: 20, fontWeight: 500 }}>
              ✓ אושרה
            </span>
          )}
          {!isMyTask && !appStatus && task.approval_mode === 'instant' && (
            <span style={{ fontSize: 11, color: '#16a34a', background: '#f0fdf4', padding: '2px 7px', borderRadius: 20, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Zap className="w-2.5 h-2.5" /> מיידי
            </span>
          )}
        </div>

        {/* Description — subtle */}
        {task.description && (
          <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 10, lineHeight: 1.45 }} className="line-clamp-1">
            {task.description}
          </p>
        )}

        {/* Bottom row: location · client · distance · time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#94a3b8', flexWrap: 'wrap' }}>
          {task.location_name && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" style={{ color: '#94a3b8' }} />
              <span>{task.location_name}</span>
            </span>
          )}
          {dist != null && !isNaN(dist) && (
            <span style={{ color: '#60a5fa', fontWeight: 500 }} className="flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              {dist < 1 ? `${Math.round(dist * 1000)}מ'` : `${dist.toFixed(1)}ק"מ`}
            </span>
          )}
          {task.client_name && (
            <span className="flex items-center gap-1 mr-auto">
              <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
              <span style={{ color: '#94a3b8' }}>
                {task.client_rating > 0 ? task.client_rating.toFixed(1) : 'חדש'} ·{' '}
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/public-profile?id=${task.client_id}`); }}
                  style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12 }}
                >
                  {task.client_name}
                </button>
              </span>
            </span>
          )}
          {task.created_date && (
            <span style={{ color: '#cbd5e1', fontSize: 11 }}>
              {format(new Date(task.created_date), 'HH:mm')}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}