import { z } from "zod";

const optionalUuidFilter = z
  .string()
  .trim()
  .default("")
  .refine((value) => value === "" || z.uuid().safeParse(value).success, {
    message: "Invalid identifier",
  });

export const DISPENSE_SOURCE_OPTIONS = [
  "manual",
  "emr",
  "import",
  "api",
] as const;

export type DispenseSource = (typeof DISPENSE_SOURCE_OPTIONS)[number];

export const DISPENSE_SOURCE_LABELS: Record<DispenseSource, string> = {
  manual: "Manual",
  emr: "EMR",
  import: "Import",
  api: "API",
};

export const dispenseHistoryPageFiltersSchema = z.object({
  procedureKitId: optionalUuidFilter,
  locationId: optionalUuidFilter,
  source: z
    .enum(DISPENSE_SOURCE_OPTIONS)
    .optional()
    .or(z.literal(""))
    .default(""),
  search: z.string().trim().max(100).default(""),
  dateFrom: z.string().trim().default(""),
  dateTo: z.string().trim().default(""),
  page: z.coerce.number().int().min(1).default(1),
});

export type DispenseHistoryPageFilters = z.infer<
  typeof dispenseHistoryPageFiltersSchema
>;

export function parseDispenseHistoryPageFilters(
  raw: Record<string, string | string[] | undefined>
): DispenseHistoryPageFilters {
  const normalized = {
    procedureKitId:
      typeof raw.procedureKitId === "string" ? raw.procedureKitId : "",
    locationId: typeof raw.locationId === "string" ? raw.locationId : "",
    source: typeof raw.source === "string" ? raw.source : "",
    search: typeof raw.search === "string" ? raw.search : "",
    dateFrom: typeof raw.dateFrom === "string" ? raw.dateFrom : "",
    dateTo: typeof raw.dateTo === "string" ? raw.dateTo : "",
    page: typeof raw.page === "string" ? raw.page : "1",
  };

  const parsed = dispenseHistoryPageFiltersSchema.safeParse(normalized);
  if (!parsed.success) {
    return dispenseHistoryPageFiltersSchema.parse({ page: "1" });
  }

  return parsed.data;
}
