import type { SupabaseClient } from "@supabase/supabase-js";

import { canManageItems } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import {
  createItemSchema,
  updateItemSchema,
  type CreateItemInput,
  type UpdateItemInput,
} from "@/lib/validation/item";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type ItemMutationSuccess = {
  success: true;
  itemId: string;
};

export type ItemMutationFailure = {
  success: false;
  error: string;
};

export type ItemMutationResult = ItemMutationSuccess | ItemMutationFailure;

function mapDbError(message: string): string {
  if (
    message.includes("duplicate key") ||
    message.includes("items_internal_sku_unique") ||
    message.includes("23505")
  ) {
    return "An item with this internal SKU already exists.";
  }
  if (message.includes("permission denied") || message.includes("42501")) {
    return "You do not have permission to manage items.";
  }
  return message;
}

async function itemHasTransactions(
  supabase: Client,
  itemId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from("inventory_transactions")
    .select("id", { count: "exact", head: true })
    .eq("item_id", itemId);

  if (error) {
    throw new Error(error.message);
  }

  return (count ?? 0) > 0;
}

export async function executeCreateItem(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<ItemMutationResult> {
  if (!canManageItems(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage items.",
    };
  }

  const parsed = createItemSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid form data.",
    };
  }

  return insertItem(supabase, parsed.data);
}

export async function executeUpdateItem(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<ItemMutationResult> {
  if (!canManageItems(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage items.",
    };
  }

  const parsed = updateItemSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid form data.",
    };
  }

  return updateItemRecord(supabase, parsed.data);
}

export async function executeSetItemActive(
  supabase: Client,
  session: AppSession,
  itemId: string,
  active: boolean
): Promise<ItemMutationResult> {
  if (!canManageItems(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage items.",
    };
  }

  const idParsed = updateItemSchema.shape.id.safeParse(itemId);
  if (!idParsed.success) {
    return { success: false, error: "Invalid item." };
  }

  const { data, error } = await supabase
    .from("items")
    .update({ active })
    .eq("id", idParsed.data)
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, error: mapDbError(error.message) };
  }

  if (!data) {
    return { success: false, error: "Item not found." };
  }

  return { success: true, itemId: data.id };
}

export async function insertItem(
  supabase: Client,
  input: CreateItemInput
): Promise<ItemMutationResult> {
  const { data, error } = await supabase
    .from("items")
    .insert({
      item_name: input.itemName,
      internal_sku: input.internalSku,
      category_id: input.categoryId,
      unit_of_measure_id: input.unitOfMeasureId,
      preferred_vendor_id: input.preferredVendorId,
      reorder_point: input.reorderPoint,
      par_level: input.parLevel,
      active: input.active,
      track_expiration: input.trackExpiration,
      track_lot_number: input.trackLotNumber,
      expiration_warning_days: input.expirationWarningDays,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: mapDbError(error.message) };
  }

  return { success: true, itemId: data.id };
}

export async function updateItemRecord(
  supabase: Client,
  input: UpdateItemInput
): Promise<ItemMutationResult> {
  const { data: existing, error: existingError } = await supabase
    .from("items")
    .select("id, unit_of_measure_id")
    .eq("id", input.id)
    .maybeSingle();

  if (existingError) {
    return { success: false, error: mapDbError(existingError.message) };
  }

  if (!existing) {
    return { success: false, error: "Item not found." };
  }

  if (
    existing.unit_of_measure_id !== input.unitOfMeasureId &&
    (await itemHasTransactions(supabase, input.id))
  ) {
    return {
      success: false,
      error:
        "Stocking unit cannot be changed after inventory transactions exist for this item.",
    };
  }

  const { data, error } = await supabase
    .from("items")
    .update({
      item_name: input.itemName,
      internal_sku: input.internalSku,
      category_id: input.categoryId,
      unit_of_measure_id: input.unitOfMeasureId,
      preferred_vendor_id: input.preferredVendorId,
      reorder_point: input.reorderPoint,
      par_level: input.parLevel,
      active: input.active,
      track_expiration: input.trackExpiration,
      track_lot_number: input.trackLotNumber,
      expiration_warning_days: input.expirationWarningDays,
    })
    .eq("id", input.id)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: mapDbError(error.message) };
  }

  return { success: true, itemId: data.id };
}
