import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import React, { lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { LanguageProvider } from '@/lib/LanguageContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { TaskSheetProvider } from '@/lib/TaskSheetContext';
import AppErrorBoundary from '@/components/AppErrorBoundary';
import EarningsDashboard from '@/pages/EarningsDashboard';
import ResetPassword from '@/pages/ResetPassword';
import AdminDashboard from '@/pages/AdminDashboard';
import GlobalPopups from '@/components/GlobalPopups';
import TaskDetailSheet from '@/components/TaskDetailSheet';
import DeepLinkHandler from '@/components/DeepLinkHandler';
import NativeAuthListener from '@/components/NativeAuthListener';
import NativeOAuthBounce from '@/components/NativeOAuthBounce';
import TaskDetailRedirect from '@/components/TaskDetailRedirect';
import { DemoModeExitBanner } from '@/components/NewUserSimulator';

// Add page imports here
// lazyRetry — Vite lazy chunks are hashed; after a new deploy the browser may
// still hold a stale route URL whose chunk no longer exists on the server, so
// the dynamic import 404s ("Failed to fetch dynamically imported module").
// Catch that and reload once (throttled to 10s) to fetch fresh assets.
const lazyRetry = (importFn) => lazy(() =>
  importFn().catch(async (err) => {
    const KEY = 'joba24_chunk_reload_ts';
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last > 10000) {
      sessionStorage.setItem(KEY, String(Date.now()));
      // A stale service worker / HTTP cache can keep serving a broken chunk URL
      // even after a rebuild (the ?t= changes but the SW returns the old 500).
      // Unregister all SWs so the reload fetches the fresh chunk from the server.
      try {
        const regs = await navigator.serviceWorker?.getRegistrations?.();
        if (regs?.length) await Promise.all(regs.map(r => r.unregister()));
      } catch {}
      window.location.reload();
    }
    throw err;
  })
);
// App entry — force reload to clear stale dynamic import cache
// Tab pages — preloaded for instant tab switching
const HomeFeed = lazyRetry(() => import('@/pages/HomeFeed'));
const MapView = lazyRetry(() => import('@/pages/MapView'));
const ChatInbox = lazyRetry(() => import('@/pages/ChatInbox'));
const Profile = lazyRetry(() => import('@/pages/Profile'));

// Preload remaining tab pages after initial render is complete (idle callback)
// so they don't compete with the critical path (HomeFeed) on slow connections
if (typeof window !== 'undefined') {
  const preloadPages = () => {
    // Root tabs (keep-alive) + most-visited non-root pages — preloading the
    // chunks means navigation never hits the Suspense full-screen spinner.
    import('@/pages/MapView');
    import('@/pages/ChatInbox');
    import('@/pages/Profile');
    import('@/pages/CreateTask');
    import('@/pages/Wallet');
    import('@/pages/MyTasks');
    import('@/pages/WorkerProfile');
    import('@/pages/EarningsDashboard');
    import('@/pages/Notifications');
    import('@/pages/Chat');
    import('@/pages/SupportChat');
    import('@/pages/AgentDashboard');
  };
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(preloadPages, { timeout: 4000 });
  } else {
    setTimeout(preloadPages, 1500);
  }
}

