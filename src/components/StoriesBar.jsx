import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getCategoryLabel } from '@/lib/categories';
import { X, MapPin, Navigation } from 'lucide-react';
import { Link } from 'react-router-dom';
import { calculateCurrentPrice } from '@/lib/priceCalculator';

function calcDistKm(userLoc, task) {
  if (!userLoc || !task.lat || !task.lng) return null;
  const R = 6371;
  const dLat = (task.lat - userLoc.lat) * Math.PI / 180;
  const dLon = (task.lng - userLoc.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(userLoc.lat * Math.PI / 180) * Math.cos(task.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

function StoriesViewer({ stories, startIndex, onClose, userLocation }) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const progressRef = useRef(null);
  const touchStartX = useRef(null);
  const touchStartTime = useRef(null);
  const holdTimer = useRef(null);

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
    if (paused) {
      clearInterval(progressRef.current);
      return;
    }
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
  }, [currentIndex, paused]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
    // Hold to pause
    holdTimer.current = setTimeout(() => setPaused(true), 150);
  };

  const handleTouchEnd = (e) => {
    clearTimeout(holdTimer.current);
    const elapsed = Date.now() - touchStartTime.current;
    const dx = e.changedTouches[0].clientX - touchStartX.current;

    if (paused) {
      setPaused(false);
      return;
    }

    if (Math.abs(dx) > 50) {
      if (dx > 0) goPrev();
      else goNext();
    } else if (elapsed < 300) {
      const x = e.changedTouches[0].clientX;
      const half = window.innerWidth / 2;
      if (x < half) goPrev();
      else goNext();
    }
  };

  const handleMouseDown = () => {
    holdTimer.current = setTimeout(() => setPaused(true), 150);
  };

  const handleMouseUp = () => {
    clearTimeout(holdTimer.current);
    if (paused) setPaused(false);
  };

  if (!task) return null;

  const label = getCategoryLabel(task.category);
  const currentPrice = calculateCurrentPrice(task);
  const applyCost = Math.max(1, Math.round((currentPrice || 0) * 0.05));
  const distKm = calcDistKm(userLocation, task);

  return (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center"
      style={{ zIndex: 100000, userSelect: 'none' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
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

      {/* Content — bottom panel with background */}
      <div className="absolute bottom-0 left-0 right-0 z-20" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
        {/* Text background panel */}
        <div style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 70%, transparent 100%)', padding: '28px 20px 16px', color: 'white' }}>
          <div style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, marginBottom: 4 }}>₪{currentPrice}</div>
          <h2 style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.25, marginBottom: task.description ? 8 : 10 }}>{task.title}</h2>

          {task.description && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.45 }}>{task.description}</p>
          )}
          {(task.location_name || distKm != null) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 12, flexWrap: 'wrap' }}>
              {task.location_name && <><MapPin size={12} /><span>{task.location_name.split(',')[0]}</span></>}
              {distKm != null && !isNaN(distKm) && (
                <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Navigation size={10} />
                  {distKm < 1 ? `${Math.round(distKm * 1000)}מ'` : `${distKm.toFixed(1)}ק"מ`}
                </span>
              )}
            </div>
          )}
        </div>
        {/* CTA button */}
        <div style={{ padding: '0 16px' }}>
          <Link
            to={`/task/${task.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', borderRadius: 18, background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', boxShadow: '0 4px 16px rgba(26,111,212,0.4)', fontWeight: 800, fontSize: 15, color: 'white', padding: '14px 20px', textDecoration: 'none' }}
          >
            🔍 בדוק את המשימה
            <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '2px 9px', fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 3 }}>
              {applyCost}
              <svg viewBox="0 0 24 24" width="12" height="12"><circle cx="12" cy="12" r="11" fill="#fbbf24"/><text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="900" fontFamily="Inter,sans-serif" fill="#1a6fd4">J</text></svg>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function StoriesBar() {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { timeout: 5000 }
      );
    }
  }, []);

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
          userLocation={userLocation}
          onClose={() => setSelectedIndex(null)}
        />
      )}
    </>
  );
}