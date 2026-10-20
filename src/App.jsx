import { Toaster } from "@/components/ui/toaster"
// The app's own notifications (`toast` from 'sonner') are raised in twenty-odd
// screens, and until this surface was mounted NOT ONE of them was ever rendered:
// every success and every failure was silent. That is why a failed admin action —
// an approval refused by the server, say — looked like a button that does
// nothing at all.
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import React, { Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { LanguageProvider, useLanguage } from '@/lib/LanguageContext';
import { BrandProvider } from '@/lib/brand/BrandProvider';
import BrandGate from '@/components/BrandGate';
import BrandTheme from '@/components/BrandTheme';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';
import { TaskSheetProvider } from '@/lib/TaskSheetContext';
import AppErrorBoundary from '@/components/AppErrorBoundary';
import GlobalPopups from '@/components/GlobalPopups';
import TaskDetailSheet from '@/components/TaskDetailSheet';
import DeepLinkHandler from '@/components/DeepLinkHandler';
import NativeTaskLink from '@/components/NativeTaskLink';
import NativeAuthListener from '@/components/NativeAuthListener';
import IosIapRecovery from '@/components/IosIapRecovery';
import PermissionPrompt from '@/components/PermissionPrompt';
import NativeOAuthBounce from '@/components/NativeOAuthBounce';
import TaskDetailRedirect from '@/components/TaskDetailRedirect';
import { DemoModeExitBanner } from '@/components/NewUserSimulator';
import AppDownloadPopup from '@/components/AppDownloadPopup';
import AppLoading from '@/components/AppLoading';
import ConsentBanner from '@/components/ConsentBanner';
import { lazyRetry } from '@/lib/lazyRetry';

// Add page imports here
// App entry — force reload to clear stale dynamic import cache
// Tab pages — preloaded for instant tab switching
const HomeFeed = lazyRetry(() => import('@/pages/HomeFeed'));
const MapView = lazyRetry(() => import('@/pages/MapView'));
const ChatInbox = lazyRetry(() => import('@/pages/ChatInbox'));
const Profile = lazyRetry(() => import('@/pages/Profile'));

// Preload remaining tab pages after initial render is complete (idle callback)
// so they don't compete with the critical path (HomeFeed) on slow connections
if (typeof window !== 'undefined') {
  // ── ROOT CAUSE OF "TypeError: Importing a module script failed." ──────────
  //
  // A preload is an OPTIMISATION, never a dependency: its only job is to warm
  // the chunk cache so a later navigation is instant. When one of these
  // unguarded imports failed — a chunk from a previous deploy that no longer
  // exists, a dropped connection mid-download — the rejection had no handler,
  // so the browser reported it as an uncaught module error on a screen that had
  // otherwise loaded perfectly. The user saw a crash; nothing was actually
  // broken, and the route's own loader (lazyRetry) would have healed it anyway.
  //
  // Wrapping each one makes a failed warm-up exactly what it should be:
  // silent. The real route import keeps its own recovery, so a genuine stale
  // chunk is still fixed by reloading onto the current build.
  const warm = (load) => load().catch(() => {});
  const preloadPages = () => {
    // Root tabs (keep-alive) + most-visited non-root pages — preloading the
    // chunks means navigation never hits the Suspense full-screen spinner.
    // Deliberately SHORT. This runs while the app is still booting, so every
    // chunk listed here competes for bandwidth with the critical path (the
    // entry bundle, the Brand queries and the auth check). Warming thirteen
    // routes starved the launch on a slow connection to speed up pages most
    // visitors never open. Only the other three root tabs and the publish form
    // — the routes a visitor actually reaches next — are warmed; every other
    // route still loads normally on first visit.
    warm(() => import('@/pages/MapView'));
    warm(() => import('@/pages/ChatInbox'));
    warm(() => import('@/pages/Profile'));
    warm(() => import('@/pages/CreateTask'));
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
const MySchedule = lazyRetry(() => import('@/pages/MySchedule'));
const PublicProfile = lazyRetry(() => import('@/pages/PublicProfile'));
const Notifications = lazyRetry(() => import('@/pages/Notifications'));
const AgentDashboard = lazyRetry(() => import('@/pages/AgentDashboard'));
const AgentReferralsReport = lazyRetry(() => import('@/pages/AgentReferralsReport'));
const QADashboard = lazyRetry(() => import('@/pages/QADashboard'));
const Terms = lazyRetry(() => import('@/pages/Terms'));
const Privacy = lazyRetry(() => import('@/pages/Privacy'));
const ReferralRedirect = lazyRetry(() => import('@/pages/ReferralRedirect'));
const AuthCallback = lazyRetry(() => import('@/pages/AuthCallback'));
const StoreKitStudio = lazyRetry(() => import('@/pages/StoreKitStudio'));
const DesignPreviewV2 = lazyRetry(() => import('@/pages/DesignPreviewV2'));
const BrandManager = lazyRetry(() => import('@/pages/BrandManager'));
const BrandDashboard = lazyRetry(() => import('@/pages/BrandDashboard'));
const OnboardingTrackWelcome = lazyRetry(() => import('@/pages/OnboardingTrackWelcome'));
// Admin-only and rarely-reached screens. These were the ONLY three pages in the
// file still imported statically, so the admin dashboard — its tables, its KYC
// tab, its brand manager, its charts — was parsed and executed on EVERY launch,
// including for guests who can never open it. They now load on demand like the
// other thirty pages, through the same lazyRetry so a stale chunk after a deploy
// still heals itself. Route guards are untouched: AdminRoute / ProtectedRoute
// still wrap the same elements.
const AdminDashboard = lazyRetry(() => import('@/pages/AdminDashboard'));
const EarningsDashboard = lazyRetry(() => import('@/pages/EarningsDashboard'));
const ResetPassword = lazyRetry(() => import('@/pages/ResetPassword'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // TWO scroll roots, and both must be reset. Root tabs keep-alive inside
    // 'main-scroll'; every non-root page scrolls in 'main-scroll-sub'. The
    // non-root container used to reuse the id 'main-scroll', so this effect
    // always reset the HIDDEN root-tab one instead and a non-root page opened
    // at the previous page's scroll position.
    for (const id of ['main-scroll', 'main-scroll-sub']) {
      const el = document.getElementById(id);
      if (el) el.scrollTop = 0;
    }
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
      // FIRST-TOUCH: only store the ref code if no previous one exists.
      // A user who clicked agent A's link then agent B's link stays attributed
      // to agent A (the first agent). This is critical for commission accuracy.
      if (!localStorage.getItem('joba24_ref_code')) {
        localStorage.setItem('joba24_ref_code', ref);
      }
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
  p === '/lp' || p === '/presentation' || p === '/reset-password' || p === '/join' || p === '/welcome' ||
  p === '/design-v2' || p === '/support' || p.startsWith('/chat/') || p.startsWith('/r/');
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
  // False only while a NON-Hebrew dictionary is still being fetched. Hebrew is
  // compiled in, so for a Hebrew launch — and for every first-ever launch — this
  // is true on the very first render and adds no wait whatsoever.
  const { ready: langReady } = useLanguage();
  const prevDepthRef = useRef(getDepth(location.pathname));
  const curDepth = getDepth(location.pathname);
  const slideDir = curDepth >= prevDepthRef.current ? 1 : -1;
  useEffect(() => { prevDepthRef.current = curDepth; }, [location.pathname]);

  const isStandalone = STANDALONE(location.pathname);
  const animKey = isStandalone ? location.pathname : 'app';



  // langReady is the dictionary gate: holding the first paint here is what stops
  // the app flashing Hebrew at a visitor whose saved language is not Hebrew. It
  // is read from the context rather than gating inside the provider because this
  // point already sits BELOW <BrandProvider>, which AppLoading needs for its logo.
  if (isLoadingPublicSettings || isLoadingAuth || !langReady) {
    return <AppLoading />;
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <GlobalPopups />
      <AnimatePresence custom={slideDir} initial={false}>
        <motion.div
          key={animKey}
          custom={slideDir}
          variants={isStandalone ? PUSH_VARIANTS : undefined}
          initial={isStandalone ? 'enter' : false}
          animate={isStandalone ? 'center' : { opacity: 1 }}
          // ── THE EXIT MUST ALWAYS RESOLVE ──────────────────────────────────
          // This used to be `isStandalone ? 'exit' : {…}` — a VARIANT NAME in
          // one branch and an object in the other. A variant name is only
          // resolvable while `variants` is defined, and `variants` above is
          // itself conditional on `isStandalone`. When a standalone screen left
          // for an in-Layout route, the two conditions could disagree and the
          // exit became a name with no variants to resolve it: framer-motion
          // then never finished the exit, so the leaving layer stayed mounted at
          // FULL opacity, painted over the app.
          //
          // That is the join screen ("רוצה יותר עבודות? הרשם עכשיו") sitting on
          // top of the feed after "continue as guest": its own header and the
          // bottom nav are z-index 40 / 30, so they still showed, while the feed
          // body was hidden behind the stuck layer. Only a fresh launch cleared
          // it, because then no such layer exists.
          //
          // An OBJECT always resolves, so the layer is guaranteed to leave.
          exit={{ opacity: 0, pointerEvents: 'none' }}
          transition={
            isStandalone
              ? { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.22 }
              : { duration: 0.14, ease: 'easeOut' }
          }
          // ── AND THE APP ALWAYS WINS THE STACK ─────────────────────────────
          // Belt and braces for the same class of bug: the in-Layout layer
          // paints ABOVE any standalone layer. The app layer is the base screen
          // and is opaque, so even if a leaving layer were ever to linger, the
          // visitor sees the app — never a stale screen on top of it. Without a
          // z-index both layers sat at auto, and DOM order alone decided which
          // one covered the other.
          className="j-app-shell"
          style={{ position: 'absolute', inset: 0, zIndex: isStandalone ? 1 : 2 }}
        >
          {/* ── THE SUSPENSE BOUNDARY BELONGS INSIDE THE LAYER ───────────────
              A lazily-loaded route fetches its chunk the first time it is
              opened. With this boundary OUTSIDE AnimatePresence, that first
              fetch suspended the ENTIRE route stack: React unwound to the
              boundary, AnimatePresence was torn down mid-transition, and the
              layer it was animating out could be left mounted on top of the
              app. That is the "old screen stuck over the new one" fault this
              file has had to fix twice already.

              On the first launch after a fresh install it is exactly what
              happens: /welcome has never been fetched, so the visitor's very
              first navigation suspends — and the splash they were already
              looking at stays on screen instead of the Welcome screen. On the
              next launch the chunk is cached, nothing suspends, and it works.

              Inside the layer, a route's first fetch shows this fallback
              within its own layer and leaves AnimatePresence's bookkeeping
              untouched: the old layer exits, the new one slides in, and the
              route resolves into place. */}
          <Suspense fallback={<AppLoading />}>
          <Routes location={location}>
            <Route path="/r/:code" element={<ReferralRedirect />} />
            <Route path="/auth-callback" element={<AuthCallback />} />
            <Route path="/store-kit" element={<StoreKitStudio />} />
            <Route path="/design-v2" element={<DesignPreviewV2 />} />

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
                {/* Internal QA tooling — admin-only, same role check used elsewhere in Joba24 */}
                <Route element={<AdminRoute />}>
                  <Route path="/simulator" element={<SimulatorPanel />} />
                </Route>
                <Route path="/my-tasks" element={<MyTasks />} />
                <Route path="/schedule" element={<MySchedule />} />
                {/* A Brand's own dashboard — reachable only with an explicit grant */}
                <Route path="/brand/:brandId" element={<BrandDashboard />} />
                <Route path="/chats" element={<ChatInbox />} />
                <Route path="/notifications" element={<Notifications />} />
                {/* Platform Admin only — same guard as /simulator */}
                <Route element={<AdminRoute />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/brands/:brandId" element={<BrandManager />} />
                </Route>
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
            {/* First-run track picker + explainer screens (standalone, no layout) */}
            <Route path="/welcome" element={<OnboardingTrackWelcome />} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

function App() {
  // ── THE PINCH-ZOOM LOCK IS CSS NOW, AND THAT IS AN ANDROID FIX ────────────
  // This used to register a `touchmove` listener on `document` with
  // `{ passive: false }`. An explicit non-passive listener OPTS OUT of the
  // passive-by-default behaviour Chrome gave document-level touch listeners, and
  // the cost is paid on EVERY scroll in the app, not just where the lock is
  // needed: Android's compositor has to synchronise with the main thread before
  // it may scroll, so any React work in flight visibly stalls the scroll. That is
  // exactly the "the app scrolls badly / a form feels stuck" class of complaint
  // on Android, and it does not reproduce on iOS, whose WebView uses its own
  // scroll model.
  //
  // The lock itself is one element — the map's container, marked `data-no-zoom`
  // — and CSS expresses it better: `touch-action` is decided by the browser
  // before the main thread is involved, so it blocks page pinch-zoom with zero
  // scroll cost. See `[data-no-zoom]` in src/index.css. Mapbox already manages
  // `touch-action` on its own canvas, so the map's own gestures are untouched.
  //
  // Do NOT re-add a non-passive touch/touchmove listener on `document` here.

  return (
    <AppErrorBoundary>
      <LanguageProvider>
        <BrandProvider>
        <BrandGate>
        {/* Applies the resolved Brand's colours / favicon / title / language to the surface */}
        <BrandTheme />
        <AuthProvider>
          <QueryClientProvider client={queryClientInstance}>
            <Router>
              <TaskSheetProvider>
                <CaptureRefCode />
                <ScrollToTop />
                <DeepLinkHandler />
                {/* A task link opens in the NATIVE app (iOS Universal Links /
                    Android App Links), so the web handler above never sees it.
                    This is the half that catches the URL the OS hands the app. */}
                <NativeTaskLink />
                <NativeAuthListener />
                <IosIapRecovery />
                <PermissionPrompt />
                <NativeOAuthBounce />
                <AuthenticatedApp />
                <TaskDetailSheet />
                <DemoModeExitBanner />
                {/* The "get the app" nudge for a web publisher, raised once after
                    their first published task has been seen on the feed. */}
                <AppDownloadPopup />
                {/* Advertising-consent notice — shown until the visitor chooses */}
                <ConsentBanner />
              </TaskSheetProvider>
            </Router>
            <Toaster />
            {/* ── One surface for the app's own toasts (`toast` from 'sonner') ──
                The app raises its own notifications in twenty-odd screens, and
                until this surface was mounted not one of them was ever rendered:
                every success and every failure was silent. It was missing — not
                broken — and mounting it is what brought them back.

                It is rendered in the SAME design language as the app's other
                notifications (see LiveNotificationPopup): the same card radius,
                surface colour and border, the same 46px rounded tile holding the
                status emoji, the same bold title over a muted line — so a notice
                looks like part of the app instead of a foreign white box.

                It sits ABOVE the bottom nav, never over the header, where a
                notice used to land on the logo, the balance and the menu button. */}
            <SonnerToaster
              position="bottom-center"
              offset={{ bottom: 'calc(66px + env(safe-area-inset-bottom))' }}
              mobileOffset={{ bottom: 'calc(66px + env(safe-area-inset-bottom))' }}
              icons={{ success: '✅', error: '⚠️', warning: '⚠️', info: 'ℹ️' }}
              toastOptions={{
                classNames: {
                  toast: 'rounded-xl border border-jborder-1 bg-surface-2 text-jtext-1 shadow-lg',
                  title: 'text-[15px] font-black leading-tight text-jtext-1',
                  description: 'text-[13px] font-medium text-jtext-2',
                  icon: 'w-[46px] h-[46px] rounded-md bg-surface-3 flex items-center justify-center text-[22px] shrink-0',
                },
              }}
            />
          </QueryClientProvider>
        </AuthProvider>
        </BrandGate>
        </BrandProvider>
      </LanguageProvider>
    </AppErrorBoundary>
  )
}

export default App