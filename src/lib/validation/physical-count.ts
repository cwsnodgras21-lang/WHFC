import { z } from "zod";

export function calculateVariance(
  countedQuantity: number,
  systemQuantity: number
): number {
  return countedQuantity - systemQuantity;
}

export const startPhysicalCountSchema = z.object({
  locationId: z.uuid("Select a location."),
});

export type StartPhysicalCountInput = z.infer<typeof startPhysicalCountSchema>;

export const physicalCountLineSchema = z.object({
  itemId: z.uuid("Select an item."),
  countedQuantity: z.coerce
    .number({ error: "Enter a counted quantity." })
    .min(0, "Counted quantity cannot be negative.")
    .max(999_999.999, "Quantity is too large."),
});

export const savePhysicalCountLinesSchema = z.object({
  physicalCountId: z.uuid("Invalid physical count."),
  lines: z
    .array(physicalCountLineSchema)
    .min(1, "Enter at least one counted quantity to save."),
});

export type SavePhysicalCountLinesInput = z.infer<
  typeof savePhysicalCountLinesSchema
>;

export const completePhysicalCountSchema = z.object({
  physicalCountId: z.uuid("Invalid physical count."),
});

export type CompletePhysicalCountInput = z.infer<
  typeof completePhysicalCountSchema
>;

export const cancelPhysicalCountSchema = z.object({
  physicalCountId: z.uuid("Invalid physical count."),
});

export type CancelPhysicalCountInput = z.infer<typeof cancelPhysicalCountSchema>;

/** Client-side row validation for counted quantity text inputs. */
export const countedQuantityInputSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || !Number.isNaN(Number(value)),
    "Enter a valid quantity."
  )
  .refine(
    (value) => value === "" || Number(value) >= 0,
    "Counted quantity cannot be negative."
  );

export function parseCountedQuantityInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }

  const parsed = Number(trimmed);
  if (Number.isNaN(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}
