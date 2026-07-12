import { z } from "zod";

import { EXPIRATION_BUCKETS } from "@/lib/lots/expiration";

const optionalUuidFilter = z
  .string()
  .trim()
  .default("")
  .refine((value) => value === "" || z.uuid().safeParse(value).success, {
    message: "Invalid identifier",
  });

export const expirationCenterPageFiltersSchema = z.object({
  bucket: z.enum(EXPIRATION_BUCKETS).default("expiring_90"),
  categoryId: optionalUuidFilter,
  itemId: optionalUuidFilter,
  locationId: optionalUuidFilter,
});

export type ExpirationCenterPageFilters = z.infer<
  typeof expirationCenterPageFiltersSchema
>;

export function parseExpirationCenterPageFilters(
  raw: Record<string, string | string[] | undefined>
): ExpirationCenterPageFilters {
  const normalized = {
    bucket: typeof raw.bucket === "string" ? raw.bucket : "expiring_90",
    categoryId: typeof raw.categoryId === "string" ? raw.categoryId : "",
    itemId: typeof raw.itemId === "string" ? raw.itemId : "",
    locationId: typeof raw.locationId === "string" ? raw.locationId : "",
  };

  const parsed = expirationCenterPageFiltersSchema.safeParse(normalized);
  if (!parsed.success) {
    return expirationCenterPageFiltersSchema.parse({});
  }

  return parsed.data;
}
