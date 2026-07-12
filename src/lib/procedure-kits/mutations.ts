import type { SupabaseClient } from "@supabase/supabase-js";

import { canManageProcedureKits } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import type { Database } from "@/lib/types/database";
import {
  saveProcedureKitSchema,
  type SaveProcedureKitInput,
} from "@/lib/validation/procedure-kit";

type Client = SupabaseClient<Database>;

export type ProcedureKitMutationResult =
  | { success: true; kitId: string }
  | { success: false; error: string };

function mapDbError(message: string): string {
  if (message.includes("procedure_kits_name_active_unique")) {
    return "An active kit with this name already exists.";
  }
  if (message.includes("procedure_kit_components_kit_item_unique")) {
    return "Each item can only appear once per kit.";
  }
  if (message.includes("permission denied") || message.includes("42501")) {
    return "You do not have permission to manage procedure kits.";
  }
  return message;
}

export async function executeSaveProcedureKit(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<ProcedureKitMutationResult> {
  if (!canManageProcedureKits(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage procedure kits.",
    };
  }

  const parsed = saveProcedureKitSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid form data.",
    };
  }

  return saveProcedureKit(supabase, parsed.data);
}

async function saveProcedureKit(
  supabase: Client,
  input: SaveProcedureKitInput
): Promise<ProcedureKitMutationResult> {
  const kitPayload = {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    category_id: input.categoryId || null,
    active: input.active,
    default_location_id: input.defaultLocationId || null,
  };

  let kitId = input.id;

  if (kitId) {
    const { error } = await supabase
      .from("procedure_kits")
      .update(kitPayload)
      .eq("id", kitId);

    if (error) {
      return { success: false, error: mapDbError(error.message) };
    }

    const { error: deleteError } = await supabase
      .from("procedure_kit_components")
      .delete()
      .eq("procedure_kit_id", kitId);

    if (deleteError) {
      return { success: false, error: mapDbError(deleteError.message) };
    }
  } else {
    const { data, error } = await supabase
      .from("procedure_kits")
      .insert(kitPayload)
      .select("id")
      .single();

    if (error || !data) {
      return {
        success: false,
        error: mapDbError(error?.message ?? "Failed to create kit."),
      };
    }
    kitId = data.id;
  }

  const componentRows = input.components.map((c) => ({
    procedure_kit_id: kitId!,
    item_id: c.itemId,
    quantity: c.isVariableQuantity ? 1 : c.quantity,
    unit: c.unit.trim(),
    is_variable_quantity: c.isVariableQuantity,
    variable_quantity_label: c.isVariableQuantity
      ? c.variableQuantityLabel?.trim() || null
      : null,
    variable_quantity_unit: c.isVariableQuantity
      ? c.variableQuantityUnit?.trim() || null
      : null,
    calculation_type: c.isVariableQuantity ? c.calculationType : null,
    multiplier:
      c.calculationType === "multiplier" ? (c.multiplier ?? null) : null,
    concentration_amount:
      c.calculationType === "concentration"
        ? (c.concentrationAmount ?? null)
        : null,
    concentration_unit:
      c.calculationType === "concentration"
        ? c.concentrationUnit?.trim() || null
        : null,
    concentration_volume:
      c.calculationType === "concentration"
        ? (c.concentrationVolume ?? null)
        : null,
    concentration_volume_unit:
      c.calculationType === "concentration"
        ? c.concentrationVolumeUnit?.trim() || null
        : null,
    required: c.required,
  }));

  const { error: componentsError } = await supabase
    .from("procedure_kit_components")
    .insert(componentRows);

  if (componentsError) {
    return { success: false, error: mapDbError(componentsError.message) };
  }

  return { success: true, kitId: kitId! };
}

export async function executeDeleteProcedureKit(
  supabase: Client,
  session: AppSession,
  kitId: string
): Promise<ProcedureKitMutationResult> {
  if (!canManageProcedureKits(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage procedure kits.",
    };
  }

  const { error } = await supabase
    .from("procedure_kits")
    .update({ active: false })
    .eq("id", kitId);

  if (error) {
    return { success: false, error: mapDbError(error.message) };
  }

  return { success: true, kitId };
}
