import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';

// Add page imports here
import Landing from '@/pages/Landing';
import HomeFeed from '@/pages/HomeFeed';
import CreateTask from '@/pages/CreateTask';
import TaskDetail from '@/pages/TaskDetail';
import Chat from '@/pages/Chat';
import MapView from '@/pages/MapView';
import Profile from '@/pages/Profile';
import Wallet from '@/pages/Wallet';
import EditTask from '@/pages/EditTask';
import Leaderboard from '@/pages/Leaderboard';
import WorkerProfile from '@/pages/WorkerProfile';
import FAQ from '@/pages/FAQ';
import DailyGoal from '@/pages/DailyGoal';
import Presentation from '@/pages/Presentation';
import SimulatorPanel from '@/pages/SimulatorPanel';
import MyTasks from '@/pages/MyTasks';
import ChatInbox from '@/pages/ChatInbox';
import PublicProfile from '@/pages/PublicProfile';
import Notifications from '@/pages/Notifications';
import AdminDashboard from '@/pages/AdminDashboard';
import Terms from '@/pages/Terms';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    const scrollContainer = document.getElementById('main-scroll');
    if (scrollContainer) scrollContainer.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const ROOT_TABS = new Set(['/', '/map', '/chats', '/profile', '/wallet']);
function getDepth(pathname) {
  if (ROOT_TABS.has(pathname)) return 0;
  if (pathname.startsWith('/task/') || pathname.startsWith('/chat/') || pathname.startsWith('/edit-task/')) return 2;
  return 1;
}

const PAGE_VARIANTS = {
  enter: (dir) => ({ x: dir > 0 ? '-100%' : '100%' }),
  center: { x: 0 },
  exit: (dir) => ({ x: dir > 0 ? '100%' : '-100%' }),
};

const AuthenticatedApp = () => {
  const location = useLocation();
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  const prevDepthRef = useRef(getDepth(location.pathname));
  const curDepth = getDepth(location.pathname);
  const slideDir = curDepth >= prevDepthRef.current ? 1 : -1;
  useEffect(() => { prevDepthRef.current = curDepth; }, [location.pathname]);

  const isRootTab = ROOT_TABS.has(location.pathname);
  // Root tabs share one animation key so they don't slide against each other
  const animKey = isRootTab ? 'root' : location.pathname;

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <AnimatePresence mode="popLayout" custom={slideDir} initial={false}>
        <motion.div
          key={animKey}
          custom={slideDir}
          variants={PAGE_VARIANTS}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'tween', ease: [0.32, 0, 0.67, 0], duration: 0.26 }}
          style={{ position: 'absolute', inset: 0 }}
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
                <Route path="/edit-task/:id" element={<EditTask />} />
                <Route path="/worker-profile" element={<WorkerProfile />} />
                <Route path="/simulator" element={<SimulatorPanel />} />
                <Route path="/my-tasks" element={<MyTasks />} />
                <Route path="/chats" element={<ChatInbox />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/admin" element={<AdminDashboard />} />
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
    </div>
  );
};

function App() {
  // Prevent pinch zoom on iOS
  React.useEffect(() => {
    const handleTouchMove = (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => document.removeEventListener('touchmove', handleTouchMove);
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App