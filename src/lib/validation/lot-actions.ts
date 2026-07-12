import { z } from "zod";

import type { Database } from "@/lib/types/database";

export type DisposeReasonCode = Extract<
  Database["public"]["Enums"]["reason_code"],
  "expired_disposal" | "damaged_disposal"
>;

export const DISPOSE_REASON_CODES = [
  "expired_disposal",
  "damaged_disposal",
] as const satisfies readonly DisposeReasonCode[];

export const DISPOSE_REASON_LABELS: Record<DisposeReasonCode, string> = {
  expired_disposal: "Expired",
  damaged_disposal: "Damaged",
};

/** Dispose part or all of a lot. Null quantity = the full remaining amount. */
export const disposeLotSchema = z.object({
  lotId: z.uuid("Select a valid lot."),
  quantity: z.coerce
    .number({ error: "Enter a quantity." })
    .positive("Quantity must be greater than zero.")
    .max(999_999.999, "Quantity is too large.")
    .optional(),
  reasonCode: z.enum(DISPOSE_REASON_CODES, { error: "Select a reason." }),
});

export type DisposeLotInput = z.infer<typeof disposeLotSchema>;

export type AdjustLotReasonCode = Extract<
  Database["public"]["Enums"]["reason_code"],
  | "found_stock"
  | "data_correction_increase"
  | "damaged_stock"
  | "data_correction_decrease"
  | "shrinkage"
>;

export const ADJUST_LOT_INCREASE_REASONS = [
  "found_stock",
  "data_correction_increase",
] as const satisfies readonly AdjustLotReasonCode[];

export const ADJUST_LOT_DECREASE_REASONS = [
  "damaged_stock",
  "data_correction_decrease",
  "shrinkage",
] as const satisfies readonly AdjustLotReasonCode[];

export const ADJUST_LOT_REASON_LABELS: Record<AdjustLotReasonCode, string> = {
  found_stock: "Found stock",
  data_correction_increase: "Correction (increase)",
  damaged_stock: "Damaged",
  data_correction_decrease: "Correction (decrease)",
  shrinkage: "Shrinkage",
};

export const adjustLotSchema = z
  .object({
    lotId: z.uuid("Select a valid lot."),
    quantity: z.coerce
      .number({ error: "Enter a quantity." })
      .positive("Quantity must be greater than zero.")
      .max(999_999.999, "Quantity is too large."),
    increase: z.boolean(),
    reasonCode: z.enum([
      ...ADJUST_LOT_INCREASE_REASONS,
      ...ADJUST_LOT_DECREASE_REASONS,
    ]),
  })
  .refine(
    (data) =>
      data.increase
        ? (ADJUST_LOT_INCREASE_REASONS as readonly string[]).includes(
            data.reasonCode
          )
        : (ADJUST_LOT_DECREASE_REASONS as readonly string[]).includes(
            data.reasonCode
          ),
    { message: "Reason does not match the adjustment direction.", path: ["reasonCode"] }
  );

export type AdjustLotInput = z.infer<typeof adjustLotSchema>;
