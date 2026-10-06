/**
 * scheduleSignature — the stable identity of a task's schedule.
 *
 * A worker sees a task's schedule when they apply. If that schedule is
 * unchanged at the moment the publisher picks them, the two are already
 * aligned: the Schedule Agreement is automatic and no confirmation is asked.
 * A signature is the cheapest way to prove "unchanged" without trusting either
 * side's clock or shipping the whole schedule around.
 *
 * Built ONLY from the raw persisted fields, so the client and the server derive
 * an identical string for identical data. It is a change-detector, not a
 * security token — it never gates credits or access.
 */
export function scheduleSignature(task: any): string {
  const slots = (task?.category_details?.schedule || [])
    .map((s: any) => `${s?.date ?? ''} ${s?.start ?? ''}-${s?.end ?? ''}`)
    .sort()
    .join('|');
  const single = task?.scheduled_time ? String(task.scheduled_time) : '';
  return `${slots}::${single}`;
}

/** Whether a task carries any schedule at all. */
export function hasSchedule(task: any): boolean {
  const slots = task?.category_details?.schedule;
  return (Array.isArray(slots) && slots.length > 0) || !!task?.scheduled_time;
}