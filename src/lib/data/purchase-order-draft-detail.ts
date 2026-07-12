import type { SupabaseClient } from "@supabase/supabase-js";

import {
  canManagePurchaseOrderDrafts,
  canViewPurchaseOrderDrafts,
} from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import { itemLocationKey } from "@/lib/reorder-suggestions/calculate";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;
type DraftStatus = Database["public"]["Enums"]["purchase_order_draft_status"];

export type PurchaseOrderDraftLineRow = {
  id: string;
  itemId: string;
  itemName: string;
  internalSku: string;
  locationId: string | null;
  locationName: string | null;
  unitAbbreviation: string;
  quantity: number;
  suggestedQuantity: number | null;
  reorderReason: string | null;
  notes: string | null;
  onHand: number;
};

export type PurchaseOrderDraftDetail = {
  id: string;
  vendorId: string | null;
  vendorName: string;
  status: DraftStatus;
  createdAt: string;
  updatedAt: string;
  editable: boolean;
};

export type PurchaseOrderDraftDetailData = {
  canView: boolean;
  canManage: boolean;
  permissionMessage: string | null;
  draft: PurchaseOrderDraftDetail | null;
  lines: PurchaseOrderDraftLineRow[];
  loadError: string | null;
};

export async function getPurchaseOrderDraftDetailData(
  supabase: Client,
  session: AppSession,
  draftId: string
): Promise<PurchaseOrderDraftDetailData> {
  const canView = canViewPurchaseOrderDrafts(session.profile.active);
  const canManage = canManagePurchaseOrderDrafts(
    session.profile.role,
    session.profile.active
  );

  if (!canView) {
    return {
      canView: false,
      canManage: false,
      permissionMessage: "Your account cannot view purchase order drafts.",
      draft: null,
      lines: [],
      loadError: null,
    };
  }

  try {
    const { data: draftRow, error: draftError } = await supabase
      .from("purchase_order_drafts")
      .select(
        `
        id,
        vendor_id,
        status,
        created_at,
        updated_at,
        vendors ( name )
      `
      )
      .eq("id", draftId)
      .maybeSingle();

    if (draftError) {
      throw new Error(draftError.message);
    }

    if (!draftRow) {
      return {
        canView: true,
        canManage,
        permissionMessage: null,
        draft: null,
        lines: [],
        loadError: null,
      };
    }

    const { data: lineRows, error: linesError } = await supabase
      .from("purchase_order_draft_lines")
      .select(
        `
        id,
        item_id,
        location_id,
        quantity,
        suggested_quantity,
        reorder_reason,
        notes,
        items (
          item_name,
          internal_sku,
          units_of_measure ( abbreviation )
        ),
        locations ( location_name )
      `
      )
      .eq("purchase_order_draft_id", draftId)
      .order("created_at", { ascending: true });

    if (linesError) {
      throw new Error(linesError.message);
    }

    const onHandKeys = new Set<string>();
    for (const line of lineRows ?? []) {
      if (line.item_id && line.location_id) {
        onHandKeys.add(itemLocationKey(line.item_id, line.location_id));
      }
    }

    const onHandMap = new Map<string, number>();
    if (onHandKeys.size > 0) {
      const { data: onHandRows } = await supabase
        .from("inventory_on_hand")
        .select("item_id, location_id, quantity_on_hand");

      for (const row of onHandRows ?? []) {
        if (!row.item_id || !row.location_id) continue;
        const key = itemLocationKey(row.item_id, row.location_id);
        if (onHandKeys.has(key)) {
          onHandMap.set(key, Number(row.quantity_on_hand ?? 0));
        }
      }
    }

    const vendor = draftRow.vendors as { name: string } | null;
    const lines: PurchaseOrderDraftLineRow[] = (lineRows ?? []).map((line) => {
      const item = line.items as {
        item_name: string;
        internal_sku: string;
        units_of_measure: { abbreviation: string } | null;
      } | null;
      const location = line.locations as { location_name: string } | null;
      const onHandKey =
        line.item_id && line.location_id
          ? itemLocationKey(line.item_id, line.location_id)
          : null;

      return {
        id: line.id,
        itemId: line.item_id,
        itemName: item?.item_name ?? "Unknown item",
        internalSku: item?.internal_sku ?? "—",
        locationId: line.location_id,
        locationName: location?.location_name ?? null,
        unitAbbreviation: item?.units_of_measure?.abbreviation ?? "EA",
        quantity: Number(line.quantity),
        suggestedQuantity:
          line.suggested_quantity == null
            ? null
            : Number(line.suggested_quantity),
        reorderReason: line.reorder_reason,
        notes: line.notes,
        onHand: onHandKey ? (onHandMap.get(onHandKey) ?? 0) : 0,
      };
    });

    return {
      canView: true,
      canManage,
      permissionMessage: null,
      draft: {
        id: draftRow.id,
        vendorId: draftRow.vendor_id,
        vendorName: vendor?.name ?? "No preferred vendor",
        status: draftRow.status,
        createdAt: draftRow.created_at,
        updatedAt: draftRow.updated_at,
        editable: draftRow.status === "draft",
      },
      lines,
      loadError: null,
    };
  } catch (caught) {
    const message =
      caught instanceof Error
        ? caught.message
        : "Unable to load purchase order draft.";

    return {
      canView: true,
      canManage,
      permissionMessage: null,
      draft: null,
      lines: [],
      loadError: message,
    };
  }
}
