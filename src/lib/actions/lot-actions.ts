"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import {
  executeAdjustLot,
  executeDisposeLot,
  type LotActionResult,
} from "@/lib/inventory/lot-actions";
import { createClient } from "@/lib/supabase/server";

function revalidateLotViews() {
  revalidatePath("/expiration");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}

export async function disposeLotAction(
  rawInput: unknown
): Promise<LotActionResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeDisposeLot(supabase, session, rawInput);
  if (result.success) {
    revalidateLotViews();
  }
  return result;
}

export async function adjustLotAction(
  rawInput: unknown
): Promise<LotActionResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeAdjustLot(supabase, session, rawInput);
  if (result.success) {
    revalidateLotViews();
  }
  return result;
}
