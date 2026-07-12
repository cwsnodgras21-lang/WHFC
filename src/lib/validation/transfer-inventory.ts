import { z } from "zod";

export function locationsAreSame(
  fromLocationId: string,
  toLocationId: string
): boolean {
  return fromLocationId === toLocationId;
}

export function exceedsAvailableOnHand(
  quantity: number,
  onHand: number
): boolean {
  return quantity > onHand;
}

const distinctLocationsRefine = {
  message: "Source and destination must be different locations.",
  path: ["toLocationId"],
};

/** Client form validation (React Hook Form + zodResolver). */
export const transferInventoryFormSchema = z
  .object({
    itemId: z.string().min(1, "Select an item.").uuid("Select an item."),
    fromLocationId: z
      .string()
      .min(1, "Select a source location.")
      .uuid("Select a source location."),
    toLocationId: z
      .string()
      .min(1, "Select a destination location.")
      .uuid("Select a destination location."),
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
    transactionDate: z
      .string()
      .min(1, "Enter a transaction date and time.")
      .refine((value) => !Number.isNaN(new Date(value).getTime()), {
        message: "Enter a valid date and time.",
      }),
  })
  .refine(
    (data) => !locationsAreSame(data.fromLocationId, data.toLocationId),
    distinctLocationsRefine
  );

export type TransferInventoryFormValues = z.infer<
  typeof transferInventoryFormSchema
>;

/** Server-side validation for transfer_inventory RPC payloads. */
export const transferInventorySchema = z
  .object({
    itemId: z.uuid("Select an item."),
    fromLocationId: z.uuid("Select a source location."),
    toLocationId: z.uuid("Select a destination location."),
    quantity: z.coerce
      .number({ error: "Enter a quantity." })
      .positive("Quantity must be greater than zero.")
      .max(999_999.999, "Quantity is too large."),
    transactionDate: z.coerce
      .date()
      .refine((value) => !Number.isNaN(value.getTime()), {
        message: "Enter a valid date and time.",
      }),
  })
  .refine(
    (data) => !locationsAreSame(data.fromLocationId, data.toLocationId),
    distinctLocationsRefine
  );

export type TransferInventoryInput = z.infer<typeof transferInventorySchema>;
