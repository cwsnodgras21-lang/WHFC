import type { SupabaseClient } from "@supabase/supabase-js";

import { ACTIVITY_EVENTS } from "@/lib/activity/events";
import { publishActivity } from "@/lib/activity/service";
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
  transferOutId: string | null;
  transferInId: string | null;
  transactionGroupId: string | null;
};

export type TransferInventorySuccess = {
  success: true;
  transferOutId: string | null;
  transferInId: string | null;
  transactionGroupId: string | null;
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
  const transferOutId =
    typeof record.transfer_out_id === "string" ? record.transfer_out_id : null;
  const transferInId =
    typeof record.transfer_in_id === "string" ? record.transfer_in_id : null;
  const transactionGroupId =
    typeof record.transaction_group_id === "string"
      ? record.transaction_group_id
      : null;

  // Legacy RPC returned out/in ids; lot-aware RPC returns transaction_group_id.
  if (transferOutId || transferInId || transactionGroupId) {
    return { transferOutId, transferInId, transactionGroupId };
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

  await publishActivity(supabase, {
    module: "inventory",
    eventType: ACTIVITY_EVENTS.inventory.transferred,
    entityType: "item",
    entityId: input.itemId,
    title: `Transferred ${formatQuantity(input.quantity)} units`,
    severity: "info",
    metadata: {
      from_location_id: input.fromLocationId,
      to_location_id: input.toLocationId,
      quantity: input.quantity,
      transaction_group_id: transferIds.transactionGroupId,
    },
  });

  return {
    success: true,
    transferOutId: transferIds.transferOutId,
    transferInId: transferIds.transferInId,
    transactionGroupId: transferIds.transactionGroupId,
    quantityTransferred: input.quantity,
    updatedOnHandAtSource,
    updatedOnHandAtDestination,
  };
}
