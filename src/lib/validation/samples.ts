import { z } from "zod";

/** Admin CRUD form for the sample product catalog. */
export const sampleProductFormSchema = z.object({
  id: z.string().optional(),
  productName: z.string().trim().min(1, "Enter a product name.").max(160, "Name is too long."),
  manufacturerVendor: z.string().trim().max(120, "Too long.").optional(),
  strength: z.string().trim().max(60, "Too long.").optional(),
  dosageForm: z.string().trim().max(60, "Too long.").optional(),
  unitOfMeasureId: z.string().min(1, "Select a unit.").uuid("Select a unit."),
  reorderThreshold: z
    .string()
    .min(1, "Enter a threshold.")
    .refine((v) => {
      const n = Number(v);
      return !Number.isNaN(n) && n >= 0;
    }, "Threshold must be zero or greater."),
  expirationWarningDays: z.string().optional(),
  active: z.boolean(),
  notes: z.string().trim().max(500, "Notes are too long.").optional(),
});

export type SampleProductFormValues = z.infer<typeof sampleProductFormSchema>;

export const saveSampleProductSchema = z.object({
  id: z.uuid().optional(),
  productName: z.string().trim().min(1).max(160),
  manufacturerVendor: z.string().trim().max(120).optional().nullable(),
  strength: z.string().trim().max(60).optional().nullable(),
  dosageForm: z.string().trim().max(60).optional().nullable(),
  unitOfMeasureId: z.uuid("Select a unit."),
  reorderThreshold: z.coerce.number().min(0).max(999_999.999),
  expirationWarningDays: z.coerce.number().int().positive().optional().nullable(),
  active: z.boolean(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type SaveSampleProductInput = z.infer<typeof saveSampleProductSchema>;

/** Client form for recording a sample receipt. */
export const receiveSampleFormSchema = z.object({
  sampleProductId: z.string().min(1, "Select a product.").uuid("Select a product."),
  quantity: z
    .string()
    .min(1, "Enter a quantity.")
    .refine((v) => {
      const n = Number(v);
      return !Number.isNaN(n) && n > 0;
    }, "Quantity must be greater than zero.")
    .refine((v) => Number(v) <= 999_999.999, "Quantity is too large."),
  lotNumber: z.string().trim().max(100, "Lot number is too long.").optional(),
  expirationDate: z
    .string()
    .optional()
    .refine(
      (v) => !v || !Number.isNaN(new Date(v).getTime()),
      "Enter a valid expiration date."
    ),
  vendorId: z.string().optional(),
  representativeName: z.string().trim().max(120, "Too long.").optional(),
  receivedDate: z.string().optional(),
  notes: z.string().trim().max(280, "Keep notes short and non-clinical.").optional(),
});

export type ReceiveSampleFormValues = z.infer<typeof receiveSampleFormSchema>;

export const receiveSampleSchema = z.object({
  sampleProductId: z.uuid("Select a product."),
  quantity: z.coerce
    .number({ error: "Enter a quantity." })
    .positive("Quantity must be greater than zero.")
    .max(999_999.999, "Quantity is too large."),
  lotNumber: z.string().trim().max(100).optional().nullable(),
  expirationDate: z
    .union([z.literal(""), z.iso.date("Enter a valid expiration date.")])
    .optional()
    .nullable(),
  vendorId: z.union([z.uuid("Select a valid vendor."), z.literal("")]).optional().nullable(),
  representativeName: z.string().trim().max(120).optional().nullable(),
  receivedDate: z.union([z.literal(""), z.iso.date("Enter a valid received date.")]).optional().nullable(),
  notes: z.string().trim().max(280).optional().nullable(),
});

export type ReceiveSampleInput = z.infer<typeof receiveSampleSchema>;

/** Client form for dispensing a sample to a patient. */
export const dispenseSampleFormSchema = z.object({
  sampleProductId: z.string().min(1, "Select a product.").uuid("Select a product."),
  quantity: z
    .string()
    .min(1, "Enter a quantity.")
    .refine((v) => {
      const n = Number(v);
      return !Number.isNaN(n) && n > 0;
    }, "Quantity must be greater than zero.")
    .refine((v) => Number(v) <= 999_999.999, "Quantity is too large."),
  patientReference: z
    .string()
    .trim()
    .min(1, "Enter a patient reference (MRN or initials).")
    .max(64, "Keep the patient reference short — no full names."),
  sampleLotId: z.string().optional(),
  notes: z.string().trim().max(280, "Keep notes short and non-clinical.").optional(),
});

export type DispenseSampleFormValues = z.infer<typeof dispenseSampleFormSchema>;

export const dispenseSampleSchema = z.object({
  sampleProductId: z.uuid("Select a product."),
  quantity: z.coerce
    .number({ error: "Enter a quantity." })
    .positive("Quantity must be greater than zero.")
    .max(999_999.999, "Quantity is too large."),
  patientReference: z
    .string()
    .trim()
    .min(1, "Enter a patient reference (MRN or initials).")
    .max(64, "Keep the patient reference short — no full names."),
  sampleLotId: z.union([z.uuid("Select a valid lot."), z.literal("")]).optional().nullable(),
  notes: z.string().trim().max(280).optional().nullable(),
});

export type DispenseSampleInput = z.infer<typeof dispenseSampleSchema>;

export function exceedsAvailableSampleStock(
  quantity: number,
  onHand: number
): boolean {
  return quantity > onHand;
}
