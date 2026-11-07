/**
 * liveActivityRating — the star row a FINISHED card turns into.
 *
 * ── WHY A FINISHED CARD DOES NOT SIMPLY DISAPPEAR ──────────────────────────
 * The card used to end the instant the work was approved. The rating was left to
 * a popup the person only met if they opened the app afterwards — so the one
 * moment the answer is easiest to give (they have just approved the work, phone
 * already in hand) was the one moment nothing asked.
 *
 * The card therefore stays for exactly ONE more content state: the ask. Its
 * phase is `rate`, it carries a `rating` object, and a star tap posts to the same
 * capability endpoint every other card action uses. When the answer is in, the
 * card ends — exactly as before.
 *
 * ── WHAT THIS MODULE DOES NOT DO ───────────────────────────────────────────
 * It writes nothing and authorizes nothing. It builds a content state from a Task
 * it is handed, using the app's own sentences. Whether a person MAY rate is
 * decided from the stored Task by the caller (`liveActivityAction`), and whether
 * they still HAVE to rate is decided by the Review that already exists.
 */
import { LIVE_ACTIVITY_CONTRACT_VERSION } from './taskActivitySnapshot.ts';
import { t } from './liveActivityStrings.ts';

/** The action id a star tap carries. Stable forever; the stars are the label. */
export const RATING_ACTION_ID = 'rate_counterpart';

/** The phase a finished card uses while it is asking. */
export const RATING_PHASE = 'rate';

const OPEN_DEEP_LINK = 'https://joba24.com/?open_task=';

/**
 * Build the rating card for one side of a finished task.
 *
 * @param task        the STORED Task (status COMPLETED, both parties present)
 * @param role        which side is looking ('publisher' | 'worker')
 * @param ratedStars  null while ASKING; 1…5 once answered (the thanks state)
 * @param revision    the caller's monotonic revision, as every snapshot takes
 */
export function buildRatingSnapshot(input: any) {
  const { task, role, revision = 1, ratedStars = null, now = Date.now() } = input || {};
  if (!task || !task.id) return null;
  if (role !== 'publisher' && role !== 'worker') return null;

  const isWorker = role === 'worker';
  // WHO is being rated: the publisher rates the worker and the worker rates the
  // publisher, so the card names the other side, never the reader.
  const counterpart = String((isWorker ? task.client_name : task.worker_name) || '').trim();
  const answered = Number(ratedStars) >= 1 && Number(ratedStars) <= 5;

  const applicants = Array.isArray(task.applicants) ? task.applicants.length : 0;

  return Object.freeze({
    contractVersion: LIVE_ACTIVITY_CONTRACT_VERSION,
    id: task.id,
    role,
    phase: RATING_PHASE,
    // Answered: the app's own confirmation sentence. Asking: its own "rate X".
    title: answered ? t('review_saved') : t('tda_rate_person', { name: counterpart }),
    subtitle: '',
    categoryLabel: '',
    categoryKey: task.category || '',
    // No rail: there is no step to be on any more, and a row of empty dashes
    // would read as work still in progress.
    progress: { step: -1, total: 0, steps: [] },
    counters: { applicants, views: null, clicks: null },
    // The same green check the completion itself is drawn with — the card is
    // signing off a finished job, not starting anything.
    iconKey: 'check',
    colorKey: 'success',
    // The card offers no flow action while it is asking: the stars ARE the action.
    action: null,
    actionState: 'idle',
    // ── THE ASK ITSELF ─────────────────────────────────────────────────────
    // `prompt` is the sentence the in-app completion sheet uses, `value` is the
    // star chosen (nil = still asking). A card that carries this draws stars
    // instead of a button, and stops being a control once `value` is set.
    rating: {
      prompt: answered ? '' : t('cm_how_was', { name: counterpart }),
      value: answered ? Number(ratedStars) : null,
    },
    deepLink: `${OPEN_DEEP_LINK}${task.id}`,
    endsAt: null,
    revision: Math.max(1, Math.floor(Number(revision) || 1)),
    updatedAt: task.updated_date || null,
    generatedAt: new Date(now).toISOString(),
  });
}

/**
 * Has this participant already rated the other side?
 *
 * Fails CLOSED: if the answer cannot be read, the card is not turned into the
 * ask. A missing rating card costs one tap (the app still asks); a card that
 * asks for a rating that already exists would invite a second answer to a
 * question that is already settled.
 */
export async function hasRatedTask(base44, input: any) {
  const { taskId, reviewerId } = input || {};
  if (!taskId || !reviewerId) return true;
  try {
    const rows = await base44.asServiceRole.entities.Review.filter({
      task_id: taskId,
      reviewer_id: reviewerId,
    });
    const list = Array.isArray(rows) ? rows : (rows?.items || []);
    return list.length > 0;
  } catch {
    return true;
  }
}

/**
 * The rating card THIS recipient should see for a finished task, or null when
 * their card must simply end (not finished, not a participant, already rated).
 */
export async function buildCompletionRatingCard(base44, input: any) {
  const { task, role, recipientId, revision = 1 } = input || {};
  if (!task || task.status !== 'COMPLETED') return null;

  const owns = role === 'worker'
    ? task.worker_id === recipientId
    : task.client_id === recipientId;
  if (!owns) return null;

  if (await hasRatedTask(base44, { taskId: task.id, reviewerId: recipientId })) return null;

  return buildRatingSnapshot({ task, role, revision });
}