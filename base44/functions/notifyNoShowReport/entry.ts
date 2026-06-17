import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, event } = await req.json();

    // Only on no-show reports
    if (data?.reason !== 'no-show') {
      return Response.json({ sent: 0, reason: 'Not a no-show report' });
    }

    if (!data.task_id) {
      return Response.json({ sent: 0, reason: 'No task' });
    }

    // Get the task to find the worker
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: data.task_id });
    const task = tasks[0];
    if (!task || !task.worker_id) {
      return Response.json({ sent: 0, reason: 'No worker found' });
    }

    // Notify the worker about the no-show report
    const users = await base44.asServiceRole.entities.User.filter({ id: task.worker_id });
    const worker = users[0];
    if (!worker || !worker.fcm_tokens?.length) {
      return Response.json({ sent: 0, reason: 'No device tokens' });
    }

    await base44.asServiceRole.functions.invoke('sendPushNotification', {
      user_ids: [task.worker_id],
      title: `דווחו עליך כ-no-show ⚠️`,
      body: `דווחו שלא הופעת למשימה "${task.title || ''}" — זה עלול להשפיע על הדירוג שלך`,
      url: `/task/${task.id}`,
      tag: `no_show_${task.id}_${task.worker_id}`,
    });

    return Response.json({ sent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});