/**
 * useChatThread — the single source of truth for one conversation's messages.
 *
 * A conversation is exactly two people (see chatThread.js). Every path that can
 * produce a message flows through here and is merged by message id, so:
 *
 *   initial fetch ─┐
 *   older pages   ─┼─► mergeIn() ─► messages
 *   realtime      ─┤
 *   optimistic    ─┘
 *
 * Consequences that matter:
 *   • the same message can never render twice (dedupe by id),
 *   • a late fetch can never erase a message that already arrived over the
 *     socket (merging is additive — nothing is ever dropped),
 *   • history is always read NEWEST-first from the server and only then sorted
 *     for display, so opening a chat shows the latest messages, not the oldest.
 *
 * The thread scope is applied server-side (`task_id` + `thread_key`) so two
 * applicants on one task never pull each other's messages.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { isMessageInThread } from '@/lib/chatThread';

const PAGE_SIZE = 40;          // messages per page
const LEGACY_LIMIT = 40;       // pre-thread messages scanned once, on first load
const DUP_SEND_WINDOW = 1200;  // ms — an identical payload inside this window is one send

const byDate = (a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0);

export default function useChatThread({ taskId, threadKey, meId, meName, otherId, pairIds }) {
  const [messages, setMessages] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const storeRef = useRef(new Map()); // id -> message (dedupe + merge target)
  const pageRef = useRef(PAGE_SIZE);
  const lastSendRef = useRef({ key: '', at: 0 });

  // Live context for async callbacks — keeps effects from re-subscribing when
  // the parent re-renders with a new (but equivalent) pairIds array.
  const ctxRef = useRef({});
  ctxRef.current = { taskId, threadKey, meId, meName, otherId, pairIds };

  const commit = useCallback(() => {
    setMessages([...storeRef.current.values()].sort(byDate));
  }, []);

  /** Upsert by id. Never removes anything we already hold. */
  const mergeIn = useCallback((incoming) => {
    if (!incoming?.length) return;
    let changed = false;
    for (const m of incoming) {
      if (!m?.id) continue;
      const prev = storeRef.current.get(m.id);
      storeRef.current.set(m.id, prev ? { ...prev, ...m } : m);
      changed = true;
    }
    if (changed) commit();
  }, [commit]);

  /** Read one page of this thread (plus pre-thread history on the first load). */
  const loadWindow = useCallback(async (limit, { withLegacy = false } = {}) => {
    const { taskId: tid, threadKey: tk, pairIds: pids } = ctxRef.current;
    if (!tid || !tk) return { count: 0 };

    const primary = await base44.entities.ChatMessage.filter(
      { task_id: tid, thread_key: tk },
      '-created_date',           // newest first — never the oldest 500
      limit,
    );

    let legacy = [];
    if (withLegacy) {
      // Messages written before threads existed carry no thread_key. One small
      // extra read keeps that history visible without weakening thread scoping.
      const recent = await base44.entities.ChatMessage
        .filter({ task_id: tid }, '-created_date', LEGACY_LIMIT)
        .catch(() => []);
      legacy = recent.filter((m) => !m.thread_key && isMessageInThread(m, tk, pids));
    }

    // The user may have switched to another person while we were awaiting —
    // in that case this page belongs to the previous conversation, so drop it
    // rather than leaking it into the new one.
    const now = ctxRef.current;
    if (now.taskId !== tid || now.threadKey !== tk) return { count: 0 };

    mergeIn([...primary, ...legacy]);
    return { count: primary.length };
  }, [mergeIn]);

  // ── Initial load / thread switch ─────────────────────────────────────────
  useEffect(() => {
    if (!taskId || !threadKey) { setInitialLoading(false); return; }
    let cancelled = false;

    storeRef.current = new Map();
    pageRef.current = PAGE_SIZE;
    setMessages([]);
    setHasMore(false);
    setInitialLoading(true);

    (async () => {
      let count = 0;
      try { ({ count } = await loadWindow(PAGE_SIZE, { withLegacy: true })); } catch { /* offline — realtime + refresh will fill in */ }
      if (cancelled) return;
      setHasMore(count >= PAGE_SIZE);
      setInitialLoading(false);
    })();

    return () => { cancelled = true; };
  }, [taskId, threadKey, loadWindow]);

  // ── Pagination: widen the window and merge the older messages in ─────────
  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    const next = pageRef.current + PAGE_SIZE;
    try {
      const { count } = await loadWindow(next);
      pageRef.current = next;
      setHasMore(count >= next);
    } catch { /* keep what we have */ } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder, hasMore, loadWindow]);

  /** Re-read the newest page and merge. Used when the app returns to front. */
  const refresh = useCallback(async () => {
    const { taskId: tid, threadKey: tk } = ctxRef.current;
    if (!tid || !tk) return;
    try { await loadWindow(PAGE_SIZE); } catch { /* transient */ }
  }, [loadWindow]);

  // ── Realtime: additive merge, so it can never clobber the fetched page ───
  useEffect(() => {
    if (!taskId || !threadKey) return;
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.type === 'delete') {
        if (storeRef.current.delete(event.id)) commit();
        return;
      }
      const m = event.data;
      if (!m?.id || m.task_id !== taskId) return;
      const { threadKey: tk, pairIds: pids, meId: mid } = ctxRef.current;
      if (!isMessageInThread(m, tk, pids)) return;
      // An update only ever patches a message we already hold — never creates a stub.
      if (event.type === 'update' && !storeRef.current.has(m.id)) return;

      mergeIn([m]);

      if (event.type === 'create' && m.sender_id !== mid) {
        base44.entities.ChatMessage.update(m.id, { read: true }).catch(() => {});
      }
    });
    return unsub;
  }, [taskId, threadKey, mergeIn, commit]);

  // ── Reconciliation on foreground ─────────────────────────────────────────
  // Anything missed while the socket was suspended (iOS/Android background the
  // WebView) is picked up here instead of being lost until a remount.
  useEffect(() => {
    if (!taskId || !threadKey) return;
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [taskId, threadKey, refresh]);

  // ── Sending ──────────────────────────────────────────────────────────────
  const deliver = useCallback(async (localId) => {
    const { taskId: tid, threadKey: tk, meId: mid, otherId: oid } = ctxRef.current;
    const opt = storeRef.current.get(localId);
    if (!opt) return;
    try {
      const created = await base44.entities.ChatMessage.create({
        task_id: tid,
        sender_id: mid,
        sender_name: opt.sender_name,
        content: opt.content,
        thread_key: tk,
        recipient_id: oid,
      });
      storeRef.current.delete(localId);
      if (created?.id) mergeIn([created]); else commit();
    } catch {
      const cur = storeRef.current.get(localId);
      if (cur) storeRef.current.set(localId, { ...cur, _status: 'failed' });
      commit();
    }
  }, [mergeIn, commit]);

  /**
   * Optimistic send: the bubble is on screen and the composer is cleared before
   * the request leaves. On failure the bubble stays put and is marked failed so
   * the user can retry instead of losing what they wrote.
   */
  const send = useCallback(async (text, mediaUrl = null, mediaType = 'img') => {
    const { taskId: tid, threadKey: tk, meId: mid, otherId: oid, meName: name } = ctxRef.current;
    const trimmed = (text || '').trim();
    if (!tid || !tk || !mid || (!trimmed && !mediaUrl)) return null;

    // Rapid double-tap guard — an identical payload inside the window is one send.
    const key = mediaUrl || trimmed;
    const now = Date.now();
    if (lastSendRef.current.key === key && now - lastSendRef.current.at < DUP_SEND_WINDOW) return null;
    lastSendRef.current = { key, at: now };

    const prefix = mediaType === 'audio' ? '[audio]' : '[img]';
    const localId = `local_${now}_${Math.random().toString(36).slice(2, 7)}`;
    storeRef.current.set(localId, {
      id: localId,
      _localId: localId,
      _status: 'sending',
      _payload: { text, mediaUrl, mediaType },
      task_id: tid,
      thread_key: tk,
      recipient_id: oid,
      sender_id: mid,
      sender_name: name || '',
      content: mediaUrl ? `${prefix}${mediaUrl}` : trimmed,
      read: false,
      created_date: new Date().toISOString(),
    });
    commit();

    deliver(localId);
    return localId;
  }, [commit, deliver]);

  /** Re-send a message that failed. */
  const retry = useCallback((msg) => {
    const localId = msg?._localId || msg?.id;
    const cur = storeRef.current.get(localId);
    if (!cur || cur._status === 'sending') return;
    storeRef.current.set(localId, { ...cur, _status: 'sending' });
    commit();
    deliver(localId);
  }, [commit, deliver]);

  /** Drop a local bubble that should never have been shown (e.g. moderation). */
  const dropLocal = useCallback((localId) => {
    if (localId && storeRef.current.delete(localId)) commit();
  }, [commit]);

  return { messages, initialLoading, hasMore, loadingOlder, loadOlder, refresh, send, retry, dropLocal };
}