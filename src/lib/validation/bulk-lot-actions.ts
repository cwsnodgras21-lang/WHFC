import { z } from "zod";

/** Max lots processed in one bulk request (keeps server actions bounded). */
export const BULK_LOT_ID_LIMIT = 50;

export const lotIdListSchema = z
  .array(z.uuid("Select a valid lot."))
  .min(1, "Select at least one lot.")
  .max(BULK_LOT_ID_LIMIT, `Select at most ${BULK_LOT_ID_LIMIT} lots at a time.`);

export const bulkDisposeLotsSchema = z.object({
  lotIds: lotIdListSchema,
});

export type BulkDisposeLotsInput = z.infer<typeof bulkDisposeLotsSchema>;

export const markLotsReviewedSchema = z.object({
  lotIds: lotIdListSchema,
});

export type MarkLotsReviewedInput = z.infer<typeof markLotsReviewedSchema>;

export const bulkTransferLotsSchema = z.object({
  lotIds: lotIdListSchema,
  toLocationId: z.uuid("Select a destination location."),
});

export type BulkTransferLotsInput = z.infer<typeof bulkTransferLotsSchema>;
