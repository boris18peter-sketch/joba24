import { Link } from 'react-router-dom';
import { MapPin, Clock, Navigation, Zap, Users } from 'lucide-react';
import TaskExpiry from '@/components/TaskExpiry';
import { getCategoryLabel } from '@/lib/categories';

const statusConfig = {
  OPEN: { label: 'פתוח', dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  TAKEN: { label: 'נלקח', dot: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  COMPLETED: { label: 'הושלם', dot: 'bg-gray-400', badge: 'bg-gray-50 text-gray-600 border-gray-200' },
  CANCELLED: { label: 'בוטל', dot: 'bg-red-400', badge: 'bg-red-50 text-red-700 border-red-200' },
  EXPIRED: { label: 'פג תוקף', dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
};

export default function TaskCard({ task }) {
  const status = statusConfig[task.status] || statusConfig.OPEN;
  const catLabel = getCategoryLabel(task.category);
  const dist = task._distKm;

  return (
    <Link to={`/task/${task.id}`} className="block">
      <div className="bg-white rounded-2xl p-4 active:scale-[0.985] transition-all shadow-sm hover:shadow-md" style={{ border: '1px solid #dce8f5' }}>
        {/* Top row: title + price */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-bold text-black text-[15px] leading-tight flex-1">{task.title}</h3>
          <div className="text-xl font-black text-black shrink-0">₪{task.price}</div>
        </div>

        {/* Tags row */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          {/* Category */}
          <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full">{catLabel}</span>

          {/* Status */}
          <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${status.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>

          {/* Approval mode */}
          {task.approval_mode === 'instant' ? (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              ⚡ מיידי
            </span>
          ) : (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              ✋ ממתין לאישור
            </span>
          )}

          {/* Expiry timer - only shows when < 6 hours left */}
          {task.expires_at && task.status === 'OPEN' && (
            <TaskExpiry expiresAt={task.expires_at} />
          )}
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-gray-400 text-xs mb-2 line-clamp-1">{task.description}</p>
        )}

        {/* Bottom row: location, time, distance */}
        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
          {task.location_name && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {task.location_name}
            </span>
          )}
          {task.estimated_time && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {task.estimated_time}
            </span>
          )}
          {dist != null && !isNaN(dist) && (
            <span className="flex items-center gap-1 text-blue-500 font-semibold">
              <Navigation className="w-3 h-3" />
              {dist < 1 ? `${Math.round(dist * 1000)}מ'` : `${dist.toFixed(1)}ק"מ`}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}