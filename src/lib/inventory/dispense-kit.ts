import type { SupabaseClient } from "@supabase/supabase-js";

import { canDispenseKit } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import {
  assertLocationNotLockedByPhysicalCount,
  LOCATION_COUNT_LOCK_MESSAGE,
  mapLocationPhysicalCountRpcError,
} from "@/lib/inventory/location-count-lock";
import type { Database } from "@/lib/types/database";
import {
  dispenseKitSchema,
  type DispenseKitInput,
} from "@/lib/validation/dispense-kit";

type Client = SupabaseClient<Database>;

export type DispenseKitSuccess = {
  success: true;
  dispenseEventId: string;
  transactionGroupId: string;
  idempotentReplay: boolean;
};

export type DispenseKitFailure = {
  success: false;
  error: string;
};

export type DispenseKitResult = DispenseKitSuccess | DispenseKitFailure;

function mapRpcError(message: string): string {
  const countLockMessage = mapLocationPhysicalCountRpcError(message);
  if (countLockMessage) {
    return countLockMessage;
  }
  if (message.includes("insufficient_privilege")) {
    return "You do not have permission to dispense kits.";
  }
  if (message.includes("profile_inactive")) {
    return "Your account is inactive.";
  }
  if (message.includes("procedure_kit_not_found")) {
    return "The selected procedure kit was not found.";
  }
  if (message.includes("procedure_kit_inactive")) {
    return "This procedure kit is inactive.";
  }
  if (message.includes("administered_amount_required")) {
    return "Enter the administered amount for variable components.";
  }
  if (message.includes("insufficient_stock_for_item:")) {
    const itemName = message.split("insufficient_stock_for_item:")[1]?.trim();
    return itemName
      ? `Insufficient stock for ${itemName} at this location.`
      : "Insufficient stock for one or more kit components.";
  }
  if (
    message.includes("negative_inventory_not_allowed") ||
    message.includes("negative_lot_inventory_not_allowed") ||
    message.includes("insufficient_lot_stock")
  ) {
    return "Insufficient stock at this location.";
  }
  if (message.includes("lot_expired_override_required")) {
    return "The stock available first has expired. Confirm using expired stock to continue.";
  }
  if (message.includes("location_not_found_or_inactive")) {
    return "The selected location is not available.";
  }
  return message;
}

export async function executeDispenseKit(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<DispenseKitResult> {
  if (!canDispenseKit(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to dispense kits.",
    };
  }

  const parsed = dispenseKitSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid form data.",
    };
  }

  return submitDispenseKit(supabase, parsed.data);
}

export async function submitDispenseKit(
  supabase: Client,
  input: DispenseKitInput
): Promise<DispenseKitResult> {
  const lockCheck = await assertLocationNotLockedByPhysicalCount(
    supabase,
    input.locationId
  );
  if (lockCheck.locked) {
    return { success: false, error: LOCATION_COUNT_LOCK_MESSAGE };
  }

  const administeredAmounts = input.administeredAmounts.map((entry) => ({
    component_id: entry.componentId,
    amount: entry.amount,
  }));

  const { data: result, error } = await supabase.rpc("dispense_kit", {
    p_procedure_kit_id: input.procedureKitId,
    p_location_id: input.locationId,
    p_administered_amounts: administeredAmounts,
    p_performed_at: input.performedAt.toISOString(),
    p_allow_expired: input.allowExpired ?? undefined,
    p_source: "manual",
  });

  if (error) {
    return { success: false, error: mapRpcError(error.message) };
  }

  if (!result || typeof result !== "object") {
    return { success: false, error: "Dispense did not return a result." };
  }

  const payload = result as {
    dispense_event_id?: string;
    transaction_group_id?: string;
    idempotent_replay?: boolean;
  };

  if (!payload.dispense_event_id || !payload.transaction_group_id) {
    return { success: false, error: "Dispense did not return an event id." };
  }

  return {
    success: true,
    dispenseEventId: payload.dispense_event_id,
    transactionGroupId: payload.transaction_group_id,
    idempotentReplay: payload.idempotent_replay ?? false,
  };
}
