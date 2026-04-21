import { Link } from 'react-router-dom';
import { MapPin, Clock, Star, ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

const categoryColors = {
  moving: 'bg-orange-100 text-orange-700',
  shopping: 'bg-green-100 text-green-700',
  repairs: 'bg-blue-100 text-blue-700',
  cleaning: 'bg-purple-100 text-purple-700',
  other: 'bg-gray-100 text-gray-700',
};

const categoryLabels = {
  moving: '🚛 הובלה',
  shopping: '🛒 קניות',
  repairs: '🔧 תיקון',
  cleaning: '🧹 ניקיון',
  other: '📋 אחר',
};

const statusConfig = {
  OPEN: { label: 'פתוח', color: 'bg-green-100 text-green-700' },
  TAKEN: { label: 'נלקח', color: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'הושלם', color: 'bg-gray-100 text-gray-700' },
  CANCELLED: { label: 'בוטל', color: 'bg-red-100 text-red-700' },
};

export default function TaskCard({ task }) {
  const status = statusConfig[task.status] || statusConfig.OPEN;
  const catColor = categoryColors[task.category] || categoryColors.other;
  const catLabel = categoryLabels[task.category] || categoryLabels.other;

  return (
    <Link to={`/task/${task.id}`} className="block animate-fade-in">
      <div className="bg-card rounded-2xl border border-border p-4 hover:shadow-md hover:border-primary/30 transition-all duration-200 active:scale-[0.99]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${catColor}`}>{catLabel}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
            </div>
            <h3 className="font-semibold text-foreground text-base leading-tight truncate">{task.title}</h3>
            {task.description && (
              <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{task.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
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
              {task.created_date && (
                <span>{formatDistanceToNow(new Date(task.created_date), { addSuffix: true })}</span>
              )}
            </div>
            {task.client_name && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span>{task.client_rating?.toFixed(1) || '—'}</span>
                <span>·</span>
                <span>{task.client_name}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="text-xl font-bold text-primary">₪{task.price}</div>
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </Link>
  );
}