import { getReorderUrgencyRank } from "@/lib/reorder/calculations";
import type { ReorderReportSort } from "@/lib/reorder/constants";
import type { ReorderReportGroupBy } from "@/lib/reorder/constants";
import type { ReorderReportGroup, ReorderReportRow } from "@/lib/reorder/types";

function compareText(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

export function sortReorderReportRows(
  rows: ReorderReportRow[],
  sort: ReorderReportSort
): ReorderReportRow[] {
  const sorted = [...rows];

  sorted.sort((left, right) => {
    switch (sort) {
      case "vendor": {
        const vendorCompare = compareText(
          left.vendorName ?? "No preferred vendor",
          right.vendorName ?? "No preferred vendor"
        );
        if (vendorCompare !== 0) {
          return vendorCompare;
        }
        return compareText(left.itemName, right.itemName);
      }
      case "item_name":
        return compareText(left.itemName, right.itemName);
      case "quantity_needed": {
        const quantityCompare =
          right.suggestedOrderQuantity - left.suggestedOrderQuantity;
        if (quantityCompare !== 0) {
          return quantityCompare;
        }
        return compareText(left.itemName, right.itemName);
      }
      case "urgency":
      default: {
        const urgencyCompare =
          getReorderUrgencyRank(left.stockStatus) -
          getReorderUrgencyRank(right.stockStatus);
        if (urgencyCompare !== 0) {
          return urgencyCompare;
        }

        const quantityCompare =
          right.suggestedOrderQuantity - left.suggestedOrderQuantity;
        if (quantityCompare !== 0) {
          return quantityCompare;
        }

        return compareText(left.itemName, right.itemName);
      }
    }
  });

  return sorted;
}

export function groupReorderReportRows(
  rows: ReorderReportRow[],
  groupBy: ReorderReportGroupBy
): ReorderReportGroup[] {
  if (groupBy === "none") {
    return [{ key: "all", label: "All items", rows }];
  }

  const groups = new Map<string, ReorderReportGroup>();

  for (const row of rows) {
    const key =
      groupBy === "vendor"
        ? row.preferredVendorId ?? "none"
        : row.categoryId;
    const label =
      groupBy === "vendor"
        ? row.vendorName ?? "No preferred vendor"
        : row.categoryName;

    const existing = groups.get(key);
    if (existing) {
      existing.rows.push(row);
    } else {
      groups.set(key, { key, label, rows: [row] });
    }
  }

  return [...groups.values()].sort((left, right) =>
    compareText(left.label, right.label)
  );
}
