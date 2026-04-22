import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from '@/components/Layout';
// Add page imports here
import HomeFeed from '@/pages/HomeFeed';
import CreateTask from '@/pages/CreateTask';
import TaskDetail from '@/pages/TaskDetail';
import Chat from '@/pages/Chat';
import MapView from '@/pages/MapView';
import Profile from '@/pages/Profile';
import Wallet from '@/pages/Wallet';
import EditTask from '@/pages/EditTask';
import Leaderboard from '@/pages/Leaderboard';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomeFeed />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/create-task" element={<CreateTask />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/task/:id" element={<TaskDetail />} />
        <Route path="/edit-task/:id" element={<EditTask />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Route>
      <Route path="/chat/:taskId" element={<Chat />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App