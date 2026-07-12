import type { SupabaseClient } from "@supabase/supabase-js";

import { canManageLocations } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import type { Database } from "@/lib/types/database";
import {
  createLocationSchema,
  locationIdSchema,
  updateLocationSchema,
  type CreateLocationInput,
  type UpdateLocationInput,
} from "@/lib/validation/location";

type Client = SupabaseClient<Database>;

export type LocationMutationSuccess = {
  success: true;
  locationId: string;
};

export type LocationMutationFailure = {
  success: false;
  error: string;
};

export type LocationMutationResult =
  | LocationMutationSuccess
  | LocationMutationFailure;

function mapDbError(message: string): string {
  if (
    message.includes("duplicate key") ||
    message.includes("locations_name_active_unique") ||
    message.includes("23505")
  ) {
    return "An active location with this name already exists.";
  }
  if (message.includes("permission denied") || message.includes("42501")) {
    return "You do not have permission to manage locations.";
  }
  return message;
}

async function locationHasTransactions(
  supabase: Client,
  locationId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from("inventory_transactions")
    .select("id", { count: "exact", head: true })
    .eq("location_id", locationId);

  if (error) {
    throw new Error(error.message);
  }

  return (count ?? 0) > 0;
}

export async function executeCreateLocation(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<LocationMutationResult> {
  if (!canManageLocations(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage locations.",
    };
  }

  const parsed = createLocationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid form data.",
    };
  }

  return insertLocation(supabase, parsed.data);
}

export async function executeUpdateLocation(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<LocationMutationResult> {
  if (!canManageLocations(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage locations.",
    };
  }

  const parsed = updateLocationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid form data.",
    };
  }

  return updateLocationRecord(supabase, parsed.data);
}

export async function executeSetLocationActive(
  supabase: Client,
  session: AppSession,
  locationId: string,
  active: boolean
): Promise<LocationMutationResult> {
  if (!canManageLocations(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage locations.",
    };
  }

  const idParsed = locationIdSchema.safeParse(locationId);
  if (!idParsed.success) {
    return { success: false, error: "Invalid location." };
  }

  const { data, error } = await supabase
    .from("locations")
    .update({ active })
    .eq("id", idParsed.data)
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, error: mapDbError(error.message) };
  }

  if (!data) {
    return { success: false, error: "Location not found." };
  }

  return { success: true, locationId: data.id };
}

export async function insertLocation(
  supabase: Client,
  input: CreateLocationInput
): Promise<LocationMutationResult> {
  const { data, error } = await supabase
    .from("locations")
    .insert({
      location_name: input.locationName,
      room: input.room,
      cabinet: input.cabinet,
      shelf: input.shelf,
      bin: input.bin,
      active: input.active,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: mapDbError(error.message) };
  }

  return { success: true, locationId: data.id };
}

export async function updateLocationRecord(
  supabase: Client,
  input: UpdateLocationInput
): Promise<LocationMutationResult> {
  const { data: existing, error: existingError } = await supabase
    .from("locations")
    .select("id, location_name, room, cabinet, shelf, bin")
    .eq("id", input.id)
    .maybeSingle();

  if (existingError) {
    return { success: false, error: mapDbError(existingError.message) };
  }

  if (!existing) {
    return { success: false, error: "Location not found." };
  }

  const identityChanged =
    existing.location_name !== input.locationName ||
    existing.room !== input.room ||
    existing.cabinet !== input.cabinet ||
    existing.shelf !== input.shelf ||
    existing.bin !== input.bin;

  if (identityChanged && (await locationHasTransactions(supabase, input.id))) {
    return {
      success: false,
      error:
        "Location identity cannot be changed after inventory transactions exist for this location.",
    };
  }

  const { data, error } = await supabase
    .from("locations")
    .update({
      location_name: input.locationName,
      room: input.room,
      cabinet: input.cabinet,
      shelf: input.shelf,
      bin: input.bin,
      active: input.active,
    })
    .eq("id", input.id)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: mapDbError(error.message) };
  }

  return { success: true, locationId: data.id };
}
