"use server";

import { revalidatePath } from "next/cache";

import {
  executeCreatePoDraft,
  executeDismissSuggestion,
  executeReviewSuggestion,
} from "@/lib/reorder-suggestions/operations";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function dismissSuggestionAction(rawInput: unknown) {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeDismissSuggestion(supabase, session, rawInput);

  if (result.success) {
    revalidatePath("/reorder-suggestions");
    revalidatePath("/dashboard");
  }

  return result;
}

export async function reviewSuggestionAction(rawInput: unknown) {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeReviewSuggestion(supabase, session, rawInput);

  if (result.success) {
    revalidatePath("/reorder-suggestions");
    revalidatePath("/dashboard");
  }

  return result;
}

export async function createPoDraftAction(rawInput: unknown) {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeCreatePoDraft(supabase, session, rawInput);

  if (result.success) {
    revalidatePath("/reorder-suggestions");
    revalidatePath("/purchase-order-drafts");
    revalidatePath("/dashboard");
  }

  return result;
}
