import { Link } from 'react-router-dom';
import { MapPin, Navigation, Star, Zap, Users, Pin } from 'lucide-react';
import TaskExpiry from '@/components/TaskExpiry';
import { getCategoryLabel } from '@/lib/categories';
import VerifiedBadge from '@/components/VerifiedBadge';
import { format } from 'date-fns';

const statusConfig = {
  OPEN: { label: 'פתוח', dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  TAKEN: { label: 'נלקח', dot: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  COMPLETED: { label: 'הושלם', dot: 'bg-gray-400', badge: 'bg-gray-50 text-gray-600 border-gray-200' },
  CANCELLED: { label: 'בוטל', dot: 'bg-red-400', badge: 'bg-red-50 text-red-700 border-red-200' },
  EXPIRED: { label: 'פג תוקף', dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
};

export default function TaskCard({ task, workerBadge, clientBadge, myApp, isMyTask }) {
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

        {/* Tags row - only category + approval mode / application status / my task */}
         <div className="flex items-center gap-1.5 flex-wrap mb-2">
           {/* Category */}
           <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full">{catLabel}</span>

           {/* My task badge */}
           {isMyTask && (
             <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
               <Pin className="w-2.5 h-2.5" /> משימה שלי
             </span>
           )}

           {/* My application status */}
           {myApp && myApp.status === 'pending' && (
             <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
               <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
               ממתין לאישור
             </span>
           )}

           {myApp && myApp.status === 'approved' && (
             <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
               <span className="w-2 h-2 rounded-full bg-green-500" /> אושרה
             </span>
           )}

           {/* Approval mode */}
           {!isMyTask && (!myApp || myApp.status !== 'pending') && (
             <>
               {task.approval_mode === 'instant' && (
                 <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                   <Zap className="w-2.5 h-2.5" /> מיידי
                 </span>
               )}
               {task.approval_mode === 'manual' && (
                 <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                   <Users className="w-2.5 h-2.5" /> נדרש אישור
                 </span>
               )}
             </>
           )}
         </div>



        {/* Description */}
        {task.description && (
          <p className="text-gray-400 text-xs mb-2 line-clamp-1">{task.description}</p>
        )}

        {/* Bottom row */}
        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
          {task.client_name && (
            <span className="flex items-center gap-1 text-amber-600 font-semibold">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {task.client_rating > 0 ? task.client_rating.toFixed(1) : 'חדש'}
              <span className="text-gray-400 font-normal">· {task.client_name}</span>
            </span>
          )}
          {task.location_name && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {task.location_name}
            </span>
          )}
          {dist != null && !isNaN(dist) && (
            <span className="flex items-center gap-1 text-blue-500 font-semibold">
              <Navigation className="w-3 h-3" />
              {dist < 1 ? `${Math.round(dist * 1000)}מ'` : `${dist.toFixed(1)}ק"מ`}
            </span>
          )}
          {task.created_date && (
            <span className="flex items-center gap-1 mr-auto text-gray-300">
              {format(new Date(task.created_date), 'dd.MM.yy · HH:mm')}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}