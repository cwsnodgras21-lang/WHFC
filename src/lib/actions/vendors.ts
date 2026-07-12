"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import {
  executeCreateVendor,
  executeQuickCreateVendor,
  executeSetVendorActive,
  executeUpdateVendor,
  type VendorMutationResult,
} from "@/lib/vendors/mutations";
import { createClient } from "@/lib/supabase/server";

function revalidateVendorPaths() {
  revalidatePath("/administration/vendors");
  revalidatePath("/items");
}

export async function createVendorAction(
  rawInput: unknown
): Promise<VendorMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeCreateVendor(supabase, session, rawInput);

  if (result.success) {
    revalidateVendorPaths();
  }

  return result;
}

export async function quickCreateVendorAction(
  rawInput: unknown
): Promise<VendorMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeQuickCreateVendor(supabase, session, rawInput);

  if (result.success) {
    revalidateVendorPaths();
  }

  return result;
}

export async function updateVendorAction(
  rawInput: unknown
): Promise<VendorMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeUpdateVendor(supabase, session, rawInput);

  if (result.success) {
    revalidateVendorPaths();
  }

  return result;
}

export async function setVendorActiveAction(
  vendorId: string,
  active: boolean
): Promise<VendorMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeSetVendorActive(
    supabase,
    session,
    vendorId,
    active
  );

  if (result.success) {
    revalidateVendorPaths();
  }

  return result;
}
