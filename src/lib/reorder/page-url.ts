import type { ReorderReportPageFilters } from "@/lib/validation/reorder-report-page";

export function buildReorderReportPageHref(
  filters: ReorderReportPageFilters
): string {
  const params = new URLSearchParams();

  if (filters.search.trim()) {
    params.set("search", filters.search.trim());
  }
  if (filters.categoryId) {
    params.set("categoryId", filters.categoryId);
  }
  if (filters.vendorId) {
    params.set("vendorId", filters.vendorId);
  }
  if (filters.sort !== "urgency") {
    params.set("sort", filters.sort);
  }
  if (filters.groupBy !== "none") {
    params.set("groupBy", filters.groupBy);
  }

  const query = params.toString();
  return query ? `/reorder-report?${query}` : "/reorder-report";
}
