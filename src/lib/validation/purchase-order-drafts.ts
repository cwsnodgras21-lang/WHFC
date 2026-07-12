import { z } from "zod";

const draftIdSchema = z.object({
  draftId: z.uuid(),
});

const lineIdSchema = z.object({
  lineId: z.uuid(),
});

const quantitySchema = z.coerce.number().positive().max(999_999.999);

const notesSchema = z
  .string()
  .trim()
  .max(500, "Notes must be 500 characters or fewer.")
  .optional()
  .nullable()
  .transform((value) => (value === "" ? null : value ?? null));

export const saveDraftLinesSchema = z.object({
  draftId: z.uuid(),
  lines: z
    .array(
      z.object({
        lineId: z.uuid(),
        quantity: quantitySchema,
        notes: notesSchema,
      })
    )
    .min(1, "At least one line is required."),
});

export const removeDraftLineSchema = lineIdSchema.extend({
  draftId: z.uuid(),
});

export const approveDraftSchema = draftIdSchema;
export const markDraftOrderedSchema = draftIdSchema;
export const cancelDraftSchema = draftIdSchema;

export type SaveDraftLinesInput = z.infer<typeof saveDraftLinesSchema>;
export type RemoveDraftLineInput = z.infer<typeof removeDraftLineSchema>;
export type ApproveDraftInput = z.infer<typeof approveDraftSchema>;
export type MarkDraftOrderedInput = z.infer<typeof markDraftOrderedSchema>;
export type CancelDraftInput = z.infer<typeof cancelDraftSchema>;
