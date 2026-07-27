import { NextRequest } from "next/server";
import type Stripe from "stripe";

import { getStripeClient } from "@/lib/stripe/client";
import {
  reportBillingEventToCrm,
  syncInvoiceFromStripe,
  syncPaymentMethodFromStripe,
  syncSubscriptionFromStripe,
} from "@/lib/stripe/sync";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured");
    return Response.json({ error: "Webhook is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("[stripe-webhook] Signature verification failed", error);
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === "subscription" && session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscriptionFromStripe(subscription);
        }

        await reportBillingEventToCrm("checkout.session.completed", {
          sessionId: session.id,
          mode: session.mode,
          customerId:
            typeof session.customer === "string"
              ? session.customer
              : (session.customer?.id ?? null),
        });
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionFromStripe(subscription);
        await reportBillingEventToCrm(event.type, {
          subscriptionId: subscription.id,
          status: subscription.status,
        });
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await syncInvoiceFromStripe(invoice);
        await reportBillingEventToCrm(event.type, {
          invoiceId: invoice.id,
          amountDue: invoice.amount_due,
          amountPaid: invoice.amount_paid,
        });
        break;
      }

      case "payment_method.attached": {
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        await syncPaymentMethodFromStripe(paymentMethod);
        await reportBillingEventToCrm("payment_method.attached", {
          paymentMethodId: paymentMethod.id,
        });
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error(`[stripe-webhook] Failed to process ${event.type}`, error);
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }

  return Response.json({ received: true }, { status: 200 });
}
