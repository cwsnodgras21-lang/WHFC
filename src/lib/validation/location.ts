import { z } from "zod";

const optionalLocationPart = z
  .string()
  .trim()
  .max(80, "Value is too long.")
  .nullable()
  .optional();

const locationPayload = z.object({
  locationName: z
    .string()
    .trim()
    .min(1, "Enter a location name.")
    .max(120, "Location name is too long."),
  room: optionalLocationPart,
  cabinet: optionalLocationPart,
  shelf: optionalLocationPart,
  bin: optionalLocationPart,
  active: z.boolean(),
});

export const locationIdSchema = z.uuid("Invalid location.");

function normalizeOptional(value: string | null | undefined): string | null {
  return value?.trim() ? value.trim() : null;
}

export const locationFormSchema = z.object({
  locationName: locationPayload.shape.locationName,
  room: z.string().trim().max(80, "Room is too long.").optional().or(z.literal("")),
  cabinet: z
    .string()
    .trim()
    .max(80, "Cabinet is too long.")
    .optional()
    .or(z.literal("")),
  shelf: z.string().trim().max(80, "Shelf is too long.").optional().or(z.literal("")),
  bin: z.string().trim().max(80, "Bin is too long.").optional().or(z.literal("")),
  active: z.boolean(),
});

export const createLocationSchema = locationPayload.transform((data) => ({
  locationName: data.locationName.trim(),
  room: normalizeOptional(data.room),
  cabinet: normalizeOptional(data.cabinet),
  shelf: normalizeOptional(data.shelf),
  bin: normalizeOptional(data.bin),
  active: data.active,
}));

export const updateLocationSchema = locationPayload
  .extend({ id: locationIdSchema })
  .transform((data) => ({
    id: data.id,
    locationName: data.locationName.trim(),
    room: normalizeOptional(data.room),
    cabinet: normalizeOptional(data.cabinet),
    shelf: normalizeOptional(data.shelf),
    bin: normalizeOptional(data.bin),
    active: data.active,
  }));

export type LocationFormValues = z.infer<typeof locationFormSchema>;
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
