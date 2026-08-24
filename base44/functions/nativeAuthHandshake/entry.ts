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

    if (!sid || typeof sid !== 'string' || sid.length < 8) {
      return Response.json({ error: 'invalid sid' }, { status: 400 });
    }

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
      try {
        await base44.asServiceRole.entities.OAuthHandshake.deleteMany({ sid });
      } catch {}
      await base44.asServiceRole.entities.OAuthHandshake.create({ sid, token });
      return Response.json({ ok: true });
    }

    if (action === 'poll') {
      const records = await base44.asServiceRole.entities.OAuthHandshake.filter({ sid }, '-created_date', 1);
      const rec = records && records[0];
      if (!rec) return Response.json({ token: null });
      // Consume (delete) so the token can only be read once.
      try { await base44.asServiceRole.entities.OAuthHandshake.delete(rec.id); } catch {}
      return Response.json({ token: rec.token });
    }

    return Response.json({ error: 'invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}