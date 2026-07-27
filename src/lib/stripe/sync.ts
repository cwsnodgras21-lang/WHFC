import "server-only";

import type Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/admin";

const APP_SLUG = "white-house-family-care";
const DEFAULT_NOLTURN_BILLING_URL = "https://nolturn.nolturn.io/api/billing/events";

function toIso(unixSeconds: number | null | undefined): string | null {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;
}

function resolveCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

async function resolveBillingCustomerId(stripeCustomerId: string): Promise<string> {
  const supabase = createAdminClient();

  const { data: existing, error: lookupError } = await supabase
    .from("billing_customers")
    .select("id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Failed to look up billing customer: ${lookupError.message}`);
  }

  if (existing) {
    return existing.id;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("billing_customers")
    .insert({ stripe_customer_id: stripeCustomerId })
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw new Error(
      `Failed to create billing customer for ${stripeCustomerId}: ${insertError?.message ?? "unknown error"}`
    );
  }

  return inserted.id;
}

export async function syncSubscriptionFromStripe(
  subscription: Stripe.Subscription
): Promise<void> {
  const stripeCustomerId = resolveCustomerId(subscription.customer);
  if (!stripeCustomerId) return;

  const billingCustomerId = await resolveBillingCustomerId(stripeCustomerId);
  const item = subscription.items.data[0];
  const price = item?.price;

  const supabase = createAdminClient();
  const { error } = await supabase.from("billing_subscriptions").upsert(
    {
      billing_customer_id: billingCustomerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: price?.id ?? "",
      plan_name: price?.nickname ?? price?.id ?? "Subscription",
      status: subscription.status,
      current_period_start: toIso(item?.current_period_start),
      current_period_end: toIso(item?.current_period_end),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: toIso(subscription.canceled_at),
      trial_end: toIso(subscription.trial_end),
    },
    { onConflict: "stripe_subscription_id" }
  );

  if (error) {
    throw new Error(`Failed to sync subscription ${subscription.id}: ${error.message}`);
  }
}

export async function syncInvoiceFromStripe(invoice: Stripe.Invoice): Promise<void> {
  const stripeCustomerId = resolveCustomerId(invoice.customer);
  if (!stripeCustomerId) return;

  const billingCustomerId = await resolveBillingCustomerId(stripeCustomerId);

  const supabase = createAdminClient();
  const { error } = await supabase.from("billing_invoices").upsert(
    {
      billing_customer_id: billingCustomerId,
      stripe_invoice_id: invoice.id ?? invoice.number ?? crypto.randomUUID(),
      amount_due: invoice.amount_due,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status ?? "draft",
      description: invoice.description,
      invoice_pdf: invoice.invoice_pdf,
      hosted_invoice_url: invoice.hosted_invoice_url,
      due_date: toIso(invoice.due_date),
      paid_at: toIso(invoice.status_transitions.paid_at),
    },
    { onConflict: "stripe_invoice_id" }
  );

  if (error) {
    throw new Error(`Failed to sync invoice ${invoice.id}: ${error.message}`);
  }
}

export async function syncPaymentMethodFromStripe(
  paymentMethod: Stripe.PaymentMethod
): Promise<void> {
  const stripeCustomerId = resolveCustomerId(paymentMethod.customer);
  if (!stripeCustomerId) return;

  const billingCustomerId = await resolveBillingCustomerId(stripeCustomerId);

  const supabase = createAdminClient();
  const { error } = await supabase.from("billing_payment_methods").upsert(
    {
      billing_customer_id: billingCustomerId,
      stripe_payment_method_id: paymentMethod.id,
      type: paymentMethod.type,
      brand: paymentMethod.card?.brand ?? null,
      last4: paymentMethod.card?.last4 ?? null,
      exp_month: paymentMethod.card?.exp_month ?? null,
      exp_year: paymentMethod.card?.exp_year ?? null,
      is_default: false,
    },
    { onConflict: "stripe_payment_method_id" }
  );

  if (error) {
    throw new Error(
      `Failed to sync payment method ${paymentMethod.id}: ${error.message}`
    );
  }
}

/**
 * Best-effort report to the NolTurn CRM. Never throws — a CRM outage must not
 * fail webhook processing or cause Stripe to retry an already-synced event.
 */
export async function reportBillingEventToCrm(
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  const token = process.env.NOLTURN_BILLING_TOKEN;
  if (!token) {
    console.error("[billing] NOLTURN_BILLING_TOKEN is not configured");
    return;
  }

  const url = process.env.NOLTURN_BILLING_URL ?? DEFAULT_NOLTURN_BILLING_URL;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ appSlug: APP_SLUG, event, data }),
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("[billing] Nolturn rejected billing event", event, response.status);
    }
  } catch (error) {
    console.error("[billing] Nolturn billing report failed", event, error);
  }
}
