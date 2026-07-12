import type { SupabaseClient } from "@supabase/supabase-js";

import { canManagePurchaseOrderDrafts } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import type { Database } from "@/lib/types/database";
import {
  approveDraftSchema,
  cancelDraftSchema,
  markDraftOrderedSchema,
  removeDraftLineSchema,
  saveDraftLinesSchema,
  type ApproveDraftInput,
  type CancelDraftInput,
  type MarkDraftOrderedInput,
  type RemoveDraftLineInput,
  type SaveDraftLinesInput,
} from "@/lib/validation/purchase-order-drafts";

type Client = SupabaseClient<Database>;
type DraftStatus = Database["public"]["Enums"]["purchase_order_draft_status"];

type MutationResult =
  | { success: true }
  | { success: false; error: string };

function mapDbError(message: string): string {
  if (message.includes("permission denied") || message.includes("42501")) {
    return "You do not have permission to manage purchase order drafts.";
  }
  return message;
}

async function getDraftStatus(
  supabase: Client,
  draftId: string
): Promise<DraftStatus | null> {
  const { data, error } = await supabase
    .from("purchase_order_drafts")
    .select("status")
    .eq("id", draftId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.status;
}

async function countDraftLines(
  supabase: Client,
  draftId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("purchase_order_draft_lines")
    .select("id", { count: "exact", head: true })
    .eq("purchase_order_draft_id", draftId);

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export async function executeSaveDraftLines(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<MutationResult> {
  if (!canManagePurchaseOrderDrafts(session.profile.role, session.profile.active)) {
    return { success: false, error: "You do not have permission to edit PO drafts." };
  }

  const parsed = saveDraftLinesSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  return saveDraftLines(supabase, parsed.data);
}

async function saveDraftLines(
  supabase: Client,
  input: SaveDraftLinesInput
): Promise<MutationResult> {
  const status = await getDraftStatus(supabase, input.draftId);
  if (!status) {
    return { success: false, error: "Purchase order draft not found." };
  }
  if (status !== "draft") {
    return {
      success: false,
      error: "Only drafts in review can be edited. Approve or reopen is not supported.",
    };
  }

  for (const line of input.lines) {
    const { error } = await supabase
      .from("purchase_order_draft_lines")
      .update({
        quantity: line.quantity,
        notes: line.notes,
      })
      .eq("id", line.lineId)
      .eq("purchase_order_draft_id", input.draftId);

    if (error) {
      return { success: false, error: mapDbError(error.message) };
    }
  }

  return { success: true };
}

export async function executeRemoveDraftLine(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<MutationResult> {
  if (!canManagePurchaseOrderDrafts(session.profile.role, session.profile.active)) {
    return { success: false, error: "You do not have permission to edit PO drafts." };
  }

  const parsed = removeDraftLineSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  return removeDraftLine(supabase, parsed.data);
}

async function removeDraftLine(
  supabase: Client,
  input: RemoveDraftLineInput
): Promise<MutationResult> {
  const status = await getDraftStatus(supabase, input.draftId);
  if (!status) {
    return { success: false, error: "Purchase order draft not found." };
  }
  if (status !== "draft") {
    return { success: false, error: "Lines can only be removed while the draft is in review." };
  }

  const { error } = await supabase
    .from("purchase_order_draft_lines")
    .delete()
    .eq("id", input.lineId)
    .eq("purchase_order_draft_id", input.draftId);

  if (error) {
    return { success: false, error: mapDbError(error.message) };
  }

  const remaining = await countDraftLines(supabase, input.draftId);
  if (remaining === 0) {
    await supabase
      .from("purchase_order_drafts")
      .update({ status: "cancelled" })
      .eq("id", input.draftId);
  }

  return { success: true };
}

export async function executeApproveDraft(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<MutationResult> {
  if (!canManagePurchaseOrderDrafts(session.profile.role, session.profile.active)) {
    return { success: false, error: "You do not have permission to approve PO drafts." };
  }

  const parsed = approveDraftSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  return approveDraft(supabase, parsed.data);
}

async function approveDraft(
  supabase: Client,
  input: ApproveDraftInput
): Promise<MutationResult> {
  const status = await getDraftStatus(supabase, input.draftId);
  if (!status) {
    return { success: false, error: "Purchase order draft not found." };
  }
  if (status !== "draft") {
    return { success: false, error: "Only drafts in review can be approved." };
  }

  const lineCount = await countDraftLines(supabase, input.draftId);
  if (lineCount === 0) {
    return { success: false, error: "Add at least one line before approving." };
  }

  const { error } = await supabase
    .from("purchase_order_drafts")
    .update({ status: "approved" })
    .eq("id", input.draftId);

  if (error) {
    return { success: false, error: mapDbError(error.message) };
  }

  return { success: true };
}

export async function executeMarkDraftOrdered(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<MutationResult> {
  if (!canManagePurchaseOrderDrafts(session.profile.role, session.profile.active)) {
    return { success: false, error: "You do not have permission to mark PO drafts ordered." };
  }

  const parsed = markDraftOrderedSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  return markDraftOrdered(supabase, parsed.data);
}

async function markDraftOrdered(
  supabase: Client,
  input: MarkDraftOrderedInput
): Promise<MutationResult> {
  const status = await getDraftStatus(supabase, input.draftId);
  if (!status) {
    return { success: false, error: "Purchase order draft not found." };
  }
  if (status !== "approved") {
    return { success: false, error: "Only approved drafts can be marked ordered." };
  }

  const { error } = await supabase
    .from("purchase_order_drafts")
    .update({ status: "ordered" })
    .eq("id", input.draftId);

  if (error) {
    return { success: false, error: mapDbError(error.message) };
  }

  return { success: true };
}

export async function executeCancelDraft(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<MutationResult> {
  if (!canManagePurchaseOrderDrafts(session.profile.role, session.profile.active)) {
    return { success: false, error: "You do not have permission to cancel PO drafts." };
  }

  const parsed = cancelDraftSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  return cancelDraft(supabase, parsed.data);
}

async function cancelDraft(
  supabase: Client,
  input: CancelDraftInput
): Promise<MutationResult> {
  const status = await getDraftStatus(supabase, input.draftId);
  if (!status) {
    return { success: false, error: "Purchase order draft not found." };
  }
  if (status === "ordered" || status === "cancelled") {
    return { success: false, error: "This draft can no longer be cancelled." };
  }

  const { error } = await supabase
    .from("purchase_order_drafts")
    .update({ status: "cancelled" })
    .eq("id", input.draftId);

  if (error) {
    return { success: false, error: mapDbError(error.message) };
  }

  return { success: true };
}
