import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getCategoryLabel } from '@/lib/categories';
import { X, MapPin, Navigation, Eye, MousePointerClick } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { calculateCurrentPrice } from '@/lib/priceCalculator';
import { parseDescription } from '@/lib/descriptionParser';
import { useLanguage } from '@/lib/LanguageContext';

function calcDistKm(userLoc, task) {
  if (!userLoc || !task.lat || !task.lng) return null;
  const R = 6371;
  const dLat = (task.lat - userLoc.lat) * Math.PI / 180;
  const dLon = (task.lng - userLoc.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(userLoc.lat * Math.PI / 180) * Math.cos(task.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const STORY_DURATION = 5000;
const VIEWED_KEY = 'viewed_stories';

function getViewedIds() {
  try { return new Set(JSON.parse(localStorage.getItem(VIEWED_KEY) || '[]')); } catch { return new Set(); }
}
function markViewed(id) {
  const set = getViewedIds();
  set.add(id);
  localStorage.setItem(VIEWED_KEY, JSON.stringify([...set]));
}

// Sort stories: unviewed first
function sortStories(stories) {
  const viewed = getViewedIds();
  return [...stories].sort((a, b) => {
    const aViewed = viewed.has(a.id) ? 1 : 0;
    const bViewed = viewed.has(b.id) ? 1 : 0;
    return aViewed - bViewed;
  });
}

function StoryCard({ task, isViewed, isOwn, onClick, t }) {
  const label = getCategoryLabel(task.category);
  const emoji = label.split(' ')[0];
  const currentPrice = calculateCurrentPrice(task);
  const ringGradient = isOwn
    ? 'linear-gradient(135deg, #fbbf24, #f97316)'
    : isViewed
      ? 'linear-gradient(135deg, #9ca3af, #d1d5db)'
      : 'linear-gradient(135deg, #f97316, #ec4899, #1a6fd4)';
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{ position: 'relative' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: ringGradient,
          padding: 2.5,
          boxShadow: isViewed && !isOwn ? 'none' : '0 2px 12px rgba(26,111,212,0.3)',
          transition: 'opacity 0.2s',
        }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: '2px solid white', overflow: 'hidden', background: '#1a3a6b' }}>
            {task.images?.[0] ? (
              <img src={task.images[0]} alt={task.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)' }}>
                <span style={{ fontSize: 22, lineHeight: 1 }}>{emoji}</span>
              </div>
            )}
          </div>
        </div>
        {isOwn && (
          <div style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: '50%', background: '#fbbf24', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#7c2d12' }}>{t('story_me_pill')}</div>
        )}
      </div>
      <div style={{ background: isOwn ? 'linear-gradient(135deg,#f97316,#ea580c)' : 'linear-gradient(135deg,#1a6fd4,#0a52b0)', borderRadius: 99, padding: '2px 8px', fontSize: 10, fontWeight: 800, color: 'white' }}>₪{Math.round(currentPrice)}</div>
      <span style={{ fontSize: 10, color: isViewed && !isOwn ? '#94a3b8' : '#475569', fontWeight: 600, textAlign: 'center', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {task.title}
      </span>
    </button>
  );
}

function StoriesViewer({ stories, startIndex, onClose, userLocation, currentUserId, t }) {
  const { openTaskSheet } = useTaskSheet();
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const progressRef = useRef(null);
  const viewedInSessionRef = useRef(new Set());

  // Touch tracking
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const touchStartTime = useRef(null);
  const holdTimer = useRef(null);
  const isDragging = useRef(false);

  const task = stories[currentIndex];

  // Mark as viewed when story changes + debounced increment views_count
  const viewUpdateTimerRef = useRef(null);
  useEffect(() => {
    if (!task) return;
    markViewed(task.id);
    const isOwner = currentUserId && task.client_id === currentUserId;
    if (!isOwner && !viewedInSessionRef.current.has(task.id)) {
      viewedInSessionRef.current.add(task.id);
      // Debounce: only write after user stays on story for 1s
      clearTimeout(viewUpdateTimerRef.current);
      const taskId = task.id;
      const newViews = (task.views_count || 0) + 1;
      viewUpdateTimerRef.current = setTimeout(() => {
        base44.entities.Task.update(taskId, { views_count: newViews }).catch(() => {});  // eslint-disable-line
      }, 1000);
    }
    return () => clearTimeout(viewUpdateTimerRef.current);
  }, [currentIndex, task?.id]);

  const goNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(i => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  // Auto-advance progress
  useEffect(() => {
    clearInterval(progressRef.current);
    if (paused) return;

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
  }, [currentIndex, paused, goNext]);

  // Touch handlers — Instagram-style
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    isDragging.current = false;
    holdTimer.current = setTimeout(() => setPaused(true), 200);
  };

  const handleTouchMove = (e) => {
    if (!touchStartX.current) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (dx > 8 || dy > 8) {
      isDragging.current = true;
      clearTimeout(holdTimer.current);
    }
  };

  const handleTouchEnd = (e) => {
    clearTimeout(holdTimer.current);
    const elapsed = Date.now() - touchStartTime.current;
    const dx = e.changedTouches[0].clientX - touchStartX.current;

    if (paused && !isDragging.current) {
      setPaused(false);
      return;
    }
    setPaused(false);

    // Swipe gesture (horizontal drag > 60px)
    if (Math.abs(dx) > 60) {
      if (dx > 0) goPrev(); else goNext();
      return;
    }

    // Tap (short press, no drag)
    if (elapsed < 300 && !isDragging.current) {
      const x = e.changedTouches[0].clientX;
      if (x < window.innerWidth / 3) goPrev();
      else goNext();
    }
  };

  // Mouse support (desktop)
  const handleMouseDown = (e) => {
    touchStartX.current = e.clientX;
    touchStartTime.current = Date.now();
    isDragging.current = false;
    holdTimer.current = setTimeout(() => setPaused(true), 200);
  };

  const handleMouseUp = (e) => {
    clearTimeout(holdTimer.current);
    const elapsed = Date.now() - touchStartTime.current;
    const dx = e.clientX - touchStartX.current;

    if (paused) { setPaused(false); return; }

    if (Math.abs(dx) > 60) {
      if (dx > 0) goPrev(); else goNext();
      return;
    }

    if (elapsed < 300) {
      if (e.clientX < window.innerWidth / 3) goPrev();
      else goNext();
    }
  };

  const clickTrackedRef = useRef(new Set());

  if (!task) return null;

  const label = getCategoryLabel(task.category);
  const currentPrice = calculateCurrentPrice(task);
  const applyCost = Math.max(1, Math.round((currentPrice || 0) * 0.05));
  const distKm = calcDistKm(userLocation, task);
  const { mainDescription } = parseDescription(task.description);
  const isOwnerStory = currentUserId && task.client_id === currentUserId;
  const handleTaskClick = (e) => {
    e.stopPropagation();
    if (isOwnerStory) return;
    // Only track once per task per session
    if (clickTrackedRef.current.has(task.id)) return;
    clickTrackedRef.current.add(task.id);
    const newClicks = (task.clicks_count || 0) + 1;
    base44.entities.Task.update(task.id, { clicks_count: newClicks }).catch(() => {}); // eslint-disable-line
  };

  return (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center"
      style={{ zIndex: 100000, userSelect: 'none', touchAction: 'pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      dir="rtl"
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-3" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        {stories.map((_, i) => (
          <div key={i} className="flex-1 rounded-full overflow-hidden" style={{ height: 2, background: 'rgba(255,255,255,0.35)' }}>
            <div
              className="h-full bg-white rounded-full"
              style={{
                width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%',
                transition: i === currentIndex ? 'none' : undefined,
              }}
            />
          </div>
        ))}
      </div>

      {/* Close */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute z-30 w-9 h-9 bg-black/60 rounded-full flex items-center justify-center"
        style={{ top: 'max(48px, calc(env(safe-area-inset-top) + 36px))', right: 12 }}
        onMouseDown={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85" />
      </div>

      {/* Category badge */}
      <div className="absolute z-20" style={{ top: 'max(60px, calc(env(safe-area-inset-top) + 48px))', left: 14 }}>
        <span className="bg-black/60 text-white text-xs font-semibold px-3 py-1 rounded-full">{label}</span>
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 z-20" style={{ paddingBottom: 'max(100px, calc(env(safe-area-inset-bottom) + 80px))' }}>
        <div style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.7) 70%, transparent 100%)', padding: '32px 20px 14px', color: 'white' }}>
          <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1, marginBottom: 4 }}>₪{Math.round(currentPrice)}</div>
          <h2 style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.25, marginBottom: 8 }}>{task.title}</h2>
          {mainDescription && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.45 }}>{mainDescription}</p>
          )}
          {(task.location_name || distKm != null) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 4, flexWrap: 'wrap' }}>
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
        <div style={{ padding: '0 16px' }}>
          {/* Owner stats row */}
          {isOwnerStory && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Eye size={14} color="rgba(255,255,255,0.9)" />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: 'white', lineHeight: 1 }}>{task.views_count || 0}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{t('story_views')}</div>
                </div>
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MousePointerClick size={14} color="rgba(255,255,255,0.9)" />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: 'white', lineHeight: 1 }}>{task.clicks_count || 0}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{t('story_clicks')}</div>
                </div>
              </div>
            </div>
          )}
          <div
            onClick={(e) => { handleTaskClick(e); openTaskSheet(task.id); }}
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', borderRadius: 18, background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', boxShadow: '0 4px 16px rgba(26,111,212,0.4)', fontWeight: 800, fontSize: 15, color: 'white', padding: '14px 20px', textDecoration: 'none', cursor: 'pointer' }}
          >
            {t('story_check_task')}
            {!isOwnerStory && (
              <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '2px 9px', fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 3 }}>
                {applyCost}
                <svg viewBox="0 0 24 24" width="12" height="12"><circle cx="12" cy="12" r="11" fill="#fbbf24"/><text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="900" fontFamily="Inter,sans-serif" fill="#1a6fd4">J</text></svg>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StoriesBar({ filterCategory = null, currentUserId = null }) {
  const { t } = useLanguage();
  const { openTaskSheet } = useTaskSheet();
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [viewedIds, setViewedIds] = useState(() => getViewedIds());
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

  useEffect(() => {
    const unsub = base44.entities.Task.subscribe((event) => {
      // Any task create/update/delete can affect stories — invalidate to refresh
      if (event.type === 'create' || event.type === 'delete') {
        queryClient.invalidateQueries({ queryKey: ['stories'] });
        return;
      }
      if (event.type === 'update' && event.data) {
        const patch = event.data;
        // Update story data in cache (price, status, story_expires_at, etc.)
        queryClient.setQueryData(['stories'], (old = []) =>
          old.map(t => t.id === event.id ? { ...t, ...patch } : t)
        );
        // If story status changed or expired, refetch to filter properly
        if (patch.status || patch.story_expires_at || patch.is_story === false) {
          queryClient.invalidateQueries({ queryKey: ['stories'] });
        }
      }
    });
    return unsub;
  }, [queryClient]);

  const { data: rawStories = [] } = useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      const tasks = await base44.entities.Task.filter({ is_story: true }, '-created_date', 30);
      const now = new Date();
      return tasks.filter(t => t.story_expires_at && new Date(t.story_expires_at) > now && t.status === 'OPEN');
    },
    staleTime: 15000,
    refetchOnWindowFocus: true,
  });

  // Filter by category if specified; for 'all' (null), show stories matching user's context
  const filteredRaw = filterCategory
    ? rawStories.filter(t => t.category === filterCategory)
    : rawStories;

  // Sort: own stories always first (with gold ring), then unviewed, then viewed
  const stories = (() => {
    const ownStories = currentUserId ? filteredRaw.filter(t => t.client_id === currentUserId) : [];
    const otherStories = currentUserId ? filteredRaw.filter(t => t.client_id !== currentUserId) : filteredRaw;
    return [...ownStories, ...sortStories(otherStories)];
  })();

  const handleOpen = (index) => {
    setSelectedIndex(index);
  };

  const handleClose = () => {
    setSelectedIndex(null);
    // Refresh viewed state
    setViewedIds(getViewedIds());
  };

  if (stories.length === 0) return null;

  return (
    <>
      <div className="pt-2 pb-1">
        <div
          className="flex gap-3 overflow-x-auto"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            paddingLeft: 16,
            paddingRight: 16,
            paddingBottom: 6,
          }}
        >
          {stories.map((task, i) => (
            <StoryCard
              key={task.id}
              task={task}
              isViewed={viewedIds.has(task.id)}
              isOwn={!!currentUserId && task.client_id === currentUserId}
              onClick={() => handleOpen(i)}
              t={t}
            />
          ))}
        </div>
      </div>
      {selectedIndex !== null && (
        <StoriesViewer
          stories={stories}
          startIndex={selectedIndex}
          userLocation={userLocation}
          currentUserId={currentUserId}
          onClose={handleClose}
          t={t}
        />
      )}
    </>
  );
}