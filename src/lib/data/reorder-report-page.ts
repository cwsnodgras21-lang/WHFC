import type { SupabaseClient } from "@supabase/supabase-js";

import {
  canManageReorderSuggestions,
  canViewReorderReport,
} from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import { applyReorderReportFilters } from "@/lib/reorder/filtering";
import { mapReorderReportViewRow } from "@/lib/reorder/map-row";
import {
  groupReorderReportRows,
  sortReorderReportRows,
} from "@/lib/reorder/sorting";
import type { ReorderReportGroup, ReorderReportRow } from "@/lib/reorder/types";
import type { ReorderReportPageFilters } from "@/lib/validation/reorder-report-page";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type ReorderReportFilterOption = {
  id: string;
  label: string;
};

export type ReorderReportSummary = {
  totalItems: number;
  outOfStockCount: number;
  belowReorderCount: number;
  atReorderCount: number;
};

export type ReorderReportPageData = {
  canView: boolean;
  canManage: boolean;
  permissionMessage: string | null;
  filters: ReorderReportPageFilters;
  groups: ReorderReportGroup[];
  allRows: ReorderReportRow[];
  summary: ReorderReportSummary;
  categoryOptions: ReorderReportFilterOption[];
  vendorOptions: ReorderReportFilterOption[];
  generatedAt: string;
  loadError: string | null;
};

function buildFilterOptions(rows: ReorderReportRow[]): {
  categoryOptions: ReorderReportFilterOption[];
  vendorOptions: ReorderReportFilterOption[];
} {
  const categories = new Map<string, string>();
  const vendors = new Map<string, string>();

  for (const row of rows) {
    if (row.categoryId) {
      categories.set(row.categoryId, row.categoryName);
    }
    if (row.preferredVendorId && row.vendorName) {
      vendors.set(row.preferredVendorId, row.vendorName);
    }
  }

  return {
    categoryOptions: [...categories.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((left, right) => left.label.localeCompare(right.label)),
    vendorOptions: [
      { id: "none", label: "No preferred vendor" },
      ...[...vendors.entries()]
        .map(([id, label]) => ({ id, label }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    ],
  };
}

function buildSummary(rows: ReorderReportRow[]): ReorderReportSummary {
  return {
    totalItems: rows.length,
    outOfStockCount: rows.filter((row) => row.stockStatus === "out_of_stock")
      .length,
    belowReorderCount: rows.filter(
      (row) => row.stockStatus === "below_reorder"
    ).length,
    atReorderCount: rows.filter(
      (row) => row.stockStatus === "at_reorder_point"
    ).length,
  };
}

export async function getReorderReportPageData(
  supabase: Client,
  session: AppSession,
  filters: ReorderReportPageFilters
): Promise<ReorderReportPageData> {
  const canView = canViewReorderReport(session.profile.active);
  const canManage = canManageReorderSuggestions(
    session.profile.role,
    session.profile.active
  );

  if (!canView) {
    return {
      canView: false,
      canManage: false,
      permissionMessage: "Your account cannot view the reorder report.",
      filters,
      groups: [],
      allRows: [],
      summary: {
        totalItems: 0,
        outOfStockCount: 0,
        belowReorderCount: 0,
        atReorderCount: 0,
      },
      categoryOptions: [],
      vendorOptions: [],
      generatedAt: new Date().toISOString(),
      loadError: null,
    };
  }

  try {
    const { data, error } = await supabase
      .from("items_below_reorder_point")
      .select("*");

    if (error) {
      throw new Error(error.message);
    }

    const sourceRows = (data ?? [])
      .map(mapReorderReportViewRow)
      .filter((row): row is ReorderReportRow => row !== null);

    const { categoryOptions, vendorOptions } = buildFilterOptions(sourceRows);

    const filteredRows = applyReorderReportFilters(sourceRows, {
      search: filters.search,
      categoryId: filters.categoryId || undefined,
      vendorId: filters.vendorId || undefined,
    });

    const sortedRows = sortReorderReportRows(filteredRows, filters.sort);
    const groups = groupReorderReportRows(sortedRows, filters.groupBy);

    return {
      canView: true,
      canManage,
      permissionMessage: null,
      filters,
      groups,
      allRows: sortedRows,
      summary: buildSummary(sortedRows),
      categoryOptions,
      vendorOptions,
      generatedAt: new Date().toISOString(),
      loadError: null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load reorder report.";

    return {
      canView: true,
      canManage,
      permissionMessage: null,
      filters,
      groups: [],
      allRows: [],
      summary: {
        totalItems: 0,
        outOfStockCount: 0,
        belowReorderCount: 0,
        atReorderCount: 0,
      },
      categoryOptions: [],
      vendorOptions: [],
      generatedAt: new Date().toISOString(),
      loadError: message,
    };
  }
}
