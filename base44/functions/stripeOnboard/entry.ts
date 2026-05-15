import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const returnUrl = body.returnUrl || 'https://app.joba24.com/wallet';
    const refreshUrl = body.refreshUrl || 'https://app.joba24.com/wallet';

    // Check existing account
    const existing = await base44.asServiceRole.entities.StripeAccount.filter({ user_id: user.id });
    let stripeAccountId;

    if (existing.length > 0) {
      stripeAccountId = existing[0].stripe_account_id;
    } else {
      // Create new Express account
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
        metadata: { user_id: user.id },
      });
      stripeAccountId = account.id;

      // Save to DB
      await base44.asServiceRole.entities.StripeAccount.create({
        user_id: user.id,
        stripe_account_id: stripeAccountId,
        onboarding_complete: false,
        payouts_enabled: false,
        charges_enabled: false,
        email: user.email,
      });
    }

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return Response.json({ url: accountLink.url, accountId: stripeAccountId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});