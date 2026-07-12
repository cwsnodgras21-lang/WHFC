import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export function onHandKey(itemId: string, locationId: string): string {
  return `${itemId}:${locationId}`;
}

export async function fetchOnHandByLocation(
  supabase: Client
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("inventory_on_hand")
    .select("item_id, location_id, quantity_on_hand");

  if (error) {
    throw new Error(error.message);
  }

  const map: Record<string, number> = {};
  for (const row of data ?? []) {
    if (row.item_id && row.location_id) {
      map[onHandKey(row.item_id, row.location_id)] = Number(
        row.quantity_on_hand ?? 0
      );
    }
  }
  return map;
}

export async function fetchOnHandAtLocation(
  supabase: Client,
  itemId: string,
  locationId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("inventory_on_hand")
    .select("quantity_on_hand")
    .eq("item_id", itemId)
    .eq("location_id", locationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Number(data?.quantity_on_hand ?? 0);
}
