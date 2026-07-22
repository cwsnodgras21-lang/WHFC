import type { SupabaseClient } from "@supabase/supabase-js";

import { canManageReorderSuggestions } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import { DISMISS_DURATION_DAYS } from "@/lib/reorder-suggestions/calculate";
import type { Database } from "@/lib/types/database";
import {
  createPoDraftSchema,
  dismissSuggestionSchema,
  reviewSuggestionSchema,
  type CreatePoDraftInput,
  type DismissSuggestionInput,
} from "@/lib/validation/reorder-suggestions";

type Client = SupabaseClient<Database>;

type MutationResult =
  | { success: true; draftId?: string }
  | { success: false; error: string };

function mapDbError(message: string): string {
  if (message.includes("permission denied") || message.includes("42501")) {
    return "You do not have permission to manage reorder suggestions.";
  }
  if (message.includes("purchase_order_draft_lines_unique_item")) {
    return "This item is already on the selected purchase order draft.";
  }
  return message;
}

export async function executeDismissSuggestion(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<MutationResult> {
  if (!canManageReorderSuggestions(session.profile.role, session.profile.active)) {
    return { success: false, error: "You do not have permission to dismiss suggestions." };
  }

  const parsed = dismissSuggestionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  return dismissSuggestion(supabase, session, parsed.data);
}

async function dismissSuggestion(
  supabase: Client,
  session: AppSession,
  input: DismissSuggestionInput
): Promise<MutationResult> {
  const dismissedUntil = new Date();
  dismissedUntil.setUTCDate(dismissedUntil.getUTCDate() + DISMISS_DURATION_DAYS);

  const { error } = await supabase.from("reorder_suggestion_actions").insert({
    item_id: input.itemId,
    location_id: input.locationId,
    action: "dismissed",
    dismissed_until: dismissedUntil.toISOString(),
    created_by: session.user.id,
  });

  if (error) {
    return { success: false, error: mapDbError(error.message) };
  }

  return { success: true };
}

export async function executeReviewSuggestion(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<MutationResult> {
  if (!canManageReorderSuggestions(session.profile.role, session.profile.active)) {
    return { success: false, error: "You do not have permission to review suggestions." };
  }

  const parsed = reviewSuggestionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const dismissedUntil = new Date();
  dismissedUntil.setUTCDate(dismissedUntil.getUTCDate() + DISMISS_DURATION_DAYS);

  const { error } = await supabase.from("reorder_suggestion_actions").insert({
    item_id: parsed.data.itemId,
    location_id: parsed.data.locationId,
    action: "reviewed",
    dismissed_until: dismissedUntil.toISOString(),
    created_by: session.user.id,
  });

  if (error) {
    return { success: false, error: mapDbError(error.message) };
  }

  return { success: true };
}

export async function executeCreatePoDraft(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<MutationResult> {
  if (!canManageReorderSuggestions(session.profile.role, session.profile.active)) {
    return { success: false, error: "You do not have permission to create PO drafts." };
  }

  const parsed = createPoDraftSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  return createPoDraftLine(supabase, session, parsed.data);
}

async function createPoDraftLine(
  supabase: Client,
  session: AppSession,
  input: CreatePoDraftInput
): Promise<MutationResult> {
  let draftId: string | null = null;

  if (input.vendorId) {
    const { data: existing } = await supabase
      .from("purchase_order_drafts")
      .select("id")
      .eq("vendor_id", input.vendorId)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    draftId = existing?.id ?? null;
  }

  if (!draftId) {
    const { data: created, error: createError } = await supabase
      .from("purchase_order_drafts")
      .insert({
        vendor_id: input.vendorId ?? null,
        status: "draft",
        created_by: session.user.id,
      })
      .select("id")
      .single();

    if (createError || !created) {
      return {
        success: false,
        error: mapDbError(createError?.message ?? "Failed to create PO draft."),
      };
    }
    draftId = created.id;
  }

  const { error: lineError } = await supabase
    .from("purchase_order_draft_lines")
    .insert({
      purchase_order_draft_id: draftId,
      item_id: input.itemId,
      location_id: input.locationId ?? null,
      quantity: input.quantity,
      suggested_quantity: input.suggestedQuantity ?? input.quantity,
      reorder_reason: input.reorderReason ?? null,
    });

  if (lineError) {
    return { success: false, error: mapDbError(lineError.message) };
  }

  return { success: true, draftId };
}
