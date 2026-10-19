import { base44 } from '@/api/base44Client';

/**
 * One-time bonus announcements, remembered on the SERVER.
 *
 * A bonus is announced to a user at most once, and the record of "already
 * announced" used to live only in this browser's localStorage. That guard does
 * not survive a cleared cache, a reinstall, a second device, or a WebView that
 * blocks storage — and in exactly those cases the same bonus was celebrated
 * again on every launch, which is the repeated popup users complained about.
 *
 * The marker now lives on the user's own record, the same way
 * `verified_celebration_shown` already does, so it holds everywhere. The local
 * copy is kept purely as a fast path and is never the source of truth.
 */
const LOCAL_PREFIX = 'joba24_announced_';
const MAX_KEYS = 40;

let cachedUserId = null;
let cachedKeys = null;
let inflight = null;

function readLocal(userId) {
  try { return JSON.parse(localStorage.getItem(LOCAL_PREFIX + userId) || '[]'); } catch { return []; }
}

function writeLocal(userId, keys) {
  try { localStorage.setItem(LOCAL_PREFIX + userId, JSON.stringify(keys.slice(-MAX_KEYS))); } catch { /* storage blocked */ }
}

function loadKeys(userId) {
  if (cachedUserId === userId && cachedKeys) return Promise.resolve(cachedKeys);
  if (inflight && inflight.userId === userId) return inflight.promise;

  const promise = (async () => {
    let serverKeys = [];
    try {
      const res = await base44.entities.BonusAnnouncement.filter(
        { user_id: userId }, { limit: 100, fields: ['announcement_key'] }
      );
      const rows = Array.isArray(res) ? res : res?.items || [];
      serverKeys = rows.map((r) => r.announcement_key).filter(Boolean);
    } catch {
      serverKeys = [];
    }
    const merged = Array.from(new Set([...readLocal(userId), ...serverKeys]));
    cachedUserId = userId;
    cachedKeys = new Set(merged);
    writeLocal(userId, merged);
    return cachedKeys;
  })();

  inflight = { userId, promise };
  return promise;
}

/** True when this announcement has already been shown to this user. */
export async function hasAnnouncedBonus(userId, key) {
  if (!userId || !key) return true;
  const keys = await loadKeys(userId);
  return keys.has(key);
}

/** Records that the announcement has now been shown — locally AND on the server. */
export function rememberBonusAnnounced(userId, key) {
  if (!userId || !key) return;
  const local = readLocal(userId);
  if (!local.includes(key)) writeLocal(userId, [...local, key]);
  if (cachedUserId === userId && cachedKeys) cachedKeys.add(key);
  // Fire and forget — the popup must never wait on a write. A duplicate row is
  // harmless: only membership is ever checked.
  base44.entities.BonusAnnouncement.create({ user_id: userId, announcement_key: key }).catch(() => {});
}

/** Called on sign-out so a second account on the same device never inherits the cache. */
export function resetBonusAnnouncementCache() {
  cachedUserId = null;
  cachedKeys = null;
  inflight = null;
}