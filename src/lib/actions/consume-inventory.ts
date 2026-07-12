"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import {
  executeConsumeInventory,
  type ConsumeInventoryResult,
} from "@/lib/inventory/consume";
import { createClient } from "@/lib/supabase/server";

export async function consumeInventoryAction(
  rawInput: unknown
): Promise<ConsumeInventoryResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeConsumeInventory(supabase, session, rawInput);

  if (result.success) {
    revalidatePath("/consume");
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
  }

  return result;
}
