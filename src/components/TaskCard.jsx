import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Star, Zap, Pin, Clock, ShieldCheck } from 'lucide-react';
import { getCategoryLabel } from '@/lib/categories';
import { format } from 'date-fns';

const CATEGORY_EMOJI = {
  plumbing: '🔧', electricity: '⚡', gardening: '🌿', cleaning: '🧹',
  moving: '📦', painting: '🎨', carpentry: '🪚', ac: '❄️',
  locksmith: '🔑', shopping: '🛍️', delivery: '🚗', babysitting: '👶',
  tutoring: '📚', it_support: '💻', other: '✦',
};

export default function TaskCard({ task, myApp, isMyTask }) {
  const navigate = useNavigate();
  const catLabel = getCategoryLabel(task.category);
  const dist = task._distKm;
  const appStatus = myApp?.status;
  const emoji = CATEGORY_EMOJI[task.category] || '✦';

  const isInstant = task.approval_mode === 'instant';
  const isPending = !isMyTask && appStatus === 'pending';
  const isApproved = !isMyTask && appStatus === 'approved';

  return (
    <Link to={`/task/${task.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          background: 'white',
          borderRadius: 16,
          border: isPending ? '1.5px solid #fbbf24' : isApproved ? '1.5px solid #34d399' : '1px solid #eaeff6',
          padding: '14px 16px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          transition: 'transform 0.12s ease, box-shadow 0.12s ease',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
        onTouchStart={e => e.currentTarget.style.transform = 'scale(0.985)'}
        onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {/* Row 1: title + price */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontWeight: 600, color: '#111827', fontSize: 15, lineHeight: 1.3, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {task.title}
            </h3>
            {task.description && (
              <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 3, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '3px 0 0' }}>
                {task.description}
              </p>
            )}
          </div>
          <div style={{ flexShrink: 0, textAlign: 'left' }}>
            <div style={{ fontWeight: 700, color: '#1a6fd4', fontSize: 17, lineHeight: 1 }}>₪{task.price}</div>
            {task.estimated_time && (
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2, display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
                <Clock size={9} /> {task.estimated_time}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: tags */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: '#4b5563', background: '#f3f4f6', padding: '3px 8px', borderRadius: 6, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 12 }}>{emoji}</span> {catLabel}
          </span>

          {isMyTask && (
            <span style={{ fontSize: 11, color: '#2563eb', background: '#eff6ff', padding: '3px 7px', borderRadius: 6, fontWeight: 600 }}>
              שלי
            </span>
          )}
          {isPending && (
            <span style={{ fontSize: 11, color: '#92400e', background: '#fffbeb', padding: '3px 7px', borderRadius: 6, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', animation: 'tagPulse 1.5s infinite' }} />
              ממתין
            </span>
          )}
          {isApproved && (
            <span style={{ fontSize: 11, color: '#065f46', background: '#ecfdf5', padding: '3px 7px', borderRadius: 6, fontWeight: 600 }}>
              ✓ אושרה
            </span>
          )}
          {!isMyTask && !appStatus && isInstant && (
            <span style={{ fontSize: 11, color: '#1d4ed8', background: '#eff6ff', padding: '3px 7px', borderRadius: 6, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Zap size={10} strokeWidth={2.5} /> מיידי
            </span>
          )}
        </div>

        {/* Row 3: meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#9ca3af' }}>
          {task.location_name && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, flex: 1, overflow: 'hidden' }}>
              <MapPin size={11} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.location_name}</span>
            </span>
          )}
          {dist != null && !isNaN(dist) && (
            <span style={{ color: '#60a5fa', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
              <Navigation size={10} />
              {dist < 1 ? `${Math.round(dist * 1000)}מ` : `${dist.toFixed(1)}ק"מ`}
            </span>
          )}
          {/* Client trust */}
          {task.client_name && (
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/public-profile?id=${task.client_id}`); }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9ca3af', fontSize: 12, flexShrink: 0 }}
            >
              {task.client_rating > 0 ? (
                <>
                  <Star size={10} style={{ fill: '#fbbf24', color: '#fbbf24' }} />
                  <span style={{ fontWeight: 500 }}>{task.client_rating.toFixed(1)}</span>
                </>
              ) : null}
              {task.client_name && <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.client_name}</span>}
            </button>
          )}
          {task.created_date && (
            <span style={{ fontSize: 10, color: '#d1d5db', flexShrink: 0 }}>
              {format(new Date(task.created_date), 'HH:mm')}
            </span>
          )}
        </div>
      </div>
      <style>{`@keyframes tagPulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </Link>
  );
}