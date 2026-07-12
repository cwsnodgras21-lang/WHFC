"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import {
  executeCreateLocation,
  executeSetLocationActive,
  executeUpdateLocation,
  type LocationMutationResult,
} from "@/lib/locations/mutations";
import { createClient } from "@/lib/supabase/server";

function revalidateLocationPaths() {
  revalidatePath("/locations");
  revalidatePath("/receive");
  revalidatePath("/consume");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}

export async function createLocationAction(
  rawInput: unknown
): Promise<LocationMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeCreateLocation(supabase, session, rawInput);

  if (result.success) {
    revalidateLocationPaths();
  }

  return result;
}

export async function updateLocationAction(
  rawInput: unknown
): Promise<LocationMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeUpdateLocation(supabase, session, rawInput);

  if (result.success) {
    revalidateLocationPaths();
  }

  return result;
}

export async function setLocationActiveAction(
  locationId: string,
  active: boolean
): Promise<LocationMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeSetLocationActive(
    supabase,
    session,
    locationId,
    active
  );

  if (result.success) {
    revalidateLocationPaths();
  }

  return result;
}
