import { z } from "zod";

const statusFilter = z.enum([
  "all",
  "ordered",
  "scheduled",
  "completed",
  "results_received",
  "cancelled",
]);

const authFilter = z.enum([
  "all",
  "not_required",
  "required",
  "pending",
  "approved",
  "denied",
]);

const optionalText = z.string().trim().max(120).default("");

const optionalDate = z
  .string()
  .trim()
  .default("")
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Invalid date",
  });

export const imagingPageFiltersSchema = z.object({
  status: statusFilter.default("all"),
  authorization: authFilter.default("all"),
  provider: optionalText,
  location: optionalText,
  appointmentDate: optionalDate,
});

export type ImagingPageFilters = z.infer<typeof imagingPageFiltersSchema>;

export function parseImagingPageFilters(
  raw: Record<string, string | string[] | undefined>
): ImagingPageFilters {
  const str = (value: string | string[] | undefined): string =>
    typeof value === "string" ? value : "";

  const parsed = imagingPageFiltersSchema.safeParse({
    status: str(raw.status) || "all",
    authorization: str(raw.authorization) || "all",
    provider: str(raw.provider),
    location: str(raw.location),
    appointmentDate: str(raw.appointmentDate),
  });

  if (!parsed.success) {
    return imagingPageFiltersSchema.parse({});
  }

  return parsed.data;
}
