"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import {
  executeReceiveInventory,
  type ReceiveInventoryResult,
} from "@/lib/inventory/receive";
import { createClient } from "@/lib/supabase/server";

export async function receiveInventoryAction(
  rawInput: unknown
): Promise<ReceiveInventoryResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeReceiveInventory(supabase, session, rawInput);

  if (result.success) {
    revalidatePath("/receive");
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
  }

  return result;
}
