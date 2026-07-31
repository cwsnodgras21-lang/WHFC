import type { SupabaseClient } from "@supabase/supabase-js";

import {
  canManageSampleProducts,
  canReceiveSample,
  canDispenseSample,
  canAdjustSample,
} from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import { ACTIVITY_EVENTS } from "@/lib/activity/events";
import { publishActivity } from "@/lib/activity/service";
import {
  saveSampleProductSchema,
  receiveSampleSchema,
  dispenseSampleSchema,
  type SaveSampleProductInput,
} from "@/lib/validation/samples";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type SampleMutationResult =
  | { success: true; id: string; idempotentReplay?: boolean }
  | { success: false; error: string };

function mapDbError(message: string): string {
  if (message.includes("sample_products_name_active_unique")) {
    return "An active sample product with this name already exists.";
  }
  if (message.includes("permission denied") || message.includes("42501")) {
    return "You do not have permission to manage sample products.";
  }
  return message;
}

function mapRpcError(message: string): string {
  if (message.includes("insufficient_privilege")) {
    return "You do not have permission to perform this action.";
  }
  if (message.includes("profile_inactive")) {
    return "Your account is inactive.";
  }
  if (message.includes("sample_product_not_found_or_inactive")) {
    return "That sample product is unavailable.";
  }
  if (message.includes("sample_lot_not_found")) {
    return "That sample lot no longer exists.";
  }
  if (message.includes("patient_reference_required")) {
    return "Enter a patient reference (MRN or initials).";
  }
  if (message.includes("insufficient_sample_stock")) {
    const match = /item=([^,]*),available=([^,]*),requested=([^,]*)/.exec(
      message
    );
    if (match) {
      const [, item, available, requested] = match;
      return `Not enough ${item} in stock — ${available} available, ${requested} requested.`;
    }
    return "Not enough stock available for this sample.";
  }
  return message;
}

export async function executeSaveSampleProduct(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<SampleMutationResult> {
  if (!canManageSampleProducts(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage sample products.",
    };
  }

  const parsed = saveSampleProductSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid form data.",
    };
  }

  return saveSampleProduct(supabase, parsed.data);
}

async function saveSampleProduct(
  supabase: Client,
  input: SaveSampleProductInput
): Promise<SampleMutationResult> {
  const payload = {
    product_name: input.productName.trim(),
    manufacturer_vendor: input.manufacturerVendor?.trim() || null,
    strength: input.strength?.trim() || null,
    dosage_form: input.dosageForm?.trim() || null,
    unit_of_measure_id: input.unitOfMeasureId,
    reorder_threshold: input.reorderThreshold,
    expiration_warning_days: input.expirationWarningDays ?? null,
    active: input.active,
    notes: input.notes?.trim() || null,
  };

  if (input.id) {
    const { error } = await supabase
      .from("sample_products")
      .update(payload)
      .eq("id", input.id);

    if (error) {
      return { success: false, error: mapDbError(error.message) };
    }
    return { success: true, id: input.id };
  }

  const { data, error } = await supabase
    .from("sample_products")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: mapDbError(error?.message ?? "Failed to create sample product."),
    };
  }

  return { success: true, id: data.id };
}

export async function executeDeactivateSampleProduct(
  supabase: Client,
  session: AppSession,
  sampleProductId: string
): Promise<SampleMutationResult> {
  if (!canManageSampleProducts(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage sample products.",
    };
  }

  const { error } = await supabase
    .from("sample_products")
    .update({ active: false })
    .eq("id", sampleProductId);

  if (error) {
    return { success: false, error: mapDbError(error.message) };
  }

  return { success: true, id: sampleProductId };
}

export async function executeReceiveSample(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<SampleMutationResult> {
  if (!canReceiveSample(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to receive samples.",
    };
  }

  const parsed = receiveSampleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid form data.",
    };
  }

  const input = parsed.data;
  const { data, error } = await supabase.rpc("receive_sample", {
    p_sample_product_id: input.sampleProductId,
    p_quantity: input.quantity,
    p_lot_number: input.lotNumber || null,
    p_expiration_date: input.expirationDate || null,
    p_vendor_id: input.vendorId || null,
    p_representative_name: input.representativeName || null,
    p_received_date: input.receivedDate || null,
    p_notes: input.notes || null,
  });

  if (error || !data) {
    return { success: false, error: mapRpcError(error?.message ?? "Unknown error.") };
  }

  const result = data as { transaction_id: string };

  const productName = await lookupProductName(supabase, input.sampleProductId);
  await publishActivity(supabase, {
    module: "samples",
    eventType: ACTIVITY_EVENTS.samples.received,
    entityType: "sample_transaction",
    entityId: result.transaction_id,
    title: `Sample received: ${productName ?? "sample product"} (qty ${input.quantity})`,
    severity: "info",
  });

  return { success: true, id: result.transaction_id };
}

export async function executeDispenseSample(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<SampleMutationResult> {
  if (!canDispenseSample(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to give samples.",
    };
  }

  const parsed = dispenseSampleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid form data.",
    };
  }

  const input = parsed.data;
  const { data, error } = await supabase.rpc("dispense_sample", {
    p_sample_product_id: input.sampleProductId,
    p_quantity: input.quantity,
    p_patient_reference: input.patientReference,
    p_sample_lot_id: input.sampleLotId || null,
    p_notes: input.notes || null,
  });

  if (error || !data) {
    return { success: false, error: mapRpcError(error?.message ?? "Unknown error.") };
  }

  const result = data as { transaction_id: string };

  const productName = await lookupProductName(supabase, input.sampleProductId);
  await publishActivity(supabase, {
    module: "samples",
    eventType: ACTIVITY_EVENTS.samples.dispensed,
    entityType: "sample_transaction",
    entityId: result.transaction_id,
    title: `Sample given: ${productName ?? "sample product"}`,
    description: `Patient reference ${input.patientReference}`,
    severity: "success",
  });

  return { success: true, id: result.transaction_id };
}

export async function executeAdjustSample(
  supabase: Client,
  session: AppSession,
  rawInput: { sampleLotId: string; quantity: number; increase: boolean; notes?: string | null }
): Promise<SampleMutationResult> {
  if (!canAdjustSample(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to adjust sample inventory.",
    };
  }

  const { data, error } = await supabase.rpc("adjust_sample", {
    p_sample_lot_id: rawInput.sampleLotId,
    p_quantity: rawInput.quantity,
    p_increase: rawInput.increase,
    p_notes: rawInput.notes || null,
  });

  if (error || !data) {
    return { success: false, error: mapRpcError(error?.message ?? "Unknown error.") };
  }

  const result = data as { transaction_id: string };

  await publishActivity(supabase, {
    module: "samples",
    eventType: ACTIVITY_EVENTS.samples.adjusted,
    entityType: "sample_transaction",
    entityId: result.transaction_id,
    title: `Sample inventory adjusted (${rawInput.increase ? "+" : "-"}${rawInput.quantity})`,
    severity: "warning",
  });

  return { success: true, id: result.transaction_id };
}

async function lookupProductName(
  supabase: Client,
  sampleProductId: string
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("sample_products")
      .select("product_name")
      .eq("id", sampleProductId)
      .maybeSingle();
    return data?.product_name ?? null;
  } catch {
    return null;
  }
}
