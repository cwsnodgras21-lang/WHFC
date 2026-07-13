"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import {
  executeRemoveItemVendor,
  executeSaveItemVendor,
  executeSetPreferredItemVendor,
  type ItemVendorMutationResult,
} from "@/lib/item-vendors/mutations";
import { createClient } from "@/lib/supabase/server";

function revalidateSourcing(itemId: string) {
  revalidatePath(`/items/${itemId}/sourcing`);
  revalidatePath("/items");
  revalidatePath("/reorder-suggestions");
  revalidatePath("/purchase-order-drafts");
}

export async function saveItemVendorAction(
  rawInput: unknown
): Promise<ItemVendorMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeSaveItemVendor(supabase, session, rawInput);
  if (
    result.success &&
    rawInput &&
    typeof rawInput === "object" &&
    "itemId" in rawInput
  ) {
    revalidateSourcing(String((rawInput as { itemId: unknown }).itemId));
  }
  return result;
}

export async function setPreferredItemVendorAction(
  itemId: string,
  id: string
): Promise<ItemVendorMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeSetPreferredItemVendor(supabase, session, {
    id,
    itemId,
  });
  if (result.success) revalidateSourcing(itemId);
  return result;
}

export async function removeItemVendorAction(
  itemId: string,
  id: string
): Promise<ItemVendorMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeRemoveItemVendor(supabase, session, {
    id,
    itemId,
  });
  if (result.success) revalidateSourcing(itemId);
  return result;
}
