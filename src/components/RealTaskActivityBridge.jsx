import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import useCachedQueryValues from '@/hooks/useCachedQueryValues';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { useGlobalCategories } from '@/lib/brand/globalCategories';
import { useJobaSettings } from '@/hooks/useJobaSettings';
import {
  activeTaskActivities,
  attachActivityTokenListener,
  attachPushToStartTokenListener,
  clearActivityAction,
  drainActivityActionStages,
  endTaskActivity,
  ensureUserActionCapability,
  isLiveActivityNative,
  startTaskActivity,
  syncPushToStartToken,
  updateTaskActivity,
} from '@/lib/liveActivityNative';
import {
  buildRealSnapshot,
  contentKeyOf,
  isLiveForRole,
  planActivityStep,
  selectOpenPublisherTask,
  selectTrackedTask,
  DEMO_ACTIVITY_TASK_ID,
  RUNNING_ACTIVITY_STATES,
} from '@/lib/realTaskActivity';
import { myPublishedTasksQuery } from '@/lib/queries';

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
/* ── NO PROCESS-WIDE ACCESS CACHE ────────────────────────────────────────────
   This used to be a module-level `{ value }` that was never keyed by user and
   never refreshed. Two consequences, both reported by testers as "it only works
   after I open the app again":

   • an answer of `allowed: false` — correct at the time, because the allowlist
     had not included that user yet — stayed cached for the whole life of the
     process, so the bridge never registered a token and never started a card;
   • switching accounts in the same process kept the PREVIOUS user's answer.

   The question is one cheap function call, asked on start, on account change and
   on every return to the foreground (see `probe` below). Asking again is what
   makes a newly allowlisted device begin working without a relaunch. */

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

  // ── THE BRIDGE OBSERVES; IT NEVER FETCHES ────────────────────────────────
  // These three values come straight out of the query cache, and the bridge
  // subscribes to the cache's own events to re-render when they change.
  //
  // It used to register a query per key whose fetch function resolved to nothing,
  // believing that was an observation. React Query copies an observer's options
  // onto the SHARED query, and `invalidateQueries()` refetches using the query's
  // options — so after the bridge had rendered once, an invalidation of
  // `['myPublishedTasks', meId]` ran `() => null` and replaced the publisher's
  // task list with `null`. The app shell's next `T.find(...)` then threw
  // `null is not an object`, and the in-app banner lost the active task the same
  // way. Reading the cache registers nothing and cannot rewrite another
  // component's query.
  //
  // The three keys are the ones the rest of the app already keeps live: the two
  // active-task caches the banner renders, and the publisher's own task list —
  // the same list the "my tasks" screens read, patched by the realtime
  // subscription on every task change (including a new applicant). One cache,
  // several readers, no second source of truth.
  //
  // The active-task caches are deliberately TAKEN-only: they also drive the
  // in-app banner, and an OPEN task is not "the job in progress". The publisher's
  // list is what makes an OPEN task a Lock Screen candidate before assignment.
  const [workerTask, clientTask, publishedTasks] = useCachedQueryValues([
    ['activeWorkerTask', me?.id],
    ['activeClientTask', me?.id],
    myPublishedTasksQuery(me?.id).queryKey,
  ]);

  const openPublisherTask = useMemo(
    () => selectOpenPublisherTask(publishedTasks, me?.id),
    [publishedTasks, me?.id],
  );

  const [access, setAccess] = useState(null);
  const [tick, setTick] = useState(0);
  // Bumped every time the app returns to the foreground.
  const [probe, setProbe] = useState(0);
  const appliedRef = useRef(null);
  const busyRef = useRef(false);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setProbe((n) => n + 1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // ── 1. Am I allowed at all? ───────────────────────────────────────────────
  // Asked on start, on account change, and on every foreground — so a device
  // added to the allowlist starts reporting within seconds of coming back to the
  // app instead of after a cold relaunch.
  useEffect(() => {
    if (!isLiveActivityNative() || !me?.id) return undefined;
    let alive = true;
    base44.functions.invoke('liveActivityRealTask', { action: 'access' })
      .then((response) => {
        if (alive) setAccess({ ...(response?.data || { allowed: false }), userId: me.id });
      })
      .catch(() => { if (alive) setAccess({ allowed: false, userId: me.id }); });
    return () => { alive = false; };
  }, [me?.id, probe]);

  // ── 2. Register the push token whenever iOS issues one ────────────────────
  // Without this the server has nowhere to send an update while the app is
  // closed. It runs only for an allowlisted device.
  useEffect(() => {
    if (!access?.allowed || access.userId !== me?.id) return undefined;
    return attachActivityTokenListener(() => {});
  }, [access?.allowed, access?.userId, me?.id, probe]);

  // ── 2b. PUSH-TO-START: the install token, and the button that appears with it ──
  // Three things, all for an allowlisted device only:
  //  • register the token Apple already issued (a launch with no rotation would
  //    otherwise never send it);
  //  • keep listening, so a ROTATION re-registers without any user action;
  //  • mint the install-scoped action capability, so the button on a card that
  //    appeared while the app was closed is not dead the first time it is tapped.
  useEffect(() => {
    if (!access?.allowed || access.userId !== me?.id) return undefined;
    syncPushToStartToken().catch(() => {});
    ensureUserActionCapability().catch(() => {});
    return attachPushToStartTokenListener(() => {});
  }, [access?.allowed, access?.userId, me?.id, probe]);

  const tracked = useMemo(
    () => selectTrackedTask({
      workerTask,
      clientTask,
      openTask: openPublisherTask,
      userId: me?.id,
    }),
    [workerTask, clientTask, openPublisherTask, me?.id],
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

        // ── APPLY THE CURRENT CONTENT TO A CARD THAT ALREADY EXISTS ─────────
        // Used by the ordinary update path AND by a start that finds a card was
        // created for this pair a moment earlier. A device update goes through
        // `sync` so the revision advances exactly as a pushed one would.
        const pushUpdate = async () => {
          const sync = await base44.functions.invoke('liveActivityRealTask', {
            action: 'sync', task_id: step.taskId, role: step.role,
          }).then((r) => r?.data).catch(() => null);

          if (!sync?.ok) { report('update_failed', { reason: sync?.error || 'sync_failed' }); return false; }

          const state = buildRealSnapshot({
            task: tracked.task,
            role: step.role,
            userId: me.id,
            t,
            catRows,
            settings,
            revision: sync.revision,
          });
          if (!state) { report('update_failed', { reason: 'no_snapshot' }); return false; }

          const result = await updateTaskActivity({ taskId: step.taskId, role: step.role, state });
          if (!result.updated) {
            report('update_failed', { reason: result.reason || 'not_updated' });
            return false;
          }
          appliedRef.current = { taskId: step.taskId, role: step.role, contentKey: contentKeyOf(state) };
          report('updated', { revision: sync.revision, phase: state.phase });
          return true;
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

          // ── A CARD THAT APPEARED WHILE WE WERE ASKING ──────────────────────
          // Push-to-Start can create this pair's card at the same instant the app
          // decides to start one. `begin` already stops the SERVER from starting a
          // second (`revision > 0` refuses a remote start), but the device asked
          // for its activity list BEFORE that push landed, so on its own it would
          // request a second card for the same job. The list is read again here:
          // an existing card is adopted and updated instead.
          const { activities: latest } = await activeTaskActivities();
          if (!alive) return;
          const adopted = (latest || []).some((a) => (
            a?.taskId === step.taskId
            && a.role === step.role
            && RUNNING_ACTIVITY_STATES.includes(a.activityState)
          ));
          if (adopted) {
            await pushUpdate();
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
          await pushUpdate();
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