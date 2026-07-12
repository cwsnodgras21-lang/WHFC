import type { ReorderReportRow } from "@/lib/reorder/types";

export function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

export function matchesReorderReportSearch(
  row: ReorderReportRow,
  search: string
): boolean {
  const query = search.trim().toLowerCase();
  if (!query) {
    return true;
  }

  return (
    row.itemName.toLowerCase().includes(query) ||
    row.internalSku.toLowerCase().includes(query)
  );
}

export type ReorderReportFilterInput = {
  search?: string;
  categoryId?: string;
  vendorId?: string;
};

export function applyReorderReportFilters(
  rows: ReorderReportRow[],
  filters: ReorderReportFilterInput
): ReorderReportRow[] {
  return rows.filter((row) => {
    if (filters.categoryId && row.categoryId !== filters.categoryId) {
      return false;
    }

    if (filters.vendorId) {
      if (filters.vendorId === "none") {
        if (row.preferredVendorId) {
          return false;
        }
      } else if (row.preferredVendorId !== filters.vendorId) {
        return false;
      }
    }

    if (!matchesReorderReportSearch(row, filters.search ?? "")) {
      return false;
    }

    return true;
  });
}

export function hasActiveReorderReportFilters(
  filters: ReorderReportFilterInput
): boolean {
  return Boolean(
    filters.search?.trim() ||
      filters.categoryId ||
      filters.vendorId
  );
}
