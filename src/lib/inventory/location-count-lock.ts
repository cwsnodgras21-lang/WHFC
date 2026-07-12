import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export const LOCATION_COUNT_LOCK_MESSAGE =
  "Inventory movement is blocked while a physical count is in progress at this location.";

export const LOCATION_PHYSICAL_COUNT_IN_PROGRESS_CODE =
  "location_physical_count_in_progress";

export function mapLocationPhysicalCountRpcError(
  message: string
): string | null {
  if (message.includes(LOCATION_PHYSICAL_COUNT_IN_PROGRESS_CODE)) {
    return LOCATION_COUNT_LOCK_MESSAGE;
  }
  return null;
}

export async function fetchLockedLocationIds(
  supabase: Client
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("physical_counts")
    .select("location_id")
    .eq("status", "in_progress");

  if (error) {
    throw new Error(error.message);
  }

  return new Set((data ?? []).map((row) => row.location_id));
}

export async function isLocationLockedByPhysicalCount(
  supabase: Client,
  locationId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("physical_counts")
    .select("id")
    .eq("location_id", locationId)
    .eq("status", "in_progress")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function assertLocationNotLockedByPhysicalCount(
  supabase: Client,
  locationId: string
): Promise<{ locked: false } | { locked: true; message: string }> {
  const locked = await isLocationLockedByPhysicalCount(supabase, locationId);
  if (locked) {
    return { locked: true, message: LOCATION_COUNT_LOCK_MESSAGE };
  }
  return { locked: false };
}
