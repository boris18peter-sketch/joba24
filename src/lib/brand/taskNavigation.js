import { base44 } from '@/api/base44Client';

/**
 * Brand-aware Task navigation.
 *
 * Task VISIBILITY stays Brand-isolated: marketplace feeds and lists never leak
 * across Brands, and that isolation is enforced server-side. This helper solves
 * a DIFFERENT problem — LINK RESOLUTION.
 *
 * A notification or share link for a Task carries only a task id. If that link
 * is opened on the wrong Brand's surface, the Brand-scoped reader returns
 * nothing and the user sees "Task not found". Instead we resolve the Task's own
 * origin_brand_id and send the browser to THAT Brand's domain, where the Task
 * legitimately lives.
 *
 * This never widens what a user can see: the direct read below is still governed
 * by RLS (owner / participant / admin only), and a cross-Brand redirect happens
 * only for a Task the current user is already allowed to read. A same-Brand (or
 * legacy, Brand-less) Task is opened in place — no redirect.
 *
 * @returns {Promise<string|null>} absolute URL to the Task's Brand, or null when
 *   the Task should simply open on the current surface.
 */
export async function resolveTaskBrandUrl(taskId, currentBrandId) {
  if (!taskId) return null;

  let task = null;
  try {
    const rows = await base44.entities.Task.filter({ id: taskId });
    task = rows?.[0] || null;
  } catch {
    return null;
  }
  if (!task) return null;

  // Same Brand, or a legacy record that predates Brand attribution → open here.
  if (!task.origin_brand_id || task.origin_brand_id === currentBrandId) return null;

  try {
    const domains = await base44.entities.BrandDomain.filter({
      brand_id: task.origin_brand_id,
      status: 'active',
    });
    const primary = domains?.find((d) => d.is_primary) || domains?.[0];
    if (!primary?.hostname) return null;
    return `https://${primary.hostname}/?open_task=${encodeURIComponent(taskId)}`;
  } catch {
    return null;
  }
}