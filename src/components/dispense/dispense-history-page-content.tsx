import Link from "next/link";

import { DispenseHistoryFiltersForm } from "@/components/dispense/dispense-history-filters-form";
import { DispenseHistoryTable } from "@/components/dispense/dispense-history-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageSection } from "@/components/ui/page-section";
import { SummaryStats } from "@/components/ui/summary-stats";
import {
  dispenseHistoryScopeHint,
  type DispenseHistoryPageData,
} from "@/lib/data/dispense-history-page";
import {
  buildDispenseHistoryPageHref,
  hasActiveDispenseHistoryFilters,
} from "@/lib/dispense/page-url";
import { formatQuantity } from "@/lib/format/inventory";

type DispenseHistoryPageContentProps = {
  data: DispenseHistoryPageData;
};

export function DispenseHistoryPageContent({
  data,
}: DispenseHistoryPageContentProps) {
  if (!data.canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dispense history"
          description="Operational log of procedure kit dispense events."
        />
        <ErrorState
          title="Access denied"
          message={
            data.permissionMessage ??
            "Your account cannot view dispense history."
          }
        />
      </div>
    );
  }

  const filtersActive = hasActiveDispenseHistoryFilters(data.filters);
  const showingFrom =
    data.totalCount === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const showingTo = Math.min(data.page * data.pageSize, data.totalCount);
  const scopeHint = data.staffScoped
    ? dispenseHistoryScopeHint("staff")
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispense history"
        description="Operational log of procedure kit dispenses. No patient or visit data is stored or shown."
        actions={
          <Link href="/dispense" className="btn btn-secondary">
            Dispense kit
          </Link>
        }
      />

      {scopeHint ? (
        <p className="text-sm text-muted">{scopeHint}</p>
      ) : null}

      {data.weekSummary ? (
        <SummaryStats
          aria-label="Dispense summary this week"
          stats={[
            {
              label: "Dispenses this week",
              value: data.weekSummary.eventCount,
              hint: "Completed kit dispenses",
            },
            {
              label: "Most used kit",
              value: data.weekSummary.mostUsedKitName ?? "—",
              hint:
                data.weekSummary.mostUsedKitCount > 0
                  ? `${data.weekSummary.mostUsedKitCount} dispenses`
                  : "No dispenses yet",
            },
            {
              label: "Units consumed",
              value: formatQuantity(data.weekSummary.itemsConsumed),
              hint: "Sum of line quantities",
            },
            {
              label: "Expired stock used",
              value: data.weekSummary.expiredLotDispenses,
              hint: "Confirmed expired FEFO dispenses",
              tone:
                data.weekSummary.expiredLotDispenses > 0
                  ? "attention"
                  : "success",
            },
          ]}
        />
      ) : null}

      <DispenseHistoryFiltersForm
        filters={data.filters}
        kitOptions={data.kitOptions}
        locationOptions={data.locationOptions}
      />

      {data.loadError ? (
        <ErrorState
          title="Unable to load dispense history"
          message={data.loadError}
        />
      ) : (
        <PageSection
          id="dispense-history-table-heading"
          title="Dispense events"
          action={
            data.totalCount > 0 ? (
              <span className="text-sm text-[var(--color-fg-muted)]">
                {showingFrom}–{showingTo} of {data.totalCount}
              </span>
            ) : null
          }
        >
          {data.events.length === 0 ? (
            <EmptyState
              title={
                filtersActive
                  ? "No dispense events match your filters"
                  : "No dispense events yet"
              }
              description={
                filtersActive
                  ? "Try clearing filters or widening the date range."
                  : "Completed kit dispenses will appear here once staff record them."
              }
            />
          ) : (
            <>
              <DispenseHistoryTable events={data.events} />

              {data.totalPages > 1 ? (
                <nav
                  aria-label="Dispense history pagination"
                  className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-subtle)] pt-4"
                >
                  <span className="text-sm text-[var(--color-fg-muted)]">
                    Page {data.page} of {data.totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    {data.page > 1 ? (
                      <Link
                        href={buildDispenseHistoryPageHref(
                          data.filters,
                          data.page - 1
                        )}
                        className="btn btn-secondary btn-sm"
                      >
                        Previous
                      </Link>
                    ) : (
                      <span className="btn btn-secondary btn-sm opacity-50 pointer-events-none">
                        Previous
                      </span>
                    )}
                    {data.page < data.totalPages ? (
                      <Link
                        href={buildDispenseHistoryPageHref(
                          data.filters,
                          data.page + 1
                        )}
                        className="btn btn-secondary btn-sm"
                      >
                        Next
                      </Link>
                    ) : (
                      <span className="btn btn-secondary btn-sm opacity-50 pointer-events-none">
                        Next
                      </span>
                    )}
                  </div>
                </nav>
              ) : null}
            </>
          )}
        </PageSection>
      )}
    </div>
  );
}
