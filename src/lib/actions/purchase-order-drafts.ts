"use server";

import { revalidatePath } from "next/cache";

import {
  executeApproveDraft,
  executeCancelDraft,
  executeMarkDraftOrdered,
  executeRemoveDraftLine,
  executeSaveDraftLines,
} from "@/lib/purchase-order-drafts/operations";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function revalidatePoDraftPaths(draftId?: string) {
  revalidatePath("/purchase-order-drafts");
  revalidatePath("/dashboard");
  revalidatePath("/reorder-suggestions");
  if (draftId) {
    revalidatePath(`/purchase-order-drafts/${draftId}`);
  }
}

export async function saveDraftLinesAction(rawInput: unknown) {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeSaveDraftLines(supabase, session, rawInput);

  if (result.success && typeof rawInput === "object" && rawInput && "draftId" in rawInput) {
    revalidatePoDraftPaths(String((rawInput as { draftId: string }).draftId));
  }

  return result;
}

export async function removeDraftLineAction(rawInput: unknown) {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeRemoveDraftLine(supabase, session, rawInput);

  if (result.success && typeof rawInput === "object" && rawInput && "draftId" in rawInput) {
    revalidatePoDraftPaths(String((rawInput as { draftId: string }).draftId));
  }

  return result;
}

export async function approveDraftAction(rawInput: unknown) {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeApproveDraft(supabase, session, rawInput);

  if (result.success && typeof rawInput === "object" && rawInput && "draftId" in rawInput) {
    revalidatePoDraftPaths(String((rawInput as { draftId: string }).draftId));
  }

  return result;
}

export async function markDraftOrderedAction(rawInput: unknown) {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeMarkDraftOrdered(supabase, session, rawInput);

  if (result.success && typeof rawInput === "object" && rawInput && "draftId" in rawInput) {
    revalidatePoDraftPaths(String((rawInput as { draftId: string }).draftId));
  }

  return result;
}

export async function cancelDraftAction(rawInput: unknown) {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeCancelDraft(supabase, session, rawInput);

  if (result.success && typeof rawInput === "object" && rawInput && "draftId" in rawInput) {
    revalidatePoDraftPaths(String((rawInput as { draftId: string }).draftId));
  }

  return result;
}
