import type { Database } from "@/lib/types/database";
import type { ReorderStockStatus } from "@/lib/reorder/calculations";

export type ReorderReportViewRow =
  Database["public"]["Views"]["items_below_reorder_point"]["Row"];

export type ReorderReportRow = {
  itemId: string;
  itemName: string;
  internalSku: string;
  categoryId: string;
  categoryName: string;
  unitName: string;
  unitAbbreviation: string;
  preferredVendorId: string | null;
  vendorName: string | null;
  totalOnHand: number;
  reorderPoint: number;
  parLevel: number;
  quantityNeeded: number;
  suggestedOrderQuantity: number;
  stockStatus: ReorderStockStatus;
};

export type ReorderReportGroup = {
  key: string;
  label: string;
  rows: ReorderReportRow[];
};
