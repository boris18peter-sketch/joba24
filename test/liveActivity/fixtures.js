/**
 * Fixtures — Task records shaped exactly like the stored entity, plus the
 * GlobalCategory rows the flow resolver reads. No behaviour is simulated: every
 * fixture is passed through the app's real resolveStatusFlow / scheduling code
 * before it reaches the snapshot builder.
 */
const HOUR = 3600 * 1000;

export const CLIENT = 'user_client_1';
export const WORKER = 'user_worker_1';
export const STRANGER = 'user_stranger_9';

/** A fixed clock, so a run is reproducible. */
export const NOW = Date.parse('2026-11-03T12:00:00.000Z');

/** Every status a Task can hold. */
export const ALL_STATUSES = [
  'OPEN', 'TAKEN', 'COMPLETED', 'CANCELLED', 'EXPIRED',
  'APPROVED_PENDING_DEPARTURE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS',
];

export const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED', 'EXPIRED'];

/**
 * Catalogue rows.
 *   maintenance  — a ROOT with no status_flow → generic labels.
 *   events       — a ROOT that declares its own steps.
 *   dj_service   — a SERVICE under events that overrides ONE step, so the
 *                  inheritance chain (generic → root → service) is exercised.
 */
export const CATEGORY_ROWS = [
  { category_key: 'maintenance', label: 'תחזוקה', node_type: 'root', parent_key: '' },
  {
    category_key: 'events',
    label: 'אירועים',
    node_type: 'root',
    parent_key: '',
    status_flow: {
      steps: [
        { key: 'on_the_way', label: 'בדרך לאירוע', owner_label: 'הדי.ג׳י בדרך', icon: 'truck' },
        { key: 'arrived', label: 'הגעתי לאירוע', owner_label: 'הדי.ג׳י באירוע', icon: 'star' },
      ],
      cta: { on_the_way: { label: 'יוצא לאירוע' } },
    },
  },
  {
    category_key: 'dj_service',
    label: 'די.ג׳י לאירוע',
    node_type: 'service',
    parent_key: 'events',
    status_flow: {
      steps: [{ key: 'arrived', label: 'הציוד מורכב' }],
      cta: { done: { label: 'סיימתי את האירוע' } },
    },
  },
];

let seq = 0;
/** A stored-looking Task. Overrides win. */
export function makeTask(over = {}) {
  seq += 1;
  return {
    id: `task_${String(seq).padStart(4, '0')}`,
    title: 'תיקון ברז במטבח',
    status: 'TAKEN',
    category: 'maintenance',
    client_id: CLIENT,
    client_name: 'דנה',
    worker_id: WORKER,
    worker_name: 'יוסי',
    worker_status: null,
    applicants: [],
    views_count: 0,
    clicks_count: 0,
    created_date: new Date(NOW - 2 * HOUR).toISOString(),
    updated_date: new Date(NOW - HOUR).toISOString(),
    expires_at: new Date(NOW + 48 * HOUR).toISOString(),
    ...over,
  };
}

/** A task scheduled 6h ahead: inside Upcoming, outside the activation window. */
export function scheduledTask(over = {}) {
  return makeTask({ scheduled_time: new Date(NOW + 6 * HOUR).toISOString(), ...over });
}

export function openTask(applicants = 0, over = {}) {
  return makeTask({
    status: 'OPEN',
    worker_id: null,
    worker_name: null,
    worker_status: null,
    applicants: Array.from({ length: applicants }, (_, i) => ({
      worker_id: `worker_${i}`,
      worker_name: `עובד ${i}`,
      message: 'אשמח לעזור',
      applied_at: new Date(NOW - HOUR).toISOString(),
    })),
    ...over,
  });
}

/** The 3 canonical progress states plus "not started". */
export const WORKER_STATUSES = [null, 'on_the_way', 'arrived', 'done'];