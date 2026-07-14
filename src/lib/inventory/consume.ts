import type { SupabaseClient } from "@supabase/supabase-js";

import { canConsumeInventory } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import { fetchOnHandAtLocation } from "@/lib/data/inventory";
import { publishInventoryConsumed } from "@/lib/activity/inventory";
import {
  assertLocationNotLockedByPhysicalCount,
  LOCATION_COUNT_LOCK_MESSAGE,
  mapLocationPhysicalCountRpcError,
} from "@/lib/inventory/location-count-lock";
import { formatQuantity } from "@/lib/format/inventory";
import {
  consumeInventorySchema,
  exceedsAvailableOnHand,
  type ConsumeInventoryInput,
} from "@/lib/validation/consume-inventory";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type ConsumeInventorySuccess = {
  success: true;
  transactionId: string;
  quantityConsumed: number;
  updatedOnHand: number;
};

export type ConsumeInventoryFailure = {
  success: false;
  error: string;
};

export type ConsumeInventoryResult =
  | ConsumeInventorySuccess
  | ConsumeInventoryFailure;

function mapRpcError(message: string): string {
  const countLockMessage = mapLocationPhysicalCountRpcError(message);
  if (countLockMessage) {
    return countLockMessage;
  }
  if (message.includes("insufficient_privilege")) {
    return "You do not have permission to consume inventory.";
  }
  if (message.includes("profile_inactive")) {
    return "Your account is inactive.";
  }
  if (
    message.includes("negative_inventory_not_allowed") ||
    message.includes("negative_lot_inventory_not_allowed") ||
    message.includes("insufficient_lot_stock")
  ) {
    return "Insufficient stock at this location.";
  }
  if (message.includes("lot_expired_override_required")) {
    return "The stock available first has expired. Confirm using expired stock, or choose a different lot.";
  }
  if (message.includes("lot_not_found")) {
    return "The selected lot is no longer available.";
  }
  if (message.includes("invalid_reason_for_transaction_type")) {
    return "The selected reason is not allowed for consuming stock.";
  }
  if (message.includes("quantity_must_be_positive")) {
    return "Quantity must be greater than zero.";
  }
  if (message.includes("item_not_found_or_inactive")) {
    return "The selected item is not available.";
  }
  if (message.includes("location_not_found_or_inactive")) {
    return "The selected location is not available.";
  }
  return message;
}

export async function executeConsumeInventory(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<ConsumeInventoryResult> {
  if (!canConsumeInventory(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to consume inventory.",
    };
  }

  const parsed = consumeInventorySchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid form data.",
    };
  }

  return submitConsumeInventory(supabase, parsed.data);
}

export async function submitConsumeInventory(
  supabase: Client,
  input: ConsumeInventoryInput
): Promise<ConsumeInventoryResult> {
  const lockCheck = await assertLocationNotLockedByPhysicalCount(
    supabase,
    input.locationId
  );
  if (lockCheck.locked) {
    return { success: false, error: LOCATION_COUNT_LOCK_MESSAGE };
  }

  // Pre-check against total location on hand only when consuming across lots
  // (FEFO). A manually chosen lot is bounded by that lot, enforced by the RPC.
  if (!input.lotId) {
    const onHand = await fetchOnHandAtLocation(
      supabase,
      input.itemId,
      input.locationId
    );

    if (exceedsAvailableOnHand(input.quantity, onHand)) {
      return {
        success: false,
        error: `Insufficient stock. Only ${formatQuantity(onHand)} available at this location.`,
      };
    }
  }

  const { data: result, error } = await supabase.rpc("consume_inventory", {
    p_item_id: input.itemId,
    p_location_id: input.locationId,
    p_quantity: input.quantity,
    p_reason_code: input.reasonCode,
    p_transaction_date: input.transactionDate.toISOString(),
    p_lot_id: input.lotId ? input.lotId : undefined,
    p_allow_expired: input.allowExpired ?? undefined,
  });

  if (error) {
    return { success: false, error: mapRpcError(error.message) };
  }

  const transactionId =
    result && typeof result === "object" && "transaction_group_id" in result
      ? (result as { transaction_group_id: string }).transaction_group_id
      : null;

  if (!transactionId) {
    return {
      success: false,
      error: "Consume transaction did not return an id.",
    };
  }

  const updatedOnHand = await fetchOnHandAtLocation(
    supabase,
    input.itemId,
    input.locationId
  );

  await publishInventoryConsumed(supabase, {
    itemId: input.itemId,
    quantity: input.quantity,
    locationId: input.locationId,
  });

  return {
    success: true,
    transactionId,
    quantityConsumed: input.quantity,
    updatedOnHand,
  };
}
