"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import {
  executeSaveSampleProduct,
  executeDeactivateSampleProduct,
  executeReceiveSample,
  executeDispenseSample,
  type SampleMutationResult,
} from "@/lib/samples/mutations";
import { createClient } from "@/lib/supabase/server";

function revalidateSamplePaths() {
  revalidatePath("/samples");
  revalidatePath("/samples/receive");
  revalidatePath("/samples/dispense");
  revalidatePath("/samples/history");
  revalidatePath("/samples/products");
  revalidatePath("/dashboard");
}

export async function saveSampleProductAction(
  rawInput: unknown
): Promise<SampleMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeSaveSampleProduct(supabase, session, rawInput);
  if (result.success) revalidateSamplePaths();
  return result;
}

export async function deactivateSampleProductAction(
  sampleProductId: string
): Promise<SampleMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeDeactivateSampleProduct(
    supabase,
    session,
    sampleProductId
  );
  if (result.success) revalidateSamplePaths();
  return result;
}

export async function receiveSampleAction(
  rawInput: unknown
): Promise<SampleMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeReceiveSample(supabase, session, rawInput);
  if (result.success) revalidateSamplePaths();
  return result;
}

export async function dispenseSampleAction(
  rawInput: unknown
): Promise<SampleMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeDispenseSample(supabase, session, rawInput);
  if (result.success) revalidateSamplePaths();
  return result;
}
