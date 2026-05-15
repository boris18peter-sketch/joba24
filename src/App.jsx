import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import React from 'react';

function ScrollRestoration() {
  const { pathname } = useLocation();
  const scrollPositions = React.useRef({});

  useEffect(() => {
    // שמור scroll position לפני עזיבת העמוד
    const handleBeforeUnload = () => {
      scrollPositions.current[pathname] = window.scrollY;
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pathname]);

  useEffect(() => {
    // שחזר scroll position או עלה לראש
    const timer = setTimeout(() => {
      const saved = scrollPositions.current[pathname];
      window.scrollTo(0, saved || 0);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from '@/components/Layout';
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

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();

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
    <Routes>
      <Route path="/lp" element={<Landing />} />
      <Route element={<Layout />}>
        <Route path="/" element={<HomeFeed />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/create-task" element={<CreateTask />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/task/:id" element={<TaskDetail />} />
        <Route path="/edit-task/:id" element={<EditTask />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/worker-profile" element={<WorkerProfile />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/daily-goal" element={<DailyGoal />} />
        <Route path="/simulator" element={<SimulatorPanel />} />
        <Route path="/my-tasks" element={<MyTasks />} />
        <Route path="/chats" element={<ChatInbox />} />
        <Route path="/public-profile" element={<PublicProfile />} />
        <Route path="/notifications" element={<Notifications />} />
      </Route>
      <Route path="/chat/:taskId" element={<Chat />} />
      <Route path="/presentation" element={<Presentation />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
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
          <ScrollRestoration />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App