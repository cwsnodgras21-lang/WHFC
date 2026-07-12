import type { SupabaseClient } from "@supabase/supabase-js";

import { canReceiveInventory } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import { fetchOnHandAtLocation } from "@/lib/data/inventory";
import {
  assertLocationNotLockedByPhysicalCount,
  LOCATION_COUNT_LOCK_MESSAGE,
  mapLocationPhysicalCountRpcError,
} from "@/lib/inventory/location-count-lock";
import {
  receiveInventorySchema,
  type ReceiveInventoryInput,
} from "@/lib/validation/receive-inventory";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type ReceiveInventorySuccess = {
  success: true;
  transactionId: string;
  quantityReceived: number;
  updatedOnHand: number;
};

export type ReceiveInventoryFailure = {
  success: false;
  error: string;
};

export type ReceiveInventoryResult =
  | ReceiveInventorySuccess
  | ReceiveInventoryFailure;

function mapRpcError(message: string): string {
  const countLockMessage = mapLocationPhysicalCountRpcError(message);
  if (countLockMessage) {
    return countLockMessage;
  }
  if (message.includes("insufficient_privilege")) {
    return "You do not have permission to receive inventory.";
  }
  if (message.includes("profile_inactive")) {
    return "Your account is inactive.";
  }
  if (message.includes("invalid_reason_for_transaction_type")) {
    return "The selected reason is not allowed for receiving stock.";
  }
  if (message.includes("expiration_date_required")) {
    return "This item is tracked by expiration date. Enter an expiration date.";
  }
  if (message.includes("lot_number_required")) {
    return "This item is tracked by lot number. Enter a lot number.";
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

export async function executeReceiveInventory(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<ReceiveInventoryResult> {
  if (!canReceiveInventory(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to receive inventory.",
    };
  }

  const parsed = receiveInventorySchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid form data.",
    };
  }

  return submitReceiveInventory(supabase, parsed.data);
}

export async function submitReceiveInventory(
  supabase: Client,
  input: ReceiveInventoryInput
): Promise<ReceiveInventoryResult> {
  const lockCheck = await assertLocationNotLockedByPhysicalCount(
    supabase,
    input.locationId
  );
  if (lockCheck.locked) {
    return { success: false, error: LOCATION_COUNT_LOCK_MESSAGE };
  }

  const { data: transactionId, error } = await supabase.rpc(
    "receive_inventory",
    {
      p_item_id: input.itemId,
      p_location_id: input.locationId,
      p_quantity: input.quantity,
      p_reason_code: input.reasonCode,
      p_transaction_date: input.transactionDate.toISOString(),
      p_lot_number: input.lotNumber?.trim() ? input.lotNumber.trim() : undefined,
      p_expiration_date: input.expirationDate ? input.expirationDate : undefined,
      p_vendor_id: input.vendorId ? input.vendorId : undefined,
    }
  );

  if (error) {
    return { success: false, error: mapRpcError(error.message) };
  }

  if (!transactionId) {
    return { success: false, error: "Receive transaction did not return an id." };
  }

  const updatedOnHand = await fetchOnHandAtLocation(
    supabase,
    input.itemId,
    input.locationId
  );

  return {
    success: true,
    transactionId,
    quantityReceived: input.quantity,
    updatedOnHand,
  };
}
