import type { SupabaseClient } from "@supabase/supabase-js";

import { canManageUnits } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import {
  createUnitSchema,
  updateUnitSchema,
  type CreateUnitInput,
  type UpdateUnitInput,
} from "@/lib/validation/unit";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type UnitMutationSuccess = {
  success: true;
  unitId: string;
};

export type UnitMutationFailure = {
  success: false;
  error: string;
};

export type UnitMutationResult = UnitMutationSuccess | UnitMutationFailure;

function mapDbError(message: string): string {
  if (
    message.includes("duplicate key") ||
    message.includes("units_of_measure_name_active_unique") ||
    message.includes("units_of_measure_abbrev_active_unique") ||
    message.includes("23505")
  ) {
    return "A unit with this name or abbreviation already exists.";
  }
  if (message.includes("permission denied") || message.includes("42501")) {
    return "You do not have permission to manage units of measure.";
  }
  return message;
}

export async function executeCreateUnit(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<UnitMutationResult> {
  if (!canManageUnits(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage units of measure.",
    };
  }

  const parsed = createUnitSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid form data.",
    };
  }

  return insertUnit(supabase, parsed.data);
}

export async function executeUpdateUnit(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<UnitMutationResult> {
  if (!canManageUnits(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage units of measure.",
    };
  }

  const parsed = updateUnitSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid form data.",
    };
  }

  return updateUnitRecord(supabase, parsed.data);
}

export async function executeSetUnitActive(
  supabase: Client,
  session: AppSession,
  unitId: string,
  active: boolean
): Promise<UnitMutationResult> {
  if (!canManageUnits(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage units of measure.",
    };
  }

  const { data, error } = await supabase
    .from("units_of_measure")
    .update({ active })
    .eq("id", unitId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, error: mapDbError(error.message) };
  }

  if (!data) {
    return { success: false, error: "Unit not found." };
  }

  return { success: true, unitId: data.id };
}

export async function insertUnit(
  supabase: Client,
  input: CreateUnitInput
): Promise<UnitMutationResult> {
  const { data, error } = await supabase
    .from("units_of_measure")
    .insert({
      name: input.name,
      abbreviation: input.abbreviation,
      active: input.active,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: mapDbError(error.message) };
  }

  return { success: true, unitId: data.id };
}

export async function updateUnitRecord(
  supabase: Client,
  input: UpdateUnitInput
): Promise<UnitMutationResult> {
  const { data, error } = await supabase
    .from("units_of_measure")
    .update({
      name: input.name,
      abbreviation: input.abbreviation,
      active: input.active,
    })
    .eq("id", input.id)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: mapDbError(error.message) };
  }

  return { success: true, unitId: data.id };
}
