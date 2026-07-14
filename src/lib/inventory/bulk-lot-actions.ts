import type { SupabaseClient } from "@supabase/supabase-js";

import { canConsumeInventory, canTransferInventory } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import { ACTIVITY_EVENTS } from "@/lib/activity/events";
import { publishActivity } from "@/lib/activity/service";
import {
  summarizeBulkResult,
  type BulkResultSummary,
} from "@/lib/expiration/selection";
import { executeDisposeLot } from "@/lib/inventory/lot-actions";
import { executeTransferInventory } from "@/lib/inventory/transfer";
import type { Database } from "@/lib/types/database";
import {
  bulkDisposeLotsSchema,
  bulkTransferLotsSchema,
  markLotsReviewedSchema,
} from "@/lib/validation/bulk-lot-actions";

type Client = SupabaseClient<Database>;

export type BulkLotActionSuccess = BulkResultSummary & {
  success: true;
  message: string;
};

export type BulkLotActionFailure = {
  success: false;
  error: string;
};

export type BulkLotActionResult = BulkLotActionSuccess | BulkLotActionFailure;

type LotTransferTarget = {
  lotId: string;
  itemId: string;
  itemName: string;
  locationId: string;
  quantityOnHand: number;
};

async function loadLotsForTransfer(
  supabase: Client,
  lotIds: string[]
): Promise<{ lots: LotTransferTarget[]; error: string | null }> {
  const { data, error } = await supabase
    .from("inventory_lot_stock")
    .select("lot_id, item_id, item_name, location_id, quantity_on_hand")
    .in("lot_id", lotIds);

  if (error) {
    return { lots: [], error: error.message };
  }

  const byId = new Map(
    (data ?? [])
      .filter(
        (row): row is typeof row & { lot_id: string; item_id: string; location_id: string } =>
          Boolean(row.lot_id && row.item_id && row.location_id)
      )
      .map((row) => [
        row.lot_id,
        {
          lotId: row.lot_id,
          itemId: row.item_id,
          itemName: row.item_name ?? "stock",
          locationId: row.location_id,
          quantityOnHand: Number(row.quantity_on_hand ?? 0),
        } satisfies LotTransferTarget,
      ])
  );

  const lots: LotTransferTarget[] = [];
  for (const lotId of lotIds) {
    const lot = byId.get(lotId);
    if (!lot) {
      return {
        lots: [],
        error: "One or more selected lots are no longer available.",
      };
    }
    lots.push(lot);
  }

  return { lots, error: null };
}

async function loadLotNames(
  supabase: Client,
  lotIds: string[]
): Promise<Map<string, string>> {
  const { data } = await supabase
    .from("inventory_lot_stock")
    .select("lot_id, item_name")
    .in("lot_id", lotIds);

  return new Map(
    (data ?? [])
      .filter((row): row is typeof row & { lot_id: string } => Boolean(row.lot_id))
      .map((row) => [row.lot_id, row.item_name ?? "stock"])
  );
}

/**
 * Disposes each selected lot in full with reason `expired_disposal`,
 * reusing the single-lot dispose path (RPC + activity publish).
 */
export async function executeBulkDisposeLots(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<BulkLotActionResult> {
  if (!canConsumeInventory(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to dispose stock.",
    };
  }

  const parsed = bulkDisposeLotsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid selection.",
    };
  }

  const summary: BulkResultSummary = { succeeded: 0, failed: 0, errors: [] };

  for (const lotId of parsed.data.lotIds) {
    const result = await executeDisposeLot(supabase, session, {
      lotId,
      reasonCode: "expired_disposal",
    });
    if (result.success) {
      summary.succeeded += 1;
    } else {
      summary.failed += 1;
      summary.errors.push({ lotId, error: result.error });
    }
  }

  return {
    success: true,
    ...summary,
    message: summarizeBulkResult(summary),
  };
}

/**
 * Activity-only acknowledgement that selected lots were reviewed.
 * Does not change inventory state.
 */
export async function executeMarkLotsReviewed(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<BulkLotActionResult> {
  if (!canConsumeInventory(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to mark lots reviewed.",
    };
  }

  const parsed = markLotsReviewedSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid selection.",
    };
  }

  const names = await loadLotNames(supabase, parsed.data.lotIds);
  const summary: BulkResultSummary = { succeeded: 0, failed: 0, errors: [] };

  for (const lotId of parsed.data.lotIds) {
    try {
      await publishActivity(supabase, {
        module: "expiration",
        eventType: ACTIVITY_EVENTS.expiration.reviewed,
        entityType: "inventory_lot",
        entityId: lotId,
        title: `Reviewed ${names.get(lotId) ?? "lot"}`,
        severity: "info",
      });
      summary.succeeded += 1;
    } catch {
      summary.failed += 1;
      summary.errors.push({
        lotId,
        error: "Could not record the review.",
      });
    }
  }

  return {
    success: true,
    ...summary,
    message:
      summary.failed === 0
        ? summary.succeeded === 1
          ? "Marked 1 lot as reviewed."
          : `Marked ${summary.succeeded} lots as reviewed.`
        : summarizeBulkResult(summary),
  };
}

/**
 * Transfers each selected lot's on-hand quantity from its current location
 * to `toLocationId` via the existing `transfer_inventory` RPC (FEFO at source).
 *
 * Semantics: for dated lot inventory, the RPC pulls earliest-expiring stock
 * first at that location. When the selected lot is the earliest on hand for
 * that item/location (typical from the expiration center), the move matches
 * the selected lot. Mixed selections at the same location are processed in
 * expiration/selection order so FEFO stays aligned with the UI.
 */
export async function executeBulkTransferLots(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<BulkLotActionResult> {
  if (!canTransferInventory(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to transfer inventory.",
    };
  }

  const parsed = bulkTransferLotsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid selection.",
    };
  }

  const loaded = await loadLotsForTransfer(supabase, parsed.data.lotIds);
  if (loaded.error) {
    return { success: false, error: loaded.error };
  }

  const summary: BulkResultSummary = { succeeded: 0, failed: 0, errors: [] };
  const now = new Date();

  for (const lot of loaded.lots) {
    if (lot.locationId === parsed.data.toLocationId) {
      summary.failed += 1;
      summary.errors.push({
        lotId: lot.lotId,
        error: "Already at the destination location.",
      });
      continue;
    }
    if (lot.quantityOnHand <= 0) {
      summary.failed += 1;
      summary.errors.push({
        lotId: lot.lotId,
        error: "This lot has no stock left to transfer.",
      });
      continue;
    }

    const result = await executeTransferInventory(supabase, session, {
      itemId: lot.itemId,
      fromLocationId: lot.locationId,
      toLocationId: parsed.data.toLocationId,
      quantity: lot.quantityOnHand,
      transactionDate: now,
    });

    if (result.success) {
      summary.succeeded += 1;
    } else {
      summary.failed += 1;
      summary.errors.push({ lotId: lot.lotId, error: result.error });
    }
  }

  return {
    success: true,
    ...summary,
    message: summarizeBulkResult(summary),
  };
}
