import type { SupabaseClient } from "@supabase/supabase-js";

import { canViewTransactions } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import { fetchTransactionHistory } from "@/lib/transactions/query";
import type { TransactionsPageFilters } from "@/lib/validation/transactions-page";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type TransactionHistoryRow =
  Database["public"]["Views"]["inventory_transaction_history"]["Row"];

export type FilterOption = {
  id: string;
  label: string;
};

export type TransactionsPageData = {
  canView: boolean;
  permissionMessage: string | null;
  filters: TransactionsPageFilters;
  transactions: TransactionHistoryRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  itemOptions: FilterOption[];
  locationOptions: FilterOption[];
  loadError: string | null;
};

export async function getTransactionsPageData(
  supabase: Client,
  session: AppSession,
  filters: TransactionsPageFilters
): Promise<TransactionsPageData> {
  const canView = canViewTransactions(session.profile.active);

  if (!canView) {
    return {
      canView: false,
      permissionMessage: "Your account cannot view the transaction ledger.",
      filters,
      transactions: [],
      totalCount: 0,
      page: filters.page,
      pageSize: 0,
      totalPages: 1,
      itemOptions: [],
      locationOptions: [],
      loadError: null,
    };
  }

  try {
    const [historyResult, itemsResult, locationsResult] = await Promise.all([
      fetchTransactionHistory(supabase, filters),
      supabase
        .from("items")
        .select("id, item_name, internal_sku, active")
        .order("item_name", { ascending: true }),
      supabase
        .from("locations")
        .select("id, location_name, active")
        .order("location_name", { ascending: true }),
    ]);

    if (itemsResult.error) {
      throw new Error(itemsResult.error.message);
    }
    if (locationsResult.error) {
      throw new Error(locationsResult.error.message);
    }

    const itemOptions: FilterOption[] = (itemsResult.data ?? []).map((item) => ({
      id: item.id,
      label: item.active
        ? `${item.item_name} (${item.internal_sku})`
        : `${item.item_name} (${item.internal_sku}) — inactive`,
    }));

    const locationOptions: FilterOption[] = (locationsResult.data ?? []).map(
      (location) => ({
        id: location.id,
        label: location.active
          ? location.location_name
          : `${location.location_name} — inactive`,
      })
    );

    return {
      canView: true,
      permissionMessage: null,
      filters,
      transactions: historyResult.rows,
      totalCount: historyResult.totalCount,
      page: historyResult.page,
      pageSize: historyResult.pageSize,
      totalPages: historyResult.totalPages,
      itemOptions,
      locationOptions,
      loadError: null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load transactions.";

    return {
      canView: true,
      permissionMessage: null,
      filters,
      transactions: [],
      totalCount: 0,
      page: filters.page,
      pageSize: 0,
      totalPages: 1,
      itemOptions: [],
      locationOptions: [],
      loadError: message,
    };
  }
}
