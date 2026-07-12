"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import {
  executeCreateItem,
  executeSetItemActive,
  executeUpdateItem,
  type ItemMutationResult,
} from "@/lib/items/mutations";
import { createClient } from "@/lib/supabase/server";

async function revalidateItemPaths() {
  revalidatePath("/items");
  revalidatePath("/administration/categories");
  revalidatePath("/dashboard");
  revalidatePath("/receive");
  revalidatePath("/consume");
  revalidatePath("/reorder-report");
}

export async function createItemAction(
  rawInput: unknown
): Promise<ItemMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeCreateItem(supabase, session, rawInput);

  if (result.success) {
    await revalidateItemPaths();
  }

  return result;
}

export async function updateItemAction(
  rawInput: unknown
): Promise<ItemMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeUpdateItem(supabase, session, rawInput);

  if (result.success) {
    await revalidateItemPaths();
  }

  return result;
}

export async function setItemActiveAction(
  itemId: string,
  active: boolean
): Promise<ItemMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeSetItemActive(
    supabase,
    session,
    itemId,
    active
  );

  if (result.success) {
    await revalidateItemPaths();
  }

  return result;
}
