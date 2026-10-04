import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { taskAlertStore } from '@/lib/taskAlertStore';

/**
 * useTaskAlerts — detects "the publisher cancelled a task I was assigned to"
 * and raises it on the GLOBAL alert store.
 *
 * Mounted once, in GlobalPopups, so it runs on EVERY route — including the
 * standalone screens rendered outside Layout (/chat/:taskId, /support), where
 * Layout's realtime hook is not mounted. That was why a worker sitting in a
 * chat thread never saw the cancellation popup.
 *
 * Detection is based on a real transition: the pre-update snapshot must show the
 * caller as the assigned worker on an active task, and the update must move the
 * task to CANCELLED. The cancellation update nulls `worker_id`, so the previous
 * state is the only reliable evidence of ownership.
 */
const ACTIVE_WORKER_STATUSES = ['TAKEN', 'APPROVED_PENDING_DEPARTURE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'];

export default function useTaskAlerts(meId) {
  const prevRef = useRef({});
  const raisedRef = useRef(new Set());

  useEffect(() => {
    if (!meId) return;
    let stopped = false;

    // Seed the previous-state map from the worker's own tasks so a cancellation
    // is still detected for a task this device had not yet seen an update for.
    base44.entities.Task.filter({ worker_id: meId }, '-updated_date', 50)
      .then((tasks) => {
        if (stopped) return;
        (tasks || []).forEach((task) => {
          if (!prevRef.current[task.id]) prevRef.current[task.id] = task;
        });
      })
      .catch(() => {});

    const unsub = base44.entities.Task.subscribe((event) => {
      const patch = event.data;
      if (!patch) return;

      if (event.type === 'delete') {
        delete prevRef.current[event.id];
        return;
      }
      if (event.type !== 'update') return;

      // Snapshot BEFORE merging this update in — that is the pre-cancellation state.
      const prev = prevRef.current[event.id];
      if (patch.status) prevRef.current[event.id] = { ...(prev || {}), ...patch };

      if (patch.status !== 'CANCELLED' || !prev) return;
      if (prev.worker_id !== meId) return;
      if (!ACTIVE_WORKER_STATUSES.includes(prev.status)) return;
      if (raisedRef.current.has(event.id)) return;

      raisedRef.current.add(event.id);
      taskAlertStore.raise('cancelled', {
        ...prev,
        ...patch,
        title: prev.title || patch.title || '',
      });
    });

    return () => { stopped = true; unsub(); };
  }, [meId]);
}