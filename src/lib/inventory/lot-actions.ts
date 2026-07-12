import type { SupabaseClient } from "@supabase/supabase-js";

import { canConsumeInventory, canManageItems } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import {
  assertLocationNotLockedByPhysicalCount,
  LOCATION_COUNT_LOCK_MESSAGE,
  mapLocationPhysicalCountRpcError,
} from "@/lib/inventory/location-count-lock";
import {
  adjustLotSchema,
  disposeLotSchema,
} from "@/lib/validation/lot-actions";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type LotActionResult =
  | { success: true }
  | { success: false; error: string };

function mapRpcError(message: string): string {
  const countLockMessage = mapLocationPhysicalCountRpcError(message);
  if (countLockMessage) {
    return countLockMessage;
  }
  if (message.includes("insufficient_privilege")) {
    return "You do not have permission to perform this action.";
  }
  if (message.includes("profile_inactive")) {
    return "Your account is inactive.";
  }
  if (message.includes("lot_not_found")) {
    return "This lot is no longer available.";
  }
  if (message.includes("nothing_to_dispose")) {
    return "This lot has no stock left to dispose.";
  }
  if (
    message.includes("negative_lot_inventory_not_allowed") ||
    message.includes("negative_inventory_not_allowed")
  ) {
    return "That quantity is more than this lot has on hand.";
  }
  if (message.includes("invalid_disposal_reason")) {
    return "Select a valid disposal reason.";
  }
  return message;
}

async function lotLocationId(
  supabase: Client,
  lotId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("inventory_lots")
    .select("location_id")
    .eq("id", lotId)
    .maybeSingle();
  return data?.location_id ?? null;
}

export async function executeDisposeLot(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<LotActionResult> {
  if (!canConsumeInventory(session.profile.role, session.profile.active)) {
    return { success: false, error: "You do not have permission to dispose stock." };
  }

  const parsed = disposeLotSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid form data.",
    };
  }

  const locationId = await lotLocationId(supabase, parsed.data.lotId);
  if (locationId) {
    const lock = await assertLocationNotLockedByPhysicalCount(supabase, locationId);
    if (lock.locked) {
      return { success: false, error: LOCATION_COUNT_LOCK_MESSAGE };
    }
  }

  const { error } = await supabase.rpc("dispose_lot", {
    p_lot_id: parsed.data.lotId,
    p_quantity: parsed.data.quantity ?? undefined,
    p_reason_code: parsed.data.reasonCode,
  });

  if (error) {
    return { success: false, error: mapRpcError(error.message) };
  }

  return { success: true };
}

export async function executeAdjustLot(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<LotActionResult> {
  if (!canManageItems(session.profile.role, session.profile.active)) {
    return { success: false, error: "You do not have permission to adjust stock." };
  }

  const parsed = adjustLotSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid form data.",
    };
  }

  const locationId = await lotLocationId(supabase, parsed.data.lotId);
  if (locationId) {
    const lock = await assertLocationNotLockedByPhysicalCount(supabase, locationId);
    if (lock.locked) {
      return { success: false, error: LOCATION_COUNT_LOCK_MESSAGE };
    }
  }

  const { error } = await supabase.rpc("adjust_lot", {
    p_lot_id: parsed.data.lotId,
    p_quantity: parsed.data.quantity,
    p_increase: parsed.data.increase,
    p_reason_code: parsed.data.reasonCode,
  });

  if (error) {
    return { success: false, error: mapRpcError(error.message) };
  }

  return { success: true };
}
