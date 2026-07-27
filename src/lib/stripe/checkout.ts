import "server-only";

import { getOrCreateStripeCustomer, getStripeCustomer } from "@/lib/stripe/customers";
import { getStripeClient } from "@/lib/stripe/client";

const APP_SLUG = "white-house-family-care";

export type CheckoutMode = "payment" | "subscription";

export async function createCheckoutSession(params: {
  mode: CheckoutMode;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail: string | null;
  customerName: string | null;
  externalId: string;
}): Promise<{ url: string }> {
  const stripe = getStripeClient();
  const { stripeCustomerId } = await getOrCreateStripeCustomer({
    email: params.customerEmail,
    name: params.customerName,
    externalId: params.externalId,
  });

  const session = await stripe.checkout.sessions.create({
    mode: params.mode,
    customer: stripeCustomerId,
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: { appSlug: APP_SLUG },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.");
  }

  return { url: session.url };
}

export async function createPortalSession(params: {
  returnUrl: string;
}): Promise<{ url: string }> {
  const customer = await getStripeCustomer();
  if (!customer) {
    throw new Error("No billing customer found for this app.");
  }

  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: customer.stripeCustomerId,
    return_url: params.returnUrl,
  });

  return { url: session.url };
}
