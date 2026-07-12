import type { SupabaseClient } from "@supabase/supabase-js";

import { canViewDispenseHistory } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import type { UserRole } from "@/lib/auth/session";
import type { DispenseHistoryPageFilters } from "@/lib/validation/dispense-history-page";
import type { Database } from "@/lib/types/database";
import {
  fetchDispenseHistory,
  fetchDispenseWeekSummary,
  type DispenseHistoryRow,
  type DispenseHistoryWeekSummary,
} from "@/lib/dispense/query";
import type { FilterOption } from "@/lib/data/transactions-page";

type Client = SupabaseClient<Database>;

export type DispenseHistoryPageData = {
  canView: boolean;
  permissionMessage: string | null;
  staffScoped: boolean;
  filters: DispenseHistoryPageFilters;
  events: DispenseHistoryRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  kitOptions: FilterOption[];
  locationOptions: FilterOption[];
  weekSummary: DispenseHistoryWeekSummary | null;
  loadError: string | null;
};

export async function getDispenseHistoryPageData(
  supabase: Client,
  session: AppSession,
  filters: DispenseHistoryPageFilters
): Promise<DispenseHistoryPageData> {
  const canView = canViewDispenseHistory(session.profile.active);
  const staffScoped = session.profile.role === "staff";

  if (!canView) {
    return {
      canView: false,
      permissionMessage: "Your account cannot view dispense history.",
      staffScoped: false,
      filters,
      events: [],
      totalCount: 0,
      page: filters.page,
      pageSize: 0,
      totalPages: 1,
      kitOptions: [],
      locationOptions: [],
      weekSummary: null,
      loadError: null,
    };
  }

  try {
    const [historyResult, kitsResult, locationsResult, weekSummary] =
      await Promise.all([
        fetchDispenseHistory(supabase, filters),
        supabase
          .from("procedure_kits")
          .select("id, name, active")
          .order("name"),
        supabase
          .from("locations")
          .select("id, location_name, active")
          .order("location_name"),
        fetchDispenseWeekSummary(supabase),
      ]);

    if (kitsResult.error) {
      throw new Error(kitsResult.error.message);
    }
    if (locationsResult.error) {
      throw new Error(locationsResult.error.message);
    }

    const kitOptions: FilterOption[] = (kitsResult.data ?? []).map((kit) => ({
      id: kit.id,
      label: kit.active ? kit.name : `${kit.name} — inactive`,
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
      staffScoped,
      filters,
      events: historyResult.rows,
      totalCount: historyResult.totalCount,
      page: historyResult.page,
      pageSize: historyResult.pageSize,
      totalPages: historyResult.totalPages,
      kitOptions,
      locationOptions,
      weekSummary,
      loadError: null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load dispense history.";

    return {
      canView: true,
      permissionMessage: null,
      staffScoped,
      filters,
      events: [],
      totalCount: 0,
      page: filters.page,
      pageSize: 0,
      totalPages: 1,
      kitOptions: [],
      locationOptions: [],
      weekSummary: null,
      loadError: message,
    };
  }
}

export function dispenseHistoryScopeHint(role: UserRole): string | null {
  if (role === "staff") {
    return "Showing dispense events you recorded. Managers and read-only users see clinic-wide history.";
  }
  return null;
}
