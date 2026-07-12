import { z } from "zod";

import type { Database } from "@/lib/types/database";

export type ReceiveReasonCode = Extract<
  Database["public"]["Enums"]["reason_code"],
  "vendor_delivery" | "initial_stock" | "internal_restock"
>;

/** Reason codes permitted by the database for RECEIVE transactions. */
export const RECEIVE_REASON_CODES = [
  "vendor_delivery",
  "initial_stock",
  "internal_restock",
] as const satisfies readonly ReceiveReasonCode[];

export const RECEIVE_REASON_LABELS: Record<
  (typeof RECEIVE_REASON_CODES)[number],
  string
> = {
  vendor_delivery: "Normal receipt",
  initial_stock: "Initial stock setup",
  internal_restock: "Internal restock",
};

/** Client form validation (React Hook Form + zodResolver). */
export const receiveInventoryFormSchema = z.object({
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
  reasonCode: z.enum(RECEIVE_REASON_CODES, {
    error: "Select a reason.",
  }),
  transactionDate: z
    .string()
    .min(1, "Enter a transaction date and time.")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "Enter a valid date and time.",
    }),
  // Optional lot / expiration detail — only revealed and required when the
  // selected item tracks them (enforced in the form and by the database RPC).
  lotNumber: z.string().max(100, "Lot number is too long.").optional(),
  expirationDate: z
    .string()
    .optional()
    .refine(
      (value) => !value || !Number.isNaN(new Date(value).getTime()),
      "Enter a valid expiration date."
    ),
  vendorId: z.string().optional(),
});

export type ReceiveInventoryFormValues = z.infer<
  typeof receiveInventoryFormSchema
>;

/** Server-side validation for receive_inventory RPC payloads. */
export const receiveInventorySchema = z.object({
  itemId: z.uuid("Select an item."),
  locationId: z.uuid("Select a location."),
  quantity: z.coerce
    .number({ error: "Enter a quantity." })
    .positive("Quantity must be greater than zero.")
    .max(999_999.999, "Quantity is too large."),
  reasonCode: z.enum(RECEIVE_REASON_CODES, {
    error: "Select a reason.",
  }),
  transactionDate: z.coerce.date().refine((value) => !Number.isNaN(value.getTime()), {
    message: "Enter a valid date and time.",
  }),
  lotNumber: z
    .string()
    .trim()
    .max(100, "Lot number is too long.")
    .optional(),
  expirationDate: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || !Number.isNaN(new Date(value).getTime()),
      "Enter a valid expiration date."
    )
    .optional(),
  vendorId: z.union([z.uuid("Select a valid vendor."), z.literal("")]).optional(),
});

export type ReceiveInventoryInput = z.infer<typeof receiveInventorySchema>;

export function getReceiveReasonLabel(code: ReceiveReasonCode): string {
  return RECEIVE_REASON_LABELS[code];
}
