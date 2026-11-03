/**
 * liveActivityFlow — server-side resolution of the SAME category flow and
 * schedule state the app already uses, for snapshot generation in a backend
 * function.
 *
 * ── THE RULE THIS MODULE FOLLOWS ───────────────────────────────────────────
 * No lifecycle rule is invented here. This is a faithful mirror of:
 *   src/lib/taskStatusFlow.js  (resolveStatusFlow, normalizeFlow, mergeFlows)
 *   src/lib/scheduling.js      (occurrencesOf, primaryOccurrence,
 *                               schedulePhase, isEngagement, scheduleWindows)
 *   src/lib/time.js            (parseTime, combineDateTime)
 *
 * Those files are untouched: they are the app's single source of truth and
 * Stage 1 explicitly must not refactor them. What keeps the two halves honest is
 * `test/liveActivity/flow.test.js`, which runs the SAME task fixtures through
 * both implementations and asserts identical output for every category and every
 * schedule window. If the app's logic changes, that test fails immediately
 * instead of the Lock Screen quietly drifting.
 *
 * ── THE ONE DELIBERATE DIFFERENCE: TIMEZONE ────────────────────────────────
 * The app formats an occurrence in the DEVICE's timezone. A server has no
 * device timezone, so the recipient's IANA timezone is captured at token
 * registration and every label here is formatted in it. Same wording, same
 * tables, correct local clock.
 */

/** The only worker progress states the backend understands. Never extend. */
export const CANONICAL_STEPS = ['on_the_way', 'arrived', 'done'];

/** Icons a step may reference (mirrors STEP_ICONS in taskStatusFlow). */
export const STEP_ICON_KEYS = ['navigation', 'map_pin', 'check', 'truck', 'heart', 'clock', 'star'];

/** The generic fallback flow — identical values to GENERIC_STATUS_FLOW. */
export const GENERIC_STATUS_FLOW = {
  steps: [
    { key: 'on_the_way', label: 'בדרך לעבודה', owner_label: 'בדרך אליך', icon: 'navigation' },
    { key: 'arrived', label: 'הגעתי', owner_label: 'הגיע למיקום', icon: 'map_pin' },
    { key: 'done', label: 'סיימתי את העבודה', owner_label: 'ממתין לאישורך', icon: 'check' },
  ],
  cta: {
    on_the_way: {
      label: 'יצאתי לדרך',
      emoji: '🚀',
      confirm_title: 'יוצא לדרך',
      confirm_sub: 'המפרסם יקבל עדכון שאתה בדרך',
      toast: 'יצאת לדרך! המפרסם קיבל עדכון',
    },
    arrived: {
      label: 'הגעתי',
      emoji: '📍',
      confirm_title: 'אישור הגעה',
      confirm_sub: 'המפרסם יקבל עדכון שהגעת',
      toast: 'סומן שהגעת',
    },
    done: {
      label: 'סיימתי את העבודה',
      emoji: '✅',
      confirm_title: 'אישור סיום עבודה',
      confirm_sub: 'המפרסם יקבל עדכון שהעבודה הסתיימה ויוכל לאשר תשלום',
      toast: 'מעולה! ממתין לאישור הלקוח',
    },
  },
  proof: {
    label: 'הוכחת ביצוע',
    sub: 'תמונות/סרטון — מוצגים למפרסם המשימה',
  },
};

/** Scheduling windows — identical defaults to scheduling.js. */
export const DEFAULT_SCHEDULE_WINDOWS = {
  upcoming_visibility_hours: 48,
  execution_activation_hours: 3,
  starting_soon_reminder_hours: 2,
};

/** Fallback timezone for a token that registered without one. */
export const DEFAULT_TIMEZONE = 'Asia/Jerusalem';

const str = (v, fallback) => (typeof v === 'string' && v.trim() ? v.trim() : fallback);

