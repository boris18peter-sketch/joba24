import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * verifyInstagram — Social media account verification.
 * 
 * Instagram + TikTok: OAuth-based (user logs in, we fetch their username)
 * Facebook: Manual username entry (no verification)
 *
 * Actions:
 *   "fetch_profile"   — Uses OAuth token to fetch username (Instagram/TikTok)
 *   "connect_manual"  — Saves username manually (Facebook)
 *   "disconnect"      — Clears social media data from user entity
 */

const INSTAGRAM_CONNECTOR_ID = '6a461cba44174744ca6f4c1c';
const TIKTOK_CONNECTOR_ID = '6a461cbcb8f2b9b391f70d9e';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, platform, username } = await req.json();

    if (!platform) return Response.json({ error: 'platform required' }, { status: 400 });

    const usernameField = `${platform}_username`;
    const verifiedField = `${platform}_verified`;

    // ── Fetch profile via OAuth (Instagram, TikTok) ──
    if (action === 'fetch_profile') {
      let socialUsername = '';

      if (platform === 'instagram') {
        const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(INSTAGRAM_CONNECTOR_ID);
        const res = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`);
        const data = await res.json();
        if (data?.username) socialUsername = data.username;
      } else if (platform === 'tiktok') {
        const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(TIKTOK_CONNECTOR_ID);
        const res = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,username,display_name', {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        const data = await res.json();
        if (data?.data?.user?.username) socialUsername = data.data.user.username;
      } else {
        return Response.json({ error: 'fetch_profile not supported for this platform' }, { status: 400 });
      }

      if (socialUsername) {
        await base44.asServiceRole.entities.User.update(user.id, {
          [usernameField]: socialUsername,
          [verifiedField]: true,
        });
        return Response.json({ success: true, username: socialUsername, verified: true });
      }
      return Response.json({ error: 'Could not fetch profile — make sure you authorized the app' }, { status: 400 });
    }

    // ── Manual connect (Facebook) ──
    if (action === 'connect_manual') {
      const clean = (username || '').replace(/^@/, '').trim().toLowerCase();
      if (!clean || clean.length < 2) return Response.json({ error: 'שם משתמש לא תקין' }, { status: 400 });
      await base44.asServiceRole.entities.User.update(user.id, {
        [usernameField]: clean,
        [verifiedField]: false,
      });
      return Response.json({ success: true, username: clean });
    }

    // ── Disconnect ──
    if (action === 'disconnect') {
      await base44.asServiceRole.entities.User.update(user.id, {
        [usernameField]: '',
        [verifiedField]: false,
        [`${platform}_verify_code`]: '',
      });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('verifyInstagram error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});