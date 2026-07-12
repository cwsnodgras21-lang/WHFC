import type { DispenseHistoryPageFilters } from "@/lib/validation/dispense-history-page";

export function buildDispenseHistoryPageHref(
  filters: DispenseHistoryPageFilters,
  page?: number
): string {
  const params = new URLSearchParams();
  const targetPage = page ?? filters.page;

  if (filters.procedureKitId) {
    params.set("procedureKitId", filters.procedureKitId);
  }
  if (filters.locationId) {
    params.set("locationId", filters.locationId);
  }
  if (filters.source) {
    params.set("source", filters.source);
  }
  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }
  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }
  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
  }
  if (targetPage > 1) {
    params.set("page", String(targetPage));
  }

  const query = params.toString();
  return query ? `/dispense/history?${query}` : "/dispense/history";
}

export function hasActiveDispenseHistoryFilters(
  filters: DispenseHistoryPageFilters
): boolean {
  return Boolean(
    filters.procedureKitId ||
      filters.locationId ||
      filters.source ||
      filters.search?.trim() ||
      filters.dateFrom ||
      filters.dateTo
  );
}
