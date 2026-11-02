import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { taskAlertStore } from '@/lib/taskAlertStore';

/**
 * useTaskAlerts — the automatic moments that must reach a user on EVERY route:
 *
 *  • 'cancelled'        — the publisher cancelled a task I was assigned to.
 *  • 'approved'         — I was picked for a task and have not set off yet, so
 *                         the "לצאת לדרך" sheet opens on its own.
 *  • 'new_applicant'    — someone applied to MY task, offered with photo,
 *                         rating and an instant approve.
 *  • 'completion_ready' — the worker marked MY task as done, so the approval
 *                         sheet opens by itself.
 *
 * ── WHY "APPROVED" WAS NEVER DETECTED ──────────────────────────────────────
 * The check used to require `status === 'APPROVED_PENDING_DEPARTURE'`, but
 * `approveWorker` stores exactly this: `status: 'TAKEN'`, `worker_id` set and
 * `worker_status` still empty — the departure step is what later moves it on.
 * No record ever carried APPROVED_PENDING_DEPARTURE at approval time, so the
 * condition was never true and the sheet never opened. The ONE definition of
 * "picked, not yet set off" now lives in `awaitingDeparture` below and is also
 * tolerant of the legacy status, so both shapes are recognised.
 *
 * Approval is watched on TWO channels — the application (which names the worker)
 * and the task itself (which `approveWorker` writes first) — because either one
 * can be the event this device happens to see.
 */
const ACTIVE_WORKER_STATUSES = ['TAKEN', 'APPROVED_PENDING_DEPARTURE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'];
const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED', 'EXPIRED'];

// One sheet per task per device — it is a nudge, not a nag; the task itself
// keeps showing the same next step afterwards.
const departureSeenKey = (taskId) => `joba24_departure_seen_${taskId}`;
const completionSeenKey = (taskId) => `joba24_completion_seen_${taskId}`;

const seen = (key) => {
  try { return !!localStorage.getItem(key); } catch { return false; }
};
const markSeen = (key) => {
  try { localStorage.setItem(key, '1'); } catch { /* private mode */ }
};

/**
 * awaitingDeparture — the worker was assigned this task and has not reported
 * setting off. `approveWorker` writes TAKEN + worker_id with no worker_status,
 * which is the real shape of "approved".
 */
export function awaitingDeparture(task, meId) {
  if (!task || !meId || task.worker_id !== meId) return false;
  if (task.status !== 'TAKEN' && task.status !== 'APPROVED_PENDING_DEPARTURE') return false;
  if (task.on_the_way_at || task.worker_status) return false;
  return true;
}

export default function useTaskAlerts(meId) {
  const prevRef = useRef({});
  const raisedRef = useRef(new Set());

  useEffect(() => {
    if (!meId) return;
    let stopped = false;
    const timers = [];

    const later = (fn, ms) => {
      const id = setTimeout(() => { if (!stopped) fn(); }, ms);
      timers.push(id);
    };

    // One raise per key per session; the caller releases the key when it has to
    // retry, so a transient read failure cannot consume the only chance.
    const claim = (key) => {
      if (raisedRef.current.has(key)) return false;
      raisedRef.current.add(key);
      return true;
    };

    // The task row and the application row are written one after the other, so
    // the first read after the event can still return the old task. Three short
    // retries settle that without any polling.
    const raiseDeparture = async (taskId, attempt = 0) => {
      const key = `departure:${taskId}`;
      if (!claim(key)) return;
      try {
        const task = await base44.entities.Task.get(taskId);
        if (stopped) return;
        if (!awaitingDeparture(task, meId)) {
          raisedRef.current.delete(key);
          if (attempt < 3) later(() => raiseDeparture(taskId, attempt + 1), 1200);
          return;
        }
        markSeen(departureSeenKey(task.id));
        taskAlertStore.raise('approved', task);
      } catch {
        raisedRef.current.delete(key);
        if (attempt < 3) later(() => raiseDeparture(taskId, attempt + 1), 1200);
      }
    };

    const raiseCompletion = async (taskId, attempt = 0) => {
      const key = `completion:${taskId}`;
      if (!claim(key)) return;
      try {
        const task = await base44.entities.Task.get(taskId);
        if (stopped) return;
        const ready = task
          && task.client_id === meId
          && task.worker_status === 'done'
          && !TERMINAL_STATUSES.includes(task.status);
        if (!ready) {
          raisedRef.current.delete(key);
          if (attempt < 3) later(() => raiseCompletion(taskId, attempt + 1), 1200);
          return;
        }
        markSeen(completionSeenKey(task.id));
        taskAlertStore.raise('completion_ready', task);
      } catch {
        raisedRef.current.delete(key);
        if (attempt < 3) later(() => raiseCompletion(taskId, attempt + 1), 1200);
      }
    };

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

    // ── An approval that happened while the app was closed ──────────────────
    (async () => {
      try {
        const apps = await base44.entities.TaskApplication.filter(
          { worker_id: meId, status: 'approved' }, '-created_date', 10
        );
        for (const app of apps || []) {
          if (stopped) return;
          if (seen(departureSeenKey(app.task_id))) continue;
          const task = await base44.entities.Task.get(app.task_id);
          if (stopped || !task) continue;
          if (!awaitingDeparture(task, meId)) continue;
          markSeen(departureSeenKey(task.id));
          taskAlertStore.raise('approved', task);
          break;
        }
      } catch { /* a missed nudge is never worth breaking the app for */ }
    })();

    // ── A job of mine whose worker already marked it done ───────────────────
    (async () => {
      try {
        const tasks = await base44.entities.Task.filter({ client_id: meId }, '-updated_date', 20);
        if (stopped) return;
        const done = (tasks || []).find((t) => (
          t.worker_status === 'done'
          && !TERMINAL_STATUSES.includes(t.status)
          && !seen(completionSeenKey(t.id))
        ));
        if (!done) return;
        markSeen(completionSeenKey(done.id));
        taskAlertStore.raise('completion_ready', done);
      } catch { /* ignore */ }
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

      // ── WORKER: the task itself says I was just assigned ────────────────
      // approveWorker writes the task first, so this is the earliest evidence.
      if (patch.status === 'TAKEN' && patch.worker_id === meId && !seen(departureSeenKey(event.id))) {
        raiseDeparture(event.id);
      }

      // ── PUBLISHER: the worker just marked my task as done ───────────────
      if (patch.worker_status === 'done' && !seen(completionSeenKey(event.id))) {
        raiseCompletion(event.id);
      }

      // ── WORKER: the publisher cancelled the task ────────────────────────
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
        if (seen(departureSeenKey(patch.task_id))) return;
        raiseDeparture(patch.task_id);
        return;
      }

      // ── PUBLISHER: someone just applied to one of my tasks ────────────────
      if (event.type === 'create' && patch.status === 'pending' && patch.worker_id && patch.worker_id !== meId) {
        const key = `applicant:${event.id}`;
        if (!claim(key)) return;
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

    return () => {
      stopped = true;
      timers.forEach(clearTimeout);
      unsubTask();
      unsubApps();
    };
  }, [meId]);
}