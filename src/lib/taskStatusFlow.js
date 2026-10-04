/**
 * taskStatusFlow — the SINGLE source of truth for how a task's lifecycle is
 * PRESENTED for a given Actionable Category.
 *
 * ── Design ────────────────────────────────────────────────────────────────
 * The CANONICAL task lifecycle never changes. The backend stores exactly three
 * worker progress states — `on_the_way` → `arrived` → `done` — and every
 * function (workerLeaveTask, notifications, completion, credit release) depends
 * on them. A category may therefore NEVER invent new backend states.
 *
 * What IS category-driven is the PRESENTATION: the name of each step, the
 * wording shown to the worker vs. the publisher, the CTA label/emoji and the
 * proof copy. A plumber's first step is "יצאתי לדרך"; a DJ's is "אישרתי הגעה
 * לאירוע". Same three canonical transitions, a different story.
 *
 * Definitions live on the GLOBAL category (`GlobalCategory.status_flow`), so a
 * category shared by several Brands is defined ONCE — editing it changes every
 * Brand that offers it. There is no per-Brand copy, and NO component contains
 * `if (category === 'dj')`: components ask this module, and this module reads
 * the catalogue.
 *
 * A category with no definition — or a partial one — falls back to
 * GENERIC_STATUS_FLOW, a clear, neutral, service-agnostic flow. A partial
 * definition inherits every field it leaves unset.
 */

/** The only worker progress states the backend understands. Never extend. */
export const CANONICAL_STEPS = ['on_the_way', 'arrived', 'done'];

/** Icons a step may reference. Components map these to real lucide icons. */
export const STEP_ICONS = [
  { key: 'navigation', label: 'ניווט / בדרך' },
  { key: 'map_pin', label: 'מיקום / הגעה' },
  { key: 'check', label: 'סיום / אישור' },
  { key: 'truck', label: 'משלוח / הובלה' },
  { key: 'heart', label: 'טיפול / ליווי' },
  { key: 'clock', label: 'המתנה / זמן' },
  { key: 'star', label: 'שירות / אירוע' },
];

/**
 * The GENERIC fallback — used for every category that has not defined its own
 * flow. Deliberately service-agnostic so it reads sensibly for anything.
 */
export const GENERIC_STATUS_FLOW = {
  steps: [
    { key: 'on_the_way', label: 'יצא לדרך', owner_label: 'בדרך אליך', icon: 'navigation' },
    { key: 'arrived', label: 'הגיע', owner_label: 'הגיע למיקום', icon: 'map_pin' },
    { key: 'done', label: 'סיים', owner_label: 'ממתין לאישורך', icon: 'check' },
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
      label: 'הגעתי למיקום',
      emoji: '📍',
      confirm_title: 'אישור הגעה',
      confirm_sub: 'המפרסם יקבל עדכון שהגעת והתחלת',
      toast: 'סומן שהגעת למיקום',
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

const str = (v, fallback) => (typeof v === 'string' && v.trim() ? v.trim() : fallback);

/**
 * Merge a stored (possibly partial) definition over the generic flow, so a
 * category only has to declare the fields it wants to change.
 */
export function normalizeFlow(raw) {
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
      icon: STEP_ICONS.some((i) => i.key === override.icon) ? override.icon : base.icon,
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

/**
 * Resolve the flow for a task's Actionable Category.
 *
 * @param {string} categoryKey  the Task.category (a GlobalCategory.category_key)
 * @param {Array}  categories   the GlobalCategory catalogue (from useGlobalCategories)
 */
export function resolveStatusFlow(categoryKey, categories) {
  if (!categoryKey || !Array.isArray(categories)) return GENERIC_STATUS_FLOW;
  const row = categories.find((c) => c && c.category_key === categoryKey);
  const stored = row?.status_flow;
  // No definition at all → the generic flow object itself (cheap, shared).
  if (!stored || typeof stored !== 'object') return GENERIC_STATUS_FLOW;
  return normalizeFlow(stored);
}

/** The ordered step list, with the label that fits the viewer's role. */
export function flowSteps(flow, role) {
  const owner = role === 'owner';
  return flow.steps.map((s) => ({ key: s.key, icon: s.icon, label: owner ? s.owner_label : s.label }));
}

/** Index of a canonical worker_status inside the flow (-1 when not started). */
export function stepIndexOf(flow, workerStatus) {
  return flow.steps.findIndex((s) => s.key === workerStatus);
}

/** The step label for a canonical status, for the given role. */
export function statusLabel(flow, workerStatus, role) {
  const idx = stepIndexOf(flow, workerStatus);
  if (idx < 0) return null;
  const step = flow.steps[idx];
  return role === 'owner' ? step.owner_label : step.label;
}

/**
 * The next action a worker can take, or null when the flow is complete.
 * Always advances along the CANONICAL order — presentation only.
 */
export function nextCta(flow, workerStatus) {
  const idx = stepIndexOf(flow, workerStatus);
  const nextKey = idx < 0 ? CANONICAL_STEPS[0] : CANONICAL_STEPS[idx + 1];
  if (!nextKey) return null;
  return { key: nextKey, ...flow.cta[nextKey] };
}

/** Proof-upload copy for the category. */
export function proofCopy(flow) {
  return flow.proof;
}