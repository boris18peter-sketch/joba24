import { resolveStatusFlow, stepIndexOf, nextCta, flowSteps } from '@/lib/taskStatusFlow';
import { isEngagement, primaryOccurrence, formatOccurrence, scheduleWindows } from '@/lib/scheduling';

/**
 * THE ORACLE — a line-for-line transcription of the presentation the app renders
 * TODAY. It exists so the snapshot builder can be held against the real screens
 * rather than against an opinion about them.
 *
 *   bannerPresentation()   ← src/components/ActiveTaskBanner.jsx:183-251
 *   getQuickAction()       ← src/components/ActiveTaskBanner.jsx:53-67
 *   openCardPresentation() ← src/components/ApplicantsGoldButton.jsx:60-64
 *                            + TaskCard's scanning line
 *
 * Everything it calls (resolveStatusFlow, stepIndexOf, nextCta, flowSteps,
 * isEngagement, primaryOccurrence, formatOccurrence, scheduleWindows) is the
 * app's real code — this file only re-expresses the if/else ladder those lines
 * contain, because the component itself needs React to run.
 *
 * If ActiveTaskBanner's ladder changes and this file is not updated, the parity
 * test will still pass while real parity is lost. That limitation is reported in
 * the Stage 0 findings, with the proposed fix.
 */

const CANONICAL_STEPS = ['on_the_way', 'arrived', 'done'];

/** Transcription of getQuickAction() — ActiveTaskBanner.jsx:53-67. */
export function getQuickAction(flow, workerStatus) {
  const cta = nextCta(flow, workerStatus);
  if (!cta) return null;
  const icon = cta.key === 'on_the_way' ? 'navigation' : cta.key === 'arrived' ? 'map_pin' : 'check';
  const color = cta.key === 'on_the_way' ? 'brand' : 'success';
  return { ...cta, nextKey: cta.key, icon, color };
}

/** Transcription of the banner hero/sub ladder — ActiveTaskBanner.jsx:183-251. */
export function bannerPresentation(task, { role, catRows, now, windows, t }) {
  const wins = windows || scheduleWindows({});

  const flow = resolveStatusFlow(task.category, catRows);
  const flowIdx = stepIndexOf(flow, task.worker_status);
  const tStatusInfo = flowIdx >= 0
    ? { step: flowIdx, label: flow.steps[flowIdx].label, ownerLabel: flow.steps[flowIdx].owner_label }
    : null;
  const tIsWorker = role === 'worker';
  const tStepIdx = tStatusInfo?.step ?? -1;
  const isTaskActive = task.status === 'TAKEN';

  const isUpcoming = isEngagement(task, now, wins);
  const nextOccurrence = isUpcoming ? primaryOccurrence(task, now) : null;
  const quickAction = tIsWorker && isTaskActive && !isUpcoming ? getQuickAction(flow, task.worker_status) : null;

  const cfgStatusLabel = tIsWorker ? tStatusInfo?.label : tStatusInfo?.ownerLabel;
  const nextBtnLabel = quickAction?.label;

  let title;
  let subtitle;
  if (isUpcoming) {
    title = tIsWorker ? t('atb_planned_worker') : t('atb_planned_owner');
    subtitle = nextOccurrence
      ? (tIsWorker
          ? t('atb_planned_worker_sub', { when: formatOccurrence(nextOccurrence) })
          : t('atb_planned_owner_sub', { when: formatOccurrence(nextOccurrence) }))
      : '';
  } else if (tIsWorker) {
    if (tStepIdx < 0) {
      title = t('atb_set_out');
      subtitle = nextBtnLabel ? t('atb_sub_btn_start', { btn: nextBtnLabel }) : t('atb_sub_update_status');
    } else if (tStepIdx === 0) {
      title = t('atb_on_way');
      subtitle = nextBtnLabel ? t('atb_sub_btn_arrive', { btn: nextBtnLabel }) : t('atb_sub_keep_going');
    } else if (tStepIdx === 1) {
      title = cfgStatusLabel || t('atb_working');
      subtitle = nextBtnLabel ? t('atb_sub_btn_finish', { btn: nextBtnLabel }) : t('atb_sub_work_in_progress');
    } else {
      title = cfgStatusLabel || t('atb_done_wait');
      subtitle = t('atb_sub_publisher_approves');
    }
  } else {
    if (tStepIdx < 0) {
      title = t('atb_await_worker');
      subtitle = t('atb_sub_worker_updates');
    } else if (tStepIdx === 0) {
      title = cfgStatusLabel || t('atb_worker_coming');
      subtitle = t('atb_sub_youll_know');
    } else if (tStepIdx === 1) {
      title = cfgStatusLabel || t('atb_worker_here');
      subtitle = t('atb_sub_work_in_progress');
    } else {
      title = cfgStatusLabel || t('atb_worker_done');
      subtitle = t('atb_sub_tap_approve');
    }
  }

  const heroDone = tStepIdx === 2;
  const heroIcon = isUpcoming
    ? 'calendar'
    : heroDone
      ? 'check'
      : (flow.steps[Math.min(Math.max(tStepIdx, 0), flow.steps.length - 1)].icon || 'navigation');

  return {
    flow,
    stepIdx: tStepIdx,
    isUpcoming,
    title,
    subtitle,
    iconKey: heroIcon,
    colorKey: quickAction ? quickAction.color : null,
    nextBtnLabel,
    progressSteps: flowSteps(flow, tIsWorker ? 'worker' : 'owner'),
    phase: isUpcoming
      ? 'scheduled'
      : tStepIdx < 0
        ? 'awaiting_start'
        : tStepIdx === 0
          ? 'on_the_way'
          : tStepIdx === 1
            ? 'arrived'
            : 'done',
  };
}

/** Transcription of the OPEN publisher card — ApplicantsGoldButton + TaskCard. */
export function openCardPresentation(task, { t, categoryLabel = '' }) {
  const count = Array.isArray(task.applicants) ? task.applicants.length : 0;
  if (count > 0) {
    return {
      title: `${count} ${t('applications')} · ${t('click_to_view_approve')}`,
      subtitle: categoryLabel,
      phase: 'open',
    };
  }
  const scanning = t('scanning_texts');
  return {
    title: Array.isArray(scanning) ? scanning[0] : scanning,
    subtitle: t('task_exposed'),
    phase: 'open',
  };
}

export { CANONICAL_STEPS };