import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Native OAuth token handshake.
//
// On mobile (Capacitor) we open OAuth in the system browser. After auth the
// backend redirects to /auth-callback (loaded in the external browser), which
// calls this function with action='store' to persist the access_token keyed by
// a random `sid`. The native app polls action='poll' with the same sid until
// the token arrives, then reloads to authenticate.
//
// This avoids relying on the `joba24://` custom scheme, which is registered in
// the iOS Info.plist but cannot be registered in the Android manifest (Base44
// builds Android and the manifest isn't editable). The server handshake works
// identically on both platforms.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action, sid, token } = body || {};
    // sid is optional: the backend redirect sometimes drops the sid query
    // param from from_url, so the auth-callback page may store a token with
    // sid=null. When polling we match by sid first, then fall back to the most
    // recent record (single-device login assumption).
    const sidStr = typeof sid === 'string' && sid.length >= 8 ? sid : null;

    if (action === 'store') {
      if (!token || typeof token !== 'string') {
        return Response.json({ error: 'invalid token' }, { status: 400 });
      }
      // Cleanup expired handshake records (older than 10 minutes).
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      try {
        await base44.asServiceRole.entities.OAuthHandshake.deleteMany({ created_date: { $lt: tenMinAgo } });
      } catch {}
      // Replace any existing record for this sid (idempotent retries).
      if (sidStr) {
        try {
          await base44.asServiceRole.entities.OAuthHandshake.deleteMany({ sid: sidStr });
        } catch {}
      }
      await base44.asServiceRole.entities.OAuthHandshake.create({ sid: sidStr, token });
      return Response.json({ ok: true });
    }

    if (action === 'poll') {
      // 1) Race-free match by sid (when the backend preserved it in from_url).
      if (sidStr) {
        const bySid = await base44.asServiceRole.entities.OAuthHandshake.filter({ sid: sidStr }, '-created_date', 1);
        const rec = bySid && bySid[0];
        if (rec) {
          try { await base44.asServiceRole.entities.OAuthHandshake.delete(rec.id); } catch {}
          return Response.json({ token: rec.token });
        }
      }
      // 2) Fallback: most recent record from the last 3 minutes. Covers the
      //    case where the backend dropped the sid — the auth-callback page
      //    stored the token with sid=null.
      // Fallback: latest record with sid=null (the backend dropped the sid
      // from from_url). Verify recency server-side so a stale record from a
      // previous cancelled login isn't returned (created_date $gte filtering
      // is unreliable via the SDK, so we check age here instead).
      const recent = await base44.asServiceRole.entities.OAuthHandshake.filter({ sid: null }, '-created_date', 1);
      const rec = recent && recent[0];
      if (!rec) return Response.json({ token: null });
      const ageMs = Date.now() - new Date(rec.created_date).getTime();
      if (Number.isNaN(ageMs) || ageMs > 90 * 1000) return Response.json({ token: null });
      try { await base44.asServiceRole.entities.OAuthHandshake.delete(rec.id); } catch {}
      return Response.json({ token: rec.token });
    }

    return Response.json({ error: 'invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}