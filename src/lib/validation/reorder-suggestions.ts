import { z } from "zod";

export const dismissSuggestionSchema = z.object({
  itemId: z.uuid(),
  locationId: z.uuid(),
});

export const reviewSuggestionSchema = dismissSuggestionSchema;

export const createPoDraftSchema = z.object({
  itemId: z.uuid(),
  locationId: z.uuid().optional().nullable(),
  quantity: z.coerce.number().positive().max(999_999.999),
  vendorId: z.uuid().optional().nullable(),
  suggestedQuantity: z.coerce.number().positive().max(999_999.999).optional(),
  reorderReason: z.string().trim().max(200).optional().nullable(),
});

export type DismissSuggestionInput = z.infer<typeof dismissSuggestionSchema>;
export type ReviewSuggestionInput = z.infer<typeof reviewSuggestionSchema>;
export type CreatePoDraftInput = z.infer<typeof createPoDraftSchema>;
