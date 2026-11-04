import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { useGlobalCategories } from '@/lib/brand/globalCategories';
import { useJobaSettings } from '@/hooks/useJobaSettings';
import {
  activeTaskActivities,
  attachActivityTokenListener,
  clearActivityAction,
  drainActivityActionStages,
  endTaskActivity,
  isLiveActivityNative,
  startTaskActivity,
  updateTaskActivity,
} from '@/lib/liveActivityNative';
import {
  buildRealSnapshot,
  contentKeyOf,
  isLiveForRole,
  planActivityStep,
  selectTrackedTask,
  DEMO_ACTIVITY_TASK_ID,
  RUNNING_ACTIVITY_STATES,
} from '@/lib/realTaskActivity';

/**
 * RealTaskActivityBridge — the ONE call site that connects a REAL task to the
 * native Live Activity. It renders nothing.
 *
 * ── THE EXACT TRIGGER ──────────────────────────────────────────────────────
 * It watches `['activeWorkerTask']` / `['activeClientTask']` — the same two
 * caches ActiveTaskBanner renders, seeded from the user's own task lists and
 * updated by the app's realtime subscription. The moment a real Task becomes
 * active for this user (worker approved → `status: 'TAKEN'` with `worker_id`,
 * or the publisher's task being taken), that cache holds a task and this bridge
 * starts the activity for that role. No new status system, no polling, no
 * second source of truth: the same record the banner shows.
 *
 * ── ROLLOUT SAFETY ─────────────────────────────────────────────────────────
 * Everything here is behind the server's `access` answer: a user who is not on
 * `LiveActivityConfig.test_user_ids` gets `allowed: false`, and this component
 * then does nothing at all — no start, no token registration, no report. The
 * server refuses the same calls independently, so a tampered client gains
 * nothing.
 *
 * ── WHAT IT CANNOT DO ──────────────────────────────────────────────────────
 * It never writes a Task, never approves, completes, pays or cancels anything.
 * It reads the task it was handed and drives the Lock Screen. Every failure is
 * reported to the diagnostic table and swallowed: a Lock Screen must never be
 * able to break a task action.
 */
const ACCESS_CACHE = { value: null };

/**
 * Forward the Lock Screen's own account of its taps.
 *
 * The App Intent runs in this app's process but with no session, so the only
 * thing it can do is write a stage into the shared App Group. This is the leg
 * that turns that into evidence: an `action_applied` row, or an `action_failed`
 * row naming the exact stage the tap stopped at (`no_capability`,
 * `http_409:stale_step`, `network_error`, …). Without it a dead button looked
 * identical to a button nobody pressed.
 */
async function flushActionStages() {
  const stages = await drainActivityActionStages();
  for (const entry of stages.slice(0, 10)) {
    if (!entry?.task) continue;
    base44.functions.invoke('liveActivityRealTask', {
      action: 'report',
      task_id: entry.task,
      role: entry.role === 'worker' ? 'worker' : 'publisher',
      event: String(entry.stage || '').startsWith('applied') ? 'action_applied' : 'action_failed',
      reason: [entry.stage, entry.detail].filter(Boolean).join(':').slice(0, 120),
    }).catch(() => {});
  }
}

/**
 * Re-read the tasks behind the cards still on this device.
 *
 * ── WHY A CARD IS ALLOWED TO BE CLOSED ONLY ON THIS EVIDENCE ───────────────
 * Closing a card is the one destructive thing the bridge does, and it used to
 * be decided from the active-task CACHES — which the app empties and refills
 * around every realtime task event. So each status update produced a pass where
 * nothing was tracked, the card was read as an orphan, and it was ended with
 * `.immediate` dismissal; the next pass started a brand-new one. On a locked
 * iPhone that is precisely what the tester saw: the card did not move on, it
 * vanished (and the screen went back to its idle Lock Screen) at the exact
 * moment of the update, over and over.
 *
 * The card's own task is now read directly — one record, the one the card
 * belongs to — and only a task that is genuinely no longer live work for this
 * user and role allows the card to close. RLS refuses another user's record,
 * which reads as `null` and is itself the evidence to close.
 */
