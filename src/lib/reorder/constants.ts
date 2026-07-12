export const REORDER_REPORT_SORT_OPTIONS = [
  "urgency",
  "vendor",
  "item_name",
  "quantity_needed",
] as const;

export type ReorderReportSort = (typeof REORDER_REPORT_SORT_OPTIONS)[number];

export const REORDER_REPORT_GROUP_OPTIONS = [
  "none",
  "vendor",
  "category",
] as const;

export type ReorderReportGroupBy = (typeof REORDER_REPORT_GROUP_OPTIONS)[number];
