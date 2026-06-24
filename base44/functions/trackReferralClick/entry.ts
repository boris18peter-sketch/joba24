import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { agent_code } = body;

    if (!agent_code) return Response.json({ error: 'Missing agent_code' }, { status: 400 });

    // Atomically increment the referral_clicks counter on the agent's user record
    await base44.asServiceRole.entities.User.updateMany(
      { agent_code },
      { $inc: { referral_clicks: 1 } },
    );

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});