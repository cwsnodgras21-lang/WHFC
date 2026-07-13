import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max, "Too long.").optional();

const optionalNumber = z
  .union([z.literal(""), z.coerce.number().nonnegative("Must be zero or more.")])
  .optional();

const optionalInt = z
  .union([
    z.literal(""),
    z.coerce.number().int("Whole days only.").nonnegative("Must be zero or more."),
  ])
  .optional();

const optionalDate = z
  .union([
    z.literal(""),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date."),
  ])
  .optional();

export const itemVendorFormSchema = z.object({
  vendorId: z.uuid("Choose a vendor."),
  isPreferred: z.boolean().default(false),
  vendorSku: optionalText(120),
  manufacturer: optionalText(120),
  manufacturerPartNumber: optionalText(120),
  packSize: optionalText(80),
  typicalOrderQuantity: optionalNumber,
  leadTimeDays: optionalInt,
  typicalCost: optionalNumber,
  lastOrderDate: optionalDate,
  orderingNotes: optionalText(500),
  orderingUrl: z
    .union([
      z.literal(""),
      z.string().trim().url("Enter a valid URL.").max(500, "Too long."),
    ])
    .optional(),
});

export type ItemVendorFormValues = z.input<typeof itemVendorFormSchema>;

function numberOrNull(value: number | "" | undefined): number | null {
  return value === "" || value === undefined ? null : value;
}

function textOrNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const saveItemVendorSchema = z
  .object({
    id: z.uuid().optional(),
    itemId: z.uuid("Invalid item."),
  })
  .and(itemVendorFormSchema)
  .transform((data) => ({
    id: data.id ?? null,
    itemId: data.itemId,
    vendorId: data.vendorId,
    isPreferred: data.isPreferred,
    vendorSku: textOrNull(data.vendorSku),
    manufacturer: textOrNull(data.manufacturer),
    manufacturerPartNumber: textOrNull(data.manufacturerPartNumber),
    packSize: textOrNull(data.packSize),
    typicalOrderQuantity: numberOrNull(data.typicalOrderQuantity),
    leadTimeDays: numberOrNull(data.leadTimeDays),
    typicalCost: numberOrNull(data.typicalCost),
    lastOrderDate: textOrNull(data.lastOrderDate),
    orderingNotes: textOrNull(data.orderingNotes),
    orderingUrl: textOrNull(data.orderingUrl),
  }));

export type SaveItemVendorInput = z.output<typeof saveItemVendorSchema>;

export const removeItemVendorSchema = z.object({
  id: z.uuid("Invalid vendor source."),
  itemId: z.uuid("Invalid item."),
});

export const setPreferredItemVendorSchema = removeItemVendorSchema;
