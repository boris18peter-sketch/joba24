import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// On the published website (joba24.com) a server proxy forwards /api → Base44,
// so an empty serverUrl (relative requests) works. But in the native app's
// local bundle the origin is https://localhost with NO such proxy — relative
// /api requests hit the static server's SPA fallback and return index.html
// (a string), which the SDK resolves as the "data". Code that does
// `tasks.filter(...)` then throws "filter is not a function" because `tasks`
// is an HTML string, not an array. Pin serverUrl to the Base44 backend so the
// SDK calls the real API directly in those environments.
const CANONICAL_API = 'https://joba24.base44.app';
const isLocalBundle =
  typeof window !== 'undefined' &&
  (window.location.origin === 'null' ||
   /localhost|127\.0\.0\.1/.test(window.location.origin) ||
   /android|iphone|ipad|ipod/i.test(navigator.userAgent || ''));

const serverUrl = isLocalBundle ? (appBaseUrl || CANONICAL_API) : '';

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl,
  requiresAuth: false,
  appBaseUrl
});