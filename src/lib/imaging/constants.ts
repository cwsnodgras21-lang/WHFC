import type { Database } from "@/lib/types/database";

export type ImagingStatus = Database["public"]["Enums"]["imaging_status"];
export type ImagingAuthorizationStatus =
  Database["public"]["Enums"]["imaging_authorization_status"];

export const IMAGING_STATUSES: readonly ImagingStatus[] = [
  "ordered",
  "scheduled",
  "completed",
  "results_received",
  "cancelled",
] as const;

export const IMAGING_STATUS_LABELS: Record<ImagingStatus, string> = {
  ordered: "Ordered",
  scheduled: "Scheduled",
  completed: "Completed",
  results_received: "Results received",
  cancelled: "Cancelled",
};

export const IMAGING_AUTHORIZATION_STATUSES: readonly ImagingAuthorizationStatus[] =
  ["not_required", "required", "pending", "approved", "denied"] as const;

export const IMAGING_AUTHORIZATION_LABELS: Record<
  ImagingAuthorizationStatus,
  string
> = {
  not_required: "Not required",
  required: "Required",
  pending: "Pending",
  approved: "Approved",
  denied: "Denied",
};

/** Badge tone for a scheduling status. */
export type BadgeTone =
  | "default"
  | "info"
  | "warning"
  | "caution"
  | "success"
  | "danger";

export const IMAGING_STATUS_BADGE: Record<ImagingStatus, BadgeTone> = {
  ordered: "caution",
  scheduled: "info",
  completed: "success",
  results_received: "success",
  cancelled: "default",
};

export const IMAGING_AUTHORIZATION_BADGE: Record<
  ImagingAuthorizationStatus,
  BadgeTone
> = {
  not_required: "default",
  required: "warning",
  pending: "warning",
  approved: "success",
  denied: "danger",
};

/** Authorization states that represent outstanding work. */
export const PENDING_AUTHORIZATION_STATUSES: readonly ImagingAuthorizationStatus[] =
  ["required", "pending"] as const;

/** Scheduling states that are still "open" (not finished or cancelled). */
export const OPEN_IMAGING_STATUSES: readonly ImagingStatus[] = [
  "ordered",
  "scheduled",
] as const;
