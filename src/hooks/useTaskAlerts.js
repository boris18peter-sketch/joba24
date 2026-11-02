import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { taskAlertStore } from '@/lib/taskAlertStore';

/**
 * useTaskAlerts — the automatic moments that must reach a user on EVERY route:
 *
 *  • 'cancelled'      — the publisher cancelled a task I was assigned to.
 *  • 'approved'       — I was approved for a task, so the "לצאת לדרך" sheet
 *                       opens on its own and departure is one tap away.
 *  • 'new_applicant'   — someone applied to MY task, offered with photo,
 *                       rating and an instant approve.
 *
 * Mounted once, in GlobalPopups, so it runs even on the standalone screens
 * rendered outside Layout (/chat/:taskId, /support), where Layout's own
 * realtime hook is not mounted.
 *
 * Cancellation is detected from a real transition on the task (the cancel
 * update nulls `worker_id`, so the pre-update snapshot is the only evidence of
 * ownership). Approval and applications are detected on the APPLICATION entity
 * instead: that event names the worker and the task directly, and a worker's
 * pending task is not in his own `worker_id` list yet, so the task stream alone
 * could never see the approval.
 */
const ACTIVE_WORKER_STATUSES = ['TAKEN', 'APPROVED_PENDING_DEPARTURE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'];

// One "you're approved, go" sheet per task per device — it is a nudge, not a
// nag, and the task itself keeps showing the departure step afterwards.
const departureSeenKey = (taskId) => `joba24_departure_seen_${taskId}`;

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

    const resolvedDeparture = (taskId) => {
      try { localStorage.setItem(departureSeenKey(taskId), '1'); } catch { /* private mode */ }
    };

    // ── An approval that happened while the app was closed ──────────────────
    // Without this the departure sheet only ever appeared for a user who was
    // online at the exact moment of approval.
    (async () => {
      try {
        const apps = await base44.entities.TaskApplication.filter(
          { worker_id: meId, status: 'approved' }, '-created_date', 10
        );
        for (const app of apps || []) {
          if (stopped) return;
          if (localStorage.getItem(departureSeenKey(app.task_id))) continue;
          const task = await base44.entities.Task.get(app.task_id);
          if (stopped || !task) continue;
          if (task.status !== 'APPROVED_PENDING_DEPARTURE' || task.worker_id !== meId) continue;
          resolvedDeparture(task.id);
          taskAlertStore.raise('approved', task);
          break;
        }
      } catch { /* a missed nudge is never worth breaking the app for */ }
    })();

    const unsubTask = base44.entities.Task.subscribe((event) => {
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

    const unsubApps = base44.entities.TaskApplication.subscribe(async (event) => {
      const patch = event.data;
      if (!patch) return;

      // ── WORKER: my application was just approved ──────────────────────────
      if (event.type === 'update' && patch.status === 'approved' && patch.worker_id === meId) {
        const key = `approved:${event.id}`;
        if (raisedRef.current.has(key)) return;
        raisedRef.current.add(key);
        try {
          const task = await base44.entities.Task.get(patch.task_id);
          if (!task || task.status !== 'APPROVED_PENDING_DEPARTURE' || task.worker_id !== meId) return;
          resolvedDeparture(task.id);
          taskAlertStore.raise('approved', task);
        } catch { /* ignore */ }
        return;
      }

      // ── PUBLISHER: someone just applied to one of my tasks ────────────────
      if (event.type === 'create' && patch.status === 'pending' && patch.worker_id && patch.worker_id !== meId) {
        const key = `applicant:${event.id}`;
        if (raisedRef.current.has(key)) return;
        raisedRef.current.add(key);
        try {
          const task = await base44.entities.Task.get(patch.task_id);
          if (!task || task.client_id !== meId || task.status !== 'OPEN') return;
          taskAlertStore.raise('new_applicant', {
            task,
            application: { id: event.id, ...patch },
          });
        } catch { /* ignore */ }
      }
    });

    return () => { stopped = true; unsubTask(); unsubApps(); };
  }, [meId]);
}