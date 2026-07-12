import Link from "next/link";

import { ReorderReportFiltersForm } from "@/components/reorder-report/reorder-report-filters-form";
import { ReorderReportTable } from "@/components/reorder-report/reorder-report-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageSection } from "@/components/ui/page-section";
import { SummaryStats } from "@/components/ui/summary-stats";
import type { ReorderReportPageData } from "@/lib/data/reorder-report-page";
import { hasActiveReorderReportFilters } from "@/lib/reorder/filtering";
import { formatDateTime } from "@/lib/format/inventory";

type ReorderReportPageContentProps = {
  data: ReorderReportPageData;
};

export function ReorderReportPageContent({
  data,
}: ReorderReportPageContentProps) {
  if (!data.canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Reorder report"
          description="Review active items at or below reorder point and suggested replenishment quantities."
        />
        <ErrorState
          title="Access denied"
          message={
            data.permissionMessage ??
            "Your account cannot view the reorder report."
          }
        />
      </div>
    );
  }

  const filtersActive = hasActiveReorderReportFilters(data.filters);
  const hasRows = data.allRows.length > 0;

  return (
    <div className="space-y-6 reorder-report-print-area">
      <PageHeader
        title="Reorder report"
        description="Read-only replenishment report for active items at or below reorder point. Suggested order quantities bring stock up to par level."
      />

      <div className="reorder-report-print-meta hidden print:block">
        <p className="text-sm text-[var(--color-fg-muted)]">
          Generated {formatDateTime(data.generatedAt)}
        </p>
      </div>

      <SummaryStats
        aria-label="Reorder summary"
        className="reorder-report-no-print"
        stats={[
          {
            label: "Items to review",
            value: data.summary.totalItems,
            hint: "At or below reorder point",
            tone: data.summary.totalItems > 0 ? "attention" : "success",
          },
          {
            label: "Out of stock",
            value: data.summary.outOfStockCount,
            hint: "Zero on hand",
            tone: data.summary.outOfStockCount > 0 ? "attention" : "success",
          },
          {
            label: "Below reorder",
            value: data.summary.belowReorderCount,
            hint: "Above zero but under reorder point",
          },
          {
            label: "At reorder point",
            value: data.summary.atReorderCount,
            hint: "Exactly at reorder threshold",
          },
        ]}
      />

      <ReorderReportFiltersForm
        filters={data.filters}
        categoryOptions={data.categoryOptions}
        vendorOptions={data.vendorOptions}
      />

      {data.loadError ? (
        <ErrorState
          title="Unable to load reorder report"
          message={data.loadError}
        />
      ) : (
        <PageSection
          id="reorder-report-table-heading"
          title="Replenishment items"
          action={
            hasRows ? (
              <span className="text-sm text-[var(--color-fg-muted)]">
                {data.summary.totalItems} item
                {data.summary.totalItems === 1 ? "" : "s"}
              </span>
            ) : null
          }
        >
          {!hasRows ? (
            <EmptyState
              title={
                filtersActive
                  ? "No items match your filters"
                  : "All items are above reorder point"
              }
              description={
                filtersActive
                  ? "Try clearing filters or choosing a different vendor or category."
                  : "Stock levels meet reorder thresholds across the active catalog."
              }
            />
          ) : (
            <div className="space-y-6">
              {data.groups.map((group) => (
                <div key={group.key} className="space-y-3">
                  {data.filters.groupBy !== "none" ? (
                    <h3 className="text-sm font-semibold text-[var(--color-fg)]">
                      {group.label}
                      <span className="ml-2 font-normal text-[var(--color-fg-muted)]">
                        ({group.rows.length})
                      </span>
                    </h3>
                  ) : null}
                  <ReorderReportTable rows={group.rows} />
                </div>
              ))}
            </div>
          )}

          {filtersActive && hasRows ? (
            <p className="reorder-report-no-print mt-4 text-sm text-[var(--color-fg-muted)]">
              <Link href="/reorder-report" className="link-subtle">
                Clear filters
              </Link>{" "}
              to see the full report.
            </p>
          ) : null}
        </PageSection>
      )}
    </div>
  );
}
