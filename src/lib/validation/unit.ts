import { z } from "zod";

const unitPayload = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a unit name.")
    .max(64, "Name is too long."),
  abbreviation: z
    .string()
    .trim()
    .min(1, "Enter an abbreviation.")
    .max(16, "Abbreviation is too long."),
  active: z.boolean(),
});

export const unitFormSchema = z.object({
  name: unitPayload.shape.name,
  abbreviation: unitPayload.shape.abbreviation,
  active: z.boolean(),
});

export const createUnitSchema = unitPayload.transform((data) => ({
  name: data.name.trim(),
  abbreviation: data.abbreviation.trim(),
  active: data.active,
}));

export const updateUnitSchema = unitPayload
  .extend({ id: z.uuid("Invalid unit.") })
  .transform((data) => ({
    id: data.id,
    name: data.name.trim(),
    abbreviation: data.abbreviation.trim(),
    active: data.active,
  }));

export type UnitFormValues = z.infer<typeof unitFormSchema>;
export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
