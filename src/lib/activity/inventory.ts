import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";
import { ACTIVITY_EVENTS } from "@/lib/activity/events";
import { publishActivity } from "@/lib/activity/service";

type Client = SupabaseClient<Database>;

async function lookupName(
  supabase: Client,
  table: "items" | "locations",
  column: "item_name" | "location_name",
  id: string
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from(table)
      .select(column)
      .eq("id", id)
      .maybeSingle();
    return (data as Record<string, string> | null)?.[column] ?? null;
  } catch {
    return null;
  }
}

type MovementInput = {
  itemId: string;
  quantity: number;
  locationId?: string | null;
};

/**
 * Publishes an inventory movement to the platform activity feed. Names are
 * looked up so the feed reads in plain language ("Received 24 gloves into
 * Front Desk"). Fire-and-forget: failures never affect the ledger write.
 */
export async function publishInventoryReceived(
  supabase: Client,
  input: MovementInput
): Promise<void> {
  const [itemName, locationName] = await Promise.all([
    lookupName(supabase, "items", "item_name", input.itemId),
    input.locationId
      ? lookupName(supabase, "locations", "location_name", input.locationId)
      : Promise.resolve(null),
  ]);

  await publishActivity(supabase, {
    module: "inventory",
    eventType: ACTIVITY_EVENTS.inventory.received,
    entityType: "item",
    entityId: input.itemId,
    title: `Received ${formatQty(input.quantity)} ${itemName ?? "stock"}`,
    description: locationName ? `Into ${locationName}` : null,
    severity: "success",
    metadata: { quantity: input.quantity, locationId: input.locationId ?? null },
  });
}

export async function publishInventoryConsumed(
  supabase: Client,
  input: MovementInput
): Promise<void> {
  const [itemName, locationName] = await Promise.all([
    lookupName(supabase, "items", "item_name", input.itemId),
    input.locationId
      ? lookupName(supabase, "locations", "location_name", input.locationId)
      : Promise.resolve(null),
  ]);

  await publishActivity(supabase, {
    module: "inventory",
    eventType: ACTIVITY_EVENTS.inventory.consumed,
    entityType: "item",
    entityId: input.itemId,
    title: `Used ${formatQty(input.quantity)} ${itemName ?? "stock"}`,
    description: locationName ? `From ${locationName}` : null,
    severity: "info",
    metadata: { quantity: input.quantity, locationId: input.locationId ?? null },
  });
}

function formatQty(quantity: number): string {
  return Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2);
}
