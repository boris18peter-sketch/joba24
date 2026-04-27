import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId, workerId, amount } = await req.json();
    if (!taskId || !workerId || !amount) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update worker's wallet directly via service role
    const workers = await base44.asServiceRole.entities.User.filter({ id: workerId });
    if (!workers || workers.length === 0) {
      return Response.json({ error: 'Worker not found' }, { status: 404 });
    }

    const worker = workers[0];
    const newBalance = (worker.wallet_balance || 0) + amount;
    await base44.asServiceRole.entities.User.update(workerId, { wallet_balance: newBalance });

    return Response.json({
      success: true,
      newBalance,
      message: `Payment of ₪${amount} released to worker`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});