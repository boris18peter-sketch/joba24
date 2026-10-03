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
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { useAuth } from '@/lib/AuthContext';
import { useBrand } from '@/lib/brand/BrandProvider';
import { resolveTaskBrandUrl } from '@/lib/brand/taskNavigation';

const PENDING_KEY = 'joba24_pending_task';

export default function DeepLinkHandler() {
  const { openTaskSheet } = useTaskSheet();
  const { isAuthenticated, isLoadingAuth, user } = useAuth();
  const { currentBrandId, isPlatformBrand } = useBrand();
  const location = useLocation();
  const openedRef = useRef(false);

  // Pre-launch gate: don't open the task sheet for unapproved users.
  // TaskDetailSheet renders at App level (outside Layout), so it would appear
  // ON TOP of the waiting page — bypassing the gate. This check prevents that.
  const isApproved = user?.is_approved || user?.role === 'admin';

  // Capture ?open_task from the URL on first load, store it, clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get('open_task');
    if (taskId) {
      sessionStorage.setItem(PENDING_KEY, taskId);
      // Remove the param so it doesn't re-trigger on refresh / back-nav
      const clean = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', clean);
    }
  }, []);

  // Open the sheet once auth is ready and the user is on a stable route
  // (not /join — onboarding redirects to / when done, which would hide the
  // sheet via the route-change handler in TaskDetailSheet).
  useEffect(() => {
    if (openedRef.current) return;
    if (isLoadingAuth || !isAuthenticated) return;
    if (!isApproved) return; // unapproved — stay on waiting page, don't open task
    if (location.pathname === '/join') return; // wait for onboarding to finish
    const pending = sessionStorage.getItem(PENDING_KEY);
    if (!pending) return;
    openedRef.current = true;
    sessionStorage.removeItem(PENDING_KEY);
    // Resolve the Task's own Brand: a link for a Task created on another Brand
    // opens on THAT Brand's domain instead of failing here as "Task not found".
    resolveTaskBrandUrl(pending, currentBrandId, isPlatformBrand).then((brandUrl) => {
      if (brandUrl) { window.location.href = brandUrl; return; }
      openTaskSheet(pending);
    });
  }, [isAuthenticated, isLoadingAuth, isApproved, location.pathname, openTaskSheet, currentBrandId, isPlatformBrand]);

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