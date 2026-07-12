import { z } from "zod";

import type { Database } from "@/lib/types/database";

export type ConsumeReasonCode = Extract<
  Database["public"]["Enums"]["reason_code"],
  "clinic_use" | "expired_disposal" | "damaged_disposal"
>;

/** Reason codes permitted by the database for CONSUME transactions. */
export const CONSUME_REASON_CODES = [
  "clinic_use",
  "expired_disposal",
  "damaged_disposal",
] as const satisfies readonly ConsumeReasonCode[];

export const CONSUME_REASON_LABELS: Record<
  (typeof CONSUME_REASON_CODES)[number],
  string
> = {
  clinic_use: "Clinic use",
  expired_disposal: "Expired disposal",
  damaged_disposal: "Damaged disposal",
};

/** Client form validation (React Hook Form + zodResolver). */
export const consumeInventoryFormSchema = z.object({
  itemId: z.string().min(1, "Select an item.").uuid("Select an item."),
  locationId: z
    .string()
    .min(1, "Select a location.")
    .uuid("Select a location."),
  quantity: z
    .string()
    .min(1, "Enter a quantity.")
    .refine((value) => {
      const parsed = Number(value);
      return !Number.isNaN(parsed) && parsed > 0;
    }, "Quantity must be greater than zero.")
    .refine(
      (value) => Number(value) <= 999_999.999,
      "Quantity is too large."
    ),
  reasonCode: z.enum(CONSUME_REASON_CODES, {
    error: "Select a reason.",
  }),
  transactionDate: z
    .string()
    .min(1, "Enter a transaction date and time.")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "Enter a valid date and time.",
    }),
  // Empty string = "Use oldest first" (FEFO). A uuid = a manually chosen lot.
  lotId: z.string().optional(),
  allowExpired: z.boolean().optional(),
});

export type ConsumeInventoryFormValues = z.infer<
  typeof consumeInventoryFormSchema
>;

/** Server-side validation for consume_inventory RPC payloads. */
export const consumeInventorySchema = z.object({
  itemId: z.uuid("Select an item."),
  locationId: z.uuid("Select a location."),
  quantity: z.coerce
    .number({ error: "Enter a quantity." })
    .positive("Quantity must be greater than zero.")
    .max(999_999.999, "Quantity is too large."),
  reasonCode: z.enum(CONSUME_REASON_CODES, {
    error: "Select a reason.",
  }),
  transactionDate: z.coerce.date().refine((value) => !Number.isNaN(value.getTime()), {
    message: "Enter a valid date and time.",
  }),
  lotId: z.union([z.uuid("Select a valid lot."), z.literal("")]).optional(),
  allowExpired: z.boolean().optional(),
});

export type ConsumeInventoryInput = z.infer<typeof consumeInventorySchema>;

export function getConsumeReasonLabel(code: ConsumeReasonCode): string {
  return CONSUME_REASON_LABELS[code];
}

export function exceedsAvailableOnHand(
  quantity: number,
  onHand: number
): boolean {
  return quantity > onHand;
}
