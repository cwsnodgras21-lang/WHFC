import type { Database } from "@/lib/types/database";

export type LotStatus = Database["public"]["Enums"]["lot_status"];

/** Plain, clinic-simple labels — no compliance jargon. */
export const LOT_STATUS_LABELS: Record<LotStatus, string> = {
  active: "OK",
  expiring_soon: "Expiring soon",
  expired: "Expired",
  depleted: "Depleted",
};

/**
 * Expiration report buckets. Each is a single selectable filter; the "days"
 * buckets are inclusive windows from today (≤30 is a subset of ≤90).
 */
export const EXPIRATION_BUCKETS = [
  "all",
  "expired",
  "expiring_30",
  "expiring_60",
  "expiring_90",
] as const;

export type ExpirationBucket = (typeof EXPIRATION_BUCKETS)[number];

export const EXPIRATION_BUCKET_LABELS: Record<ExpirationBucket, string> = {
  all: "All dated lots",
  expired: "Expired",
  expiring_30: "Expiring in 30 days",
  expiring_60: "Expiring in 60 days",
  expiring_90: "Expiring in 90 days",
};

const BUCKET_WINDOW_DAYS: Record<"expiring_30" | "expiring_60" | "expiring_90", number> = {
  expiring_30: 30,
  expiring_60: 60,
  expiring_90: 90,
};

/**
 * Whether a lot with `daysUntilExpiration` days remaining belongs in `bucket`.
 * Lots without an expiration date (null) only appear in the "all" bucket.
 * "Expired" = already past (negative days). Day windows count from today
 * forward and never include already-expired lots.
 */
export function expirationBucketMatches(
  daysUntilExpiration: number | null,
  bucket: ExpirationBucket
): boolean {
  if (bucket === "all") {
    return true;
  }
  if (daysUntilExpiration === null) {
    return false;
  }
  if (bucket === "expired") {
    return daysUntilExpiration < 0;
  }
  const window = BUCKET_WINDOW_DAYS[bucket];
  return daysUntilExpiration >= 0 && daysUntilExpiration <= window;
}

export type FefoLot = {
  id: string;
  expirationDate: string | null;
  receivedDate: string;
};

/**
 * First-Expiring-First-Out ordering: earliest expiration first, lots with no
 * expiration date last, then earliest received, then id for a stable order.
 * Mirrors the ordering used by the consume/transfer RPCs so the UI preview of
 * "which lot goes first" matches what the database will actually do.
 */
export function compareLotsFefo(a: FefoLot, b: FefoLot): number {
  if (a.expirationDate !== b.expirationDate) {
    if (a.expirationDate === null) return 1;
    if (b.expirationDate === null) return -1;
    return a.expirationDate < b.expirationDate ? -1 : 1;
  }
  if (a.receivedDate !== b.receivedDate) {
    return a.receivedDate < b.receivedDate ? -1 : 1;
  }
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

export function sortLotsFefo<T extends FefoLot>(lots: readonly T[]): T[] {
  return [...lots].sort(compareLotsFefo);
}

/**
 * Client-side mirror of the inventory_lot_stock view's status derivation, for
 * previews computed without a round-trip. `today` and `expirationDate` are
 * YYYY-MM-DD strings.
 */
export function deriveLotStatus(
  quantityOnHand: number,
  expirationDate: string | null,
  warningDays: number,
  today: string
): LotStatus {
  if (quantityOnHand <= 0) {
    return "depleted";
  }
  if (expirationDate === null) {
    return "active";
  }
  const days = daysBetween(today, expirationDate);
  if (days < 0) {
    return "expired";
  }
  if (days <= warningDays) {
    return "expiring_soon";
  }
  return "active";
}

/** Whole-day difference from `fromDate` to `toDate` (both YYYY-MM-DD). */
export function daysBetween(fromDate: string, toDate: string): number {
  const from = Date.parse(`${fromDate}T00:00:00Z`);
  const to = Date.parse(`${toDate}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}
