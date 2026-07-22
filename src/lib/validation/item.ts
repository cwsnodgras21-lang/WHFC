import { z } from "zod";

const quantityField = z
  .string()
  .min(1, "Enter a value.")
  .refine((value) => {
    const parsed = Number(value);
    return !Number.isNaN(parsed) && parsed >= 0;
  }, "Enter zero or a positive number.")
  .refine(
    (value) => Number(value) <= 999_999.999,
    "Value is too large."
  );

const warningDaysField = z
  .string()
  .min(1, "Enter the number of days.")
  .refine((value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0;
  }, "Enter a whole number of days greater than zero.")
  .refine((value) => Number(value) <= 3650, "That is too many days.");

const packQuantityField = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine((value) => {
    if (!value) return true;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0;
  }, "Enter a whole number greater than zero.")
  .refine((value) => !value || Number(value) <= 999_999, "Value is too large.");

const itemFields = {
  itemName: z
    .string()
    .trim()
    .min(1, "Enter an item name.")
    .max(200, "Item name is too long."),
  internalSku: z
    .string()
    .trim()
    .min(1, "Enter an internal SKU.")
    .max(64, "SKU is too long."),
  categoryId: z.string().min(1, "Select a category.").uuid("Select a category."),
  unitOfMeasureId: z
    .string()
    .min(1, "Select a stocking unit.")
    .uuid("Select a stocking unit."),
  preferredVendorId: z
    .string()
    .uuid("Select a valid vendor.")
    .optional()
    .or(z.literal("")),
  reorderPoint: quantityField,
  parLevel: quantityField,
  active: z.boolean(),
  trackExpiration: z.boolean(),
  trackLotNumber: z.boolean(),
  expirationWarningDays: warningDaysField,
  packQuantity: packQuantityField,
};

function parLevelMeetsReorder(reorderPoint: number, parLevel: number): boolean {
  return parLevel >= reorderPoint;
}

/** Client form validation (React Hook Form + zodResolver). */
export const itemFormSchema = z
  .object({
    itemName: itemFields.itemName,
    internalSku: itemFields.internalSku,
    categoryId: itemFields.categoryId,
    unitOfMeasureId: itemFields.unitOfMeasureId,
    preferredVendorId: itemFields.preferredVendorId,
    reorderPoint: itemFields.reorderPoint,
    parLevel: itemFields.parLevel,
    active: itemFields.active,
    trackExpiration: itemFields.trackExpiration,
    trackLotNumber: itemFields.trackLotNumber,
    expirationWarningDays: itemFields.expirationWarningDays,
    packQuantity: itemFields.packQuantity,
  })
  .superRefine((data, ctx) => {
    const reorder = Number(data.reorderPoint);
    const par = Number(data.parLevel);
    if (!parLevelMeetsReorder(reorder, par)) {
      ctx.addIssue({
        code: "custom",
        message: "Par level must be greater than or equal to reorder point.",
        path: ["parLevel"],
      });
    }
  });

export type ItemFormValues = z.infer<typeof itemFormSchema>;

const itemPayloadSchema = z
  .object({
    itemName: itemFields.itemName,
    internalSku: itemFields.internalSku,
    categoryId: z.uuid("Select a category."),
    unitOfMeasureId: z.uuid("Select a stocking unit."),
    preferredVendorId: z.string().uuid().nullable().optional(),
    reorderPoint: z.coerce.number().min(0).max(999_999.999),
    parLevel: z.coerce.number().min(0).max(999_999.999),
    active: z.boolean(),
    trackExpiration: z.boolean(),
    trackLotNumber: z.boolean(),
    expirationWarningDays: z.coerce.number().int().positive().max(3650),
    packQuantity: z.coerce.number().int().positive().max(999_999).nullable().optional(),
  })
  .refine((data) => parLevelMeetsReorder(data.reorderPoint, data.parLevel), {
    message: "Par level must be greater than or equal to reorder point.",
    path: ["parLevel"],
  });

export const createItemSchema = itemPayloadSchema;

export const updateItemSchema = itemPayloadSchema.extend({
  id: z.uuid("Invalid item."),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

export function formValuesToCreateInput(
  values: ItemFormValues
): CreateItemInput {
  return {
    itemName: values.itemName.trim(),
    internalSku: values.internalSku.trim(),
    categoryId: values.categoryId,
    unitOfMeasureId: values.unitOfMeasureId,
    preferredVendorId: values.preferredVendorId?.trim()
      ? values.preferredVendorId
      : null,
    reorderPoint: Number(values.reorderPoint),
    parLevel: Number(values.parLevel),
    active: values.active,
    trackExpiration: values.trackExpiration,
    trackLotNumber: values.trackLotNumber,
    expirationWarningDays: Number(values.expirationWarningDays),
    packQuantity: values.packQuantity?.trim()
      ? Number(values.packQuantity)
      : null,
  };
}

export function formValuesToUpdateInput(
  id: string,
  values: ItemFormValues
): UpdateItemInput {
  return {
    id,
    ...formValuesToCreateInput(values),
  };
}
