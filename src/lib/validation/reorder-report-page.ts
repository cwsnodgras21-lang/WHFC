import { z } from "zod";

import {
  REORDER_REPORT_GROUP_OPTIONS,
  REORDER_REPORT_SORT_OPTIONS,
} from "@/lib/reorder/constants";

const optionalUuidFilter = z
  .string()
  .trim()
  .default("")
  .refine((value) => value === "" || z.uuid().safeParse(value).success, {
    message: "Invalid identifier",
  });

export const reorderReportPageFiltersSchema = z.object({
  search: z.string().trim().max(100).default(""),
  categoryId: optionalUuidFilter,
  vendorId: z
    .string()
    .trim()
    .default("")
    .refine(
      (value) =>
        value === "" ||
        value === "none" ||
        z.uuid().safeParse(value).success,
      { message: "Invalid vendor filter" }
    ),
  sort: z.enum(REORDER_REPORT_SORT_OPTIONS).default("urgency"),
  groupBy: z.enum(REORDER_REPORT_GROUP_OPTIONS).default("none"),
});

export type ReorderReportPageFilters = z.infer<
  typeof reorderReportPageFiltersSchema
>;

export function parseReorderReportPageFilters(
  raw: Record<string, string | string[] | undefined>
): ReorderReportPageFilters {
  const normalized = {
    search: typeof raw.search === "string" ? raw.search : "",
    categoryId: typeof raw.categoryId === "string" ? raw.categoryId : "",
    vendorId: typeof raw.vendorId === "string" ? raw.vendorId : "",
    sort: typeof raw.sort === "string" ? raw.sort : "urgency",
    groupBy: typeof raw.groupBy === "string" ? raw.groupBy : "none",
  };

  const parsed = reorderReportPageFiltersSchema.safeParse(normalized);
  if (!parsed.success) {
    return reorderReportPageFiltersSchema.parse({});
  }

  return parsed.data;
}
