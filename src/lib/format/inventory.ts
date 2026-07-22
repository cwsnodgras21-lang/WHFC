import type { Database } from "@/lib/types/database";

type TransactionType = Database["public"]["Enums"]["transaction_type"];
type ReasonCode = Database["public"]["Enums"]["reason_code"];

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  RECEIVE: "Receive",
  CONSUME: "Consume",
  TRANSFER_IN: "Transfer in",
  TRANSFER_OUT: "Transfer out",
  ADJUSTMENT_INCREASE: "Adjustment +",
  ADJUSTMENT_DECREASE: "Adjustment −",
  PHYSICAL_COUNT_CORRECTION: "Count correction",
};

export function formatTransactionType(type: TransactionType | null): string {
  if (!type) return "—";
  return TRANSACTION_TYPE_LABELS[type] ?? type;
}

/** Whether a ledger row increases on-hand at the location (matches DB sign logic). */
export function isInventoryIncrease(
  transactionType: TransactionType | null | undefined,
  reasonCode: ReasonCode | null | undefined
): boolean | null {
  if (!transactionType) {
    return null;
  }

  switch (transactionType) {
    case "RECEIVE":
    case "TRANSFER_IN":
    case "ADJUSTMENT_INCREASE":
      return true;
    case "CONSUME":
    case "TRANSFER_OUT":
    case "ADJUSTMENT_DECREASE":
      return false;
    case "PHYSICAL_COUNT_CORRECTION":
      if (reasonCode === "count_surplus") return true;
      if (reasonCode === "count_shortage") return false;
      return null;
    default:
      return null;
  }
}

export function formatQuantity(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 3,
  }).format(value);
}

export function formatSignedQuantityWithUnit(
  quantity: number | null | undefined,
  transactionType: TransactionType | null | undefined,
  reasonCode: ReasonCode | null | undefined,
  unitAbbreviation: string | null | undefined
): string {
  if (quantity == null) return "—";

  const increase = isInventoryIncrease(transactionType, reasonCode);
  const prefix = increase === true ? "+" : increase === false ? "-" : "";
  const formattedQty = formatQuantity(quantity);
  const unit = unitAbbreviation?.trim();

  return unit ? `${prefix}${formattedQty} ${unit}` : `${prefix}${formattedQty}`;
}

export function formatLocationDetail(
  locationName: string | null | undefined
): { primary: string; secondary: string | null } {
  return {
    primary: locationName?.trim() || "—",
    secondary: null,
  };
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/** Date-only (no time) — used for expiration / received dates. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  // Treat a bare YYYY-MM-DD as a calendar date (avoid timezone shifting).
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

/** "Expires in 12 days", "Expired 3 days ago", or "No expiration". */
export function formatDaysUntilExpiration(days: number | null): string {
  if (days === null) return "No expiration";
  if (days < 0) {
    const ago = Math.abs(days);
    return `Expired ${ago} day${ago === 1 ? "" : "s"} ago`;
  }
  if (days === 0) return "Expires today";
  return `Expires in ${days} day${days === 1 ? "" : "s"}`;
}

type PhysicalCountStatus = Database["public"]["Enums"]["physical_count_status"];

const PHYSICAL_COUNT_STATUS_LABELS: Record<PhysicalCountStatus, string> = {
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function formatPhysicalCountStatus(
  status: PhysicalCountStatus | null | undefined
): string {
  if (!status) return "—";
  return PHYSICAL_COUNT_STATUS_LABELS[status] ?? status;
}

export function physicalCountStatusBadgeVariant(
  status: PhysicalCountStatus
): "info" | "success" | "default" {
  switch (status) {
    case "in_progress":
      return "info";
    case "completed":
      return "success";
    case "cancelled":
      return "default";
    default:
      return "default";
  }
}

type PurchaseOrderDraftStatus =
  Database["public"]["Enums"]["purchase_order_draft_status"];

const PO_DRAFT_STATUS_LABELS: Record<PurchaseOrderDraftStatus, string> = {
  draft: "Draft",
  approved: "Approved",
  ordered: "Ordered",
  cancelled: "Cancelled",
  submitted: "Approved",
};

export function formatPurchaseOrderDraftStatus(
  status: PurchaseOrderDraftStatus | null | undefined
): string {
  if (!status) return "—";
  return PO_DRAFT_STATUS_LABELS[status] ?? status;
}

export function purchaseOrderDraftStatusBadgeVariant(
  status: PurchaseOrderDraftStatus
): "info" | "success" | "warning" | "default" | "danger" {
  switch (status) {
    case "draft":
      return "warning";
    case "approved":
    case "submitted":
      return "info";
    case "ordered":
      return "success";
    case "cancelled":
      return "default";
    default:
      return "default";
  }
}

export function formatVariance(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value === 0) return "0";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatQuantity(value)}`;
}
