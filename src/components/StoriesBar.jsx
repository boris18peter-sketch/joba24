import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getCategoryLabel } from '@/lib/categories';
import { X, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { calculateCurrentPrice } from '@/lib/priceCalculator';

const STORY_DURATION = 5000; // 5 seconds per story

function StoryCard({ task, onClick }) {
   const label = getCategoryLabel(task.category);
   const emoji = label.split(' ')[0];
   const currentPrice = calculateCurrentPrice(task);
   return (
     <button onClick={() => onClick(task)} className="flex flex-col items-center gap-1.5 shrink-0">
       <div className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-md bg-gray-100">
         {task.images?.[0] ? (
           <img src={task.images[0]} alt={task.title} className="w-full h-full object-cover" />
         ) : (
           <div className="w-full h-full flex items-center justify-center text-2xl" style={{ background: '#1a6fd4' }}>
             {emoji}
           </div>
         )}
         <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
           <div className="text-white font-black text-[10px] text-center">₪{currentPrice}</div>
         </div>
         {/* Task ID for tracking */}
         <div className="absolute top-1 right-1 text-white font-mono text-[7px] bg-black/40 px-1 rounded">
           {task.id?.slice(-4)}
         </div>
       </div>
       <span className="text-[10px] text-gray-600 font-medium text-center leading-tight max-w-[56px] truncate">
         {task.title}
       </span>
     </button>
   );
 }

function StoriesViewer({ stories, startIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);
  const progressRef = useRef(null);
  const touchStartX = useRef(null);

  const task = stories[currentIndex];

  const goNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(i => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setProgress(0);
    }
  };

  useEffect(() => {
    setProgress(0);
    const step = 50;
    const increment = (step / STORY_DURATION) * 100;

    progressRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(progressRef.current);
          goNext();
          return 100;
        }
        return p + increment;
      });
    }, step);

    return () => clearInterval(progressRef.current);
  }, [currentIndex]);

  const handleTap = (e) => {
    const x = e.clientX || (e.touches?.[0]?.clientX);
    const half = window.innerWidth / 2;
    if (x < half) goPrev();
    else goNext();
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx > 0) goPrev();
      else goNext();
    }
  };

  if (!task) return null;

  const label = getCategoryLabel(task.category);
  const currentPrice = calculateCurrentPrice(task);

  return (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center"
      style={{ zIndex: 100000 }}
      onClick={handleTap}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      dir="rtl"
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-3 pt-12">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{
                width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Close - top-right corner, away from menu button */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 z-30 w-9 h-9 bg-black/60 rounded-full flex items-center justify-center"
        style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <X className="w-4 h-4 text-white" />
      </button>

      {/* Background */}
      <div className="w-full h-full relative">
        {task.images?.[0] ? (
          <img src={task.images[0]} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: '#0f2b6b' }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
      </div>

      {/* Category badge */}
      <div className="absolute top-16 left-4 z-20">
        <span className="bg-black/60 text-white text-xs font-semibold px-2.5 py-1 rounded-full">{label}</span>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 text-white z-20" style={{ padding: '0 24px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
        <div className="text-4xl font-black mb-1">₪{currentPrice}</div>
        <h2 className="text-xl font-bold leading-tight mb-2">{task.title}</h2>
        {/* Task ID for tracking */}
        <div className="text-xs text-white/60 font-mono mb-2">ID: {task.id?.slice(-8)}</div>
        {task.description && (
          <p className="text-sm text-white/80 mb-3 line-clamp-2">{task.description}</p>
        )}
        {task.location_name && (
          <div className="flex items-center gap-1.5 text-xs text-white/70 mb-3">
            <MapPin className="w-3.5 h-3.5" />
            {task.location_name}
          </div>
        )}
        <Link
          to={`/task/${task.id}`}
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded-2xl flex items-center justify-center font-bold text-base py-4"
          style={{ color: '#1a3a6b' }}
          style={{ background: '#fbbf24', color: '#1a3a6b', boxShadow: 'none' }}
        >
          🔍 בדוק את הג'ובה
        </Link>
      </div>
    </div>
  );
}

export default function StoriesBar() {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const queryClient = useQueryClient();

  // Real-time price updates in stories
  useEffect(() => {
    const unsub = base44.entities.Task.subscribe((event) => {
      if (event.type === 'update' && event.data) {
        queryClient.setQueryData(['stories'], (old = []) =>
          old.map(t => t.id === event.data.id ? { ...t, price: event.data.price } : t)
        );
      }
    });
    return unsub;
  }, [queryClient]);

  const { data: stories = [] } = useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      const tasks = await base44.entities.Task.filter({ is_story: true }, '-created_date', 30);
      const now = new Date();
      return tasks.filter(t => t.story_expires_at && new Date(t.story_expires_at) > now && t.status === 'OPEN');
    },
    // Refresh every 30s so price updates are reflected
    refetchInterval: 30000,
    staleTime: 0,
  });

  if (stories.length === 0) return null;

  return (
    <>
      <div className="px-4 pt-2 pb-1">
        <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {stories.map((task, i) => (
            <StoryCard key={task.id} task={task} onClick={() => setSelectedIndex(i)} />
          ))}
        </div>
      </div>
      {selectedIndex !== null && (
        <StoriesViewer
          stories={stories}
          startIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
        />
      )}
    </>
  );
}