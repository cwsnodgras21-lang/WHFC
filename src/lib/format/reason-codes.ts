import type { Database } from "@/lib/types/database";

export type ReasonCode = Database["public"]["Enums"]["reason_code"];

export const REASON_CODE_LABELS: Record<ReasonCode, string> = {
  vendor_delivery: "Vendor delivery",
  internal_restock: "Internal restock",
  initial_stock: "Initial stock",
  clinic_use: "Clinic use",
  expired_disposal: "Expired disposal",
  damaged_disposal: "Damaged disposal",
  location_transfer: "Location transfer",
  found_stock: "Found stock",
  data_correction_increase: "Data correction (increase)",
  damaged_stock: "Damaged stock",
  data_correction_decrease: "Data correction (decrease)",
  shrinkage: "Shrinkage",
  count_surplus: "Physical count surplus",
  count_shortage: "Physical count shortage",
};

export function formatReasonCode(code: ReasonCode | null | undefined): string {
  if (!code) {
    return "—";
  }
  return REASON_CODE_LABELS[code] ?? code;
}

export function isPhysicalCountCorrectionReason(
  code: ReasonCode | null | undefined
): boolean {
  return code === "count_surplus" || code === "count_shortage";
}
