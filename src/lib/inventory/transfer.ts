import type { SupabaseClient } from "@supabase/supabase-js";

import { canTransferInventory } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import { fetchOnHandAtLocation } from "@/lib/data/inventory";
import {
  assertLocationNotLockedByPhysicalCount,
  LOCATION_COUNT_LOCK_MESSAGE,
  mapLocationPhysicalCountRpcError,
} from "@/lib/inventory/location-count-lock";
import { formatQuantity } from "@/lib/format/inventory";
import type { Database } from "@/lib/types/database";
import {
  exceedsAvailableOnHand,
  transferInventorySchema,
  type TransferInventoryInput,
} from "@/lib/validation/transfer-inventory";

type Client = SupabaseClient<Database>;

type TransferRpcPayload = {
  transfer_out_id: string;
  transfer_in_id: string;
};

export type TransferInventorySuccess = {
  success: true;
  transferOutId: string;
  transferInId: string;
  quantityTransferred: number;
  updatedOnHandAtSource: number;
  updatedOnHandAtDestination: number;
};

export type TransferInventoryFailure = {
  success: false;
  error: string;
};

export type TransferInventoryResult =
  | TransferInventorySuccess
  | TransferInventoryFailure;

function parseTransferRpcResult(data: unknown): TransferRpcPayload | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;
  if (
    typeof record.transfer_out_id === "string" &&
    typeof record.transfer_in_id === "string"
  ) {
    return {
      transfer_out_id: record.transfer_out_id,
      transfer_in_id: record.transfer_in_id,
    };
  }

  return null;
}

function mapRpcError(message: string): string {
  const countLockMessage = mapLocationPhysicalCountRpcError(message);
  if (countLockMessage) {
    return countLockMessage;
  }
  if (message.includes("insufficient_privilege")) {
    return "You do not have permission to transfer inventory.";
  }
  if (message.includes("profile_inactive")) {
    return "Your account is inactive.";
  }
  if (
    message.includes("negative_inventory_not_allowed") ||
    message.includes("negative_inventory")
  ) {
    return "Insufficient stock at the source location.";
  }
  if (message.includes("transfer_requires_distinct_locations")) {
    return "Source and destination must be different locations.";
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

export async function executeTransferInventory(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<TransferInventoryResult> {
  if (!canTransferInventory(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to transfer inventory.",
    };
  }

  const parsed = transferInventorySchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid form data.",
    };
  }

  return submitTransferInventory(supabase, parsed.data);
}

export async function submitTransferInventory(
  supabase: Client,
  input: TransferInventoryInput
): Promise<TransferInventoryResult> {
  const [fromLock, toLock] = await Promise.all([
    assertLocationNotLockedByPhysicalCount(supabase, input.fromLocationId),
    assertLocationNotLockedByPhysicalCount(supabase, input.toLocationId),
  ]);

  if (fromLock.locked || toLock.locked) {
    return { success: false, error: LOCATION_COUNT_LOCK_MESSAGE };
  }

  const onHandAtSource = await fetchOnHandAtLocation(
    supabase,
    input.itemId,
    input.fromLocationId
  );

  if (exceedsAvailableOnHand(input.quantity, onHandAtSource)) {
    return {
      success: false,
      error: `Insufficient stock. Only ${formatQuantity(onHandAtSource)} available at the source location.`,
    };
  }

  const { data, error } = await supabase.rpc("transfer_inventory", {
    p_item_id: input.itemId,
    p_from_location_id: input.fromLocationId,
    p_to_location_id: input.toLocationId,
    p_quantity: input.quantity,
    p_transaction_date: input.transactionDate.toISOString(),
  });

  if (error) {
    return { success: false, error: mapRpcError(error.message) };
  }

  const transferIds = parseTransferRpcResult(data);
  if (!transferIds) {
    return {
      success: false,
      error: "Transfer did not return transaction ids.",
    };
  }

  const [updatedOnHandAtSource, updatedOnHandAtDestination] = await Promise.all(
    [
      fetchOnHandAtLocation(supabase, input.itemId, input.fromLocationId),
      fetchOnHandAtLocation(supabase, input.itemId, input.toLocationId),
    ]
  );

  return {
    success: true,
    transferOutId: transferIds.transfer_out_id,
    transferInId: transferIds.transfer_in_id,
    quantityTransferred: input.quantity,
    updatedOnHandAtSource,
    updatedOnHandAtDestination,
  };
}
