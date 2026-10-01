// ── internalAuth — shared authorization helpers (Package #3.1B) ──────────
// Single source of truth for "who is allowed to call this backend function".
//
// SECURITY ENFORCEMENT ONLY. These helpers never change marketplace, credit,
// loyalty or notification behaviour — they only decide whether a caller is
// allowed in before the existing logic runs.
//
// Kept in one module (never copied per function) so every function applies the
// same rule, and so a future Brand-scoped authorization layer can extend the
// rule in a single place instead of across dozens of functions (Invariant 7 /
// ADR-16: Base44 is infrastructure, the authorization model is Joba24-owned).

/**
 * Returns the signed-in app user, or null when the caller is anonymous or
 * carries no valid user token. Never throws.
 */
export async function getAuthenticatedUser(base44) {
  try {
    const user = await base44.auth.me();
    return user || null;
  } catch {
    return null;
  }
}

/**
 * True only when the platform forwarded the app's service credential — i.e. the
 * caller is another backend function running with service-role authority.
 * End-user and anonymous requests never carry this header.
 */
export function isServiceRoleCall(req) {
  const header = req?.headers?.get?.('Base44-Service-Authorization');
  return typeof header === 'string' && header.startsWith('Bearer ');
}

/** Standard 401 for a caller with no valid user token. */
export function unauthorized(message = 'Unauthorized') {
  return Response.json({ error: message }, { status: 401 });
}

/** Standard 403 for an authenticated caller that is not allowed to perform this action. */
export function forbidden(message = 'Forbidden') {
  return Response.json({ error: message }, { status: 403 });
}

/**
 * Internal-operator authorization (Package #3.1C).
 *
 * Allows exactly two kinds of caller:
 *   • a signed-in user whose app role is `admin`;
 *   • the platform's own service-role caller (another backend function, or an
 *     in-app agent, invoking with service authority).
 *
 * Rejects every other authenticated user and every anonymous caller.
 *
 * Role source is the platform-owned `User.role` field — the same `role === 'admin'`
 * check the app already uses in the UI (SideMenu, AdminDashboard, …). No new role
 * or authorization model is introduced.
 *
 * `knownUser` lets a caller that has already fetched the user pass it in, so the
 * user lookup is not performed twice.
 *
 * Returns a Response when the caller is rejected, or null when the call is allowed.
 */
export async function requireInternalOperator(base44, req, knownUser = undefined) {
  if (isServiceRoleCall(req)) return null;
  const user = knownUser !== undefined ? knownUser : await getAuthenticatedUser(base44);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden('Admin only');
  return null;
}