import { z } from "zod";

const expirationWarningDaysField = z.coerce
  .number()
  .int()
  .positive()
  .max(3650)
  .optional()
  .nullable();

const categoryPayload = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a category name.")
    .max(120, "Name is too long."),
  description: z
    .string()
    .trim()
    .max(500, "Description is too long.")
    .optional()
    .nullable(),
  expirationWarningDays: expirationWarningDaysField,
  active: z.boolean(),
});

export const categoryFormSchema = z.object({
  name: categoryPayload.shape.name,
  description: z
    .string()
    .trim()
    .max(500, "Description is too long.")
    .optional()
    .or(z.literal("")),
  expirationWarningDays: z
    .string()
    .optional()
    .refine((v) => {
      if (!v) return true;
      const n = Number(v);
      return Number.isInteger(n) && n > 0 && n <= 3650;
    }, "Enter a whole number of days, or leave blank to inherit."),
  active: z.boolean(),
});

export const createCategorySchema = categoryPayload.transform((data) => ({
  name: data.name.trim(),
  description: data.description?.trim() ? data.description.trim() : null,
  expirationWarningDays: data.expirationWarningDays ?? null,
  active: data.active,
}));

export const updateCategorySchema = categoryPayload
  .extend({ id: z.uuid("Invalid category.") })
  .transform((data) => ({
    id: data.id,
    name: data.name.trim(),
    description: data.description?.trim() ? data.description.trim() : null,
    expirationWarningDays: data.expirationWarningDays ?? null,
    active: data.active,
  }));

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const quickCreateCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a category name.")
    .max(120, "Name is too long."),
});
