import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const accounts = await base44.asServiceRole.entities.StripeAccount.filter({ user_id: user.id });
    if (accounts.length === 0) {
      return Response.json({ connected: false });
    }

    const record = accounts[0];
    const account = await stripe.accounts.retrieve(record.stripe_account_id);

    const payoutsEnabled = account.payouts_enabled;
    const chargesEnabled = account.charges_enabled;
    const onboardingComplete = payoutsEnabled && chargesEnabled;

    // Update DB if status changed
    if (record.payouts_enabled !== payoutsEnabled || record.onboarding_complete !== onboardingComplete) {
      await base44.asServiceRole.entities.StripeAccount.update(record.id, {
        payouts_enabled: payoutsEnabled,
        charges_enabled: chargesEnabled,
        onboarding_complete: onboardingComplete,
      });
    }

    return Response.json({
      connected: true,
      accountId: record.stripe_account_id,
      payoutsEnabled,
      chargesEnabled,
      onboardingComplete,
      requirements: account.requirements?.currently_due || [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});