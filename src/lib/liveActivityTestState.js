/**
 * liveActivityTestState — the fixture a LOCAL Live Activity test renders.
 *
 * ── WHY A FIXTURE AND NOT A REAL TASK ──────────────────────────────────────
 * The bridge is deliberately not wired to any screen yet, so this is the only
 * way to see the widget on a device before activation. It is a fixed,
 * hand-written snapshot that mirrors the contract EXACTLY (the keys the Swift
 * `ContentState` decodes, including `progress`), so what appears on the Lock
 * Screen is proof that the contract, the widget and the bridge agree.
 *
 * It never reads a task, never calls the server and never triggers a push: the
 * activity it starts is a purely local one, created by the device itself.
 */
export const TEST_TASK_ID = 'joba-live-activity-local-test';

/** The three worker flow steps, labelled as the real flow labels them. */
const STEPS = [
  { key: 'on_the_way', label: 'בדרך אליך', icon: 'navigation' },
  { key: 'arrived', label: 'הגעתי למקום', icon: 'map-pin' },
  { key: 'done', label: 'סיימתי את העבודה', icon: 'check' },
];

const PHASES = [
  { step: 0, phase: 'on_the_way', title: 'העובד בדרך אליך', subtitle: 'אפשר לעקוב אחרי ההתקדמות כאן' },
  { step: 1, phase: 'arrived', title: 'העובד הגיע', subtitle: 'העבודה מתחילה עכשיו' },
  { step: 2, phase: 'done', title: 'העבודה הסתיימה', subtitle: 'ממתין לאישור שלך' },
];

/** One snapshot for the given step (0..2), shaped exactly like the contract. */
export function testSnapshot(step = 0, revision = 1) {
  const safe = PHASES[Math.min(Math.max(step, 0), PHASES.length - 1)];
  return {
    contractVersion: 1,
    id: TEST_TASK_ID,
    role: 'worker',
    phase: safe.phase,
    title: safe.title,
    subtitle: safe.subtitle,
    categoryLabel: 'בדיקה מקומית',
    categoryKey: 'local_test',
    progress: {
      step: safe.step,
      total: STEPS.length,
      steps: STEPS,
    },
    counters: { applicants: 2, views: null, clicks: null },
    iconKey: 'wrench',
    colorKey: 'brand',
    deepLink: '',
    endsAt: null,
    revision,
    updatedAt: new Date().toISOString(),
    generatedAt: new Date().toISOString(),
  };
}

/** The last step, so the test can show that the rail completes before it ends. */
export const LAST_TEST_STEP = PHASES.length - 1;