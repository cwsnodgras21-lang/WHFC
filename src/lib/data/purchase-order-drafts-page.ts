import type { SupabaseClient } from "@supabase/supabase-js";

import {
  canManagePurchaseOrderDrafts,
  canViewPurchaseOrderDrafts,
} from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;
type DraftStatus = Database["public"]["Enums"]["purchase_order_draft_status"];

export type PurchaseOrderDraftSummary = {
  id: string;
  vendorId: string | null;
  vendorName: string;
  status: DraftStatus;
  lineCount: number;
  totalQuantity: number;
  createdAt: string;
  updatedAt: string;
};

export type VendorDraftGroup = {
  vendorId: string | null;
  vendorName: string;
  drafts: PurchaseOrderDraftSummary[];
};

export type PurchaseOrderDraftsPageData = {
  canView: boolean;
  canManage: boolean;
  permissionMessage: string | null;
  groups: VendorDraftGroup[];
  awaitingReviewCount: number;
  approvedCount: number;
  loadError: string | null;
};

const STATUS_SORT_ORDER: Record<DraftStatus, number> = {
  draft: 0,
  approved: 1,
  ordered: 2,
  submitted: 1,
  cancelled: 3,
};

function compareDrafts(
  left: PurchaseOrderDraftSummary,
  right: PurchaseOrderDraftSummary
): number {
  const byStatus = STATUS_SORT_ORDER[left.status] - STATUS_SORT_ORDER[right.status];
  if (byStatus !== 0) return byStatus;
  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

export async function getPurchaseOrderDraftsPageData(
  supabase: Client,
  session: AppSession
): Promise<PurchaseOrderDraftsPageData> {
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
      groups: [],
      awaitingReviewCount: 0,
      approvedCount: 0,
      loadError: null,
    };
  }

  try {
    const { data, error } = await supabase
      .from("purchase_order_drafts")
      .select(
        `
        id,
        vendor_id,
        status,
        created_at,
        updated_at,
        vendors ( name ),
        purchase_order_draft_lines ( quantity )
      `
      )
      .neq("status", "cancelled")
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const summaries: PurchaseOrderDraftSummary[] = (data ?? []).map((draft) => {
      const vendor = draft.vendors as { name: string } | null;
      const lines = draft.purchase_order_draft_lines ?? [];
      const totalQuantity = lines.reduce(
        (sum, line) => sum + Number(line.quantity ?? 0),
        0
      );

      return {
        id: draft.id,
        vendorId: draft.vendor_id,
        vendorName: vendor?.name ?? "No preferred vendor",
        status: draft.status,
        lineCount: lines.length,
        totalQuantity,
        createdAt: draft.created_at,
        updatedAt: draft.updated_at,
      };
    });

    const groupMap = new Map<string, VendorDraftGroup>();

    for (const draft of summaries) {
      const key = draft.vendorId ?? "__none__";
      const existing = groupMap.get(key) ?? {
        vendorId: draft.vendorId,
        vendorName: draft.vendorName,
        drafts: [],
      };
      existing.drafts.push(draft);
      groupMap.set(key, existing);
    }

    const groups = Array.from(groupMap.values())
      .map((group) => ({
        ...group,
        drafts: [...group.drafts].sort(compareDrafts),
      }))
      .sort((left, right) => {
        if (left.vendorId === null) return 1;
        if (right.vendorId === null) return -1;
        return left.vendorName.localeCompare(right.vendorName);
      });

    return {
      canView: true,
      canManage,
      permissionMessage: null,
      groups,
      awaitingReviewCount: summaries.filter((draft) => draft.status === "draft")
        .length,
      approvedCount: summaries.filter((draft) => draft.status === "approved").length,
      loadError: null,
    };
  } catch (caught) {
    const message =
      caught instanceof Error
        ? caught.message
        : "Unable to load purchase order drafts.";

    return {
      canView: true,
      canManage,
      permissionMessage: null,
      groups: [],
      awaitingReviewCount: 0,
      approvedCount: 0,
      loadError: message,
    };
  }
}

export async function countPoDraftsAwaitingReview(
  supabase: Client
): Promise<number> {
  const { count, error } = await supabase
    .from("purchase_order_drafts")
    .select("id", { count: "exact", head: true })
    .eq("status", "draft");

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export async function fetchPoDraftsAwaitingReviewPreview(
  supabase: Client,
  limit = 5
): Promise<PurchaseOrderDraftSummary[]> {
  const { data, error } = await supabase
    .from("purchase_order_drafts")
    .select(
      `
      id,
      vendor_id,
      status,
      created_at,
      updated_at,
      vendors ( name ),
      purchase_order_draft_lines ( quantity )
    `
    )
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  return (data ?? []).map((draft) => {
    const vendor = draft.vendors as { name: string } | null;
    const lines = draft.purchase_order_draft_lines ?? [];

    return {
      id: draft.id,
      vendorId: draft.vendor_id,
      vendorName: vendor?.name ?? "No preferred vendor",
      status: draft.status,
      lineCount: lines.length,
      totalQuantity: lines.reduce(
        (sum, line) => sum + Number(line.quantity ?? 0),
        0
      ),
      createdAt: draft.created_at,
      updatedAt: draft.updated_at,
    };
  });
}
