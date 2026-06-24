/**
 * useRealtimeSync — centralizes all WebSocket subscriptions from Layout.
 * Fixes:
 *  1. Dedup key includes actor+second-level timestamp → prevents false dedup of legit sequential notifs
 *  2. Credits invalidated on any CreditTransaction create
 *  3. All subscriptions have guaranteed cleanup via returned unsubscribe
 */
import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const TERMINAL_STATUSES = ['CANCELLED', 'COMPLETED', 'EXPIRED'];
const ACTIVE_WORKER_STATUSES = ['TAKEN', 'APPROVED_PENDING_DEPARTURE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'];

export default function useRealtimeSync({
  me,
  isAuthenticated,
  myPublishedTasksRef,
  workerTasksRef,
  prevTasksRef,
  takenWorkerRef,
  appStatusRef,
  addNotification,
  setUnreadMessages,
  setRevokedTask,
  setCancelledTask,
  setCancelSuccessTask,
  maybeShowRating,
  t,
}) {
  const queryClient = useQueryClient();
  const recentNotifKeysRef = useRef(new Set());

  // Improved dedup: type + taskId + actor + 10-second bucket
  const isDuplicateNotif = useCallback((notification) => {
    const bucket = Math.floor(Date.now() / 10000);
    const key = `${notification.type}:${notification.taskId || ''}:${notification.actorId || ''}:${bucket}`;
    if (recentNotifKeysRef.current.has(key)) return true;
    recentNotifKeysRef.current.add(key);
    // Auto-clean after 12 seconds (slightly over 1 bucket)
    setTimeout(() => recentNotifKeysRef.current.delete(key), 12000);
    return false;
  }, []);

  const notify = useCallback((notification) => {
    if (isDuplicateNotif(notification)) return;
    addNotification(notification);
  }, [isDuplicateNotif, addNotification]);

  // ── Task subscription ────────────────────────────────────────────────────
  useEffect(() => {
    if (!me?.id || !isAuthenticated) return;

    const unsub = base44.entities.Task.subscribe((event) => {
      const t_data = event.data || {};
      const cleanPatch = Object.fromEntries(Object.entries(t_data).filter(([, v]) => v !== undefined));

      // 1. Multi-cache sync
      const updateListCache = (key) => {
        queryClient.setQueryData([key, me.id], (old = []) => {
          if (!Array.isArray(old)) return old;
          if (event.type === 'delete') return old.filter((x) => x.id !== event.id);
          if (event.type === 'update') {
            const exists = old.find((x) => x.id === event.id);
            return exists ? old.map((x) => x.id === event.id ? { ...x, ...cleanPatch } : x) : old;
          }
          if (event.type === 'create' && (t_data.client_id === me.id || t_data.worker_id === me.id)) {
            return [...old.filter(x => x.id !== t_data.id), t_data];
          }
          return old;
        });
      };
      updateListCache('workerTasksLayout');
      updateListCache('myPublishedTasks');
      updateListCache('myTasks');
      updateListCache('tasks');

      // activeWorkerTask
      queryClient.setQueryData(['activeWorkerTask', me.id], (old) => {
        if (event.type === 'delete') return old?.id === event.id ? null : old;
        if (event.type === 'update' && old?.id === event.id) {
          if (cleanPatch.status && TERMINAL_STATUSES.includes(cleanPatch.status)) return null;
          return { ...old, ...cleanPatch };
        }
        if (event.type === 'update' && !old && cleanPatch.worker_id === me.id && cleanPatch.status === 'TAKEN') {
          return cleanPatch;
        }
        return old;
      });

      // activeClientTask
      queryClient.setQueryData(['activeClientTask', me.id], (old) => {
        if (event.type === 'delete') return old?.id === event.id ? null : old;
        if (event.type === 'update' && old?.id === event.id) {
          if (cleanPatch.status && TERMINAL_STATUSES.includes(cleanPatch.status)) return null;
          return { ...old, ...cleanPatch };
        }
        if (event.type === 'update' && !old && cleanPatch.client_id === me.id && cleanPatch.status === 'TAKEN') {
          return cleanPatch;
        }
        return old;
      });

      // COMPLETED → refresh me + show rating
      if (event.type === 'update' && t_data.status === 'COMPLETED') {
        if (t_data.worker_id === me.id || t_data.client_id === me.id) {
          queryClient.invalidateQueries({ queryKey: ['me'] });
          maybeShowRating(t_data);
        }
      }

      // 2. Notifications (update events only)
      if (event.type !== 'update') return;
      const task = t_data;
      const prev = prevTasksRef.current[task.id];

      if (!prev) {
        if (task.client_id === me.id || task.worker_id === me.id) {
          prevTasksRef.current[task.id] = task;
        }
        return;
      }

      if (task.status === 'TAKEN' && task.worker_id) {
        takenWorkerRef.current[task.id] = task.worker_id;
      }

      // Client notifications
      if (task.client_id === me.id) {
        if (task.status === 'TAKEN' && prev.status !== 'TAKEN') {
          notify({ type: 'task_taken', taskTitle: task.title, taskId: task.id, actorId: task.worker_id });
        }
        if (task.worker_status && task.worker_status !== prev.worker_status) {
          if (task.worker_status === 'on_the_way') notify({ type: 'worker_on_the_way', taskTitle: task.title, taskId: task.id, actorId: task.worker_id });
          else if (task.worker_status === 'arrived') notify({ type: 'worker_arrived', taskTitle: task.title, taskId: task.id, actorId: task.worker_id });
          else if (task.worker_status === 'done') notify({ type: 'worker_done', taskTitle: task.title, taskId: task.id, actorId: task.worker_id });
        }
      }

      // TAKEN → OPEN (worker left)
      const prevWorkerId = prev.worker_id || takenWorkerRef.current[task.id];
      if (prev.status === 'TAKEN' && task.status === 'OPEN' && prevWorkerId && !task.worker_id) {
        if (task.client_id === me.id && me.id !== prevWorkerId) {
          notify({ type: 'worker_left_task', taskTitle: task.title, taskId: task.id, actorId: prevWorkerId });
        }
      }

      // Task CANCELLED → notify worker
      const workerIdForTask = takenWorkerRef.current[task.id] || prev.worker_id;
      const prevWasActiveForWorker = ACTIVE_WORKER_STATUSES.includes(prev.status);
      if (task.status === 'CANCELLED' && prevWasActiveForWorker && workerIdForTask === me.id && me.id !== task.client_id) {
        notify({ type: 'task_cancelled_worker', taskTitle: prev.title || task.title, taskId: task.id, actorId: task.client_id });
        setCancelledTask({ ...task, worker_id: workerIdForTask, title: prev.title || task.title });
      }

      // Task CANCELLED → notify client
      if (task.client_id === me.id && me.id !== prev.worker_id && prev.status === 'TAKEN' && task.status === 'CANCELLED') {
        setCancelSuccessTask(task);
      }

      prevTasksRef.current[task.id] = { ...prev, ...task };
    });

    return unsub;
  }, [me?.id, isAuthenticated, queryClient, maybeShowRating]);

  // ── ChatMessage subscription ─────────────────────────────────────────────
  useEffect(() => {
    if (!me?.id || !isAuthenticated) return;

    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.type !== 'create' || !event.data) return;
      const msg = event.data;
      if (msg.sender_id === me.id) return;
      const allTasks = [...(myPublishedTasksRef.current || []), ...(workerTasksRef.current || [])];
      const task = allTasks.find((t) => t.id === msg.task_id);
      if (!task) return;
      setUnreadMessages((prev) => prev + 1);
      notify({ type: 'new_message', senderName: msg.sender_name, preview: msg.content?.slice(0, 60), taskId: msg.task_id, actorId: msg.sender_id });
    });

    return unsub;
  }, [me?.id, isAuthenticated]);

  // ── CreditTransaction subscription ──────────────────────────────────────
  useEffect(() => {
    if (!me?.id || !isAuthenticated) return;

    const unsub = base44.entities.CreditTransaction.subscribe((event) => {
      if (event.type !== 'create' || !event.data) return;
      const tx = event.data;
      if (tx.user_id !== me.id) return;
      // Update credits in cache directly from the transaction's balance_after (avoids refetch)
      if (tx.balance_after != null) {
        queryClient.setQueryData(['me'], (old) => old ? { ...old, worker_credits: tx.balance_after } : old);
      }
      if (tx.type === 'Loyalty_Reward') {
        notify({ type: 'new_review', taskId: tx.task_id, actorId: 'system', preview: t('loyalty_reward_notif').replace('{n}', tx.amount) });
      }
    });

    return unsub;
  }, [me?.id, isAuthenticated, queryClient]);

  // ── Review subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!me?.id || !isAuthenticated) return;

    const unsub = base44.entities.Review.subscribe((event) => {
      if (event.type !== 'create' || !event.data) return;
      if (event.data.reviewee_id !== me.id) return;
      notify({ type: 'new_review', taskId: event.data.task_id, rating: event.data.rating, actorId: event.data.reviewer_id, preview: t('review_received_notif').replace('{n}', event.data.rating) });
    });

    return unsub;
  }, [me?.id, isAuthenticated]);

  // ── TaskApplication subscription ────────────────────────────────────────
  useEffect(() => {
    if (!me?.id || !isAuthenticated) return;

    const unsub = base44.entities.TaskApplication.subscribe((event) => {
      const appData = event.data || {};
      let prevAppStatus = null;

      // Sync applications-pulse cache
      if (appData.task_id) {
        queryClient.setQueryData(['applications-pulse', appData.task_id], (old = []) => {
          if (event.type === 'create') return old.find((a) => a.id === appData.id) ? old : [...old, appData];
          if (event.type === 'update') return old.map((a) => a.id === appData.id ? { ...a, ...appData } : a);
          if (event.type === 'delete') return old.filter((a) => a.id !== appData.id);
          return old;
        });
      }

      // Detect approved → rejected (revocation)
      if (event.type === 'update' && appData.worker_id === me.id) {
        const appId = event.id || appData.id;
        const prevStatus = appStatusRef.current[appId];
        prevAppStatus = prevStatus;
        appStatusRef.current[appId] = appData.status;
        if (prevStatus === 'approved' && appData.status === 'rejected') {
          const allTasks = [...(myPublishedTasksRef.current || []), ...(workerTasksRef.current || [])];
          const relatedTask = allTasks.find((t) => t.id === appData.task_id);
          setRevokedTask(relatedTask || { id: appData.task_id, title: appData.task_title || 'משימה' });
        }
      }

      if (event.type === 'create' && appData.task_id) {
        const isMyTask = myPublishedTasksRef.current.some((t) => t.id === appData.task_id);
        const iAmApplicant = appData.worker_id === me.id;
        if (isMyTask && !iAmApplicant) {
          const task = myPublishedTasksRef.current.find((t) => t.id === appData.task_id);
          notify({ type: 'application_received', taskTitle: task?.title || 'משימה', taskId: appData.task_id, actorId: appData.worker_id });
        }
        if (iAmApplicant && !isMyTask) {
          const appliedTask = workerTasksRef.current.find((t) => t.id === appData.task_id);
          notify({ type: 'application_sent', taskTitle: appliedTask?.title || appData.task_title || 'משימה', taskId: appData.task_id, actorId: me.id });
        }
      } else if (event.type === 'update') {
        if (appData.status === 'rejected' && appData.worker_id === me.id) {
          const isMyOwnTask = myPublishedTasksRef.current.some((t) => t.id === appData.task_id);
          if (isMyOwnTask) return;
          if (prevAppStatus !== 'approved') {
            const allTasks = [...(myPublishedTasksRef.current || []), ...(workerTasksRef.current || [])];
            const rejectedTask = allTasks.find((t) => t.id === appData.task_id);
            notify({ type: 'application_rejected', taskTitle: rejectedTask?.title || 'משימה', taskId: appData.task_id, actorId: appData.task_id });
          }
        }
      }
    });

    return unsub;
  }, [me?.id, isAuthenticated, queryClient]);
}