import { z } from "zod";

const statusEnum = z.enum([
  "ordered",
  "scheduled",
  "completed",
  "results_received",
  "cancelled",
]);

const authorizationEnum = z.enum([
  "not_required",
  "required",
  "pending",
  "approved",
  "denied",
]);

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

const timeString = z
  .string()
  .trim()
  .regex(/^\d{2}:\d{2}$/, "Enter a valid time.");

/** Shape the imaging form binds to (all optional fields arrive as ""). */
export const imagingOrderFormSchema = z.object({
  patientReference: z
    .string()
    .trim()
    .min(1, "Enter a patient reference (MRN or initials).")
    .max(64, "Keep the patient reference short — no full names."),
  orderingProvider: z
    .string()
    .trim()
    .min(1, "Enter the ordering provider.")
    .max(120, "Provider name is too long."),
  imagingType: z
    .string()
    .trim()
    .min(1, "Enter the imaging type.")
    .max(120, "Imaging type is too long."),
  imagingLocation: z.string().trim().max(120, "Location is too long.").optional(),
  dateOrdered: z.string().optional(),
  appointmentDate: z.string().optional(),
  appointmentTime: z.string().optional(),
  status: statusEnum,
  authorizationStatus: authorizationEnum,
  authorizationNumber: z
    .string()
    .trim()
    .max(64, "Authorization number is too long.")
    .optional(),
  notes: z
    .string()
    .trim()
    .max(280, "Keep notes short and non-clinical.")
    .optional(),
});

export type ImagingOrderFormValues = z.infer<typeof imagingOrderFormSchema>;

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

const normalizedPayload = imagingOrderFormSchema
  .extend({
    dateOrdered: z.union([z.literal(""), dateString]).optional(),
    appointmentDate: z.union([z.literal(""), dateString]).optional(),
    appointmentTime: z.union([z.literal(""), timeString]).optional(),
  })
  .transform((data) => ({
    patientReference: data.patientReference.trim(),
    orderingProvider: data.orderingProvider.trim(),
    imagingType: data.imagingType.trim(),
    imagingLocation: emptyToNull(data.imagingLocation),
    dateOrdered: emptyToNull(data.dateOrdered),
    appointmentDate: emptyToNull(data.appointmentDate),
    appointmentTime: emptyToNull(data.appointmentTime),
    status: data.status,
    authorizationStatus: data.authorizationStatus,
    authorizationNumber: emptyToNull(data.authorizationNumber),
    notes: emptyToNull(data.notes),
  }));

export const createImagingOrderSchema = normalizedPayload;

export const updateImagingOrderSchema = z
  .object({ id: z.uuid("Invalid imaging order.") })
  .and(imagingOrderFormSchema)
  .and(
    z.object({
      dateOrdered: z.union([z.literal(""), dateString]).optional(),
      appointmentDate: z.union([z.literal(""), dateString]).optional(),
      appointmentTime: z.union([z.literal(""), timeString]).optional(),
    })
  )
  .transform((data) => ({
    id: data.id,
    patientReference: data.patientReference.trim(),
    orderingProvider: data.orderingProvider.trim(),
    imagingType: data.imagingType.trim(),
    imagingLocation: emptyToNull(data.imagingLocation),
    dateOrdered: emptyToNull(data.dateOrdered),
    appointmentDate: emptyToNull(data.appointmentDate),
    appointmentTime: emptyToNull(data.appointmentTime),
    status: data.status,
    authorizationStatus: data.authorizationStatus,
    authorizationNumber: emptyToNull(data.authorizationNumber),
    notes: emptyToNull(data.notes),
  }));

export type CreateImagingOrderInput = z.infer<typeof createImagingOrderSchema>;
export type UpdateImagingOrderInput = z.infer<typeof updateImagingOrderSchema>;

export const setImagingStatusSchema = z.object({
  id: z.uuid("Invalid imaging order."),
  status: statusEnum,
});

export const setImagingAuthorizationSchema = z.object({
  id: z.uuid("Invalid imaging order."),
  authorizationStatus: authorizationEnum,
  authorizationNumber: z
    .string()
    .trim()
    .max(64, "Authorization number is too long.")
    .optional(),
});

export type SetImagingStatusInput = z.infer<typeof setImagingStatusSchema>;
export type SetImagingAuthorizationInput = z.infer<
  typeof setImagingAuthorizationSchema
>;
