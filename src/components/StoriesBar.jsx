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
     <button onClick={() => onClick(task)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>
       {/* Gradient ring like Instagram stories */}
       <div style={{
         width: 64, height: 64,
         borderRadius: '50%',
         background: 'linear-gradient(135deg, #f97316, #ec4899, #1a6fd4)',
         padding: 2.5,
         boxShadow: '0 2px 12px rgba(26,111,212,0.3)',
       }}>
         <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: '2px solid white', overflow: 'hidden', background: '#1a3a6b' }}>
           {task.images?.[0] ? (
             <img src={task.images[0]} alt={task.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
           ) : (
             <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', gap: 1 }}>
               <span style={{ fontSize: 22, lineHeight: 1 }}>{emoji}</span>
             </div>
           )}
         </div>
       </div>
       {/* Price badge */}
       <div style={{ background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', borderRadius: 99, padding: '2px 8px', fontSize: 10, fontWeight: 800, color: 'white', letterSpacing: 0.3 }}>₪{currentPrice}</div>
       <span style={{ fontSize: 10, color: '#475569', fontWeight: 600, textAlign: 'center', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
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
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900 to-gray-900" />
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
          className="w-full rounded-2xl flex items-center justify-center font-bold text-base py-4 text-white"
          style={{ background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', boxShadow: '0 4px 16px rgba(26,111,212,0.4)' }}
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
    staleTime: 60000,
    refetchOnWindowFocus: false,
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