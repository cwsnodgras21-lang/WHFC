import { z } from "zod";

const warningDaysField = z
  .string()
  .min(1, "Enter the number of days.")
  .refine((v) => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0;
  }, "Enter a whole number of days greater than zero.")
  .refine((v) => Number(v) <= 3650, "That is too many days.");

export const expirationSettingsFormSchema = z.object({
  defaultExpirationWarningDays: warningDaysField,
  defaultSampleExpirationWarningDays: warningDaysField,
});

export type ExpirationSettingsFormValues = z.infer<
  typeof expirationSettingsFormSchema
>;

export const updateExpirationSettingsSchema = z.object({
  defaultExpirationWarningDays: z.coerce.number().int().positive().max(3650),
  defaultSampleExpirationWarningDays: z.coerce
    .number()
    .int()
    .positive()
    .max(3650),
});

export type UpdateExpirationSettingsInput = z.infer<
  typeof updateExpirationSettingsSchema
>;
