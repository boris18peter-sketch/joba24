import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { getAuthenticatedUser, isServiceRoleCall, unauthorized } from '../../shared/internalAuth.ts';
import { validRecordIds } from '../../shared/recordIds.ts';
import { sendPushToUsers } from '../../shared/pushSender.ts';

/**
 * sendPushNotification — the direct push endpoint.
 *
 * The FCM transport itself lives in `shared/pushSender.ts`, because the path
 * every real notification takes (`notificationManager`) now calls it IN PROCESS
 * instead of invoking this function as a second, nested function call. This
 * endpoint stays for the callers that address it directly: the admin dashboard's
 * manual send, and the few in-app actions that push on the user's own behalf.
 *
 * Nothing about its contract changed — same auth rule, same request body, same
 * response shape — so every existing caller keeps working.
 *
 * ── THE TWO LEGITIMATE CALLERS, AND NO OTHERS ──────────────────────────────
 *   • another backend function or automation, running with service authority;
 *   • a signed-in app user, whose own in-app action sends the push.
 *
 * Anonymous callers are refused: without this check the endpoint was open to the
 * internet, and anyone could POST a title, a body and a link and have it
 * delivered as a genuine Joba24 push to any user id.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    if (!isServiceRoleCall(req)) {
      const caller = await getAuthenticatedUser(base44);
      if (!caller) {
        console.warn('[Push] Rejected unauthenticated invocation');
        return unauthorized();
      }
    }

    const { user_ids, title, body, url, tag } = await req.json();

    if (!user_ids || !user_ids.length || !title) {
      return Response.json({ error: 'Missing required fields: user_ids, title' }, { status: 400 });
    }

    // Only real record IDs may reach the query: the entity layer rejects an
    // `$in` list containing anything else, and it rejects the WHOLE list — so one
    // demo/legacy id would otherwise fail the send for every real recipient.
    const requestedIds = Array.isArray(user_ids) ? user_ids : [user_ids];
    const safeIds = validRecordIds(requestedIds);
    if (!safeIds.length) {
      return Response.json({ sent: 0, reason: 'No valid recipient ids' });
    }

    const result = await sendPushToUsers({ base44, userIds: safeIds, title, body, url, tag });

    if (result.reason === 'fcm_not_configured') {
      return Response.json({ error: 'FCM not configured — missing Firebase secrets' }, { status: 500 });
    }

    return Response.json({
      sent: result.sent,
      failed: result.failed,
      totalTokens: result.totalTokens,
      reason: result.reason,
      message: `Successfully sent ${result.sent} notifications, ${result.failed} failed`,
    });
  } catch (error: any) {
    console.error('sendPushNotification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});