function normalizeFlow(raw) {
  if (!raw || typeof raw !== 'object') return GENERIC_STATUS_FLOW;

  const byKey = {};
  if (Array.isArray(raw.steps)) {
    for (const s of raw.steps) {
      if (s && CANONICAL_STEPS.includes(s.key)) byKey[s.key] = s;
    }
  }

  const steps = GENERIC_STATUS_FLOW.steps.map((base) => {
    const override = byKey[base.key] || {};
    return {
      key: base.key,
      label: str(override.label, base.label),
      owner_label: str(override.owner_label, base.owner_label),
      icon: STEP_ICON_KEYS.includes(override.icon) ? override.icon : base.icon,
    };
  });

  const rawCta = (raw.cta && typeof raw.cta === 'object') ? raw.cta : {};
  const cta = {};
  for (const key of CANONICAL_STEPS) {
    const base = GENERIC_STATUS_FLOW.cta[key];
    const override = rawCta[key] || {};
    cta[key] = {
      label: str(override.label, base.label),
      emoji: str(override.emoji, base.emoji),
      confirm_title: str(override.confirm_title, base.confirm_title),
      confirm_sub: str(override.confirm_sub, base.confirm_sub),
      toast: str(override.toast, base.toast),
    };
  }

  const rawProof = (raw.proof && typeof raw.proof === 'object') ? raw.proof : {};
  const proof = {
    label: str(rawProof.label, GENERIC_STATUS_FLOW.proof.label),
    sub: str(rawProof.sub, GENERIC_STATUS_FLOW.proof.sub),
  };

  return { steps, cta, proof };
}

function ancestorChain(row, map) {
  const chain = [];
  const seen = new Set();
  let node = row;
  while (node && !seen.has(node.category_key)) {
    seen.add(node.category_key);
    if (node.node_type === 'group' || node.node_type === 'parent') break;
    chain.unshift(node);
    node = node.parent_key ? map[node.parent_key] : null;
  }
  return chain;
}

function mergeFlows(base, override) {
  if (!base) return override;
  if (!override) return base;
  const out = { ...base };

  if (Array.isArray(override.steps)) {
    const byKey = {};
    for (const s of override.steps) if (s && s.key) byKey[s.key] = s;
    out.steps = Array.isArray(base.steps) && base.steps.length
      ? base.steps.map((b) => ({ ...b, ...(byKey[b.key] || {}) }))
      : override.steps;
  }

  if (override.cta && typeof override.cta === 'object') {
    out.cta = { ...(base.cta || {}) };
    for (const [key, val] of Object.entries(override.cta)) {
      if (val && typeof val === 'object') out.cta[key] = { ...(base.cta?.[key] || {}), ...val };
    }
  }

  if (override.proof && typeof override.proof === 'object') {
    out.proof = { ...(base.proof || {}), ...override.proof };
  }

  return out;
}

/**
 * Resolve the flow for a task's actionable category, from the GlobalCategory
 * rows the function reads. Generic → Root → Service inheritance, exactly as the
 * app resolves it.
 */
export function resolveStatusFlow(categoryKey, categories) {
  if (!categoryKey || !Array.isArray(categories)) return GENERIC_STATUS_FLOW;
  const map = {};
  for (const c of categories) if (c && c.category_key) map[c.category_key] = c;
  const row = map[categoryKey];
  if (!row) return GENERIC_STATUS_FLOW;

  let merged = null;
  for (const node of ancestorChain(row, map)) {
    const stored = node?.status_flow;
    if (stored && typeof stored === 'object') merged = mergeFlows(merged, stored);
  }
  return merged ? normalizeFlow(merged) : GENERIC_STATUS_FLOW;
}

/**
 * The category's display label, for the one line under the title.
 * Hebrew is the catalogue's own source-of-truth language; a `translations.he`
 * override wins when a category declares one.
 */
export function categoryLabelFor(categoryKey, categories) {
  if (!categoryKey || !Array.isArray(categories)) return '';
  const row = categories.find((c) => c && c.category_key === categoryKey);
  if (!row) return '';
  const localized = row.translations?.he?.label;
  return str(localized, str(row.label, '')) || '';
}

/* ── Time (mirrors src/lib/time.js) ──────────────────────────────────────── */