async function verifyLiveCards(activities, userId) {
  const running = (activities || []).filter((a) => (
    a?.taskId
    && a.taskId !== DEMO_ACTIVITY_TASK_ID
    && RUNNING_ACTIVITY_STATES.includes(a.activityState)
  ));
  const live = [];
  // At most one real card per role, so this is a two-read ceiling at worst.
  for (const card of running.slice(0, 2)) {
    const task = await base44.entities.Task.get(card.taskId).catch(() => null);
    if (isLiveForRole(task, card.role, userId)) {
      live.push({ taskId: card.taskId, role: card.role });
    }
  }
  return live;
}

export default function RealTaskActivityBridge() {
  const { t } = useLanguage();
  const { rows: catRows } = useGlobalCategories();
  const { settings } = useJobaSettings();

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  // READ-ONLY subscriptions to the caches Layout owns. `enabled: false` means
  // this never fetches: it observes what the app already loaded.
  const { data: workerTask } = useQuery({
    queryKey: ['activeWorkerTask', me?.id],
    queryFn: () => null,
    enabled: false,
    staleTime: Infinity,
  });
  const { data: clientTask } = useQuery({
    queryKey: ['activeClientTask', me?.id],
    queryFn: () => null,
    enabled: false,
    staleTime: Infinity,
  });

  const [access, setAccess] = useState(ACCESS_CACHE.value);
  const [tick, setTick] = useState(0);
  const appliedRef = useRef(null);
  const busyRef = useRef(false);

  // ── 1. Am I allowed at all? One question per app run ──────────────────────
  useEffect(() => {
    if (!isLiveActivityNative() || !me?.id || access) return undefined;
    let alive = true;
    base44.functions.invoke('liveActivityRealTask', { action: 'access' })
      .then((response) => {
        const value = response?.data || { allowed: false };
        ACCESS_CACHE.value = value;
        if (alive) setAccess(value);
      })
      .catch(() => { if (alive) setAccess({ allowed: false }); });
    return () => { alive = false; };
  }, [me?.id, access]);

  // ── 2. Register the push token whenever iOS issues one ────────────────────
  // Without this the server has nowhere to send an update while the app is
  // closed. It runs only for an allowlisted device.
  useEffect(() => {
    if (!access?.allowed) return undefined;
    return attachActivityTokenListener(() => {});
  }, [access?.allowed]);

  const tracked = useMemo(
    () => selectTrackedTask({ workerTask, clientTask, userId: me?.id }),
    [workerTask, clientTask, me?.id],
  );

  const snapshot = useMemo(() => {
    if (!access?.allowed || !tracked?.task || !me?.id) return null;
    return buildRealSnapshot({
      task: tracked.task,
      role: tracked.role,
      userId: me.id,
      t,
      catRows,
      settings,
      revision: 1,
    });
  }, [access?.allowed, tracked, me?.id, t, catRows, settings]);

  const contentKey = contentKeyOf(snapshot);

  // ── 3. Start / update / end, from the CURRENT state of the phone ──────────
  // The device's own activity list is the truth, not a local flag: an activity
  // iOS dismissed (reboot, or the user swiped it away) must be started again,
  // and a leftover one for a task that is over must be closed.
  useEffect(() => {
    if (!access?.allowed || !me?.id || !isLiveActivityNative()) return undefined;

    let alive = true;
    const timer = setTimeout(async () => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const { activities } = await activeTaskActivities();
        if (!alive) return;

        // What the Lock Screen did since the last pass. Deliberately BEFORE the
        // start/update decision, so a tap's evidence is recorded even on a pass
        // that turns out to have nothing else to do.
        flushActionStages();

        let plan = planActivityStep({
          task: tracked?.task || null,
          role: tracked?.role || null,
          activities,
          contentKey,
          applied: appliedRef.current,
        });

        // ── A CLOSE IS ONLY EVER DECIDED BY THE TASK, NEVER BY A CACHE GAP ──
        // Before this, "nothing tracked this instant" was enough to end the
        // card. It is not evidence of anything: the caches are rebuilt around
        // every realtime event, so the gap appears on every status update.
        // Each card's own task is re-read, and the close is re-planned with that
        // evidence; a card whose work is still live is left exactly where it is
        // and the next pass updates it normally.
        if (plan.action === 'end') {
          const verifiedLive = await verifyLiveCards(activities, me.id);
          if (!alive) return;
          if (verifiedLive.length) {
            plan = planActivityStep({
              task: tracked?.task || null,
              role: tracked?.role || null,
              activities,
              contentKey,
              applied: appliedRef.current,
              verifiedLive,
            });
          }
        }

        const step = plan;
        if (!alive || step.action === 'none' || !step.taskId) return;

        const report = (event, extra = {}) => {
          base44.functions.invoke('liveActivityRealTask', {
            action: 'report',
            task_id: step.taskId,
            role: step.role,
            event,
            reason: extra.reason || '',
            activity_id: extra.activityId || '',
            revision: extra.revision ?? null,
            phase: extra.phase || '',
          }).catch(() => {});
        };

        if (step.action === 'start') {
          // The server owns the revision sequence; ask before starting so the
          // first push after this card is never refused as stale.
          const begin = await base44.functions.invoke('liveActivityRealTask', {
            action: 'begin', task_id: step.taskId, role: step.role,
          }).then((r) => r?.data).catch(() => null);

          if (!begin?.ok) {
            report('start_failed', { reason: begin?.error || 'begin_failed' });
            return;
          }

          const state = buildRealSnapshot({
            task: tracked.task,
            role: step.role,
            userId: me.id,
            t,
            catRows,
            settings,
            revision: begin.revision,
          });
          if (!state) { report('start_failed', { reason: 'no_snapshot' }); return; }

          const result = await startTaskActivity({ taskId: step.taskId, role: step.role, state });
          if (!result.started) {
            // `activities_disabled` = the user denied Live Activities for this
            // app; it is a normal outcome, visible in the diagnostic view.
            report('start_failed', { reason: result.reason || 'not_started' });
            return;
          }
          appliedRef.current = { taskId: step.taskId, role: step.role, contentKey: contentKeyOf(state) };
          report('started', { activityId: result.activityId, revision: begin.revision, phase: state.phase });
          if (alive) setTick((n) => n + 1);
          return;
        }

        if (step.action === 'update') {
          const sync = await base44.functions.invoke('liveActivityRealTask', {
            action: 'sync', task_id: step.taskId, role: step.role,
          }).then((r) => r?.data).catch(() => null);

          if (!sync?.ok) { report('update_failed', { reason: sync?.error || 'sync_failed' }); return; }

          const state = buildRealSnapshot({
            task: tracked.task,
            role: step.role,
            userId: me.id,
            t,
            catRows,
            settings,
            revision: sync.revision,
          });
          if (!state) { report('update_failed', { reason: 'no_snapshot' }); return; }

          const result = await updateTaskActivity({ taskId: step.taskId, role: step.role, state });
          if (!result.updated) {
            report('update_failed', { reason: result.reason || 'not_updated' });
            return;
          }
          appliedRef.current = { taskId: step.taskId, role: step.role, contentKey: contentKeyOf(state) };
          report('updated', { revision: sync.revision, phase: state.phase });
          return;
        }

        // step.action === 'end'
        const result = await endTaskActivity({ taskId: step.taskId, role: step.role, dismissAfter: 0 });
        // The capability cannot outlive the card.
        clearActivityAction({ taskId: step.taskId, role: step.role });
        if (appliedRef.current?.taskId === step.taskId) appliedRef.current = null;
        // Tell the server the card is gone, so a late duplicate event cannot
        // push a second "end" for work already off the Lock Screen.
        await base44.functions.invoke('liveActivityRealTask', {
          action: 'end', task_id: step.taskId, role: step.role,
        }).catch(() => {});
        report(result.ended ? 'ended' : 'end_failed', {
          reason: result.ended ? step.reason : (result.reason || 'no_activity'),
        });
        if (alive) setTick((n) => n + 1);
      } catch {
        // Never surface: the Lock Screen is an extra, never a dependency.
      } finally {
        busyRef.current = false;
      }
    }, 350);

    return () => { alive = false; clearTimeout(timer); };
    // The dependency list is deliberately made of STABLE, MEANINGFUL values:
    //  • contentKey — a string of everything the card shows, so a re-render that
    //    changed nothing visible (a new object identity, a parent render) does
    //    not call the bridge again;
    //  • the tracked identity and role — a different task is a different card;
    //  • tick — re-runs the pass after an action, so a second orphan is handled
    //    on the next turn instead of looping inside this one.
  }, [access?.allowed, me?.id, contentKey, tracked?.task?.id, tracked?.role, tick]);

  return null;
}