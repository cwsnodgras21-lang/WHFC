import type { SupabaseClient } from "@supabase/supabase-js";

import { canManagePhysicalCounts } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import type { Database } from "@/lib/types/database";
import {
  calculateVariance,
  cancelPhysicalCountSchema,
  completePhysicalCountSchema,
  savePhysicalCountLinesSchema,
  startPhysicalCountSchema,
  type CancelPhysicalCountInput,
  type CompletePhysicalCountInput,
  type SavePhysicalCountLinesInput,
  type StartPhysicalCountInput,
} from "@/lib/validation/physical-count";

type Client = SupabaseClient<Database>;

type PhysicalCountRpcSuccess<T> = {
  success: true;
} & T;

type PhysicalCountRpcFailure = {
  success: false;
  error: string;
};

export type StartPhysicalCountResult =
  | PhysicalCountRpcSuccess<{ physicalCountId: string }>
  | PhysicalCountRpcFailure;

export type SavePhysicalCountLinesResult =
  | PhysicalCountRpcSuccess<{ savedLineCount: number }>
  | PhysicalCountRpcFailure;

export type CompletePhysicalCountResult =
  | PhysicalCountRpcSuccess<{
      physicalCountId: string;
      correctionsPosted: number;
    }>
  | PhysicalCountRpcFailure;

export type CancelPhysicalCountResult =
  | PhysicalCountRpcSuccess<{ physicalCountId: string }>
  | PhysicalCountRpcFailure;

function mapRpcError(message: string): string {
  if (message.includes("insufficient_privilege")) {
    return "You do not have permission to manage physical counts.";
  }
  if (message.includes("profile_inactive")) {
    return "Your account is inactive.";
  }
  if (message.includes("physical_count_already_in_progress")) {
    return "A physical count is already in progress at this location.";
  }
  if (message.includes("physical_count_not_found")) {
    return "Physical count not found.";
  }
  if (message.includes("physical_count_not_editable")) {
    return "This physical count can no longer be edited.";
  }
  if (message.includes("physical_count_not_in_progress")) {
    return "This physical count is not in progress.";
  }
  if (message.includes("counted_quantity_must_be_non_negative")) {
    return "Counted quantity cannot be negative.";
  }
  if (message.includes("location_not_found_or_inactive")) {
    return "The selected location is not available.";
  }
  if (message.includes("item_not_found_or_inactive")) {
    return "One or more selected items are not available.";
  }
  if (message.includes("negative_inventory_not_allowed")) {
    return "Completing this count would create negative inventory at the location.";
  }
  return message;
}

function parseCompleteRpcResult(data: unknown): {
  physicalCountId: string;
  correctionsPosted: number;
} | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;
  if (
    typeof record.physical_count_id === "string" &&
    typeof record.corrections_posted === "number"
  ) {
    return {
      physicalCountId: record.physical_count_id,
      correctionsPosted: record.corrections_posted,
    };
  }

  return null;
}

export async function executeStartPhysicalCount(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<StartPhysicalCountResult> {
  if (!canManagePhysicalCounts(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage physical counts.",
    };
  }

  const parsed = startPhysicalCountSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid form data.",
    };
  }

  return submitStartPhysicalCount(supabase, parsed.data);
}

export async function submitStartPhysicalCount(
  supabase: Client,
  input: StartPhysicalCountInput
): Promise<StartPhysicalCountResult> {
  const { data: physicalCountId, error } = await supabase.rpc(
    "start_physical_count",
    { p_location_id: input.locationId }
  );

  if (error) {
    return { success: false, error: mapRpcError(error.message) };
  }

  if (!physicalCountId) {
    return {
      success: false,
      error: "Physical count did not return an id.",
    };
  }

  return { success: true, physicalCountId };
}

export async function executeSavePhysicalCountLines(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<SavePhysicalCountLinesResult> {
  if (!canManagePhysicalCounts(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage physical counts.",
    };
  }

  const parsed = savePhysicalCountLinesSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid form data.",
    };
  }

  return submitSavePhysicalCountLines(supabase, parsed.data);
}

export async function submitSavePhysicalCountLines(
  supabase: Client,
  input: SavePhysicalCountLinesInput
): Promise<SavePhysicalCountLinesResult> {
  let savedLineCount = 0;

  for (const line of input.lines) {
    const { error } = await supabase.rpc("upsert_physical_count_line", {
      p_physical_count_id: input.physicalCountId,
      p_item_id: line.itemId,
      p_counted_quantity: line.countedQuantity,
    });

    if (error) {
      return { success: false, error: mapRpcError(error.message) };
    }

    savedLineCount += 1;
  }

  return { success: true, savedLineCount };
}

export async function executeCompletePhysicalCount(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<CompletePhysicalCountResult> {
  if (!canManagePhysicalCounts(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage physical counts.",
    };
  }

  const parsed = completePhysicalCountSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid form data.",
    };
  }

  return submitCompletePhysicalCount(supabase, parsed.data);
}

export async function submitCompletePhysicalCount(
  supabase: Client,
  input: CompletePhysicalCountInput
): Promise<CompletePhysicalCountResult> {
  const { data, error } = await supabase.rpc("complete_physical_count", {
    p_physical_count_id: input.physicalCountId,
  });

  if (error) {
    return { success: false, error: mapRpcError(error.message) };
  }

  const result = parseCompleteRpcResult(data);
  if (!result) {
    return {
      success: false,
      error: "Complete count did not return expected details.",
    };
  }

  return {
    success: true,
    physicalCountId: result.physicalCountId,
    correctionsPosted: result.correctionsPosted,
  };
}

export async function executeCancelPhysicalCount(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<CancelPhysicalCountResult> {
  if (!canManagePhysicalCounts(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage physical counts.",
    };
  }

  const parsed = cancelPhysicalCountSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid form data.",
    };
  }

  return submitCancelPhysicalCount(supabase, parsed.data);
}

export async function submitCancelPhysicalCount(
  supabase: Client,
  input: CancelPhysicalCountInput
): Promise<CancelPhysicalCountResult> {
  const { error } = await supabase.rpc("cancel_physical_count", {
    p_physical_count_id: input.physicalCountId,
  });

  if (error) {
    return { success: false, error: mapRpcError(error.message) };
  }

  return { success: true, physicalCountId: input.physicalCountId };
}

export { calculateVariance };
