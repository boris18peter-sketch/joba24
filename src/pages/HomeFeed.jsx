import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, SlidersHorizontal, SearchX, X } from 'lucide-react';
import TaskCardWithSwipe from '@/components/TaskCardWithSwipe';
import FilterSheet from '@/components/FilterSheet';
import InstantMatchPopup from '@/components/InstantMatchPopup';
import StoriesBar from '@/components/StoriesBar';
import MyTasksCarousel from '@/components/MyTasksCarousel';
import ActiveTaskBanner from '@/components/ActiveTaskBanner';
import { CATEGORIES, getCategoryLabel } from '@/lib/categories';

export default function HomeFeed() {
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('joba_searches') || '[]'); } catch { return []; }
  });
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '', time: '', city: '', category: '', approvalMode: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [dismissedTasks, setDismissedTasks] = useState(new Set());
  const [newTaskIds, setNewTaskIds] = useState(new Set()); // for live pulse animation
  const queryClient = useQueryClient();

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  // My published tasks
  const { data: myTasks = [] } = useQuery({
    queryKey: ['myTasks', me?.id],
    queryFn: () => base44.entities.Task.filter({ client_id: me.id }, '-created_date', 20),
    enabled: !!me?.id,
  });

  // Active task I'm working on as a worker
  const { data: activeWorkerTask } = useQuery({
    queryKey: ['activeWorkerTask', me?.id],
    queryFn: () => base44.entities.Task.filter({ worker_id: me.id, status: 'TAKEN' }, '-created_date', 1),
    select: data => data?.[0] || null,
    enabled: !!me?.id,
    refetchInterval: 5000,
    staleTime: 0,
  });

  // Active task I published that is currently TAKEN
  const activeClientTask = myTasks.find(t => t.status === 'TAKEN') || null;

  // My applications — to show status on feed cards
  const { data: myApplications = [] } = useQuery({
    queryKey: ['myApplicationsFeed', me?.id],
    queryFn: () => base44.entities.TaskApplication.filter({ worker_id: me.id }, '-created_date', 100),
    enabled: !!me?.id,
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 50),
  });

  // ── Real-time subscriptions ──────────────────────────────────────────────
  useEffect(() => {
    // Live task feed: update/remove tasks instantly on any change
    const unsubTask = base44.entities.Task.subscribe((event) => {
      queryClient.setQueryData(['tasks'], (old = []) => {
        if (event.type === 'create') {
          if (old.find(t => t.id === event.id)) return old;
          // Mark as new for pulse animation
          setNewTaskIds(prev => new Set([...prev, event.id]));
          setTimeout(() => setNewTaskIds(prev => { const n = new Set(prev); n.delete(event.id); return n; }), 4000);
          return [event.data, ...old];
        }
        if (event.type === 'update') {
          // If task is no longer OPEN (taken, closed, cancelled, completed) — remove from feed
          const updatedTask = { ...(old.find(t => t.id === event.id) || {}), ...event.data };
          if (updatedTask.status && updatedTask.status !== 'OPEN') {
            return old.map(t => t.id === event.id ? updatedTask : t);
          }
          return old.map(t => t.id === event.id ? updatedTask : t);
        }
        if (event.type === 'delete') {
          return old.filter(t => t.id !== event.id);
        }
        return old;
      });
      // Also update myTasks cache
      if (me?.id) {
        queryClient.setQueryData(['myTasks', me.id], (old = []) => {
          if (event.type === 'update') return old.map(t => t.id === event.id ? { ...t, ...event.data } : t);
          if (event.type === 'delete') return old.filter(t => t.id !== event.id);
          return old;
        });
      }
    });

    // Live application updates: refresh my applications cache instantly
    const unsubApp = base44.entities.TaskApplication.subscribe((event) => {
      if (!me?.id) return;
      if (event.data?.worker_id === me.id || event.type === 'delete') {
        queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed', me.id] });
      }
    });

    return () => { unsubTask(); unsubApp(); };
  }, [me?.id, queryClient]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, []);

  // Auto price bump
  useEffect(() => {
    if (!tasks.length) return;
    tasks.forEach(task => {
      if (task.status !== 'OPEN') return;
      if (!task.auto_bump_enabled || !task.max_price) return;
      if (task.price >= task.max_price) return;
      const ageMinutes = (Date.now() - new Date(task.created_date).getTime()) / 1000 / 60;
      if (ageMinutes < 5) return;
      const intervals = Math.min(Math.floor(ageMinutes / 5), 12);
      const base = task.base_price || task.price;
      const step = (task.max_price - base) / 12;
      const expectedPrice = Math.min(Math.round(base + step * intervals), task.max_price);
      if (expectedPrice > task.price) {
        base44.entities.Task.update(task.id, { price: expectedPrice });
      }
    });
  }, [tasks]);

  function getDistance(lat1, lng1, lat2, lng2) {
    if (!lat1 || !lng1 || !lat2 || !lng2) return null;
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Smart sort: distance + price + preference + task history
  const preferredCategories = me?.preferred_categories || [];
  const preferredCities = me?.preferred_cities || [];

  // Build category affinity from completed tasks history
  const categoryAffinity = React.useMemo(() => {
    const map = {};
    (myTasks || []).filter(t => t.status === 'COMPLETED').forEach(t => {
      if (t.category) map[t.category] = (map[t.category] || 0) + 1;
    });
    return map;
  }, [myTasks]);

  // Show all funded tasks: other people's + my own (with isMyTask flag)
  const otherTasks = tasks.filter(t =>
    (t.payment_status === 'funded' || !t.payment_status)
  );

  // Categorize applications
  const approvedApps = myApplications.filter(a => a.status === 'approved');
  const pendingApps = myApplications.filter(a => a.status === 'pending');
  const approvedTaskIds = new Set(approvedApps.map(a => a.task_id));
  const pendingTaskIds = new Set(pendingApps.map(a => a.task_id));

  const scored = otherTasks
    .filter(t => {
      // Show only OPEN tasks OR tasks where I have an approved/pending application
      const myAppForThis = myApplications.find(a => a.task_id === t.id);
      const isApprovedForMe = myAppForThis?.status === 'approved';
      const isPendingForMe = myAppForThis?.status === 'pending';
      // Only show OPEN tasks in the main feed
      // TAKEN/COMPLETED/CANCELLED/EXPIRED: hide entirely from feed
      if (t.status !== 'OPEN') return false;
      if (dismissedTasks.has(t.id)) return false;
      const searchLower = search.toLowerCase();
      const matchSearch = !search ||
        t.title?.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower) ||
        t.city?.toLowerCase().includes(searchLower) ||
        t.location_name?.toLowerCase().includes(searchLower) ||
        String(t.price).includes(search.trim());
      const matchMinPrice = !filters.minPrice || t.price >= Number(filters.minPrice);
      const matchPrice = !filters.maxPrice || t.price <= Number(filters.maxPrice);
      const matchTime = !filters.time || t.estimated_time === filters.time;
      const matchCity = !filters.city || t.city?.includes(filters.city) || t.location_name?.includes(filters.city);
      const matchCat = !filters.category || t.category === filters.category;
      const matchApproval = !filters.approvalMode || t.approval_mode === filters.approvalMode;
      return matchSearch && matchMinPrice && matchPrice && matchTime && matchCity && matchCat && matchApproval;
    })
    .map(t => {
      const distKm = userLocation ? getDistance(userLocation.lat, userLocation.lng, t.lat, t.lng) : null;
      let relevance = 0;
      
      // Preferred category: +3
      if (preferredCategories.includes(t.category)) relevance += 3;
      
      // History-based affinity (categories I've worked in before): up to +2.5
      if (categoryAffinity[t.category]) {
        relevance += Math.min(categoryAffinity[t.category] * 0.5, 2.5);
      }
      
      // Preferred city: +2
      if (preferredCities.some(c => t.city?.includes(c) || t.location_name?.includes(c))) relevance += 2;
      
      // Distance factor (closer is better): up to +2
      if (distKm != null && !isNaN(distKm)) {
        if (distKm < 2) relevance += 2;
        else if (distKm < 5) relevance += 1;
      }
      
      // Price factor (higher pays more): up to +1.5
      if (t.price > 300) relevance += 1.5;
      else if (t.price > 150) relevance += 0.75;
      
      // New tasks get slight freshness boost (up to +1)
      const ageHours = (Date.now() - new Date(t.created_date).getTime()) / 3600000;
      if (ageHours < 1) relevance += 1;
      else if (ageHours < 6) relevance += 0.5;
      
      return {
        ...t,
        _distKm: distKm,
        _relevance: relevance,
      };
    });

  // Sort by: 1) approved (accepted tasks), 2) pending (waiting for approval), 3) others by relevance
  const sortedTasks = scored.sort((a, b) => {
    const aIsApproved = approvedTaskIds.has(a.id) ? 0 : 2;
    const bIsApproved = approvedTaskIds.has(b.id) ? 0 : 2;
    const aIsPending = !approvedTaskIds.has(a.id) && pendingTaskIds.has(a.id) ? 1 : aIsApproved;
    const bIsPending = !approvedTaskIds.has(b.id) && pendingTaskIds.has(b.id) ? 1 : bIsApproved;
    
    if (aIsPending !== bIsPending) return aIsPending - bIsPending;
    return b._relevance - a._relevance || new Date(b.created_date) - new Date(a.created_date);
  });

  const hasFilters = filters.city || filters.minPrice || filters.maxPrice || filters.time || filters.approvalMode;

  const handleSearchSubmit = (val) => {
    if (!val.trim()) return;
    setSearch(val);
    setSearchFocused(false);
    setRecentSearches(prev => {
      const updated = [val, ...prev.filter(s => s !== val)].slice(0, 5);
      localStorage.setItem('joba_searches', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b" style={{ background: 'rgba(244,247,251,0.97)', borderColor: '#e8eef8', backdropFilter: 'blur(10px)' }}>
        <div className="px-4 pt-4 pb-3">
          {/* Logo row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg" alt="Joba24" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 10 }} />
              <span style={{ fontWeight: 900, fontSize: 22, color: '#0f2b6b', letterSpacing: -0.5 }}>Joba<span style={{ color: '#fbbf24' }}>24</span></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ position: 'relative', display: 'inline-flex', width: 7, height: 7 }}>
                <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#60a5fa', animation: 'ping 1.5s ease-in-out infinite', opacity: 0.7 }} />
                <span style={{ position: 'relative', width: 7, height: 7, borderRadius: '50%', background: '#3b82f6' }} />
              </span>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{sortedTasks.length} פתוחות</span>
              {/* Filter button — compact */}
              <button
                onClick={() => setShowFilters(true)}
                style={{
                  width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: hasFilters ? '#1a6fd4' : 'white',
                  boxShadow: '0 1px 4px rgba(26,111,212,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginRight: 4,
                  position: 'relative',
                }}
              >
                <SlidersHorizontal size={15} color={hasFilters ? 'white' : '#64748b'} />
                {hasFilters && <span style={{ position: 'absolute', top: 6, left: 6, width: 6, height: 6, borderRadius: '50%', background: '#fbbf24', border: '1px solid white' }} />}
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: searchFocused ? '#1a6fd4' : '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
              <input
                placeholder="חפש לפי מיקום, קטגוריה..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                onKeyDown={e => e.key === 'Enter' && handleSearchSubmit(search)}
                style={{
                  width: '100%', height: 42, borderRadius: 14, border: `1.5px solid ${searchFocused ? '#93c5fd' : '#e8eef8'}`,
                  paddingRight: 38, paddingLeft: search ? 36 : 14, fontSize: 14, fontFamily: 'inherit',
                  background: 'white', outline: 'none', color: '#1a2540',
                  boxShadow: searchFocused ? '0 0 0 3px rgba(147,197,253,0.25)' : '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.15s',
                  boxSizing: 'border-box',
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}>
                  <X size={14} color="#94a3b8" />
                </button>
              )}
            </div>

            {/* Search suggestions dropdown */}
            {searchFocused && !search && recentSearches.length > 0 && (
              <div style={{ position: 'absolute', top: 46, right: 0, left: 0, background: 'white', borderRadius: 14, border: '1px solid #e8eef8', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>חיפושים אחרונים</div>
                {recentSearches.map((s, i) => (
                  <button key={i} onClick={() => { setSearch(s); setSearchFocused(false); }}
                    style={{ width: '100%', padding: '9px 14px', background: 'none', border: 'none', textAlign: 'right', fontSize: 13, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Search size={12} color="#94a3b8" /> {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category quick filter */}
          <div className="flex gap-2 mt-2.5 overflow-x-auto" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: 2 }}>
            <button
              onClick={() => setFilters(f => ({ ...f, category: '' }))}
              style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: !filters.category ? '#1a6fd4' : '#eef2ff', color: !filters.category ? 'white' : '#4f46e5' }}
            >הכל</button>
            {[...CATEGORIES]
              .sort((a, b) => {
                const countA = tasks.filter(t => t.category === a.value && t.status === 'OPEN').length;
                const countB = tasks.filter(t => t.category === b.value && t.status === 'OPEN').length;
                return countB - countA;
              })
              .map(c => {
                const count = tasks.filter(t => t.category === c.value && t.status === 'OPEN').length;
                if (count === 0 && !filters.category) return null;
                const isActive = filters.category === c.value;
                return (
                  <button key={c.value}
                    onClick={() => setFilters(f => ({ ...f, category: f.category === c.value ? '' : c.value }))}
                    style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                      background: isActive ? '#1a6fd4' : '#eef2ff', color: isActive ? 'white' : '#4f46e5',
                      display: 'flex', alignItems: 'center', gap: 3 }}
                  >
                    {c.label}
                    {count > 0 && <span style={{ opacity: 0.65, fontSize: 11 }}>({count})</span>}
                  </button>
                );
              })}
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {filters.city && <span style={{ fontSize: 11, background: '#1e293b', color: 'white', padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>{filters.city}</span>}
              {(filters.minPrice || filters.maxPrice) && <span style={{ fontSize: 11, background: '#1e293b', color: 'white', padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>₪{filters.minPrice || 0}–{filters.maxPrice || '∞'}</span>}
              {filters.time && <span style={{ fontSize: 11, background: '#1e293b', color: 'white', padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>{filters.time}</span>}
              {filters.approvalMode && <span style={{ fontSize: 11, background: '#1e293b', color: 'white', padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>{filters.approvalMode === 'instant' ? 'מיידי' : 'לאישור'}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Active Task Banner — worker and/or client with in-progress task */}
      {(activeWorkerTask || activeClientTask) && (
        <div style={{ paddingTop: 12 }}>
          {activeWorkerTask && <ActiveTaskBanner task={activeWorkerTask} />}
          {activeClientTask && activeClientTask.id !== activeWorkerTask?.id && <ActiveTaskBanner task={activeClientTask} />}
        </div>
      )}

      {/* Stories - מעוכב לטעינה */}
      <React.Suspense fallback={null}>
      <StoriesBar />
      </React.Suspense>

      {/* My Published Tasks Carousel */}
      <MyTasksCarousel myTasks={myTasks} />

      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))
        ) : scored.length === 0 ? (
          <div className="text-center py-20">
            <SearchX size={40} className="mx-auto mb-3 text-gray-300" strokeWidth={1.2} />
            <p className="font-semibold text-gray-800">לא נמצאו משימות</p>
            <p className="text-sm text-gray-400 mt-1">נסה לשנות את הפילטרים</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sortedTasks.map(task => {
              const myApp = myApplications.find(a => a.task_id === task.id);
              const isNew = newTaskIds.has(task.id);
              const isMyTask = task.client_id === me?.id;
              return (
                <div key={task.id} style={{ position: 'relative', animation: isNew ? 'slideInFresh 0.4s ease-out' : undefined }}>
                  {isNew && (
                    <div style={{ position: 'absolute', top: -8, right: 12, zIndex: 10, background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, boxShadow: '0 2px 8px rgba(16,185,129,0.4)' }}>
                      חדש עכשיו
                    </div>
                  )}
                  <TaskCardWithSwipe 
                    task={task} 
                    myApp={myApp}
                    isMyTask={isMyTask}
                    onDismiss={(taskId) => {
                      setDismissedTasks(prev => new Set([...prev, taskId]));
                    }} 
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <FilterSheet open={showFilters} onClose={() => setShowFilters(false)} filters={filters} onApply={setFilters} />
      <InstantMatchPopup userLocation={userLocation} currentUserId={me?.id} />
      <style>{`
        @keyframes slideInFresh {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ping {
          0%, 100% { transform: scale(1); opacity: 0.75; }
          50% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}