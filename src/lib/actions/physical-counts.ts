"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth/session";
import {
  executeCancelPhysicalCount,
  executeCompletePhysicalCount,
  executeSavePhysicalCountLines,
  executeStartPhysicalCount,
  type CancelPhysicalCountResult,
  type CompletePhysicalCountResult,
  type SavePhysicalCountLinesResult,
} from "@/lib/physical-counts/operations";
import { createClient } from "@/lib/supabase/server";

function revalidatePhysicalCountPaths() {
  revalidatePath("/physical-counts");
  revalidatePath("/dashboard");
  revalidatePath("/receive");
  revalidatePath("/consume");
  revalidatePath("/transfer");
  revalidatePath("/transactions");
}

export async function startPhysicalCountAction(
  rawInput: unknown
): Promise<{ success: false; error: string } | void> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeStartPhysicalCount(supabase, session, rawInput);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePhysicalCountPaths();
  redirect(`/physical-counts/${result.physicalCountId}`);
}

export async function savePhysicalCountLinesAction(
  rawInput: unknown
): Promise<SavePhysicalCountLinesResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeSavePhysicalCountLines(
    supabase,
    session,
    rawInput
  );

  if (result.success) {
    revalidatePhysicalCountPaths();
  }

  return result;
}

export async function completePhysicalCountAction(
  rawInput: unknown
): Promise<CompletePhysicalCountResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeCompletePhysicalCount(
    supabase,
    session,
    rawInput
  );

  if (result.success) {
    revalidatePhysicalCountPaths();
  }

  return result;
}

export async function cancelPhysicalCountAction(
  rawInput: unknown
): Promise<CancelPhysicalCountResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeCancelPhysicalCount(
    supabase,
    session,
    rawInput
  );

  if (result.success) {
    revalidatePhysicalCountPaths();
  }

  return result;
}
