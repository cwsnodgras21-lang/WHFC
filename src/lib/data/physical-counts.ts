import type { SupabaseClient } from "@supabase/supabase-js";

import { canManagePhysicalCounts } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import { onHandKey } from "@/lib/data/inventory";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;
type PhysicalCountStatus = Database["public"]["Enums"]["physical_count_status"];

export type PhysicalCountSummary = {
  id: string;
  locationId: string;
  locationName: string;
  status: PhysicalCountStatus;
  startedAt: string;
  completedAt: string | null;
};

export type PhysicalCountsPageData = {
  canManage: boolean;
  permissionMessage: string | null;
  locations: Array<{
    id: string;
    locationName: string;
    hasActiveCount: boolean;
  }>;
  counts: PhysicalCountSummary[];
  loadError: string | null;
};

export async function getPhysicalCountsPageData(
  supabase: Client,
  session: AppSession
): Promise<PhysicalCountsPageData> {
  const canManage = canManagePhysicalCounts(
    session.profile.role,
    session.profile.active
  );

  if (!canManage) {
    return {
      canManage: false,
      permissionMessage:
        "Your account does not have permission to manage physical counts. Only administrators and inventory managers can start and complete counts.",
      locations: [],
      counts: [],
      loadError: null,
    };
  }

  const [locationsResult, countsResult, activeCountsResult] = await Promise.all(
    [
      supabase
        .from("locations")
        .select("id, location_name")
        .eq("active", true)
        .order("location_name"),
      supabase
        .from("physical_counts")
        .select("id, location_id, status, started_at, completed_at")
        .order("started_at", { ascending: false })
        .limit(50),
      supabase
        .from("physical_counts")
        .select("location_id")
        .eq("status", "in_progress"),
    ]
  );

  const errors: string[] = [];
  if (locationsResult.error) errors.push(locationsResult.error.message);
  if (countsResult.error) errors.push(countsResult.error.message);
  if (activeCountsResult.error) errors.push(activeCountsResult.error.message);

  const activeLocationIds = new Set(
    (activeCountsResult.data ?? []).map((row) => row.location_id)
  );

  const locationNameMap = new Map(
    (locationsResult.data ?? []).map((row) => [row.id, row.location_name])
  );

  const locations = (locationsResult.data ?? []).map((row) => ({
    id: row.id,
    locationName: row.location_name,
    hasActiveCount: activeLocationIds.has(row.id),
  }));

  const counts: PhysicalCountSummary[] = (countsResult.data ?? []).map(
    (row) => ({
      id: row.id,
      locationId: row.location_id,
      locationName: locationNameMap.get(row.location_id) ?? "Unknown location",
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    })
  );

  return {
    canManage: true,
    permissionMessage: null,
    locations,
    counts,
    loadError: errors.length > 0 ? errors.join(" ") : null,
  };
}

export type PhysicalCountLineRow = {
  itemId: string;
  itemName: string;
  internalSku: string;
  unitAbbreviation: string;
  systemQuantity: number;
  countedQuantity: number | null;
  variance: number | null;
  lineId: string | null;
};

export type PhysicalCountDetailData = {
  canManage: boolean;
  permissionMessage: string | null;
  count: {
    id: string;
    locationId: string;
    locationName: string;
    status: PhysicalCountStatus;
    startedAt: string;
    completedAt: string | null;
    editable: boolean;
  } | null;
  lines: PhysicalCountLineRow[];
  loadError: string | null;
};

export async function getPhysicalCountDetailData(
  supabase: Client,
  session: AppSession,
  countId: string
): Promise<PhysicalCountDetailData> {
  const canManage = canManagePhysicalCounts(
    session.profile.role,
    session.profile.active
  );

  if (!canManage) {
    return {
      canManage: false,
      permissionMessage:
        "Your account does not have permission to view or manage physical counts.",
      count: null,
      lines: [],
      loadError: null,
    };
  }

  const countResult = await supabase
    .from("physical_counts")
    .select("id, location_id, status, started_at, completed_at")
    .eq("id", countId)
    .maybeSingle();

  if (countResult.error) {
    return {
      canManage: true,
      permissionMessage: null,
      count: null,
      lines: [],
      loadError: countResult.error.message,
    };
  }

  if (!countResult.data) {
    return {
      canManage: true,
      permissionMessage: null,
      count: null,
      lines: [],
      loadError: null,
    };
  }

  const countRow = countResult.data;

  const [locationResult, itemsResult, uomResult, linesResult, onHandResult] =
    await Promise.all([
      supabase
        .from("locations")
        .select("location_name")
        .eq("id", countRow.location_id)
        .maybeSingle(),
      supabase
        .from("items")
        .select("id, item_name, internal_sku, unit_of_measure_id")
        .eq("active", true)
        .order("item_name"),
      supabase
        .from("units_of_measure")
        .select("id, abbreviation")
        .eq("active", true),
      supabase
        .from("physical_count_lines")
        .select(
          "id, item_id, system_quantity, counted_quantity, variance"
        )
        .eq("physical_count_id", countId),
      supabase
        .from("inventory_on_hand")
        .select("item_id, quantity_on_hand")
        .eq("location_id", countRow.location_id),
    ]);

  const errors: string[] = [];
  if (locationResult.error) errors.push(locationResult.error.message);
  if (itemsResult.error) errors.push(itemsResult.error.message);
  if (uomResult.error) errors.push(uomResult.error.message);
  if (linesResult.error) errors.push(linesResult.error.message);
  if (onHandResult.error) errors.push(onHandResult.error.message);

  const uomMap = new Map((uomResult.data ?? []).map((u) => [u.id, u]));
  const savedLineMap = new Map(
    (linesResult.data ?? []).map((line) => [line.item_id, line])
  );
  const onHandMap = new Map(
    (onHandResult.data ?? []).map((row) => [
      row.item_id,
      Number(row.quantity_on_hand ?? 0),
    ])
  );

  const editable = countRow.status === "in_progress";

  const lines: PhysicalCountLineRow[] = (itemsResult.data ?? []).map((item) => {
    const saved = savedLineMap.get(item.id);
    const systemQuantity = saved
      ? Number(saved.system_quantity)
      : (onHandMap.get(item.id) ?? 0);

    return {
      itemId: item.id,
      itemName: item.item_name,
      internalSku: item.internal_sku,
      unitAbbreviation:
        uomMap.get(item.unit_of_measure_id)?.abbreviation ?? "—",
      systemQuantity,
      countedQuantity: saved ? Number(saved.counted_quantity) : null,
      variance: saved ? Number(saved.variance ?? 0) : null,
      lineId: saved?.id ?? null,
    };
  });

  return {
    canManage: true,
    permissionMessage: null,
    count: {
      id: countRow.id,
      locationId: countRow.location_id,
      locationName: locationResult.data?.location_name ?? "Unknown location",
      status: countRow.status,
      startedAt: countRow.started_at,
      completedAt: countRow.completed_at,
      editable,
    },
    lines,
    loadError: errors.length > 0 ? errors.join(" ") : null,
  };
}

export { onHandKey };