// All other pages — lazy loaded, fetched only when user navigates there
const Landing = lazyRetry(() => import('@/pages/Landing'));
const CreateTask = lazyRetry(() => import('@/pages/CreateTask'));
const Chat = lazyRetry(() => import('@/pages/Chat'));
const SupportChat = lazyRetry(() => import('@/pages/SupportChat'));
const Wallet = lazyRetry(() => import('@/pages/Wallet'));
const Leaderboard = lazyRetry(() => import('@/pages/Leaderboard'));
const WorkerProfile = lazyRetry(() => import('@/pages/WorkerProfile'));
const FAQ = lazyRetry(() => import('@/pages/FAQ'));
const DailyGoal = lazyRetry(() => import('@/pages/DailyGoal'));
const Presentation = lazyRetry(() => import('@/pages/Presentation'));
const WorkerOnboarding = lazyRetry(() => import('@/pages/WorkerOnboarding'));
const SimulatorPanel = lazyRetry(() => import('@/pages/SimulatorPanel'));
const MyTasks = lazyRetry(() => import('@/pages/MyTasks'));
const PublicProfile = lazyRetry(() => import('@/pages/PublicProfile'));
const Notifications = lazyRetry(() => import('@/pages/Notifications'));
const AgentDashboard = lazyRetry(() => import('@/pages/AgentDashboard'));
const AgentReferralsReport = lazyRetry(() => import('@/pages/AgentReferralsReport'));
const QADashboard = lazyRetry(() => import('@/pages/QADashboard'));
const Terms = lazyRetry(() => import('@/pages/Terms'));
const Privacy = lazyRetry(() => import('@/pages/Privacy'));
const ReferralRedirect = lazyRetry(() => import('@/pages/ReferralRedirect'));
const AuthCallback = lazyRetry(() => import('@/pages/AuthCallback'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    const scrollContainer = document.getElementById('main-scroll');
    if (scrollContainer) scrollContainer.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Save referral code from URL to localStorage so AuthContext can apply it after login
// Also generates a device_id to track app downloads/installs per agent (even before registration)
function CaptureRefCode() {
  useEffect(() => {
    // Generate or retrieve anonymous device_id (persists across sessions)
    let deviceId = localStorage.getItem('joba24_device_id');
    if (!deviceId) {
      deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('joba24_device_id', deviceId);
    }

    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('joba24_ref_code', ref);
      // Track the click (once per session per ref code) + create ReferralEvent
      const clickKey = `joba24_ref_click_${ref}`;
      if (!sessionStorage.getItem(clickKey)) {
        sessionStorage.setItem(clickKey, '1');
        base44.functions.invoke('trackReferralClick', { agent_code: ref, device_id: deviceId, count_click: true }).catch(() => {});
      } else {
        base44.functions.invoke('trackReferralClick', { agent_code: ref, device_id: deviceId, count_click: false }).catch(() => {});
      }
    } else {
      // No ref in URL — check localStorage for stored ref code (user opened app later)
      const storedRef = localStorage.getItem('joba24_ref_code');
      if (storedRef) {
        // Ensure ReferralEvent exists (no click increment — already counted on first visit)
        base44.functions.invoke('trackReferralClick', { agent_code: storedRef, device_id: deviceId, count_click: false }).catch(() => {});
      }
    }
  }, []);
  return null;
}

// Routes rendered INSIDE Layout all share one animKey ('app') so the Layout
// itself (header, bottom nav, keep-alive tabs, realtime subscriptions, scroll
// positions) NEVER remounts when navigating between them. That remount was the
// #1 cause of the "intermediate screen" flash — Layout fading out then a fresh
// Layout fading back in on every page-to-page navigation. Only truly standalone
// screens (chat thread, landing, onboarding, reset-password, referral redirect,
// support) get their own key and animate (slide) in/out.
const STANDALONE = (p) =>
  p === '/lp' || p === '/presentation' || p === '/reset-password' || p === '/join' ||
  p === '/support' || p.startsWith('/chat/') || p.startsWith('/r/');
function getDepth(pathname) {
  if (!STANDALONE(pathname)) return 0;
  if (pathname.startsWith('/chat/')) return 2;
  return 1;
}

// Push: new screen slides in from right, old slides out left
// Pop:  new screen slides in from left, old slides out right
// Tab switch: no slide — just instant swap (handled by key='root')
const PUSH_VARIANTS = {
  enter: (dir) => ({
    x: dir > 0 ? '100%' : '-20%',
    opacity: 1,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({
    x: dir > 0 ? '-20%' : '100%',
    opacity: 0,
    pointerEvents: 'none',
  }),
};

const AuthenticatedApp = () => {
  const location = useLocation();
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  const prevDepthRef = useRef(getDepth(location.pathname));
  const curDepth = getDepth(location.pathname);
  const slideDir = curDepth >= prevDepthRef.current ? 1 : -1;
  useEffect(() => { prevDepthRef.current = curDepth; }, [location.pathname]);

  const isStandalone = STANDALONE(location.pathname);
  const animKey = isStandalone ? location.pathname : 'app';



  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#ffffff' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #e8edf5', borderTopColor: '#1a6fd4' }} className="animate-spin" />
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <GlobalPopups />
      <Suspense fallback={<div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}><div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #e8edf5', borderTopColor: '#1a6fd4' }} className="animate-spin" /></div>}>
      <AnimatePresence mode="wait" custom={slideDir} initial={false}>
        <motion.div
          key={animKey}
          custom={slideDir}
          variants={isStandalone ? PUSH_VARIANTS : undefined}
          initial={isStandalone ? 'enter' : false}
          animate={isStandalone ? 'center' : { opacity: 1 }}
          exit={isStandalone ? 'exit' : { opacity: 0 }}
          transition={
            isStandalone
              ? { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.22 }
              : { duration: 0.14, ease: 'easeOut' }
          }
          style={{ position: 'absolute', inset: 0 }}
        >
          <Routes location={location}>
            <Route path="/r/:code" element={<ReferralRedirect />} />
            <Route path="/auth-callback" element={<AuthCallback />} />
            <Route path="/lp" element={<Landing />} />
            <Route element={<Layout />}>
              <Route path="/" element={<HomeFeed />} />
              <Route path="/map" element={<MapView />} />
              <Route path="/task/:id" element={<TaskDetailRedirect />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/earnings" element={<EarningsDashboard />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/create-task" element={<CreateTask />} />
              <Route path="/daily-goal" element={<DailyGoal />} />
              <Route path="/public-profile" element={<PublicProfile />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/worker-profile" element={<WorkerProfile />} />
                <Route path="/simulator" element={<SimulatorPanel />} />
                <Route path="/my-tasks" element={<MyTasks />} />
                <Route path="/chats" element={<ChatInbox />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/agent-referrals" element={<AgentReferralsReport />} />
                <Route path="/agent-dashboard" element={<AgentDashboard />} />
                <Route path="/qa" element={<QADashboard />} />
              </Route>
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route path="/chat/:taskId" element={<Chat />} />
              <Route path="/support" element={<SupportChat />} />
            </Route>
            <Route path="/presentation" element={<Presentation />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/join" element={<WorkerOnboarding />} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      </Suspense>
    </div>
  );
};

function App() {
  // Prevent pinch zoom on iOS — only block on elements that explicitly opt in
  React.useEffect(() => {
    const handleTouchMove = (e) => {
      if (e.touches.length > 1 && e.target.closest('[data-no-zoom]')) {
        e.preventDefault();
      }
    };
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => document.removeEventListener('touchmove', handleTouchMove);
  }, []);

  return (
    <AppErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <QueryClientProvider client={queryClientInstance}>
            <Router>
              <TaskSheetProvider>
                <CaptureRefCode />
                <ScrollToTop />
                <DeepLinkHandler />
                <NativeAuthListener />
                <NativeOAuthBounce />
                <AuthenticatedApp />
                <TaskDetailSheet />
                <DemoModeExitBanner />
              </TaskSheetProvider>
            </Router>
            <Toaster />
          </QueryClientProvider>
        </LanguageProvider>
      </AuthProvider>
    </AppErrorBoundary>
  )
}

export default App