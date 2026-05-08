import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import TaskCard from '@/components/TaskCard';
import TaskCardWithSwipe from '@/components/TaskCardWithSwipe';
import FilterSheet from '@/components/FilterSheet';
import InstantMatchPopup from '@/components/InstantMatchPopup';
import StoriesBar from '@/components/StoriesBar';
import MyTasksCarousel from '@/components/MyTasksCarousel';
import ActiveTaskBanner from '@/components/ActiveTaskBanner';
import { CATEGORIES, getCategoryLabel } from '@/lib/categories';

export default function HomeFeed() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '', time: '', city: '', category: '', approvalMode: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [dismissedTasks, setDismissedTasks] = useState(new Set());
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

  // Smart sort: distance + price + preference
  const preferredCategories = me?.preferred_categories || [];
  const preferredCities = me?.preferred_cities || [];

  // Filter out my own tasks from the main feed, and only show funded (or legacy unflagged) tasks
  const otherTasks = tasks.filter(t =>
    t.client_id !== me?.id &&
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
      // TAKEN/COMPLETED/CANCELLED tasks: only show if I have an active application
      if (t.status !== 'OPEN' && !isApprovedForMe && !isPendingForMe) return false;
      // If task is TAKEN and I only have a pending app, hide it (already assigned to someone else)
      if (t.status === 'TAKEN' && isPendingForMe && !isApprovedForMe) return false;
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

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b" style={{ background: 'rgba(244,247,251,0.97)', borderColor: '#dce8f5', backdropFilter: 'blur(8px)' }}>
        <div className="px-4 pt-4 pb-3">
          {/* Logo at right edge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <img src="https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg" alt="Joba24" style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 12 }} />
            <h1 className="text-3xl font-black tracking-tight" style={{ color: '#0f2b6b' }}>Joba<span style={{ color: '#fbbf24' }}>24</span></h1>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
            <p className="text-sm" style={{ color: '#1a6fd4' }}>{sortedTasks.length} ג'ובות פתוחות</p>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#1a6fd4' }} />
              <Input
                placeholder="חפש לפי מיקום, קטגוריה, מחיר..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-9 rounded-xl h-12 text-sm"
                style={{
                  background: 'white',
                  border: '2px solid #bfdbfe',
                  boxShadow: '0 2px 8px rgba(26,111,212,0.1)',
                  fontWeight: search ? 600 : 400,
                }}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className={`rounded-xl h-12 w-12 shrink-0`}
              style={hasFilters ? { background: '#1a6fd4', color: 'white', borderColor: '#1a6fd4' } : { borderColor: '#bfdbfe', background: 'white', boxShadow: '0 2px 8px rgba(26,111,212,0.1)' }}
              onClick={() => setShowFilters(true)}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>

          {/* Category quick filter - sorted by task count */}
          <div className="flex gap-2 mt-2 overflow-x-auto" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            <button
              onClick={() => setFilters(f => ({ ...f, category: '' }))}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={!filters.category ? { background: '#1a6fd4', color: 'white' } : { background: '#dbeafe', color: '#1d4ed8' }}
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
                return (
                  <button key={c.value}
                    onClick={() => setFilters(f => ({ ...f, category: f.category === c.value ? '' : c.value }))}
                    className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1"
                    style={filters.category === c.value ? { background: '#1a6fd4', color: 'white' } : { background: '#dbeafe', color: '#1d4ed8' }}
                  >
                    {c.label}
                    {count > 0 && <span className="opacity-70">({count})</span>}
                  </button>
                );
              })}
          </div>

          {hasFilters && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {filters.city && <span className="text-xs bg-black text-white px-2 py-1 rounded-full">{filters.city}</span>}
              {(filters.minPrice || filters.maxPrice) && <span className="text-xs bg-black text-white px-2 py-1 rounded-full">₪{filters.minPrice || 0}–{filters.maxPrice || '∞'}</span>}
              {filters.time && <span className="text-xs bg-black text-white px-2 py-1 rounded-full">{filters.time}</span>}
              {filters.approvalMode && <span className="text-xs bg-black text-white px-2 py-1 rounded-full">{filters.approvalMode === 'instant' ? '⚡ מיידי' : '✋ לאישור'}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Active Task Banner — worker or client with in-progress task */}
      {(activeWorkerTask || activeClientTask) && (
        <div style={{ paddingTop: 12 }}>
          <ActiveTaskBanner task={activeWorkerTask || activeClientTask} />
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
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-semibold text-gray-800">לא נמצאו משימות</p>
            <p className="text-sm text-gray-400 mt-1">נסה לשנות את הפילטרים</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTasks.map(task => {
              const myApp = myApplications.find(a => a.task_id === task.id);
              return (
                <TaskCardWithSwipe 
                  key={task.id} 
                  task={task} 
                  myApp={myApp}
                  isMyTask={false}
                  onDismiss={(taskId) => {
                    setDismissedTasks(prev => new Set([...prev, taskId]));
                  }} 
                />
              );
            })}
          </div>
        )}
      </div>

      <FilterSheet open={showFilters} onClose={() => setShowFilters(false)} filters={filters} onApply={setFilters} />
      <InstantMatchPopup userLocation={userLocation} currentUserId={me?.id} />
    </div>
  );
}