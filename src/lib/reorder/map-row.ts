import {
  calculateSuggestedOrderQuantity,
  getReorderStockStatus,
} from "@/lib/reorder/calculations";
import type { ReorderReportRow, ReorderReportViewRow } from "@/lib/reorder/types";

export function mapReorderReportViewRow(
  row: ReorderReportViewRow
): ReorderReportRow | null {
  if (!row.item_id || !row.item_name || !row.internal_sku) {
    return null;
  }

  const totalOnHand = Number(row.total_on_hand ?? 0);
  const reorderPoint = Number(row.reorder_point ?? 0);
  const parLevel = Number(row.par_level ?? 0);

  return {
    itemId: row.item_id,
    itemName: row.item_name,
    internalSku: row.internal_sku,
    categoryId: row.category_id ?? "",
    categoryName: row.category_name ?? "Uncategorized",
    unitName: row.unit_name ?? "—",
    unitAbbreviation: row.unit_abbreviation ?? "—",
    preferredVendorId: row.preferred_vendor_id ?? null,
    vendorName: row.vendor_name ?? null,
    totalOnHand,
    reorderPoint,
    parLevel,
    quantityNeeded: Number(row.quantity_needed ?? 0),
    suggestedOrderQuantity: Number(
      row.suggested_order_quantity ??
        calculateSuggestedOrderQuantity(parLevel, totalOnHand)
    ),
    stockStatus: getReorderStockStatus(totalOnHand, reorderPoint),
  };
}
