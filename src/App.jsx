import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import React, { lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { LanguageProvider } from '@/lib/LanguageContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppErrorBoundary from '@/components/AppErrorBoundary';

// Add page imports here
// App entry — force reload to clear stale dynamic import cache
// Tab pages — lazy loaded (mounted via Layout.jsx)
const HomeFeed = lazy(() => import('@/pages/HomeFeed'));
const MapView = lazy(() => import('@/pages/MapView'));
const ChatInbox = lazy(() => import('@/pages/ChatInbox'));
const Profile = lazy(() => import('@/pages/Profile'));

// All other pages — lazy loaded, fetched only when user navigates there
const Landing = lazy(() => import('@/pages/Landing'));
const CreateTask = lazy(() => import('@/pages/CreateTask'));
const TaskDetail = lazy(() => import('@/pages/TaskDetail'));
const Chat = lazy(() => import('@/pages/Chat'));
const Wallet = lazy(() => import('@/pages/Wallet'));
const Leaderboard = lazy(() => import('@/pages/Leaderboard'));
const WorkerProfile = lazy(() => import('@/pages/WorkerProfile'));
const FAQ = lazy(() => import('@/pages/FAQ'));
const DailyGoal = lazy(() => import('@/pages/DailyGoal'));
const Presentation = lazy(() => import('@/pages/Presentation'));
const SimulatorPanel = lazy(() => import('@/pages/SimulatorPanel'));
const MyTasks = lazy(() => import('@/pages/MyTasks'));
const PublicProfile = lazy(() => import('@/pages/PublicProfile'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const AgentDashboard = lazy(() => import('@/pages/AgentDashboard'));
const Terms = lazy(() => import('@/pages/Terms'));

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
function CaptureRefCode() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('joba24_ref_code', ref);
    }
  }, []);
  return null;
}

const ROOT_TABS = new Set(['/', '/map', '/chats', '/profile', '/wallet']);
function getDepth(pathname) {
  if (ROOT_TABS.has(pathname)) return 0;
  if (pathname.startsWith('/task/') || pathname.startsWith('/chat/') || pathname.startsWith('/edit-task/')) return 2;
  return 1;
}

// Push: new screen slides in from right, old slides out left
// Pop:  new screen slides in from left, old slides out right
// Tab switch: no slide — just instant swap (handled by key='root')
const PUSH_VARIANTS = {
  enter: (dir) => ({
    x: dir > 0 ? '100%' : '-30%',
    opacity: dir > 0 ? 1 : 0.6,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({
    x: dir > 0 ? '-30%' : '100%',
    opacity: dir > 0 ? 0.6 : 1,
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

  const isRootTab = ROOT_TABS.has(location.pathname);
  const animKey = isRootTab ? 'root' : location.pathname;



  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#f4f7fb' }}>
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <Suspense fallback={<div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-1)' }}><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>}>
      <AnimatePresence mode="popLayout" custom={slideDir} initial={false}>
        <motion.div
          key={animKey}
          custom={slideDir}
          variants={isRootTab ? undefined : PUSH_VARIANTS}
          initial={isRootTab ? { opacity: 0 } : 'enter'}
          animate={isRootTab ? { opacity: 1 } : 'center'}
          exit={isRootTab ? { opacity: 0 } : 'exit'}
          transition={
            isRootTab
              ? { duration: 0.15, ease: 'easeOut' }
              : { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.32 }
          }
          style={{ position: 'absolute', inset: 0, willChange: 'transform' }}
        >
          <Routes location={location}>
            <Route path="/lp" element={<Landing />} />
            <Route element={<Layout />}>
              <Route path="/" element={<HomeFeed />} />
              <Route path="/map" element={<MapView />} />
              <Route path="/task/:id" element={<TaskDetail />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/terms" element={<Terms />} />
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
                <Route path="/agent-dashboard" element={<AgentDashboard />} />
              </Route>
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route path="/chat/:taskId" element={<Chat />} />
            </Route>
            <Route path="/presentation" element={<Presentation />} />
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
              <CaptureRefCode />
              <ScrollToTop />
              <AuthenticatedApp />
            </Router>
            <Toaster />
          </QueryClientProvider>
        </LanguageProvider>
      </AuthProvider>
    </AppErrorBoundary>
  )
}

export default App