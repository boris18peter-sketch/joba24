import { useEffect } from 'react';
import { isNativeLike } from '@/lib/nativeEnv';
import { setPendingTask } from '@/lib/pendingTask';

/**
 * NativeTaskLink — the native app's half of "a task link was tapped".
 *
 * iOS Universal Links and Android App Links are configured for joba24.com (see
 * public/.well-known/apple-app-site-association), so tapping a task link — the
 * one printed in every Facebook post — opens the NATIVE APP, not a browser.
 * The web handler in DeepLinkHandler never runs in that case, because the page
 * is never loaded in a browser: the OS hands the URL straight to the app. With
 * nobody listening, the link appeared to do nothing at all — the app opened on
 * the feed and the task was never shown. That is the whole reason the Facebook
 * link looked broken.
 *
 * This listener receives the URL the OS delivered, extracts the task id and
 * parks it exactly the way the web path does. DeepLinkHandler then opens the
 * sheet through the one proven code path (auth gate, pre-launch gate, Brand
 * resolution) — nothing is duplicated here.
 */
const TASK_PATH = /^\/task\/([^/?#]+)/;

export function taskIdFromUrl(raw) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const fromQuery = url.searchParams.get('open_task');
    if (fromQuery) return fromQuery;
    const byPath = url.pathname.match(TASK_PATH);
    if (byPath) return decodeURIComponent(byPath[1]);
    // The app's own scheme: joba24://task/<id>
    if (url.hostname === 'task') return url.pathname.replace(/^\//, '') || null;
    return null;
  } catch {
    return null;
  }
}

export default function NativeTaskLink() {
  useEffect(() => {
    // isNativeLike, not isNativePlatform: on Android with a remote server.url the
    // Capacitor bridge is not reported, but we are still inside the native shell.
    if (!isNativeLike()) return;

    let handle = null;
    let cancelled = false;

    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const sub = await App.addListener('appUrlOpen', ({ url }) => {
          const taskId = taskIdFromUrl(url);
          if (taskId) setPendingTask(taskId);
        });
        if (cancelled) { sub.remove(); return; }
        handle = sub;
      } catch {
        /* no Capacitor bridge on this surface — the web path handles the link */
      }
    })();

    return () => {
      cancelled = true;
      handle?.remove?.();
    };
  }, []);

  return null;
}