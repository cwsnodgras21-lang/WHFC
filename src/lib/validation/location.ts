import { z } from "zod";

const locationPayload = z.object({
  locationName: z
    .string()
    .trim()
    .min(1, "Enter a location name.")
    .max(120, "Location name is too long."),
  active: z.boolean(),
});

export const locationIdSchema = z.uuid("Invalid location.");

export const locationFormSchema = z.object({
  locationName: locationPayload.shape.locationName,
  active: z.boolean(),
});

export const createLocationSchema = locationPayload.transform((data) => ({
  locationName: data.locationName.trim(),
  active: data.active,
}));

export const updateLocationSchema = locationPayload
  .extend({ id: locationIdSchema })
  .transform((data) => ({
    id: data.id,
    locationName: data.locationName.trim(),
    active: data.active,
  }));

export type LocationFormValues = z.infer<typeof locationFormSchema>;
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
