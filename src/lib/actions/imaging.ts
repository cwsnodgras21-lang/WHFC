"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import {
  executeCreateImagingOrder,
  executeSetImagingAuthorization,
  executeSetImagingStatus,
  executeUpdateImagingOrder,
  type ImagingMutationResult,
} from "@/lib/imaging/mutations";
import { createClient } from "@/lib/supabase/server";

function revalidateImagingPaths() {
  revalidatePath("/imaging");
  revalidatePath("/dashboard");
}

export async function createImagingOrderAction(
  rawInput: unknown
): Promise<ImagingMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeCreateImagingOrder(supabase, session, rawInput);
  if (result.success) revalidateImagingPaths();
  return result;
}

export async function updateImagingOrderAction(
  rawInput: unknown
): Promise<ImagingMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeUpdateImagingOrder(supabase, session, rawInput);
  if (result.success) revalidateImagingPaths();
  return result;
}

export async function setImagingStatusAction(
  id: string,
  status: unknown
): Promise<ImagingMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeSetImagingStatus(supabase, session, {
    id,
    status,
  });
  if (result.success) revalidateImagingPaths();
  return result;
}

export async function setImagingAuthorizationAction(
  rawInput: unknown
): Promise<ImagingMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeSetImagingAuthorization(
    supabase,
    session,
    rawInput
  );
  if (result.success) revalidateImagingPaths();
  return result;
}
