import { z } from "zod";

import { TRANSACTION_TYPE_OPTIONS } from "@/lib/transactions/constants";

const optionalUuidFilter = z
  .string()
  .trim()
  .default("")
  .refine((value) => value === "" || z.uuid().safeParse(value).success, {
    message: "Invalid identifier",
  });

export const transactionsPageFiltersSchema = z.object({
  itemId: optionalUuidFilter,
  locationId: optionalUuidFilter,
  transactionType: z
    .enum(TRANSACTION_TYPE_OPTIONS)
    .optional()
    .or(z.literal(""))
    .default(""),
  search: z.string().trim().max(100).default(""),
  dateFrom: z.string().trim().default(""),
  dateTo: z.string().trim().default(""),
  page: z.coerce.number().int().min(1).default(1),
});

export type TransactionsPageFilters = z.infer<
  typeof transactionsPageFiltersSchema
>;

export function parseTransactionsPageFilters(
  raw: Record<string, string | string[] | undefined>
): TransactionsPageFilters {
  const normalized = {
    itemId: typeof raw.itemId === "string" ? raw.itemId : "",
    locationId: typeof raw.locationId === "string" ? raw.locationId : "",
    transactionType:
      typeof raw.transactionType === "string" ? raw.transactionType : "",
    search: typeof raw.search === "string" ? raw.search : "",
    dateFrom: typeof raw.dateFrom === "string" ? raw.dateFrom : "",
    dateTo: typeof raw.dateTo === "string" ? raw.dateTo : "",
    page: typeof raw.page === "string" ? raw.page : "1",
  };

  const parsed = transactionsPageFiltersSchema.safeParse(normalized);
  if (!parsed.success) {
    return transactionsPageFiltersSchema.parse({ page: "1" });
  }

  return parsed.data;
}
