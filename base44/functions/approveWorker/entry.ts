import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { approveWorkerCore } from '../../shared/workerApproval.ts';

/**
 * approveWorker — Assigns a worker to a task (the in-app entry).
 *
 * ── THE WORK ITSELF LIVES IN `shared/workerApproval.ts` ────────────────────
 * A Lock Screen assignment runs the same workflow, so it must not be a copy of
 * it: `approveWorkerCore` holds the guards (double-approval, a cancelled
 * application, two racing approvals), the schedule agreement, the worker
 * notification and the applicant projection exactly once. This entry only
 * authenticates the caller and turns the result into an HTTP response.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId, applicationId, workerId, workerName } = await req.json();

    if (!taskId || !applicationId || !workerId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await approveWorkerCore(base44, {
      actorId: user.id,
      taskId,
      applicationId,
      workerId,
      workerName,
    });

    return Response.json(result.body, { status: result.status });
  } catch (error) {
    console.error('❌ APPROVAL ERROR:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});