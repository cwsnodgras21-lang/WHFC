import type { SupabaseClient } from "@supabase/supabase-js";

import { TRANSACTIONS_PAGE_SIZE } from "@/lib/transactions/constants";
import type { TransactionsPageFilters } from "@/lib/validation/transactions-page";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;
type HistoryRow =
  Database["public"]["Views"]["inventory_transaction_history"]["Row"];

export type TransactionsQueryResult = {
  rows: HistoryRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

export function buildTransactionsSearchFilter(search: string): string | null {
  const trimmed = search.trim();
  if (!trimmed) {
    return null;
  }

  const pattern = `%${escapeIlikePattern(trimmed)}%`;
  return `item_name.ilike.${pattern},internal_sku.ilike.${pattern}`;
}

export function toStartOfDayIso(dateValue: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return null;
  }
  return `${dateValue}T00:00:00.000Z`;
}

export function toEndOfDayIso(dateValue: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return null;
  }
  return `${dateValue}T23:59:59.999Z`;
}

export function calculateTotalPages(
  totalCount: number,
  pageSize: number
): number {
  if (totalCount <= 0) {
    return 1;
  }
  return Math.ceil(totalCount / pageSize);
}

export async function fetchTransactionHistory(
  supabase: Client,
  filters: TransactionsPageFilters,
  pageSize: number = TRANSACTIONS_PAGE_SIZE
): Promise<TransactionsQueryResult> {
  const page = filters.page;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("inventory_transaction_history")
    .select("*", { count: "exact" })
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.itemId) {
    query = query.eq("item_id", filters.itemId);
  }

  if (filters.locationId) {
    query = query.eq("location_id", filters.locationId);
  }

  if (filters.transactionType) {
    query = query.eq("transaction_type", filters.transactionType);
  }

  const searchFilter = buildTransactionsSearchFilter(filters.search ?? "");
  if (searchFilter) {
    query = query.or(searchFilter);
  }

  const dateFrom = filters.dateFrom
    ? toStartOfDayIso(filters.dateFrom)
    : null;
  if (dateFrom) {
    query = query.gte("occurred_at", dateFrom);
  }

  const dateTo = filters.dateTo ? toEndOfDayIso(filters.dateTo) : null;
  if (dateTo) {
    query = query.lte("occurred_at", dateTo);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const totalCount = count ?? 0;

  return {
    rows: data ?? [],
    totalCount,
    page,
    pageSize,
    totalPages: calculateTotalPages(totalCount, pageSize),
  };
}
