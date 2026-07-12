export type ReorderStockStatus =
  | "out_of_stock"
  | "below_reorder"
  | "at_reorder_point";

export function calculateSuggestedOrderQuantity(
  parLevel: number,
  totalOnHand: number
): number {
  return Math.max(parLevel - totalOnHand, 0);
}

export function getReorderStockStatus(
  totalOnHand: number,
  reorderPoint: number
): ReorderStockStatus {
  if (totalOnHand <= 0) {
    return "out_of_stock";
  }

  if (totalOnHand < reorderPoint) {
    return "below_reorder";
  }

  return "at_reorder_point";
}

export function getReorderStockStatusLabel(status: ReorderStockStatus): string {
  switch (status) {
    case "out_of_stock":
      return "Out of stock";
    case "below_reorder":
      return "Below reorder point";
    case "at_reorder_point":
      return "At reorder point";
  }
}

export function getReorderUrgencyRank(status: ReorderStockStatus): number {
  switch (status) {
    case "out_of_stock":
      return 0;
    case "below_reorder":
      return 1;
    case "at_reorder_point":
      return 2;
  }
}
