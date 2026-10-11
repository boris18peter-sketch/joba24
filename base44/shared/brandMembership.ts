/**
 * brandMembership.ts — the moment a person actually JOINS a Brand.
 *
 * A membership is created by a MEANINGFUL action, never by browsing. Posting a
 * task on a Brand, or applying for one, is that moment: the person is now part
 * of that Brand's community, and the Brand's dashboard can honestly say who
 * arrived and through what.
 *
 * Written at most ONCE per (user, brand). A second action never duplicates the
 * row, and — critically — never touches `role`: someone already granted
 * dashboard access must not be demoted to a plain member by posting a task.
 */
export async function ensureBrandMembership(
  svc: any,
  userId: string | null | undefined,
  brandId: string | null | undefined,
  firstAction: string,
) {
  if (!userId || !brandId) return null;

  try {
    const existing = await svc.entities.BrandMembership.filter({
      user_id: userId,
      brand_id: brandId,
    });
    const current = existing?.[0];
    if (current) return current;

    return await svc.entities.BrandMembership.create({
      user_id: userId,
      brand_id: brandId,
      role: 'member',
      status: 'active',
      joined_at: new Date().toISOString(),
      first_action: firstAction,
    });
  } catch (e: any) {
    // A membership is attribution, not a precondition. Never fail the action
    // that created it — the task or the application matters more.
    console.error('ensureBrandMembership failed:', e?.message);
    return null;
  }
}