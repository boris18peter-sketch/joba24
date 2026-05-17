import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Search, SlidersHorizontal, SearchX, X, Sparkles, MapPin, Banknote, Flame, Clock } from 'lucide-react';
import TaskCardWithSwipe from '@/components/TaskCardWithSwipe';
import FilterSheet from '@/components/FilterSheet';
import InstantMatchPopup from '@/components/InstantMatchPopup';
import StoriesBar from '@/components/StoriesBar';
import MyTasksCarousel from '@/components/MyTasksCarousel';
import ActiveTaskBanner from '@/components/ActiveTaskBanner';
import { CATEGORIES, getCategoryLabel } from '@/lib/categories';
import { rankFeedTasks, buildSmartSections } from '@/lib/feedRanker';

export default function HomeFeed() {
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {return JSON.parse(localStorage.getItem('joba_searches') || '[]');} catch {return [];}
  });
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '', time: '', city: '', category: '', approvalMode: '', sortBy: '' });
  const [activeSection, setActiveSection] = useState('all'); // 'all' | 'nearby' | 'highpay' | 'urgent' | 'new'
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [dismissedTasks, setDismissedTasks] = useState(new Set());
  const [newTaskIds, setNewTaskIds] = useState(new Set()); // for live pulse animation
  const queryClient = useQueryClient();

  const { user: me, isAuthenticated } = useAuth();

  // My published tasks
  const { data: myTasks = [] } = useQuery({
    queryKey: ['myTasks', me?.id],
    queryFn: () => base44.entities.Task.filter({ client_id: me.id }, '-created_date', 20),
    enabled: !!me?.id,
    staleTime: 30000,
    refetchOnWindowFocus: true,
    refetchInterval: 60000
  });

  // Active task I'm working on as a worker
  const { data: activeWorkerTask } = useQuery({
    queryKey: ['activeWorkerTask', me?.id],
    queryFn: () => base44.entities.Task.filter({ worker_id: me.id, status: 'TAKEN' }, '-created_date', 1),
    select: (data) => data?.[0] || null,
    enabled: !!me?.id,
    refetchInterval: 30000,
    staleTime: 0,
    refetchOnWindowFocus: true
  });

  // Active task I published that is currently TAKEN
  const activeClientTask = myTasks.find((t) => t.status === 'TAKEN') || null;

  // My applications — to show status on feed cards
  const { data: myApplications = [] } = useQuery({
    queryKey: ['myApplicationsFeed', me?.id],
    queryFn: () => base44.entities.TaskApplication.filter({ worker_id: me.id }, '-created_date', 100),
    enabled: !!me?.id,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['allTasks'],
    queryFn: () => base44.functions.invoke('getOpenTasks').then(r => r.data.tasks || []),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
  });

  // ── Real-time subscriptions ──────────────────────────────────────────────
  useEffect(() => {
    if (!me?.id) return;

    const unsubTask = base44.entities.Task.subscribe((event) => {
      const updatedTask = event.data || {};

      // 1. Update global tasks feed
      queryClient.setQueryData(['allTasks'], (old = []) => {
        // Safety: if cache is empty (not yet loaded), don't touch it — let queryFn handle the initial load
        if (event.type === 'create') {
          if (!updatedTask?.id) return old;
          if (old.find((t) => t.id === event.id)) return old;
          setNewTaskIds((prev) => new Set([...prev, event.id]));
          setTimeout(() => setNewTaskIds((prev) => {const n = new Set(prev);n.delete(event.id);return n;}), 4000);
          return [updatedTask, ...old];
        }
        if (event.type === 'update') {
          // Only update if we already have this task in cache (don't add unknown tasks)
          if (!old.find((t) => t.id === event.id)) return old;
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
      const appData = event.data || {};
      const isMyApp = appData.worker_id === me.id;
      const isForMyTask = appData.task_id && myTasks.some(t => t.id === appData.task_id);

      if (isMyApp) {
        if (event.type === 'create') {
          queryClient.setQueryData(['myApplicationsFeed', me.id], (old = []) => {
            // Remove any optimistic/duplicate entry for this task, then add real record
            const filtered = old.filter(a =>
              !(a.task_id === appData.task_id && a.worker_id === me.id)
            );
            return [...filtered, appData];
          });
          queryClient.setQueryData(['myApp', appData.task_id, me.id], appData);
        }
        if (event.type === 'update') {
          queryClient.setQueryData(['myApplicationsFeed', me.id], (old = []) =>
            old.map(a => a.id === event.id ? { ...a, ...appData } : a)
          );
          queryClient.setQueryData(['myApp', appData.task_id, me.id], (old) =>
            old?.id === event.id ? { ...old, ...appData } : old
          );
        }
        if (event.type === 'delete') {
          queryClient.setQueryData(['myApplicationsFeed', me.id], (old = []) =>
            old.filter(a => a.id !== event.id)
          );
        }
        // Hard sync only on update (not every create)
        if (event.type === 'update') {
          queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed', me.id] });
        }
      }

      // If it's an application for one of MY published tasks — sync the applicants panel
      if (isForMyTask) {
        queryClient.invalidateQueries({ queryKey: ['applications', appData.task_id] });
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

  // Auto price bump — only run on MY tasks, only every 5 minutes via interval
  useEffect(() => {
    const bumpableTasks = myTasks.filter(t =>
      t.status === 'OPEN' && t.auto_bump_enabled && t.max_price && t.price < t.max_price
    );
    if (!bumpableTasks.length) return;

    const runBump = async () => {
      for (const task of bumpableTasks) {
        const ageMinutes = (Date.now() - new Date(task.created_date).getTime()) / 1000 / 60;
        if (ageMinutes < 5) continue;
        const intervals = Math.min(Math.floor(ageMinutes / 5), 12);
        const base = task.base_price || task.price;
        const step = (task.max_price - base) / 12;
        const expectedPrice = Math.min(Math.round(base + step * intervals), task.max_price);
        if (expectedPrice > task.price) {
          // Check pending apps before bumping
          const pendingApps = await base44.entities.TaskApplication.filter({ task_id: task.id, status: 'pending' });
          if (pendingApps.length === 0) {
            base44.entities.Task.update(task.id, { price: expectedPrice });
          }
        }
      }
    };

    runBump();
    const interval = setInterval(runBump, 5 * 60 * 1000); // every 5 minutes
    return () => clearInterval(interval);
  }, [myTasks]);

  // ── Smart Ranking Engine ──────────────────────────────────────────────────
  // Build worker profile for category matching
  const workerProfile = useMemo(() => {
    const categoryHistory = {};
    (myTasks || []).filter(t => t.status === 'COMPLETED').forEach(t => {
      if (t.category) categoryHistory[t.category] = (categoryHistory[t.category] || 0) + 1;
    });
    return {
      preferredCategories: me?.preferred_categories || [],
      preferredCities: me?.preferred_cities || [],
      categoryHistory,
    };
  }, [myTasks, me?.preferred_categories, me?.preferred_cities]);

  // Categorize my applications
  const approvedApps = myApplications.filter(a => a.status === 'approved');
  const pendingApps  = myApplications.filter(a => a.status === 'pending');
  const approvedTaskIds = new Set(approvedApps.map(a => a.task_id));
  const pendingTaskIds  = new Set(pendingApps.map(a => a.task_id));

  // Filter: only OPEN tasks from OTHER users, not dismissed, matching search/filters
  const candidateTasks = tasks.filter(t => {
    if (t.status !== 'OPEN') return false;
    if (me?.id && t.client_id === me.id) return false; // hide own tasks only when logged in
    if (dismissedTasks.has(t.id)) return false;
    const q = search.toLowerCase();
    if (search && !(
      t.title?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.city?.toLowerCase().includes(q) ||
      t.location_name?.toLowerCase().includes(q) ||
      String(t.price).includes(search.trim())
    )) return false;
    if (filters.minPrice && t.price < Number(filters.minPrice)) return false;
    if (filters.maxPrice && t.price > Number(filters.maxPrice)) return false;
    if (filters.time && t.estimated_time !== filters.time) return false;
    if (filters.city && !t.city?.includes(filters.city) && !t.location_name?.includes(filters.city)) return false;
    if (filters.category && t.category !== filters.category) return false;
    if (filters.approvalMode && t.approval_mode !== filters.approvalMode) return false;
    return true;
  });

  // Run smart ranking
  const rankedTasks = useMemo(() =>
    rankFeedTasks(candidateTasks, userLocation, workerProfile),
    [candidateTasks.length, userLocation?.lat, userLocation?.lng, workerProfile]
  );

  // Override sort if user manually picks one
  const sortedByFilter = useMemo(() => {
    if (filters.sortBy === 'newest') return [...rankedTasks].sort((a,b) => new Date(b.created_date) - new Date(a.created_date));
    if (filters.sortBy === 'price_desc') return [...rankedTasks].sort((a,b) => b.price - a.price);
    if (filters.sortBy === 'price_asc') return [...rankedTasks].sort((a,b) => a.price - b.price);
    return rankedTasks;
  }, [rankedTasks, filters.sortBy]);

  // Pin approved/pending tasks to top
  const sortedTasks = useMemo(() => {
    return [...sortedByFilter].sort((a, b) => {
      const rankA = approvedTaskIds.has(a.id) ? 0 : pendingTaskIds.has(a.id) ? 1 : 2;
      const rankB = approvedTaskIds.has(b.id) ? 0 : pendingTaskIds.has(b.id) ? 1 : 2;
      return rankA - rankB;
    });
  }, [sortedByFilter, approvedTaskIds, pendingTaskIds]);

  // Smart sections (only when not filtering/searching)
  const smartSections = useMemo(() =>
    (!search && !filters.category && !filters.sortBy) ? buildSmartSections(rankedTasks) : null,
    [rankedTasks, search, filters.category, filters.sortBy]
  );

  // Which tasks to show in the feed based on active section tab
  const displayedTasks = useMemo(() => {
    if (!smartSections || activeSection === 'all') return sortedTasks;
    if (activeSection === 'nearby')  return smartSections.nearby.length  ? smartSections.nearby  : sortedTasks;
    if (activeSection === 'highpay') return smartSections.highPaying.length ? smartSections.highPaying : sortedTasks;
    if (activeSection === 'urgent')  return smartSections.urgent.length  ? smartSections.urgent  : sortedTasks;
    if (activeSection === 'new')     return smartSections.newTasks.length ? smartSections.newTasks : sortedTasks;
    return sortedTasks;
  }, [sortedTasks, smartSections, activeSection]);

  const hasFilters = filters.city || filters.minPrice || filters.maxPrice || filters.time || filters.approvalMode || filters.sortBy || filters.category;

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

      {/* Login Banner — show only when not authenticated */}
      {!isAuthenticated && (
        <div style={{ background: 'linear-gradient(135deg, #1a6fd4 0%, #0a52b0 100%)', padding: '24px 20px', textAlign: 'center', color: 'white' }}>
          <div style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 8px', letterSpacing: -0.5 }}>
              צריך שמישהו יעשה לך <span style={{ color: '#fbbf24' }}>עבודה?</span>
            </h2>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.9)' }}>
              <div>כל משימה משימה — גם קטנה או הכי מדורה</div>
              <div>פשוט תפרסם - וימשהו ייצא לביצוע וזריז וכמו</div>
              <div>דקות!</div>
            </div>
          </div>
          <button
            onClick={() => { base44.auth.redirectToLogin(); }}
            style={{
              background: 'white',
              color: '#1a6fd4',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 14,
              fontWeight: 900,
              fontSize: 15,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              transition: 'transform 0.15s',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            התחברות
          </button>
        </div>
      )}

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

        {/* Section title + smart section tabs */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', margin: 0 }}>משימות שאחרים פרסמו</h2>
            <div style={{ flex: 1, height: 1, background: '#e8eef8' }} />
          </div>
          {/* Smart section selector — only show when not filtering */}
          {smartSections && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: 2 }}>
              {[
                { id: 'all',     icon: <Sparkles size={11} />, label: 'מומלץ', count: sortedTasks.length },
                { id: 'nearby',  icon: <MapPin size={11} />,    label: 'קרוב אליך', count: smartSections.nearby.length },
                { id: 'highpay', icon: <Banknote size={11} />,  label: 'שכר גבוה', count: smartSections.highPaying.length },
                { id: 'urgent',  icon: <Flame size={11} />,     label: 'דחוף', count: smartSections.urgent.length },
                { id: 'new',     icon: <Clock size={11} />,     label: 'חדש',  count: smartSections.newTasks.length },
              ].filter(s => s.id === 'all' || s.count > 0).map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  style={{
                    flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    border: 'none', cursor: 'pointer',
                    background: activeSection === s.id ? '#1a6fd4' : 'white',
                    color: activeSection === s.id ? 'white' : '#475569',
                    boxShadow: activeSection === s.id ? '0 2px 8px rgba(26,111,212,0.25)' : '0 1px 4px rgba(0,0,0,0.06)',
                    transition: 'all 0.15s',
                  }}
                >
                  {s.icon} {s.label}
                  {s.id !== 'all' && <span style={{ fontSize: 9, opacity: 0.7, marginRight: 1 }}>({s.count})</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search + Filter + Categories toolbar — always visible */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #eaeff7', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {/* Search row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search size={11} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: searchFocused ? '#1a6fd4' : '#cbd5e1', pointerEvents: 'none' }} />
                  <input
                placeholder="חיפוש משימות..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(search)}
                style={{
                  width: '100%', height: 28, borderRadius: 7,
                  border: `0.5px solid ${searchFocused ? '#93c5fd' : '#e2e8f0'}`,
                  paddingRight: 24, paddingLeft: search ? 20 : 6,
                  fontSize: 11, fontFamily: 'inherit',
                  background: '#f8fafc', outline: 'none', color: '#1a2540',
                  transition: 'all 0.15s', boxSizing: 'border-box'
                }} />
              
                  {search &&
              <button onClick={() => setSearch('')} style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                      <X size={10} color="#94a3b8" />
                    </button>
              }
                  {searchFocused && !search && recentSearches.length > 0 &&
              <div style={{ position: 'absolute', top: 32, right: 0, left: 0, background: 'white', borderRadius: 8, border: '1px solid #e8eef8', boxShadow: '0 6px 16px rgba(0,0,0,0.08)', zIndex: 50, overflow: 'hidden' }}>
                      {recentSearches.map((s, i) =>
                <button key={i} onClick={() => {setSearch(s);setSearchFocused(false);}}
                style={{ width: '100%', padding: '5px 10px', background: 'none', border: 'none', textAlign: 'right', fontSize: 11, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Search size={9} color="#94a3b8" /> {s}
                        </button>
                )}
                    </div>
              }
                </div>
                {/* Filter button */}
                <button
              onClick={() => setShowFilters(true)}
              style={{
                flexShrink: 0, width: 28, height: 28, borderRadius: 6,
                border: `0.5px solid ${hasFilters ? '#60a5fa' : '#e2e8f0'}`,
                background: hasFilters ? '#1a6fd4' : '#f8fafc',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', position: 'relative', transition: 'all 0.15s'
              }}>
              
                  <SlidersHorizontal size={10} color={hasFilters ? 'white' : '#64748b'} strokeWidth={1.8} />
                  {hasFilters && <span style={{ position: 'absolute', top: 3, right: 3, width: 3, height: 3, borderRadius: '50%', background: '#fbbf24', border: '0.5px solid white' }} />}
                </button>
                {/* Live count */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, background: '#eff6ff', borderRadius: 16, padding: '2px 6px', border: '0.5px solid #dbeafe' }}>
                  <span style={{ position: 'relative', display: 'inline-flex', width: 4, height: 4 }}>
                    <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#60a5fa', animation: 'ping 1.5s ease-in-out infinite', opacity: 0.7 }} />
                    <span style={{ position: 'relative', width: 4, height: 4, borderRadius: '50%', background: '#3b82f6' }} />
                  </span>
                  <span style={{ fontSize: 9, color: '#1d4ed8', fontWeight: 600 }}>{sortedTasks.filter((t) => t.status === 'OPEN').length}</span>
                </div>
              </div>

              {/* Category pills */}
              <div style={{ display: 'flex', gap: 3, overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                <button
              onClick={() => setFilters((f) => ({ ...f, category: '' }))}
              style={{ flexShrink: 0, padding: '3px 10px', borderRadius: 16, fontSize: 9, fontWeight: 500, border: '0.5px solid transparent', cursor: 'pointer', background: !filters.category ? '#1a6fd4' : '#eef2ff', color: !filters.category ? 'white' : '#4f46e5', transition: 'all 0.15s' }}>
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
                style={{ flexShrink: 0, padding: '3px 10px', borderRadius: 16, fontSize: 9, fontWeight: 500, border: '0.5px solid transparent', cursor: 'pointer', background: isActive ? '#1a6fd4' : '#eef2ff', color: isActive ? 'white' : '#4f46e5', display: 'flex', alignItems: 'center', gap: 2, transition: 'all 0.15s' }}>
                  
                        {c.label}{count > 0 && <span style={{ opacity: 0.6, fontSize: 8 }}>({count})</span>}
                      </button>);

            })}
              </div>

              {/* Active filter chips */}
              {hasFilters &&
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {filters.category && <span onClick={() => setFilters(f => ({...f, category: ''}))} style={{ fontSize: 9, background: '#1a6fd4', color: 'white', padding: '1px 7px', borderRadius: 20, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>{getCategoryLabel(filters.category)} ✕</span>}
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
        displayedTasks.length === 0 ?
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
            {displayedTasks.map((task) => {
            const myApp = myApplications.find((a) => a.task_id === task.id && (a.status === 'pending' || a.status === 'approved'));
            const isNew = newTaskIds.has(task.id);
            return (
              <div key={task.id} style={{ position: 'relative', animation: isNew ? 'slideInFresh 0.4s ease-out' : undefined }}>
                  <TaskCardWithSwipe
                  task={task}
                  myApp={myApp}
                  isMyTask={false}
                  currentUserId={isAuthenticated ? me?.id : null}
                  workerName={me?.full_name}
                  badges={task._badges}
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