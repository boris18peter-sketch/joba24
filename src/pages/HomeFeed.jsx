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
    try {return JSON.parse(localStorage.getItem('joba_searches') || '[]');} catch {return [];}
  });
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '', time: '', city: '', category: '', approvalMode: '', sortBy: '' });
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
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 10000
  });

  // Active task I'm working on as a worker
  const { data: activeWorkerTask } = useQuery({
    queryKey: ['activeWorkerTask', me?.id],
    queryFn: () => base44.entities.Task.filter({ worker_id: me.id, status: 'TAKEN' }, '-created_date', 1),
    select: (data) => data?.[0] || null,
    enabled: !!me?.id,
    refetchInterval: 3000,
    staleTime: 0,
    refetchOnWindowFocus: true
  });

  // Active task I published that is currently TAKEN
  const activeClientTask = myTasks.find((t) => t.status === 'TAKEN') || null;

  // My applications — to show status on feed cards
  const { data: myApplications = [] } = useQuery({
    queryKey: ['myApplicationsFeed', me?.id],
    queryFn: () => base44.entities.TaskApplication.filter({ worker_id: me.id }, '-created_date', 100),
    enabled: !!me?.id
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 50)
  });

  // ── Real-time subscriptions ──────────────────────────────────────────────
  useEffect(() => {
    if (!me?.id) return;

    const unsubTask = base44.entities.Task.subscribe((event) => {
      const updatedTask = event.data || {};

      // 1. Update global tasks feed
      queryClient.setQueryData(['tasks'], (old = []) => {
        if (event.type === 'create') {
          if (old.find((t) => t.id === event.id)) return old;
          setNewTaskIds((prev) => new Set([...prev, event.id]));
          setTimeout(() => setNewTaskIds((prev) => {const n = new Set(prev);n.delete(event.id);return n;}), 4000);
          return [updatedTask, ...old];
        }
        if (event.type === 'update') {
          return old.map((t) => t.id === event.id ? { ...t, ...updatedTask } : t);
        }
        if (event.type === 'delete') {
          return old.filter((t) => t.id !== event.id);
        }
        return old;
      });

      // 2a. Keep myTasksPage in sync (MyTasks page cache)
      queryClient.setQueryData(['myTasksPage', me.id], (old = []) => {
        if (!old) return old;
        if (event.type === 'create') {
          if (updatedTask.client_id !== me.id) return old;
          if (old.find((t) => t.id === event.id)) return old;
          return [updatedTask, ...old];
        }
        if (event.type === 'update') return old.map((t) => t.id === event.id ? { ...t, ...updatedTask } : t);
        if (event.type === 'delete') return old.filter((t) => t.id !== event.id);
        return old;
      });

      // 2b. Update myTasks cache — update status live, remove CANCELLED/COMPLETED
      queryClient.setQueryData(['myTasks', me.id], (old = []) => {
        if (event.type === 'create') {
          // Add new task if I'm the client
          if (updatedTask.client_id === me.id && !old.find((t) => t.id === event.id)) {
            return [updatedTask, ...old];
          }
          return old;
        }
        if (event.type === 'update') {
          const merged = { ...updatedTask };
          // Keep CANCELLED and COMPLETED visible for repost, but update status
          return old.map((t) => t.id === event.id ? { ...t, ...merged } : t);
        }
        if (event.type === 'delete') {
          return old.filter((t) => t.id !== event.id);
        }
        return old;
      });

      // 3. Update activeWorkerTask cache live
      queryClient.setQueryData(['activeWorkerTask', me.id], (old) => {
        if (event.type === 'update' && old?.id === event.id) {
          const merged = { ...old, ...updatedTask };
          // If task is no longer TAKEN, clear the banner
          if (merged.status !== 'TAKEN') return null;
          return merged;
        }
        if (event.type === 'delete' && old?.id === event.id) return null;
        // If a new TAKEN task assigned to me appears
        if (event.type === 'update' && updatedTask.worker_id === me.id && updatedTask.status === 'TAKEN') {
          return updatedTask;
        }
        return old;
      });
    });

    // Live application updates — sync immediately on create/update/delete
    const unsubApp = base44.entities.TaskApplication.subscribe((event) => {
      const isMyApp = event.data?.worker_id === me.id || event.type === 'delete';
      const isForMyTask = event.data?.task_id && myTasks.some(t => t.id === event.data.task_id);

      if (isMyApp) {
        if (event.type === 'update' && event.data) {
          // Instant cache update
          queryClient.setQueryData(['myApplicationsFeed', me.id], (old = []) =>
            old.map(a => a.id === event.id ? { ...a, ...event.data } : a)
          );
          // Also sync the per-task myApp cache
          queryClient.setQueryData(['myApp', event.data.task_id, me.id], (old) =>
            old?.id === event.id ? { ...old, ...event.data } : old
          );
        }
        if (event.type === 'create' && event.data) {
          queryClient.setQueryData(['myApplicationsFeed', me.id], (old = []) => {
            if (old.find(a => a.id === event.id)) return old;
            // Replace optimistic entry if exists
            const filtered = old.filter(a => a.id !== `optimistic_${event.data.task_id}`);
            return [...filtered, event.data];
          });
          queryClient.setQueryData(['myApp', event.data.task_id, me.id], event.data);
        }
        queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed', me.id] });
      }

      // If it's an application for one of MY published tasks — sync the applicants panel
      if (isForMyTask) {
        queryClient.invalidateQueries({ queryKey: ['applications', event.data.task_id] });
      }
    });

    return () => {unsubTask();unsubApp();};
  }, [me?.id, queryClient]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, []);

  // Auto price bump — stop bumping when there's a pending application, resume when cancelled
  useEffect(() => {
    if (!tasks.length) return;
    tasks.forEach(async (task) => {
      if (task.status !== 'OPEN') return;
      if (!task.auto_bump_enabled || !task.max_price) return;
      if (task.price >= task.max_price) return;

      // Check if there's already a pending application — if so, pause bumping
      const pendingApps = await base44.entities.TaskApplication.filter({ task_id: task.id, status: 'pending' });
      if (pendingApps.length > 0) return; // pause bump while someone applied

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
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Smart sort: distance + price + preference + task history
  const preferredCategories = me?.preferred_categories || [];
  const preferredCities = me?.preferred_cities || [];

  // Build category affinity from completed tasks history
  const categoryAffinity = React.useMemo(() => {
    const map = {};
    (myTasks || []).filter((t) => t.status === 'COMPLETED').forEach((t) => {
      if (t.category) map[t.category] = (map[t.category] || 0) + 1;
    });
    return map;
  }, [myTasks]);

  // Show only OTHER people's funded OPEN tasks (exclude my own published tasks)
  const otherTasks = tasks.filter((t) =>
  (t.payment_status === 'funded' || !t.payment_status) && t.client_id !== me?.id
  );

  // Categorize applications
  const approvedApps = myApplications.filter((a) => a.status === 'approved');
  const pendingApps = myApplications.filter((a) => a.status === 'pending');
  const approvedTaskIds = new Set(approvedApps.map((a) => a.task_id));
  const pendingTaskIds = new Set(pendingApps.map((a) => a.task_id));

  const scored = otherTasks.
  filter((t) => {
    // Show only OPEN tasks OR tasks where I have an approved/pending application
    const myAppForThis = myApplications.find((a) => a.task_id === t.id);
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
  }).
  map((t) => {
    const distKm = userLocation ? getDistance(userLocation.lat, userLocation.lng, t.lat, t.lng) : null;
    let relevance = 0;

    // Preferred category: +3
    if (preferredCategories.includes(t.category)) relevance += 3;

    // History-based affinity (categories I've worked in before): up to +2.5
    if (categoryAffinity[t.category]) {
      relevance += Math.min(categoryAffinity[t.category] * 0.5, 2.5);
    }

    // Preferred city: +2
    if (preferredCities.some((c) => t.city?.includes(c) || t.location_name?.includes(c))) relevance += 2;

    // Distance factor (closer is better): up to +2
    if (distKm != null && !isNaN(distKm)) {
      if (distKm < 2) relevance += 2;else
      if (distKm < 5) relevance += 1;
    }

    // Price factor (higher pays more): up to +1.5
    if (t.price > 300) relevance += 1.5;else
    if (t.price > 150) relevance += 0.75;

    // New tasks get slight freshness boost (up to +1)
    const ageHours = (Date.now() - new Date(t.created_date).getTime()) / 3600000;
    if (ageHours < 1) relevance += 1;else
    if (ageHours < 6) relevance += 0.5;

    return {
      ...t,
      _distKm: distKm,
      _relevance: relevance
    };
  });

  // Sort by: 1) approved (accepted tasks), 2) pending (waiting for approval), 3) others by sortBy/relevance
  const sortedTasks = scored.sort((a, b) => {
    const aIsApproved = approvedTaskIds.has(a.id) ? 0 : 2;
    const bIsApproved = approvedTaskIds.has(b.id) ? 0 : 2;
    const aIsPending = !approvedTaskIds.has(a.id) && pendingTaskIds.has(a.id) ? 1 : aIsApproved;
    const bIsPending = !approvedTaskIds.has(b.id) && pendingTaskIds.has(b.id) ? 1 : bIsApproved;

    if (aIsPending !== bIsPending) return aIsPending - bIsPending;

    if (filters.sortBy === 'newest') return new Date(b.created_date) - new Date(a.created_date);
    if (filters.sortBy === 'price_desc') return b.price - a.price;
    if (filters.sortBy === 'price_asc') return a.price - b.price;
    return b._relevance - a._relevance || new Date(b.created_date) - new Date(a.created_date);
  });

  const hasFilters = filters.city || filters.minPrice || filters.maxPrice || filters.time || filters.approvalMode || filters.sortBy;

  const handleSearchSubmit = (val) => {
    if (!val.trim()) return;
    setSearch(val);
    setSearchFocused(false);
    setRecentSearches((prev) => {
      const updated = [val, ...prev.filter((s) => s !== val)].slice(0, 5);
      localStorage.setItem('joba_searches', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div className="min-h-screen" style={{ background: '#f8f9fc' }} dir="rtl">
      {/* Header — fixed height, vertically centered, logo pinned right */}
      <div className="sticky top-0 z-40" style={{ background: 'rgba(248,249,252,0.97)', borderBottom: '1px solid #eaeef5', backdropFilter: 'blur(14px)', height: 56, display: 'flex', alignItems: 'center', paddingRight: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <img src="https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg" alt="Joba24" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 8 }} />
          <span style={{ fontWeight: 900, fontSize: 17, color: '#0f2b6b', letterSpacing: -0.5 }}>Joba<span style={{ color: '#fbbf24' }}>24</span></span>
        </div>
      </div>

      {/* Active Task Banners Carousel */}
      {(activeWorkerTask || activeClientTask) && (() => {
        const activeTasks = [];
        if (activeWorkerTask) activeTasks.push({ ...activeWorkerTask, _roleHint: 'worker' });
        if (activeClientTask && activeClientTask.id !== activeWorkerTask?.id) activeTasks.push({ ...activeClientTask, _roleHint: 'client' });
        return activeTasks.length > 0 && (
          <div style={{ padding: '14px 16px 0' }}>
            <ActiveTaskBanner tasks={activeTasks} roleHint={activeTasks[0]._roleHint} />
          </div>
        );
      })()}

      {/* Stories - מעוכב לטעינה */}
      <React.Suspense fallback={null}>
      <StoriesBar />
      </React.Suspense>

      {/* My Published Tasks Carousel */}
      {myTasks.some(t => ['OPEN', 'TAKEN', 'EXPIRED'].includes(t.status)) && (
        <MyTasksCarousel myTasks={myTasks} hideWhenWorking={false} />
      )}

      <div className="px-4 py-5">

        {/* Section title — always visible */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', margin: 0 }}>משימות שאחרים פרסמו</h2>
          <div style={{ flex: 1, height: 1, background: '#e8eef8' }} />
        </div>

        {/* Search + Filter + Categories toolbar — always visible */}
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #eaeff7', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {/* Search row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: searchFocused ? '#1a6fd4' : '#c4ccd8', pointerEvents: 'none' }} />
                  <input
                placeholder="חיפוש משימות..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(search)}
                style={{
                  width: '100%', height: 30, borderRadius: 8,
                  border: `1px solid ${searchFocused ? '#93c5fd' : '#e8eef7'}`,
                  paddingRight: 26, paddingLeft: search ? 22 : 8,
                  fontSize: 12, fontFamily: 'inherit',
                  background: '#f7f9fc', outline: 'none', color: '#1a2540',
                  transition: 'all 0.15s', boxSizing: 'border-box'
                }} />
              
                  {search &&
              <button onClick={() => setSearch('')} style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                      <X size={11} color="#94a3b8" />
                    </button>
              }
                  {searchFocused && !search && recentSearches.length > 0 &&
              <div style={{ position: 'absolute', top: 36, right: 0, left: 0, background: 'white', borderRadius: 10, border: '1px solid #e8eef8', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden' }}>
                      {recentSearches.map((s, i) =>
                <button key={i} onClick={() => {setSearch(s);setSearchFocused(false);}}
                style={{ width: '100%', padding: '7px 12px', background: 'none', border: 'none', textAlign: 'right', fontSize: 12, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Search size={10} color="#94a3b8" /> {s}
                        </button>
                )}
                    </div>
              }
                </div>
                {/* Filter button */}
                <button
              onClick={() => setShowFilters(true)}
              style={{
                flexShrink: 0, width: 30, height: 30, borderRadius: 8,
                border: `1px solid ${hasFilters ? '#93c5fd' : '#e8eef7'}`,
                background: hasFilters ? '#1a6fd4' : '#f7f9fc',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', position: 'relative'
              }}>
              
                  <SlidersHorizontal size={11} color={hasFilters ? 'white' : '#64748b'} />
                  {hasFilters && <span style={{ position: 'absolute', top: 4, right: 4, width: 4, height: 4, borderRadius: '50%', background: '#fbbf24', border: '1px solid white' }} />}
                </button>
                {/* Live count */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, background: '#eff6ff', borderRadius: 20, padding: '3px 7px', border: '1px solid #dbeafe' }}>
                  <span style={{ position: 'relative', display: 'inline-flex', width: 5, height: 5 }}>
                    <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#60a5fa', animation: 'ping 1.5s ease-in-out infinite', opacity: 0.75 }} />
                    <span style={{ position: 'relative', width: 5, height: 5, borderRadius: '50%', background: '#3b82f6' }} />
                  </span>
                  <span style={{ fontSize: 10, color: '#1d4ed8', fontWeight: 700 }}>{sortedTasks.filter((t) => t.status === 'OPEN').length}</span>
                </div>
              </div>

              {/* Category pills */}
              <div style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                <button
              onClick={() => setFilters((f) => ({ ...f, category: '' }))}
              style={{ flexShrink: 0, padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer', background: !filters.category ? '#1a6fd4' : '#eef2ff', color: !filters.category ? 'white' : '#4f46e5' }}>
              הכל</button>
                {[...CATEGORIES].
            sort((a, b) => tasks.filter((t) => t.category === b.value && t.status === 'OPEN').length - tasks.filter((t) => t.category === a.value && t.status === 'OPEN').length).
            map((c) => {
              const count = tasks.filter((t) => t.category === c.value && t.status === 'OPEN').length;
              if (count === 0 && !filters.category) return null;
              const isActive = filters.category === c.value;
              return (
                <button key={c.value}
                onClick={() => setFilters((f) => ({ ...f, category: f.category === c.value ? '' : c.value }))}
                style={{ flexShrink: 0, padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer', background: isActive ? '#1a6fd4' : '#eef2ff', color: isActive ? 'white' : '#4f46e5', display: 'flex', alignItems: 'center', gap: 2 }}>
                  
                        {c.label}{count > 0 && <span style={{ opacity: 0.5, fontSize: 9 }}>({count})</span>}
                      </button>);

            })}
              </div>

              {/* Active filter chips */}
              {hasFilters &&
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {filters.city && <span style={{ fontSize: 9, background: '#1e293b', color: 'white', padding: '1px 7px', borderRadius: 20, fontWeight: 500 }}>{filters.city}</span>}
                  {(filters.minPrice || filters.maxPrice) && <span style={{ fontSize: 9, background: '#1e293b', color: 'white', padding: '1px 7px', borderRadius: 20, fontWeight: 500 }}>₪{filters.minPrice || 0}–{filters.maxPrice || '∞'}</span>}
                  {filters.time && <span style={{ fontSize: 9, background: '#1e293b', color: 'white', padding: '1px 7px', borderRadius: 20, fontWeight: 500 }}>{filters.time}</span>}
                  {filters.approvalMode && <span style={{ fontSize: 9, background: '#1e293b', color: 'white', padding: '1px 7px', borderRadius: 20, fontWeight: 500 }}>לאישור</span>}
                  {filters.sortBy === 'newest' && <span style={{ fontSize: 9, background: '#1e293b', color: 'white', padding: '1px 7px', borderRadius: 20, fontWeight: 500 }}>🆕 חדשות קודם</span>}
                  {filters.sortBy === 'price_desc' && <span style={{ fontSize: 9, background: '#1e293b', color: 'white', padding: '1px 7px', borderRadius: 20, fontWeight: 500 }}>💰 מחיר גבוה</span>}
                  {filters.sortBy === 'price_asc' && <span style={{ fontSize: 9, background: '#1e293b', color: 'white', padding: '1px 7px', borderRadius: 20, fontWeight: 500 }}>💸 מחיר נמוך</span>}
                </div>
          }
        </div>

        {isLoading ?
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {Array(4).fill(0).map((_, i) =>
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
          )}
          </div> :
        scored.length === 0 ?
        <div className="text-center py-16">
            <SearchX size={36} className="mx-auto mb-3 text-gray-300" strokeWidth={1.2} />
            <p className="font-semibold text-gray-700">לא נמצאו משימות</p>
            <p className="text-sm text-gray-400 mt-1">נסה לשנות את הפילטרים</p>
            {(search || hasFilters) &&
          <button onClick={() => {setSearch('');setFilters({ minPrice: '', maxPrice: '', time: '', city: '', category: '', approvalMode: '' });}}
          style={{ marginTop: 14, padding: '8px 20px', borderRadius: 20, background: '#1a6fd4', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                נקה חיפוש
              </button>
          }
          </div> :

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {sortedTasks.map((task) => {
            const myApp = myApplications.find((a) => a.task_id === task.id);
            const isNew = newTaskIds.has(task.id);
            return (
              <div key={task.id} style={{ position: 'relative', animation: isNew ? 'slideInFresh 0.4s ease-out' : undefined }}>
                  {isNew &&
                <div style={{ position: 'absolute', top: -8, right: 12, zIndex: 10, background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, boxShadow: '0 2px 8px rgba(16,185,129,0.35)' }}>
                      חדש עכשיו
                    </div>
                }
                  <TaskCardWithSwipe
                  task={task}
                  myApp={myApp}
                  isMyTask={false}
                  currentUserId={me?.id}
                  workerName={me?.full_name}
                  onDismiss={(taskId) => {
                    setDismissedTasks((prev) => new Set([...prev, taskId]));
                  }} />
                
                </div>);

          })}
          </div>
        }
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
    </div>);

}