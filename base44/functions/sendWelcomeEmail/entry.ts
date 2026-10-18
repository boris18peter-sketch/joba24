import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const email = user.email;
    const name = user.full_name || 'חבר';
    if (!email) return Response.json({ sent: false, reason: 'No email' });

    await base44.integrations.Core.SendEmail({
      to: email,
      template_name: 'Welcome',
      variables: { first_name: name },
    });

    return Response.json({ sent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});