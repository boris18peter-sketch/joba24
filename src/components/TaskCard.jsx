import { Link } from 'react-router-dom';
import { MapPin, Clock, Star, Navigation, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import TaskExpiry from '@/components/TaskExpiry';
import { getCategoryLabel } from '@/lib/categories';

const statusConfig = {
  OPEN: { label: 'פתוח', dot: 'bg-green-500', badge: 'bg-green-50 text-green-700 border-green-200' },
  TAKEN: { label: 'נלקח', dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
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
      <div className="bg-white rounded-2xl border border-gray-100 p-4 active:scale-[0.985] transition-all shadow-sm hover:shadow-md hover:border-gray-200">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs text-gray-500 font-medium">{catLabel}</span>
              {task.is_story && <Sparkles className="w-3 h-3 text-purple-500" />}
              <span className="text-gray-300">·</span>
              <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${status.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
              {task.expires_at && (
                <TaskExpiry expiresAt={task.expires_at} price={task.price} taskId={task.id} />
              )}
            </div>
            <h3 className="font-bold text-black text-[15px] leading-tight">{task.title}</h3>
          </div>
          <div className="text-right">
            <div className="text-xl font-black text-black">₪{task.price}</div>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-gray-500 text-sm mb-3 line-clamp-1">{task.description}</p>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-3 flex-wrap">
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
          {task.client_name && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              {task.client_rating?.toFixed(1) || '—'}
              <span className="text-gray-300 mx-0.5">·</span>
              {task.client_name}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}