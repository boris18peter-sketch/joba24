// DeepLinkHandler — opens the task popup from a `?open_task=TASK_ID` link.
// Rendered at the App level (inside TaskSheetProvider) so it works on EVERY
// route, including /join (onboarding) and /chat, not only Layout routes.
//
// Why this exists at App level (not in Layout):
//   The previous handler lived inside Layout. When a recipient opened a
//   shared link while unauthenticated, Layout redirected them to /join before
//   the popup could open, so the task popup never appeared. This component
//   captures the pending task ID into sessionStorage on first paint (before any
//   redirect), then opens the sheet once the user is authenticated and on a
//   stable (non-/join) route — surviving login + onboarding redirects.
//
// Also handles foreground notification clicks: the service worker posts
// { type: 'OPEN_TASK_SHEET', taskId } when the app is already open.
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { useAuth } from '@/lib/AuthContext';
import { useBrand } from '@/lib/brand/BrandProvider';
import { resolveTaskBrandUrl } from '@/lib/brand/taskNavigation';
import { setPendingTask, readPendingTask, clearPendingTask, PENDING_TASK_EVENT } from '@/lib/pendingTask';

// The first-run flow owns the screen until the visitor has been through it.
// A pending task waits for them to come out the other side.
const FIRST_RUN_PATHS = ['/join', '/welcome'];

export default function DeepLinkHandler() {
  const { openTaskSheet } = useTaskSheet();
  const { isLoadingAuth, user } = useAuth();
  const { currentBrandId, isPlatformBrand } = useBrand();
  const location = useLocation();
  // The task id we have already opened, NOT a boolean. A boolean meant the
  // handler ran once per app load and ignored every later link — including the
  // Universal Link the native app receives while it is already running.
  const openedRef = useRef(null);
  const [pendingSignal, setPendingSignal] = useState(0);

  // A task can arrive at any moment, not only at launch. Each arrival bumps the
  // signal so the open effect below re-evaluates.
  useEffect(() => {
    const onPending = () => {
      openedRef.current = null;
      setPendingSignal((n) => n + 1);
    };
    window.addEventListener(PENDING_TASK_EVENT, onPending);
    return () => window.removeEventListener(PENDING_TASK_EVENT, onPending);
  }, []);

  // Pre-launch gate: don't open the task sheet for unapproved users.
  // TaskDetailSheet renders at App level (outside Layout), so it would appear
  // ON TOP of the waiting page — bypassing the gate. This check prevents that.
  const isApproved = user?.is_approved || user?.role === 'admin';

  // Capture ?open_task from the URL on first load, store it, clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get('open_task');
    if (taskId) {
      // Parked in both stores — the URL param is stripped right below, so these
      // two are the only copy left. See @/lib/pendingTask.
      setPendingTask(taskId);
      // Remove the param so it doesn't re-trigger on refresh / back-nav
      const clean = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', clean);
    }
  }, []);

  // Open the sheet once auth is ready and the user is on a stable route
  // (not /join — onboarding redirects to / when done, which would hide the
  // sheet via the route-change handler in TaskDetailSheet).
  useEffect(() => {
    if (isLoadingAuth) return;
    // ── A SHARED LINK IS NOT A SIGN-IN WALL ─────────────────────────────────
    // This used to require `isAuthenticated`, so a visitor arriving from a
    // Facebook post — the entire audience those posts are written for — had the
    // task discarded and was sent into the first-run flow instead. A link is
    // meant to be opened by someone who has never used the app, so a visitor
    // with no account is allowed through; only a SIGNED-IN user who has not
    // been approved stays on the waiting page.
    if (user && !isApproved) return;
    if (FIRST_RUN_PATHS.includes(location.pathname)) return;
    const pending = readPendingTask();
    if (!pending || openedRef.current === pending) return;
    openedRef.current = pending;
    clearPendingTask();
    // Resolve the Task's own Brand: a link for a Task created on another Brand
    // opens on THAT Brand's domain instead of failing here as "Task not found".
    resolveTaskBrandUrl(pending, currentBrandId, isPlatformBrand).then((brandUrl) => {
      if (brandUrl) { window.location.href = brandUrl; return; }
      openTaskSheet(pending);
    });
  }, [isLoadingAuth, isApproved, user, location.pathname, openTaskSheet, currentBrandId, isPlatformBrand, pendingSignal]);

  // Foreground notification click → open the sheet immediately
  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === 'OPEN_TASK_SHEET' && event.data?.taskId) {
        // Pre-launch gate: don't open task sheet for unapproved users
        if (!isApproved) return;
        const tid = event.data.taskId;
        resolveTaskBrandUrl(tid, currentBrandId, isPlatformBrand).then((brandUrl) => {
          if (brandUrl) { window.location.href = brandUrl; return; }
          openTaskSheet(tid);
        });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [openTaskSheet, isApproved, currentBrandId, isPlatformBrand]);

  return null;
}