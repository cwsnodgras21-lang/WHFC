import type { SupabaseClient } from "@supabase/supabase-js";

import { canManageItems } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import { ACTIVITY_EVENTS } from "@/lib/activity/events";
import { publishActivity } from "@/lib/activity/service";
import {
  removeItemVendorSchema,
  saveItemVendorSchema,
  setPreferredItemVendorSchema,
} from "@/lib/validation/item-vendor";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type ItemVendorMutationResult =
  | { success: true }
  | { success: false; error: string };

const PERMISSION_ERROR =
  "You do not have permission to manage item sourcing.";

function ensurePermission(session: AppSession): string | null {
  return canManageItems(session.profile.role, session.profile.active)
    ? null
    : PERMISSION_ERROR;
}

function mapError(message: string): string {
  if (message.includes("item_vendors_unique_pair") || message.includes("23505")) {
    return "That vendor is already a source for this item.";
  }
  if (message.includes("permission denied") || message.includes("42501")) {
    return PERMISSION_ERROR;
  }
  return message;
}

async function publishPreferredChanged(
  supabase: Client,
  itemId: string,
  vendorId: string
): Promise<void> {
  const [item, vendor] = await Promise.all([
    supabase.from("items").select("item_name").eq("id", itemId).maybeSingle(),
    supabase.from("vendors").select("name").eq("id", vendorId).maybeSingle(),
  ]);
  await publishActivity(supabase, {
    module: "vendors",
    eventType: ACTIVITY_EVENTS.vendors.preferredChanged,
    entityType: "item",
    entityId: itemId,
    title: `Preferred vendor set to ${vendor.data?.name ?? "a vendor"}`,
    description: item.data?.item_name
      ? `For ${item.data.item_name}`
      : null,
    severity: "info",
  });
}

export async function executeSaveItemVendor(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<ItemVendorMutationResult> {
  const denied = ensurePermission(session);
  if (denied) return { success: false, error: denied };

  const parsed = saveItemVendorSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid form data.",
    };
  }

  const input = parsed.data;
  const row = {
    item_id: input.itemId,
    vendor_id: input.vendorId,
    is_preferred: input.isPreferred,
    vendor_sku: input.vendorSku,
    manufacturer: input.manufacturer,
    manufacturer_part_number: input.manufacturerPartNumber,
    pack_size: input.packSize,
    typical_order_quantity: input.typicalOrderQuantity,
    lead_time_days: input.leadTimeDays,
    typical_cost: input.typicalCost,
    last_order_date: input.lastOrderDate,
    ordering_notes: input.orderingNotes,
    ordering_url: input.orderingUrl,
  };

  const { error } = input.id
    ? await supabase.from("item_vendors").update(row).eq("id", input.id)
    : await supabase.from("item_vendors").insert(row);

  if (error) {
    return { success: false, error: mapError(error.message) };
  }

  if (input.isPreferred) {
    await publishPreferredChanged(supabase, input.itemId, input.vendorId);
  }

  return { success: true };
}

export async function executeSetPreferredItemVendor(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<ItemVendorMutationResult> {
  const denied = ensurePermission(session);
  if (denied) return { success: false, error: denied };

  const parsed = setPreferredItemVendorSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: "Invalid vendor source." };
  }

  const { data, error } = await supabase
    .from("item_vendors")
    .update({ is_preferred: true })
    .eq("id", parsed.data.id)
    .eq("item_id", parsed.data.itemId)
    .select("vendor_id")
    .maybeSingle();

  if (error) {
    return { success: false, error: mapError(error.message) };
  }
  if (!data) {
    return { success: false, error: "That vendor source no longer exists." };
  }

  await publishPreferredChanged(supabase, parsed.data.itemId, data.vendor_id);
  return { success: true };
}

export async function executeRemoveItemVendor(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<ItemVendorMutationResult> {
  const denied = ensurePermission(session);
  if (denied) return { success: false, error: denied };

  const parsed = removeItemVendorSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: "Invalid vendor source." };
  }

  const { error } = await supabase
    .from("item_vendors")
    .delete()
    .eq("id", parsed.data.id)
    .eq("item_id", parsed.data.itemId);

  if (error) {
    return { success: false, error: mapError(error.message) };
  }

  return { success: true };
}
