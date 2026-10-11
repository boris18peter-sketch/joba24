/**
 * taskApplicants — keep a Task's denormalised `applicants` array truthful.
 *
 * TaskApplication is the single source of truth for who is actually applying.
 * Task.applicants is a projection that the publisher's task card COUNTS, so any
 * change to an application's status must rebuild it — otherwise the publisher
 * keeps seeing a phantom applicant on an OPEN task long after that worker's
 * application was cancelled, rejected or expired.
 *
 * Every function that changes an application's status calls this. It is the only
 * sanctioned writer of the array.
 */
export async function syncTaskApplicants(svc: any, taskId: string): Promise<number> {
  if (!taskId) return 0;
  const apps = await svc.entities.TaskApplication.filter({ task_id: taskId }, '-created_date', 200);
  const active = (apps || []).filter((a: any) => a.status === 'pending' || a.status === 'approved');
  await svc.entities.Task.update(taskId, {
    applicants: active.map((a: any) => ({
      worker_id: a.worker_id,
      worker_name: a.worker_name,
      applied_at: a.created_date,
    })),
  });
  return active.length;
}