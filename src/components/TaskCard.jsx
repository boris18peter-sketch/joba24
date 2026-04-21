import { Link } from 'react-router-dom';
import { MapPin, Clock, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const categoryLabels = {
  moving: '🚛 הובלה',
  shopping: '🛒 קניות',
  repairs: '🔧 תיקון',
  cleaning: '🧹 ניקיון',
  other: '📋 אחר',
};

const statusConfig = {
  OPEN: { label: 'פתוח', dot: 'bg-green-500' },
  TAKEN: { label: 'נלקח', dot: 'bg-blue-500' },
  COMPLETED: { label: 'הושלם', dot: 'bg-gray-400' },
  CANCELLED: { label: 'בוטל', dot: 'bg-red-400' },
};

export default function TaskCard({ task }) {
  const status = statusConfig[task.status] || statusConfig.OPEN;
  const catLabel = categoryLabels[task.category] || categoryLabels.other;

  return (
    <Link to={`/task/${task.id}`} className="block">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 active:scale-[0.985] transition-transform shadow-sm hover:shadow-md hover:border-gray-200 transition-all">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs text-gray-500 font-medium">{catLabel}</span>
              <span className="text-gray-300">·</span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
            </div>
            <h3 className="font-bold text-black text-[15px] leading-tight">{task.title}</h3>
          </div>
          <div className="text-xl font-black text-black shrink-0">₪{task.price}</div>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-gray-500 text-sm mb-3 line-clamp-1">{task.description}</p>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-3">
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