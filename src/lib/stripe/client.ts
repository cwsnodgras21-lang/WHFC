import "server-only";

import Stripe from "stripe";

export const runtime = "nodejs";

let stripeSingleton: Stripe | null = null;

/** Lazily-created Stripe SDK client, keyed off STRIPE_SECRET_KEY. */
export function getStripeClient(): Stripe {
  if (stripeSingleton) {
    return stripeSingleton;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing environment variable: STRIPE_SECRET_KEY");
  }

  stripeSingleton = new Stripe(secretKey, {
    appInfo: {
      name: "whfc-inventory",
    },
  });

  return stripeSingleton;
}
