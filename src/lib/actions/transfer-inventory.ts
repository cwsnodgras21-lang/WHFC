"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import {
  executeTransferInventory,
  type TransferInventoryResult,
} from "@/lib/inventory/transfer";
import { createClient } from "@/lib/supabase/server";

export async function transferInventoryAction(
  rawInput: unknown
): Promise<TransferInventoryResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeTransferInventory(supabase, session, rawInput);

  if (result.success) {
    revalidatePath("/transfer");
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
  }

  return result;
}
