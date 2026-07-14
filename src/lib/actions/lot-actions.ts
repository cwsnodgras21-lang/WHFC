"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import {
  executeBulkDisposeLots,
  executeBulkTransferLots,
  executeMarkLotsReviewed,
  type BulkLotActionResult,
} from "@/lib/inventory/bulk-lot-actions";
import {
  executeAdjustLot,
  executeDisposeLot,
  type LotActionResult,
} from "@/lib/inventory/lot-actions";
import { createClient } from "@/lib/supabase/server";

function revalidateLotViews() {
  revalidatePath("/expiration");
  revalidatePath("/expiration/history");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/transfer");
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

export async function bulkDisposeLotsAction(
  lotIds: string[]
): Promise<BulkLotActionResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeBulkDisposeLots(supabase, session, { lotIds });
  if (result.success && result.succeeded > 0) {
    revalidateLotViews();
  }
  return result;
}

export async function markLotsReviewedAction(
  lotIds: string[]
): Promise<BulkLotActionResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeMarkLotsReviewed(supabase, session, { lotIds });
  if (result.success && result.succeeded > 0) {
    revalidateLotViews();
  }
  return result;
}

export async function bulkTransferLotsAction(
  lotIds: string[],
  toLocationId: string
): Promise<BulkLotActionResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeBulkTransferLots(supabase, session, {
    lotIds,
    toLocationId,
  });
  if (result.success && result.succeeded > 0) {
    revalidateLotViews();
  }
  return result;
}
