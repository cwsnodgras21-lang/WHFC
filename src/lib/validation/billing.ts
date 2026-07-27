import { z } from "zod";

export const createCheckoutRequestSchema = z.object({
  mode: z.enum(["payment", "subscription"]),
  priceId: z.string().trim().min(1, "Select a plan."),
  successUrl: z.url("Enter a valid success URL."),
  cancelUrl: z.url("Enter a valid cancel URL."),
});

export type CreateCheckoutRequest = z.infer<typeof createCheckoutRequestSchema>;
