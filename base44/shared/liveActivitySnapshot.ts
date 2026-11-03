/**
 * liveActivitySnapshot — the server-side composition point.
 *
 * It glues three pieces that are each independently tested:
 *
 *   liveActivityFlow     → the category flow + schedule state (authoritative
 *                          GlobalCategory rules, same as the app)
 *   liveActivityStrings  → the exact Hebrew copy the app shows
 *   taskActivitySnapshot → the versioned presentation contract (Stage 0)
 *
 * There is no presentation ladder here. Everything visible comes from the Stage
 * 0 contract, which is already proven against ActiveTaskBanner and the applicant
 * button. This module only supplies its inputs from the database.
 */
import { buildTaskActivitySnapshot } from './taskActivitySnapshot.ts';
import { resolveStatusFlow, categoryLabelFor, resolveSchedule } from './liveActivityFlow.ts';
import { t } from './liveActivityStrings.ts';

/**
 * Build the snapshot for one task, one role, one authenticated recipient.
 *
 * @returns the frozen snapshot, or null when this task must not be tracked
 *          (terminal status, or a role/identity that does not own it).
 */
export function buildBackendSnapshot(input) {
  const {
    task,
    role,
    userId,
    categories = [],
    settings = {},
    timeZone,
    revision = 1,
    now = Date.now(),
  } = input || {};

  if (!task) return null;

  const flow = resolveStatusFlow(task.category, categories);
  const schedule = resolveSchedule(task, { now, settings, timeZone });
  const categoryLabel = categoryLabelFor(task.category, categories);

  return buildTaskActivitySnapshot({
    task,
    role,
    userId,
    flow,
    schedule,
    t,
    categoryLabel,
    now,
    revision,
  });
}