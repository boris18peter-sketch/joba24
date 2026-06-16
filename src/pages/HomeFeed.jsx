import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Search, SlidersHorizontal, SearchX, X, MapPin, Banknote, Flame, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator';

import TaskCardWithSwipe from '@/components/TaskCardWithSwipe';
import FilterSheet from '@/components/FilterSheet';
import InstantMatchPopup from '@/components/InstantMatchPopup';
import StoriesBar from '@/components/StoriesBar';
import MyTasksCarousel from '@/components/MyTasksCarousel';
import ActiveTaskBanner from '@/components/ActiveTaskBanner';
import LoginBannerCarousel from '@/components/LoginBannerCarousel';
import { CATEGORIES, getCategoryLabel } from '@/lib/categories';
import { useNavigate, Link } from 'react-router-dom';
import EmptyMyTasksState from '@/components/EmptyMyTasksState';
import PublishTaskOnboarding from '@/components/PublishTaskOnboarding';

import { rankFeedTasks, buildSmartSections, buildBehavioralProfile } from '@/lib/feedRanker';
import ProfileCompletionBanner from '@/components/ProfileCompletionBanner';

export default function HomeFeed() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {return JSON.parse(localStorage.getItem('joba_searches') || '[]');} catch {return [];}
  });
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '', time: '', city: '', categories: [], approvalMode: '', sortBy: '', urgency_tag: '', payment_method: '', forYou: false, requires_invoice: false });
  // Keep backward compat: single-category filter reads from categories[0]
  const filterCategory = filters.categories?.[0] || filters.category || '';
  const [activeSection, setActiveSection] = useState('all'); // 'all' | 'nearby' | 'highpay' | 'urgent' | 'new'
  const [showFilters, setShowFilters] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const [userLocation, setUserLocation] = useState(null);
  const [dismissedTasks, setDismissedTasks] = useState(new Set());
  const [newTaskIds, setNewTaskIds] = useState(new Set()); // for live pulse animation
  const [activeTab, setActiveTabRaw] = useState(() => sessionStorage.getItem('homeTab') || 'my_published');
  const setActiveTab = (tab) => { sessionStorage.setItem('homeTab', tab); sessionStorage.setItem('homeTabChosen', '1'); setActiveTabRaw(tab); };
  const [myPubTab, setMyPubTab] = useState('active'); // 'active' | 'completed' | 'other'

  // New task highlight — set when navigating back from CreateTask with ?newTaskId=
  const [highlightTaskId, setHighlightTaskId] = useState(() =>
    new URLSearchParams(window.location.search).get('newTaskId') || null
  );
  const [tapHintTaskId, setTapHintTaskId] = useState(null);

  const MY_PUB_TABS = [
    { key: 'active',    label: 'פעילות',  statuses: ['OPEN', 'TAKEN'] },
    { key: 'completed', label: 'הושלמו',  statuses: ['COMPLETED'] },
    { key: 'other',     label: 'ארכיון',  statuses: ['CANCELLED', 'EXPIRED'] },
  ];
  const queryClient = useQueryClient();

  const { user: me, isAuthenticated } = useAuth();

  // My published tasks
  const { data: myTasks = [] } = useQuery({
    queryKey: ['myTasks', me?.id],
    queryFn: () => base44.entities.Task.filter({ client_id: me.id }, '-created_date', 20),
    enabled: !!me?.id,
    staleTime: 15000,
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
  });

  // Auto-switch to my_published silently if user has active tasks and hasn't manually chosen a tab
  const didAutoSwitch = useRef(false);
  useEffect(() => {
    if (!didAutoSwitch.current && myTasks.length > 0 && myTasks.some(t => t.status === 'OPEN' || t.status === 'TAKEN')) {
      didAutoSwitch.current = true;
      if (!sessionStorage.getItem('homeTabChosen')) {
        setActiveTab('my_published');
      }
    }
  }, [myTasks.length]);

  // Active task I'm working on as a worker — short staleTime so it picks up changes quickly
  const { data: activeWorkerTask } = useQuery({
    queryKey: ['activeWorkerTask', me?.id],
    queryFn: () => base44.entities.Task.filter({ worker_id: me.id, status: 'TAKEN' }, '-created_date', 1),
    select: (data) => data?.[0] || null,
    enabled: !!me?.id,
    staleTime: 10000,
    refetchInterval: 15000,
    gcTime: 120000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: true,
  });

  // Active task I published that is currently TAKEN
  const activeClientTask = myTasks.find((t) => t.status === 'TAKEN') || null;

  // My applications — to show status on feed cards
  const { data: myApplications = [] } = useQuery({
    queryKey: ['myApplicationsFeed', me?.id],
    queryFn: () => base44.entities.TaskApplication.filter({ worker_id: me.id }, '-created_date', 100),
    enabled: !!me?.id,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['allTasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 200),
    staleTime: 60000,
    gcTime: 300000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Force refetch when auth state changes (e.g. user logs in) — only on actual login transition
  const prevAuthRef = useRef(null);
  useEffect(() => {
    if (prevAuthRef.current === false && isAuthenticated === true) {
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
    }
    if (isAuthenticated !== null) prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

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
          // Only show OPEN tasks in feed
          if (updatedTask.status && updatedTask.status !== 'OPEN') return old;
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

      // 3. Update activeWorkerTask cache live — includes worker_status sub-updates
      if (event.type === 'update') {
        queryClient.setQueryData(['activeWorkerTask', me.id], (old) => {
          // Update existing active task
          if (old?.id === event.id) {
            const merged = { ...old, ...updatedTask };
            return merged.status !== 'TAKEN' ? null : merged;
          }
          // New TAKEN task assigned to me — show banner immediately
          if (updatedTask.worker_id === me.id && updatedTask.status === 'TAKEN') {
            return updatedTask;
          }
          return old;
        });
        // Also invalidate to ensure fresh data is fetched soon
        if (updatedTask.worker_id === me.id || updatedTask.status === 'TAKEN') {
          queryClient.invalidateQueries({ queryKey: ['activeWorkerTask', me.id] });
        }
      }
      if (event.type === 'delete') {
        queryClient.setQueryData(['activeWorkerTask', me.id], (old) =>
          old?.id === event.id ? null : old
        );
      }

      // 4. Keep activeClientTask in sync (myTasks already updated above) — force re-render
      if (event.type === 'update' && updatedTask.client_id === me.id) {
        // Already handled by myTasks update — no extra work needed
      }
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
          // If cancelled/rejected, clear myApp so apply button re-appears
          if (appData.status === 'cancelled' || appData.status === 'rejected') {
            queryClient.setQueryData(['myApp', appData.task_id, me.id], null);
          } else {
            queryClient.setQueryData(['myApp', appData.task_id, me.id], (old) =>
              old?.id === event.id ? { ...old, ...appData } : old
            );
          }
        }
        if (event.type === 'delete') {
          queryClient.setQueryData(['myApplicationsFeed', me.id], (old = []) =>
            old.filter(a => a.id !== event.id)
          );
          queryClient.setQueryData(['myApp', appData.task_id, me.id], (old) =>
            old?.id === event.id ? null : old
          );
        }
        // Data already updated via setQueryData above — no extra network call needed
      }

      // If it's an application for one of MY published tasks — sync the applicants panel + update task applicant count
      if (isForMyTask) {
        // Use setQueryData instead of invalidate to avoid extra API calls
        queryClient.setQueryData(['applications', appData.task_id], (old = []) => {
          if (!old) return old;
          if (event.type === 'create') return old.find(a => a.id === appData.id) ? old : [...old, appData];
          if (event.type === 'update') return old.map(a => a.id === appData.id ? { ...a, ...appData } : a);
          if (event.type === 'delete') return old.filter(a => a.id !== appData.id);
          return old;
        });
        // Also bump the task.applicants array so liveApplicantCount in TaskCard updates immediately
        if (event.type === 'create' && (appData.status === 'pending' || appData.status === 'approved')) {
          queryClient.setQueryData(['myTasks', me.id], (old = []) =>
            old.map(t => t.id === appData.task_id
              ? { ...t, applicants: [...(t.applicants || []), { worker_id: appData.worker_id, worker_name: appData.worker_name }] }
              : t
            )
          );
          queryClient.setQueryData(['allTasks'], (old = []) =>
            old.map(t => t.id === appData.task_id
              ? { ...t, applicants: [...(t.applicants || []), { worker_id: appData.worker_id, worker_name: appData.worker_name }] }
              : t
            )
          );
        }
        if (event.type === 'update' && (appData.status === 'cancelled' || appData.status === 'rejected')) {
          // Remove from applicants array
          queryClient.setQueryData(['myTasks', me.id], (old = []) =>
            old.map(t => t.id === appData.task_id
              ? { ...t, applicants: (t.applicants || []).filter(a => a.worker_id !== appData.worker_id) }
              : t
            )
          );
          queryClient.setQueryData(['allTasks'], (old = []) =>
            old.map(t => t.id === appData.task_id
              ? { ...t, applicants: (t.applicants || []).filter(a => a.worker_id !== appData.worker_id) }
              : t
            )
          );
        }
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
  // Use a ref so myTasks changes don't restart the interval and trigger extra API calls
  const myTasksRef = useRef(myTasks);
  useEffect(() => { myTasksRef.current = myTasks; }, [myTasks]);

  useEffect(() => {
    if (!me?.id) return;

    const runBump = async () => {
      const bumpableTasks = myTasksRef.current.filter(t =>
        t.status === 'OPEN' && t.auto_bump_enabled && t.max_price && t.price < t.max_price
      );
      if (!bumpableTasks.length) return;

      for (const task of bumpableTasks) {
        const existingApps = await base44.entities.TaskApplication.filter({ task_id: task.id });
        const hasActiveApp = existingApps.some(a => a.status === 'pending' || a.status === 'approved');
        if (hasActiveApp) continue;

        const ageMinutes = (Date.now() - new Date(task.created_date).getTime()) / 1000 / 60;
        if (ageMinutes < 5) continue;
        const intervals = Math.min(Math.floor(ageMinutes / 5), 12);
        const base = task.base_price || task.price;
        const step = (task.max_price - base) / 12;
        const expectedPrice = Math.min(Math.round(base + step * intervals), task.max_price);
        if (expectedPrice > task.price) {
          base44.entities.Task.update(task.id, { price: expectedPrice });
        }
      }
    };

    const interval = setInterval(runBump, 5 * 60 * 1000); // every 5 minutes, no immediate call
    return () => clearInterval(interval);
  }, [me?.id]);

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

  // Build behavioral profile from applications + completed tasks
  const behavioralProfile = useMemo(() => {
    const completedTasks = (myTasks || []).filter(t => t.status === 'COMPLETED' && t.worker_id === me?.id);
    const appliedTaskDetails = myApplications.map(a => {
      const task = tasks.find(t => t.id === a.task_id);
      return task || { category: null, price: null };
    });
    return buildBehavioralProfile(appliedTaskDetails, completedTasks);
  }, [myApplications, myTasks, tasks, me?.id]);

  // Categorize my applications
  const approvedApps = myApplications.filter(a => a.status === 'approved');
  const pendingApps  = myApplications.filter(a => a.status === 'pending');
  const approvedTaskIds = new Set(approvedApps.map(a => a.task_id));
  const pendingTaskIds  = new Set(pendingApps.map(a => a.task_id));

  // My own OPEN tasks to show in the available feed (same card style, isMyPublished)
  const myOpenTasks = useMemo(() =>
    myTasks.filter(t => t.status === 'OPEN'),
    [myTasks]
  );

  // Filter: only OPEN tasks from OTHER users, not dismissed, matching search/filters
  const candidateTasks = tasks.filter(t => {
    if (t.status !== 'OPEN') return false;
    // own tasks stay in the feed — ranked normally alongside others
    if (dismissedTasks.has(t.id)) return false;
    const q = search.toLowerCase().replace('#', '');
    if (search && !(
      t.title?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.city?.toLowerCase().includes(q) ||
      t.location_name?.toLowerCase().includes(q) ||
      String(t.price).includes(search.trim()) ||
      t.id?.toLowerCase().includes(q) ||
      t.id?.slice(-8).toLowerCase() === q
    )) return false;
    if (filters.minPrice && t.price < Number(filters.minPrice)) return false;
    if (filters.maxPrice && t.price > Number(filters.maxPrice)) return false;
    if (filters.time && t.estimated_time !== filters.time) return false;
    if (filters.city && !t.city?.includes(filters.city) && !t.location_name?.includes(filters.city)) return false;
    if (filters.categories?.length > 0 && !filters.categories.includes(t.category)) return false;
    if (filters.approvalMode && t.approval_mode !== filters.approvalMode) return false;
    if (filters.urgency_tag && t.urgency_tag !== filters.urgency_tag) return false;
    if (filters.payment_method && t.payment_method !== filters.payment_method) return false;
    if (filters.requires_invoice && !t.requires_invoice) return false;
    return true;
  });

  // Run smart ranking — pass isLoggedIn + behavioralProfile
  const rankedTasks = useMemo(() =>
    rankFeedTasks(candidateTasks, userLocation, workerProfile, { isLoggedIn: !!isAuthenticated, behavioralProfile }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [candidateTasks, userLocation?.lat, userLocation?.lng, workerProfile, isAuthenticated, behavioralProfile]
  );

  // Override sort if user manually picks one
  const sortedByFilter = useMemo(() => {
    if (filters.sortBy === 'newest') return [...rankedTasks].sort((a,b) => new Date(b.created_date) - new Date(a.created_date));
    if (filters.sortBy === 'price_desc') return [...rankedTasks].sort((a,b) => b.price - a.price);
    if (filters.sortBy === 'price_asc') return [...rankedTasks].sort((a,b) => a.price - b.price);
    return rankedTasks;
  }, [rankedTasks, filters.sortBy]);

  // Pin approved/pending tasks to top (but NOT own published tasks — those stay in natural rank)
  const sortedTasks = useMemo(() => {
    return [...sortedByFilter].sort((a, b) => {
      const isOwnA = me?.id && a.client_id === me.id;
      const isOwnB = me?.id && b.client_id === me.id;
      const rankA = isOwnA ? 2 : approvedTaskIds.has(a.id) ? 0 : pendingTaskIds.has(a.id) ? 1 : 2;
      const rankB = isOwnB ? 2 : approvedTaskIds.has(b.id) ? 0 : pendingTaskIds.has(b.id) ? 1 : 2;
      return rankA - rankB;
    });
  }, [sortedByFilter, approvedTaskIds, pendingTaskIds, me?.id]);

  // Smart sections (only when not filtering/searching)
  const smartSections = useMemo(() =>
    (!search && !(filters.categories?.length > 0) && !filters.sortBy) ? buildSmartSections(rankedTasks) : null,
    [rankedTasks, search, filters.categories, filters.sortBy]
  );

  // Which tasks to show in the feed based on active section tab + forYou filter
  const displayedTasks = useMemo(() => {
    let base;
    // When any filter/search is active, always use sortedTasks (already filtered)
    const hasActiveFilter = search || (filters.categories?.length > 0) || filters.sortBy || filters.city || filters.minPrice || filters.maxPrice || filters.time || filters.approvalMode || filters.urgency_tag || filters.payment_method || filters.forYou;
    if (!smartSections || activeSection === 'all' || hasActiveFilter) base = sortedTasks;
    else if (activeSection === 'nearby')  base = smartSections.nearby.length  ? smartSections.nearby  : sortedTasks;
    else if (activeSection === 'highpay') base = smartSections.highPaying.length ? smartSections.highPaying : sortedTasks;
    else if (activeSection === 'urgent')  base = smartSections.urgent.length  ? smartSections.urgent  : sortedTasks;
    else if (activeSection === 'new')     base = smartSections.newTasks.length ? smartSections.newTasks : sortedTasks;
    else base = sortedTasks;
    // Apply forYou filter — only tasks with isForYou badge
    if (filters.forYou && behavioralProfile?.hasStrongPattern) {
      base = base.filter(t => t._badges?.isForYou);
    }
    return base;
  }, [sortedTasks, smartSections, activeSection, filters, search, behavioralProfile]);

  // task_status_update is handled centrally by Layout (single broadcaster) — no duplicate here

  // Pull to refresh — refetch main tasks list
  const { refreshing, pullProgress } = usePullToRefresh(async () => {
    await queryClient.refetchQueries({ queryKey: ['allTasks'] });
    if (me?.id) {
      queryClient.invalidateQueries({ queryKey: ['myTasks', me.id] });
      queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed', me.id] });
    }
  });

  const hasFilters = filters.city || filters.minPrice || filters.maxPrice || filters.time || filters.approvalMode || filters.sortBy || filters.categories?.length > 0 || filters.payment_method || filters.forYou || filters.requires_invoice;
  const hasSheetFilters = !!(filters.city || filters.minPrice || filters.maxPrice || filters.time || filters.approvalMode || filters.sortBy || filters.urgency_tag || filters.payment_method || filters.forYou || filters.requires_invoice);

  // Red dot: any OPEN published task has pending applicants
  const hasNewApplicants = useMemo(() =>
    isAuthenticated && myTasks.some(t => t.status === 'OPEN' && (t.applicants?.length ?? 0) > 0),
    [myTasks, isAuthenticated]
  );

  // ── New task highlight: auto-tab + scroll + glow ──────────────────────────
  useEffect(() => {
    if (!highlightTaskId) return;
    setActiveTabRaw('my_published');
    setMyPubTab('active');
    // Clean URL without reload
    window.history.replaceState({}, '', '/');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!highlightTaskId) return;
    const taskInCache = myTasks.find(t => t.id === highlightTaskId);
    if (!taskInCache) {
      if (me?.id) queryClient.invalidateQueries({ queryKey: ['myTasks', me.id] });
      return;
    }
    const scrollTimer = setTimeout(() => {
      const el = document.getElementById(`task-card-${highlightTaskId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTapHintTaskId(highlightTaskId);
    }, 400);
    const tapClearTimer = setTimeout(() => setTapHintTaskId(null), 2800);
    const glowTimer = setTimeout(() => setHighlightTaskId(null), 5200);
    return () => { clearTimeout(scrollTimer); clearTimeout(tapClearTimer); clearTimeout(glowTimer); };
  }, [highlightTaskId, myTasks.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <div style={{ background: 'var(--surface-1)', minHeight: '100%' }} dir="rtl">
      <PullToRefreshIndicator refreshing={refreshing} pullProgress={pullProgress} />
      {/* Login Banner Carousel — color depends on active tab */}
      {!isAuthenticated && <LoginBannerCarousel activeTab={activeTab} />}

      {/* Segmented Control Tabs */}
      <div dir="rtl" style={{ background: 'var(--surface-2)', borderBottom: '1.5px solid var(--border-1)', padding: '6px 16px', position: 'sticky', top: 0, zIndex: 50, height: 50, boxSizing: 'border-box', display: 'flex', alignItems: 'center', marginTop: -1 }}>
        <div style={{ display: 'flex', background: 'var(--surface-3)', borderRadius: 99, padding: 3, width: '100%', position: 'relative', height: 38, alignItems: 'center' }}>
          <div style={{ position: 'absolute', top: 3, bottom: 3, width: 'calc(50% - 3px)', right: activeTab === 'my_published' ? 3 : 'calc(50%)', background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', borderRadius: 99, transition: 'right 220ms cubic-bezier(0.16,1,0.3,1)', zIndex: 1, boxShadow: '0 4px 12px rgba(26,111,212,0.25)' }} />
          <button onClick={() => setActiveTab('my_published')} style={{ flex: 1, background: 'none', border: 'none', fontSize: 13.5, fontWeight: activeTab === 'my_published' ? 800 : 600, color: activeTab === 'my_published' ? 'white' : 'var(--text-2)', zIndex: 2, cursor: 'pointer', height: '100%', position: 'relative', transition: 'color 150ms ease' }}>
            פרסם משימה
            {hasNewApplicants && <span style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 12, width: 8, height: 8, borderRadius: '50%', background: '#ef4444', border: '1.5px solid white', animation: 'pulseRedDot 1.5s infinite' }} />}
          </button>
          <button onClick={() => setActiveTab('available')} style={{ flex: 1, background: 'none', border: 'none', fontSize: 13.5, fontWeight: activeTab === 'available' ? 800 : 600, color: activeTab === 'available' ? 'white' : 'var(--text-2)', zIndex: 2, cursor: 'pointer', height: '100%', transition: 'color 150ms ease' }}>משימות זמינות</button>
        </div>
      </div>

      {/* Active Task Banner — below segmented control */}
      {activeTab === 'available' && activeWorkerTask && (
        <div style={{ padding: '10px 16px 0' }}>
          <ActiveTaskBanner tasks={[{ ...activeWorkerTask, _roleHint: 'worker' }]} roleHint="worker" />
        </div>
      )}
      {activeTab === 'my_published' && activeClientTask && (
        <div style={{ padding: '10px 16px 0' }}>
          <ActiveTaskBanner tasks={[{ ...activeClientTask, _roleHint: 'client' }]} roleHint="client" />
        </div>
      )}

      <div className="px-4" style={{ paddingTop: 12, paddingBottom: 8 }}>

        {/* ── Available Tasks Tab ────────────────────────────── */}
        {activeTab === 'available' && (
          <>
            {/* Search bar — sticky below tabs */}
            <div style={{ position: 'sticky', top: 49, zIndex: 49, background: 'var(--surface-1)', paddingTop: 12, paddingBottom: 4, marginTop: -12, marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border-1)', padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <Search size={12} style={{ color: searchFocused ? '#1a6fd4' : '#b0bec5', flexShrink: 0, pointerEvents: 'none' }} />
                {/* Scrollable row: input + category chips */}
                <style>{`.cat-scroll::-webkit-scrollbar{display:none}`}</style>
                <div className="cat-scroll" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5, overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', minWidth: 0 }}>
                 <input placeholder="חיפוש משימות..." value={search} onChange={(e) => setSearch(e.target.value)} onFocus={() => setSearchFocused(true)} onBlur={() => setTimeout(() => setSearchFocused(false), 150)} onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(search)}
                   style={{ flexShrink: 0, minWidth: (filters.categories?.length > 0) ? 55 : 110, width: (filters.categories?.length > 0) ? 55 : undefined, height: 28, border: 'none', background: 'transparent', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: 'var(--text-1)' }} />
                 {(filters.categories || []).map(cat => (
                   <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 7px 3px 5px', borderRadius: 8, background: '#eff6ff', border: '1px solid #93c5fd', flexShrink: 0, fontSize: 11, color: '#1a6fd4', fontWeight: 700, whiteSpace: 'nowrap' }}>
                     {getCategoryLabel(cat)}
                     <button onClick={() => setFilters(f => ({ ...f, categories: (f.categories || []).filter(c => c !== cat) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#60a5fa', marginRight: 1 }}><X size={9} /></button>
                   </div>
                 ))}
                </div>
                {search && (<button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}><X size={11} color="#94a3b8" /></button>)}
                <button onClick={() => setShowCategoryDropdown(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 8, border: `1px solid ${(filters.categories?.length > 0) ? '#93c5fd' : 'var(--border-1)'}`, background: (filters.categories?.length > 0) ? '#eff6ff' : 'var(--surface-3)', cursor: 'pointer', flexShrink: 0, fontSize: 11, color: (filters.categories?.length > 0) ? '#1a6fd4' : 'var(--text-2)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {(filters.categories?.length > 0) ? '+ קטגוריה' : 'קטגוריה'}
                  {showCategoryDropdown ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
                <button onClick={() => setShowFilters(true)} style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 6, border: `0.5px solid ${hasSheetFilters ? '#60a5fa' : 'var(--border-1)'}`, background: hasSheetFilters ? '#1a6fd4' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', transition: 'all 0.15s' }}>
                  <SlidersHorizontal size={10} color={hasSheetFilters ? 'white' : '#64748b'} strokeWidth={1.8} />
                  {hasSheetFilters && <span style={{ position: 'absolute', top: -2, right: -2, width: 7, height: 7, borderRadius: '50%', background: '#ef4444', border: '1.5px solid white' }} />}
                </button>
              </div>
              {searchFocused && !search && recentSearches.length > 0 && (
                <div style={{ position: 'absolute', top: 38, right: 0, left: 0, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border-1)', boxShadow: '0 6px 16px rgba(0,0,0,0.08)', zIndex: 50, overflow: 'hidden' }}>
                  {recentSearches.map((s, i) => (<button key={i} onClick={() => { setSearch(s); setSearchFocused(false); }} style={{ width: '100%', padding: '5px 10px', background: 'none', border: 'none', textAlign: 'right', fontSize: 11, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}><Search size={9} color="#94a3b8" /> {s}</button>))}
                </div>
              )}
              {showCategoryDropdown && (
                <>
                  <div onClick={() => setShowCategoryDropdown(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
                  <div style={{ position: 'absolute', top: 38, right: 0, left: 0, background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border-1)', boxShadow: '0 6px 20px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: 220, overflowY: 'auto' }}>
                    {(filters.categories?.length > 0) && <button onClick={() => { setFilters(f => ({ ...f, categories: [] })); setShowCategoryDropdown(false); }} style={{ width: '100%', padding: '8px 14px', background: 'none', border: 'none', textAlign: 'right', fontSize: 12, color: '#dc2626', cursor: 'pointer', fontWeight: 700 }}>נקה קטגוריות</button>}
                    {[...CATEGORIES].sort((a, b) => tasks.filter(t => t.category === b.value && t.status === 'OPEN').length - tasks.filter(t => t.category === a.value && t.status === 'OPEN').length).map(c => {
                     const count = tasks.filter(t => t.category === c.value && t.status === 'OPEN').length;
                      if (count === 0) return null;
                      const isSelected = (filters.categories || []).includes(c.value);
                      return (<button key={c.value} onClick={() => { setFilters(f => { const cats = f.categories || []; return { ...f, categories: isSelected ? cats.filter(x => x !== c.value) : [...cats, c.value] }; }); }} style={{ width: '100%', padding: '8px 14px', background: isSelected ? '#eff6ff' : 'none', border: 'none', textAlign: 'right', fontSize: 12, color: isSelected ? '#1a6fd4' : 'var(--text-1)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: isSelected ? 700 : 500 }}><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{isSelected && <span style={{ fontSize: 9, color: '#1a6fd4' }}>✓</span>}{c.label}</span><span style={{ fontSize: 10, color: 'var(--text-2)', background: 'var(--surface-3)', borderRadius: 20, padding: '1px 6px' }}>{count}</span></button>);
                    })}
                  </div>
                </>
              )}
            </div>

            </div>{/* end sticky search wrapper */}

            {/* Profile completion banner — only for new logged-in users */}
            {isAuthenticated && me && <ProfileCompletionBanner me={me} />}

            {/* Stories Bar — filtered by active category; 'all' shows all stories */}
            <StoriesBar filterCategory={filters.categories?.[0] || null} currentUserId={me?.id} />

            {isLoading ?
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                {Array(4).fill(0).map((_, i) => <div key={i} style={{ background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border-1)', padding: '16px' }} className="animate-pulse"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}><div style={{ flex: 1 }}><div className="h-4 bg-gray-100 rounded-lg w-3/4 mb-3" /><div className="h-3 bg-gray-100 rounded-lg w-1/3 mb-4" /><div className="h-3 bg-gray-100 rounded-lg w-1/2" /></div><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}><div className="h-6 bg-gray-100 rounded-lg w-16" /><div className="h-8 bg-gray-100 rounded-lg w-16" /></div></div></div>)}
              </div> :
            displayedTasks.length === 0 ?
              <div className="text-center py-16">
                <SearchX size={36} className="mx-auto mb-3 text-gray-300" strokeWidth={1.2} />
                <p className="font-semibold text-gray-700">לא נמצאו משימות</p>
                <p className="text-sm text-gray-400 mt-1">נסה לשנות את הפילטרים</p>
                {(search || hasFilters) && <button onClick={() => { setSearch(''); setFilters({ minPrice: '', maxPrice: '', time: '', city: '', categories: [], approvalMode: '', sortBy: '', urgency_tag: '', payment_method: '', forYou: false, requires_invoice: false }); }} style={{ marginTop: 14, padding: '8px 20px', borderRadius: 20, background: '#1a6fd4', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>נקה חיפוש</button>}
              </div> :
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                {displayedTasks.map((task, index) => {
                  const isOwn = !!me?.id && task.client_id === me.id;
                  const myApp = !isOwn ? myApplications.find((a) => a.task_id === task.id && (a.status === 'pending' || a.status === 'approved')) : undefined;
                  const isNew = newTaskIds.has(task.id);
                  return (
                    <div key={task.id} style={{ position: 'relative', animation: isNew ? 'slideInFresh 0.4s ease-out' : `slideInStagger 0.45s ease-out both`, animationDelay: isNew ? undefined : `${Math.min(index, 12) * 50}ms` }}>
                      <TaskCardWithSwipe task={{ ...task, _isFirstCard: index === 0 }} myApp={myApp} isMyPublished={isOwn} currentUserId={isAuthenticated ? me?.id : null} workerName={me?.full_name} badges={isOwn ? undefined : task._badges}
                        onDismiss={isOwn ? undefined : (taskId) => setDismissedTasks((prev) => new Set([...prev, taskId]))} />
                    </div>
                  );
                })}
              </div>
            }
          </>
        )}

        {/* ── My Published Tasks Tab ───────────────────────────── */}
        {activeTab === 'my_published' && myTasks.length === 0 && (
          <PublishTaskOnboarding />
        )}
        {activeTab === 'my_published' && myTasks.length > 0 && (() => {
          const pubTab = MY_PUB_TABS.find(t => t.key === myPubTab);
          const filteredPub = myTasks.filter(t => pubTab?.statuses.includes(t.status));
          return (
            <div>
              {/* Sub-tabs bar — sticky below tabs bar */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14, position: 'sticky', top: 49, zIndex: 49, background: 'var(--surface-1)', paddingTop: 12, paddingBottom: 8, marginTop: -12, marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}>
                {MY_PUB_TABS.map(t => {
                  const count = myTasks.filter(x => t.statuses.includes(x.status)).length;
                  const active = myPubTab === t.key;
                  return (
                    <button key={t.key} onClick={() => setMyPubTab(t.key)}
                      style={{ flex: 1, height: 38, borderRadius: 10, fontSize: 13, fontWeight: 700, border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                        background: active ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : 'var(--surface-2)',
                        color: active ? 'white' : 'var(--text-2)',
                        borderColor: active ? '#1a6fd4' : 'var(--border-1)',
                        boxShadow: active ? '0 2px 8px rgba(26,111,212,0.25)' : 'none',
                      }}
                    >
                      {t.label}
                      {count > 0 && (
                        <span style={{ marginRight: 4, fontSize: 10, background: active ? 'rgba(255,255,255,0.25)' : '#e8edf5', color: active ? 'white' : '#64748b', padding: '1px 5px', borderRadius: 8 }}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {filteredPub.length === 0 && myPubTab === 'active' ? (
                <EmptyMyTasksState />
              ) : filteredPub.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
                  <p style={{ fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>אין משימות כאן</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredPub.map((task, index) => {
                    const isHighlighted = highlightTaskId === task.id;
                    const hasTapHint = tapHintTaskId === task.id;
                    return (
                      <div
                        key={task.id}
                        id={`task-card-${task.id}`}
                        style={isHighlighted ? {
                          borderRadius: 18,
                          position: 'relative',
                          animation: hasTapHint
                            ? 'newTaskGlow 2s ease-in-out infinite, tapHintOnce 0.9s 0.3s ease-in-out'
                            : 'newTaskGlow 2s ease-in-out infinite',
                        } : {
                          animation: `slideInStagger 0.45s ease-out both`,
                          animationDelay: `${Math.min(index, 12) * 50}ms`,
                        }}
                      >
                        <TaskCardWithSwipe task={task} isMyPublished={true} currentUserId={me?.id} workerName={me?.full_name} />
                        {hasTapHint && (
                          <div style={{
                            position: 'absolute',
                            top: '55%', left: '50%',
                            pointerEvents: 'none',
                            zIndex: 20,
                            fontSize: 38,
                            animation: 'fingerTap 1.1s 0.45s ease-in-out forwards',
                            opacity: 0,
                            filter: 'drop-shadow(0 4px 12px rgba(26,111,212,0.4))',
                          }}>
                            👆
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

      </div>


      <FilterSheet open={showFilters} onClose={() => setShowFilters(false)} filters={filters} onApply={setFilters} hasForYou={behavioralProfile?.hasStrongPattern} />

      <InstantMatchPopup userLocation={userLocation} currentUserId={me?.id} activeCategory={filters.categories?.[0] || null} />
      <style>{`
        @keyframes slideInFresh {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInStagger {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ping {
          0%, 100% { transform: scale(1); opacity: 0.75; }
          50% { transform: scale(2); opacity: 0; }
        }
        @keyframes pulseRedDot {
          0%, 100% { transform: translateY(-50%) scale(1); opacity: 1; }
          50% { transform: translateY(-50%) scale(1.5); opacity: 0.5; }
        }
        @keyframes newTaskGlow {
          0%, 100% { box-shadow: 0 0 0 2px rgba(26,111,212,0.18), 0 4px 24px rgba(26,111,212,0.08); }
          50% { box-shadow: 0 0 0 4px rgba(26,111,212,0.55), 0 6px 40px rgba(26,111,212,0.32); }
        }
        @keyframes tapHintOnce {
          0%   { transform: scale(1); }
          22%  { transform: scale(0.967); }
          52%  { transform: scale(1.018); }
          78%  { transform: scale(0.995); }
          100% { transform: scale(1); }
        }
        @keyframes fingerTap {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.7); }
          18%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          42%  { transform: translate(-50%, -50%) scale(0.82); }
          60%  { transform: translate(-50%, -50%) scale(1); }
          82%  { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
        }
      `}</style>
    </div>);

}