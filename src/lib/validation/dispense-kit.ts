import { z } from "zod";

const administeredAmountEntrySchema = z.object({
  componentId: z.uuid("Invalid component."),
  amount: z.coerce
    .number({ error: "Enter an administered amount." })
    .positive("Amount must be greater than zero.")
    .max(999_999.999, "Amount is too large."),
});

export const dispenseKitFormSchema = z.object({
  procedureKitId: z
    .string()
    .min(1, "Select a procedure kit.")
    .uuid("Select a procedure kit."),
  locationId: z
    .string()
    .min(1, "Select a location.")
    .uuid("Select a location."),
  administeredAmounts: z.record(z.string(), z.string()),
  allowExpired: z.boolean().optional(),
});

export type DispenseKitFormValues = z.infer<typeof dispenseKitFormSchema>;

export const dispenseKitSchema = z.object({
  procedureKitId: z.uuid("Select a procedure kit."),
  locationId: z.uuid("Select a location."),
  administeredAmounts: z.array(administeredAmountEntrySchema),
  performedAt: z.coerce.date().refine((value) => !Number.isNaN(value.getTime()), {
    message: "Enter a valid date and time.",
  }),
  allowExpired: z.boolean().optional(),
});

export type DispenseKitInput = z.infer<typeof dispenseKitSchema>;

export function parseAdministeredAmountsFromForm(
  kitId: string,
  raw: Record<string, string>,
  variableComponentIds: string[]
): { componentId: string; amount: number }[] {
  return variableComponentIds.map((componentId) => ({
    componentId,
    amount: Number(raw[componentId] ?? ""),
  }));
}