export function parseTime(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  const normalized = s.includes('T') && !s.endsWith('Z') && !s.includes('+') ? `${s}Z` : s;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

export function combineDateTime(date, time) {
  if (!date) return null;
  const d = new Date(`${date}T${time || '00:00'}:00`);
  return isNaN(d.getTime()) ? null : d;
}

/* ── Scheduling (mirrors src/lib/scheduling.js) ──────────────────────────── */

export function scheduleWindows(settings) {
  const out = { ...DEFAULT_SCHEDULE_WINDOWS };
  for (const key of Object.keys(out)) {
    const value = Number(settings?.[key]);
    if (Number.isFinite(value) && value >= 0) out[key] = value;
  }
  return out;
}

export function occurrencesOf(task) {
  if (!task) return [];
  const out = [];
  const seen = new Set();

  const push = (occurrence) => {
    const key = occurrence.start.getTime();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(occurrence);
  };

  for (const slot of (task.category_details?.schedule || [])) {
    const start = combineDateTime(slot?.date, slot?.start);
    if (!start) continue;
    push({
      key: `${slot.date}_${slot.start}`,
      start,
      end: combineDateTime(slot?.date, slot?.end),
      date: slot.date,
      startClock: slot.start,
      endClock: slot.end,
      source: 'slot',
    });
  }

  const single = parseTime(task.scheduled_time);
  if (single) {
    push({ key: 'scheduled_time', start: single, end: null, date: null, startClock: null, endClock: null, source: 'scheduled_time' });
  }

  return out.sort((a, b) => a.start - b.start);
}

export function primaryOccurrence(task, now = Date.now()) {
  const all = occurrencesOf(task);
  if (!all.length) return null;
  return all.find((o) => (o.end || o.start).getTime() > now) || all[all.length - 1];
}

export function schedulePhase(task, now = Date.now(), windows = DEFAULT_SCHEDULE_WINDOWS) {
  const all = occurrencesOf(task);
  if (!all.length) return 'none';

  const next = all.find((o) => (o.end || o.start).getTime() > now);
  if (!next) return 'ended';

  const minutesToStart = (next.start.getTime() - now) / 60000;
  if (minutesToStart <= windows.execution_activation_hours * 60) return 'active';
  if (minutesToStart <= windows.upcoming_visibility_hours * 60) return 'upcoming';
  return 'calendar';
}

export function isEngagement(task, now = Date.now(), windows = DEFAULT_SCHEDULE_WINDOWS) {
  const phase = schedulePhase(task, now, windows);
  return phase === 'upcoming' || phase === 'calendar';
}

/* ── Local-time formatting, in the RECIPIENT's timezone ──────────────────── */

const WEEKDAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
// The short month names he-IL produces ("6 באוק׳"), spelled out so the server
// never depends on the runtime's ICU data.
const MONTHS_HE_SHORT = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];

export function isValidTimeZone(tz) {
  if (typeof tz !== 'string' || !tz.trim()) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

function zonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
  return { y: get('year'), m: get('month'), d: get('day'), H: get('hour'), M: get('minute') };
}

const pad = (n) => String(n).padStart(2, '0');

/** 'היום, 14:00' · 'מחר, 09:30' · 'שלישי, 6 באוק׳, 14:00' — in `timeZone`. */
export function formatOccurrence(occurrence, timeZone = DEFAULT_TIMEZONE, now = Date.now()) {
  if (!occurrence || !occurrence.start) return '';
  const zone = isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
  const start = occurrence.start instanceof Date ? occurrence.start : parseTime(occurrence.start);
  if (!start || isNaN(start.getTime())) return '';

  const p = zonedParts(start, zone);
  const clock = `${pad(p.H)}:${pad(p.M)}`;

  const nowParts = zonedParts(new Date(now), zone);
  const midnightUTC = (parts) => Date.UTC(parts.y, parts.m - 1, parts.d);
  const dayDiff = Math.round((midnightUTC(p) - midnightUTC(nowParts)) / 86400000);

  if (dayDiff === 0) return `היום, ${clock}`;
  if (dayDiff === 1) return `מחר, ${clock}`;

  const dow = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
  const endClock = occurrence.endClock
    ? String(occurrence.endClock)
    : (occurrence.end ? zonedClock(occurrence.end, zone) : '');
  const base = `${WEEKDAYS_HE[dow]}, ${p.d} ב${MONTHS_HE_SHORT[p.m - 1]}, ${clock}`;
  return endClock ? `${base}–${endClock}` : base;
}

function zonedClock(value, timeZone) {
  const date = value instanceof Date ? value : parseTime(value);
  if (!date || isNaN(date.getTime())) return '';
  const p = zonedParts(date, timeZone);
  return `${pad(p.H)}:${pad(p.M)}`;
}

/**
 * The schedule state the snapshot builder needs: whether the task is an agreed
 * engagement (so the banner shows a TIME and no step CTA), and the label of the
 * governing occurrence.
 */
export function resolveSchedule(task, options: any = {}) {
  const { now = Date.now(), settings = {}, timeZone = DEFAULT_TIMEZONE } = options;
  const windows = scheduleWindows(settings);
  const engagement = isEngagement(task, now, windows);
  const occurrence = primaryOccurrence(task, now);
  return {
    isEngagement: engagement,
    occurrenceLabel: engagement ? formatOccurrence(occurrence, timeZone, now) : '',
    phase: schedulePhase(task, now, windows),
  };
}