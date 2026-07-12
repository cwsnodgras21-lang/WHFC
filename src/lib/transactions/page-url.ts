import type { TransactionsPageFilters } from "@/lib/validation/transactions-page";

export function buildTransactionsPageHref(
  filters: TransactionsPageFilters,
  page?: number
): string {
  const params = new URLSearchParams();
  const targetPage = page ?? filters.page;

  if (filters.itemId) {
    params.set("itemId", filters.itemId);
  }
  if (filters.locationId) {
    params.set("locationId", filters.locationId);
  }
  if (filters.transactionType) {
    params.set("transactionType", filters.transactionType);
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
  return query ? `/transactions?${query}` : "/transactions";
}

export function hasActiveTransactionFilters(
  filters: TransactionsPageFilters
): boolean {
  return Boolean(
    filters.itemId ||
      filters.locationId ||
      filters.transactionType ||
      filters.search?.trim() ||
      filters.dateFrom ||
      filters.dateTo
  );
}
