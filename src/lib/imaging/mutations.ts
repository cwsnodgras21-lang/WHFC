import type { SupabaseClient } from "@supabase/supabase-js";

import { canManageImaging } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import { ACTIVITY_EVENTS } from "@/lib/activity/events";
import { publishActivity } from "@/lib/activity/service";
import type { ActivitySeverity } from "@/lib/activity/service";
import {
  IMAGING_STATUS_LABELS,
  type ImagingStatus,
  type ImagingAuthorizationStatus,
} from "@/lib/imaging/constants";
import {
  createImagingOrderSchema,
  setImagingAuthorizationSchema,
  setImagingStatusSchema,
  updateImagingOrderSchema,
} from "@/lib/validation/imaging";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type ImagingMutationResult =
  | { success: true; imagingOrderId: string }
  | { success: false; error: string };

const PERMISSION_ERROR = "You do not have permission to manage imaging orders.";

function mapRpcError(message: string): string {
  if (message.includes("insufficient_privilege")) {
    return PERMISSION_ERROR;
  }
  if (message.includes("profile_inactive")) {
    return "Your account is inactive.";
  }
  if (message.includes("imaging_order_not_found")) {
    return "That imaging order no longer exists.";
  }
  return message;
}

function ensurePermission(session: AppSession): string | null {
  return canManageImaging(session.profile.role, session.profile.active)
    ? null
    : PERMISSION_ERROR;
}

/** Short, non-PHI label for the feed, e.g. "MRI for A.B.". */
function orderLabel(imagingType: string, patientReference: string): string {
  return `${imagingType} for ${patientReference}`;
}

export async function executeCreateImagingOrder(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<ImagingMutationResult> {
  const denied = ensurePermission(session);
  if (denied) return { success: false, error: denied };

  const parsed = createImagingOrderSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid form data.",
    };
  }

  const input = parsed.data;
  const { data, error } = await supabase.rpc("create_imaging_order", {
    p_patient_reference: input.patientReference,
    p_ordering_provider: input.orderingProvider,
    p_imaging_type: input.imagingType,
    p_imaging_location: input.imagingLocation,
    p_date_ordered: input.dateOrdered,
    p_appointment_date: input.appointmentDate,
    p_appointment_time: input.appointmentTime,
    p_status: input.status,
    p_authorization_status: input.authorizationStatus,
    p_authorization_number: input.authorizationNumber,
    p_notes: input.notes,
  });

  if (error || !data) {
    return { success: false, error: mapRpcError(error?.message ?? "Unknown error.") };
  }

  await publishActivity(supabase, {
    module: "imaging",
    eventType: ACTIVITY_EVENTS.imaging.orderCreated,
    entityType: "imaging_order",
    entityId: data,
    title: `Imaging ordered: ${orderLabel(input.imagingType, input.patientReference)}`,
    description: `Ordered by ${input.orderingProvider}`,
    severity: "info",
  });

  return { success: true, imagingOrderId: data };
}

export async function executeUpdateImagingOrder(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<ImagingMutationResult> {
  const denied = ensurePermission(session);
  if (denied) return { success: false, error: denied };

  const parsed = updateImagingOrderSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid form data.",
    };
  }

  const input = parsed.data;
  const { data, error } = await supabase.rpc("update_imaging_order", {
    p_id: input.id,
    p_patient_reference: input.patientReference,
    p_ordering_provider: input.orderingProvider,
    p_imaging_type: input.imagingType,
    p_imaging_location: input.imagingLocation,
    p_date_ordered: input.dateOrdered,
    p_appointment_date: input.appointmentDate,
    p_appointment_time: input.appointmentTime,
    p_status: input.status,
    p_authorization_status: input.authorizationStatus,
    p_authorization_number: input.authorizationNumber,
    p_notes: input.notes,
  });

  if (error || !data) {
    return { success: false, error: mapRpcError(error?.message ?? "Unknown error.") };
  }

  return { success: true, imagingOrderId: data };
}

const STATUS_EVENT: Record<ImagingStatus, string> = {
  ordered: ACTIVITY_EVENTS.imaging.statusChanged,
  scheduled: ACTIVITY_EVENTS.imaging.scheduled,
  completed: ACTIVITY_EVENTS.imaging.completed,
  results_received: ACTIVITY_EVENTS.imaging.resultsReceived,
  cancelled: ACTIVITY_EVENTS.imaging.cancelled,
};

export async function executeSetImagingStatus(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<ImagingMutationResult> {
  const denied = ensurePermission(session);
  if (denied) return { success: false, error: denied };

  const parsed = setImagingStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid status.",
    };
  }

  const { id, status } = parsed.data;
  const { data, error } = await supabase.rpc("set_imaging_order_status", {
    p_id: id,
    p_status: status,
  });

  if (error || !data) {
    return { success: false, error: mapRpcError(error?.message ?? "Unknown error.") };
  }

  const label = await lookupOrderLabel(supabase, id);
  const severity: ActivitySeverity = status === "cancelled" ? "warning" : "info";
  await publishActivity(supabase, {
    module: "imaging",
    eventType: STATUS_EVENT[status],
    entityType: "imaging_order",
    entityId: id,
    title: `Imaging ${IMAGING_STATUS_LABELS[status].toLowerCase()}${label ? `: ${label}` : ""}`,
    severity,
  });

  return { success: true, imagingOrderId: id };
}

const AUTH_EVENT: Partial<Record<ImagingAuthorizationStatus, string>> = {
  approved: ACTIVITY_EVENTS.imaging.authApproved,
  denied: ACTIVITY_EVENTS.imaging.authDenied,
};

export async function executeSetImagingAuthorization(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<ImagingMutationResult> {
  const denied = ensurePermission(session);
  if (denied) return { success: false, error: denied };

  const parsed = setImagingAuthorizationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid authorization.",
    };
  }

  const { id, authorizationStatus, authorizationNumber } = parsed.data;
  const { data, error } = await supabase.rpc("set_imaging_authorization", {
    p_id: id,
    p_authorization_status: authorizationStatus,
    p_authorization_number: authorizationNumber ?? null,
  });

  if (error || !data) {
    return { success: false, error: mapRpcError(error?.message ?? "Unknown error.") };
  }

  const eventType = AUTH_EVENT[authorizationStatus];
  if (eventType) {
    const label = await lookupOrderLabel(supabase, id);
    await publishActivity(supabase, {
      module: "imaging",
      eventType,
      entityType: "imaging_order",
      entityId: id,
      title: `Authorization ${authorizationStatus}${label ? `: ${label}` : ""}`,
      severity: authorizationStatus === "denied" ? "warning" : "success",
    });
  }

  return { success: true, imagingOrderId: id };
}

async function lookupOrderLabel(
  supabase: Client,
  id: string
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("imaging_orders")
      .select("imaging_type, patient_reference")
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    return orderLabel(data.imaging_type, data.patient_reference);
  } catch {
    return null;
  }
}
