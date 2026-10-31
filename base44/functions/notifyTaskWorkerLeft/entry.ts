import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { isRecordId } from '../../shared/recordIds.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, old_data, event } = await req.json();

    // Only trigger on TAKEN → OPEN transition with worker leaving
    if (old_data?.status !== 'TAKEN' || data?.status !== 'OPEN') {
      return Response.json({ sent: 0, reason: 'Not a worker leave transition' });
    }

    // ── TAKEN → OPEN IS NOT ALWAYS "THE WORKER LEFT" ─────────────────────────
    // The same transition also happens when the PUBLISHER removes the approved
    // worker before they set off (cancelApprovedWorker). That path used to send
    // the publisher a push saying "{worker} ביטל את הקבלת המשימה" — a message
    // written for the opposite case, delivered to the person who had just done
    // the cancelling. The two cases are distinguishable in the data: a worker
    // who leaves writes their own application as `cancelled`, while a worker
    // the publisher removed is `rejected`. Only a genuine leave is announced
    // here; the removal is announced by the function that performed it.
    const formerWorkerId = old_data?.worker_id || null;
    const formerTaskId = data.id || event?.entity_id;
    if (formerWorkerId) {
      // A demo/legacy id cannot be queried at all (the entity layer rejects the
      // whole query), and without the application we cannot tell a genuine leave
      // from a removal — so nothing is announced rather than the wrong thing.
      if (!isRecordId(formerTaskId) || !isRecordId(formerWorkerId)) {
        return Response.json({ sent: 0, reason: 'Unverifiable ids — not announcing' });
      }
      const apps = await base44.asServiceRole.entities.TaskApplication.filter({
        task_id: formerTaskId,
        worker_id: formerWorkerId,
      });
      const latest = (apps || []).sort((a: any, b: any) =>
        String(b?.created_date || '').localeCompare(String(a?.created_date || ''))
      )[0];
      if (latest && latest.status !== 'cancelled') {
        return Response.json({ sent: 0, reason: `Application is ${latest.status} — not a voluntary leave` });
      }
    }

    // Get client
    if (!data.client_id) {
      return Response.json({ sent: 0, reason: 'No client' });
    }

    // Get client's tokens
    const users = await base44.asServiceRole.entities.User.filter({ id: data.client_id });
    const client = users[0];
    if (!client || !client.fcm_tokens?.length) {
      return Response.json({ sent: 0, reason: 'No device tokens' });
    }

    // Determine who left: usually old_data.worker_id or data.worker_id (should be null now)
    const workerName = old_data?.worker_name || data?.worker_name || 'העובד';

    // ── Route through NotificationManager ──
    await base44.asServiceRole.functions.invoke('notificationManager', {
      event_key: 'worker_left_task',
      user_ids: [data.client_id],
      task_id: data.id || event?.entity_id,
      variables: {
        worker_name: workerName,
        task_title: data.title || '',
        task_id: data.id || event?.entity_id || '',
      },
    });

    return Response.json({ sent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});