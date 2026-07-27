import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/client";

const APP_SLUG = "white-house-family-care";

export type StripeCustomerRecord = {
  id: string;
  stripeCustomerId: string;
};

/**
 * Returns the single billing customer for this app instance, creating both
 * the Stripe Customer and the billing_customers row on first use. The app is
 * single-tenant, so there is at most one billing_customers row.
 */
export async function getOrCreateStripeCustomer(params: {
  email: string | null;
  name: string | null;
  externalId: string;
}): Promise<StripeCustomerRecord> {
  const supabase = createAdminClient();

  const { data: existing, error: lookupError } = await supabase
    .from("billing_customers")
    .select("id, stripe_customer_id")
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Failed to look up billing customer: ${lookupError.message}`);
  }

  if (existing) {
    return { id: existing.id, stripeCustomerId: existing.stripe_customer_id };
  }

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: params.email ?? undefined,
    name: params.name ?? undefined,
    metadata: { appSlug: APP_SLUG, externalId: params.externalId },
  });

  const { data: inserted, error: insertError } = await supabase
    .from("billing_customers")
    .insert({
      stripe_customer_id: customer.id,
      email: params.email,
      name: params.name,
    })
    .select("id, stripe_customer_id")
    .single();

  if (insertError || !inserted) {
    throw new Error(
      `Failed to persist Stripe customer: ${insertError?.message ?? "unknown error"}`
    );
  }

  return { id: inserted.id, stripeCustomerId: inserted.stripe_customer_id };
}

/** The app's single billing customer, or null if billing has not been set up yet. */
export async function getStripeCustomer(): Promise<StripeCustomerRecord | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("billing_customers")
    .select("id, stripe_customer_id")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to look up billing customer: ${error.message}`);
  }

  return data ? { id: data.id, stripeCustomerId: data.stripe_customer_id } : null;
}
