import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PrintReorderReportButton } from "@/components/reorder-report/print-reorder-report-button";
import {
  REORDER_REPORT_GROUP_OPTIONS,
  REORDER_REPORT_SORT_OPTIONS,
} from "@/lib/reorder/constants";
import type { ReorderReportFilterOption } from "@/lib/data/reorder-report-page";
import type { ReorderReportPageFilters } from "@/lib/validation/reorder-report-page";

type ReorderReportFiltersFormProps = {
  filters: ReorderReportPageFilters;
  categoryOptions: ReorderReportFilterOption[];
  vendorOptions: ReorderReportFilterOption[];
};

const SORT_LABELS = {
  urgency: "Urgency",
  vendor: "Vendor",
  item_name: "Item name",
  quantity_needed: "Quantity needed",
} as const;

const GROUP_LABELS = {
  none: "No grouping",
  vendor: "Vendor",
  category: "Category",
} as const;

export function ReorderReportFiltersForm({
  filters,
  categoryOptions,
  vendorOptions,
}: ReorderReportFiltersFormProps) {
  return (
    <form
      method="get"
      action="/reorder-report"
      className="card card-body reorder-report-no-print space-y-4"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="field">
          <span className="field-label">Search item</span>
          <input
            type="search"
            name="search"
            defaultValue={filters.search}
            placeholder="Name or SKU"
            className="field-input"
            autoComplete="off"
          />
        </label>

        <label className="field">
          <span className="field-label">Category</span>
          <select
            name="categoryId"
            defaultValue={filters.categoryId}
            className="field-input"
          >
            <option value="">All categories</option>
            {categoryOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Preferred vendor</span>
          <select
            name="vendorId"
            defaultValue={filters.vendorId}
            className="field-input"
          >
            <option value="">All vendors</option>
            {vendorOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Sort by</span>
          <select name="sort" defaultValue={filters.sort} className="field-input">
            {REORDER_REPORT_SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {SORT_LABELS[option]}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Group by</span>
          <select
            name="groupBy"
            defaultValue={filters.groupBy}
            className="field-input"
          >
            {REORDER_REPORT_GROUP_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {GROUP_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">Apply</Button>
        <Link href="/reorder-report" className="link-subtle">
          Clear filters
        </Link>
        <PrintReorderReportButton />
      </div>
    </form>
  );
}
